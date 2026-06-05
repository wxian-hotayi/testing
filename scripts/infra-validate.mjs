#!/usr/bin/env node
// @ts-check
/**
 * Runtime infrastructure validator — multi-tenant SaaS (Supabase + Stripe).
 *
 * Runs against REAL staging/production infrastructure and reports the ACTUAL
 * state. It NEVER fabricates results:
 *   - PASS         only when something was actually verified against live infra.
 *   - FAIL         a real check ran and failed (critical → non-zero exit).
 *   - WARNING      ran, non-blocking concern.
 *   - SKIPPED      prerequisites absent (e.g. no credentials, optional gate off).
 *   - NOT VALIDATED the check cannot be performed through the available API
 *                   surface (e.g. index/constraint introspection isn't exposed
 *                   via PostgREST) — verify via the noted alternate path.
 *
 * Node ESM, no framework dependency (uses the project's @supabase/supabase-js
 * and stripe SDKs). All network ops are time-boxed so it's CI-safe.
 *
 * Usage:
 *   node scripts/infra-validate.mjs [--payments] [--strict] [--target=staging|production]
 *
 * Exit: 0 if no CRITICAL gate FAILED; 1 otherwise. With --strict, any critical
 * gate that is not PASS (SKIPPED/NOT VALIDATED/WARNING) also exits 1.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const NET_TIMEOUT_MS = 8000;

// --- args + env --------------------------------------------------------------
const argv = process.argv.slice(2);
const FLAG_PAYMENTS = argv.includes('--payments');
const FLAG_STRICT = argv.includes('--strict');
const TARGET =
  (argv.find((a) => a.startsWith('--target='))?.split('=')[1] ?? process.env.GO_LIVE_TARGET ?? 'staging')
    .toLowerCase();
const IS_PROD = TARGET === 'production';

/** Best-effort load of .env.local for local runs (CI provides real env). */
function loadEnvLocal() {
  const p = join(process.cwd(), '.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
loadEnvLocal();

const ENV = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  stripeKey: process.env.STRIPE_SECRET_KEY ?? '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? '',
};

// --- status model ------------------------------------------------------------
const PASS = 'PASS';
const FAIL = 'FAIL';
const WARN = 'WARNING';
const SKIP = 'SKIPPED';
const NV = 'NOT VALIDATED';

/** @typedef {{ id:string, name:string, status:string, critical:boolean, lines:string[] }} GateResult */
/** @param {string} id @param {string} name @param {boolean} critical @param {string} status @param {string[]} [lines] @returns {GateResult} */
const gate = (id, name, critical, status, lines = []) => ({ id, name, critical, status, lines });

const timeoutSignal = () =>
  typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
    ? AbortSignal.timeout(NET_TIMEOUT_MS)
    : undefined;

// --- lazy SDK + client construction -----------------------------------------
let _supaService = null;
let _supaAnon = null;
/** @returns {Promise<any|null>} */
async function supabase(role) {
  const key = role === 'service' ? ENV.serviceKey : ENV.anonKey;
  if (!ENV.supabaseUrl || !key) return null;
  const cache = role === 'service' ? _supaService : _supaAnon;
  if (cache) return cache;
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(ENV.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (role === 'service') _supaService = client;
  else _supaAnon = client;
  return client;
}

// --- error classifiers -------------------------------------------------------
const isMissingTable = (e) => !!e && (e.code === '42P01' || e.code === 'PGRST205' ||
  /could not find the table|does not exist|schema cache/i.test(e.message ?? ''));
const isMissingColumn = (e) => !!e && (e.code === '42703' ||
  /column .* does not exist|could not find the .* column/i.test(e.message ?? ''));
const isConnError = (e) => !!e &&
  /fetch failed|enotfound|getaddrinfo|econnrefused|timed out|aborted|invalid api key|jwt|unauthor|401|403/i
    .test(`${e.message ?? ''} ${e.code ?? ''}`);

/**
 * Existence probe via a real GET (NOT head:true). HEAD requests return no body,
 * so PostgREST's missing-table/column error is lost — which previously masked
 * absent tables as "present". Always probe with a GET. @returns {Promise<{state:'present'|'missing'|'error', error?:any}>}
 */
async function probeTable(client, table) {
  try {
    const q = client.from(table).select('*').limit(1);
    const sig = timeoutSignal();
    const { error } = await (sig ? q.abortSignal(sig) : q);
    if (!error) return { state: 'present' };
    if (isMissingTable(error)) return { state: 'missing' };
    return { state: 'error', error };
  } catch (e) {
    return { state: 'error', error: e };
  }
}

/** Row count visible to a client (RLS-aware) — only meaningful for tables known
 *  to exist. @returns {Promise<{count:number|null, error:any}>} */
async function headCount(client, table) {
  const q = client.from(table).select('*', { count: 'exact', head: true });
  const sig = timeoutSignal();
  const { count, error } = sig ? await q.abortSignal(sig) : await q;
  return { count: count ?? null, error };
}

// --- GATE 1: Supabase connectivity ------------------------------------------
async function gate1() {
  if (!ENV.supabaseUrl || !ENV.serviceKey) {
    return gate('GATE 1', 'Supabase Connectivity', true, SKIP, [
      'No SUPABASE URL / SERVICE_ROLE key in env — cannot attempt a connection.',
    ]);
  }
  const client = await supabase('service');
  // A missing-table response STILL proves we reached + authenticated against
  // PostgREST; only network/auth errors are a connectivity FAIL.
  const r = await probeTable(client, 'profiles');
  if (r.state === 'error' && isConnError(r.error)) {
    return gate('GATE 1', 'Supabase Connectivity', true, FAIL, [
      `Connection/auth failed: ${r.error?.message ?? r.error}`,
    ]);
  }
  return gate('GATE 1', 'Supabase Connectivity', true, PASS, [
    `Reached ${ENV.supabaseUrl} with the service-role key (authenticated PostgREST response).`,
  ]);
}

// --- GATE 2: migration state / required tables -------------------------------
const REQUIRED_TABLES = [
  'stores', 'store_members', 'store_invitations', 'membership_audit',
  'products', 'categories', 'orders', 'order_items', 'coupons', 'subscriptions',
];
async function gate2(connected) {
  if (!connected) return gate('GATE 2', 'Migration State / Tables', true, SKIP, ['Supabase not connected.']);
  const client = await supabase('service');
  const missing = [];
  const errored = [];
  for (const t of REQUIRED_TABLES) {
    const r = await probeTable(client, t);
    if (r.state === 'missing') missing.push(t);
    else if (r.state === 'error') errored.push(`${t} (${r.error?.message ?? r.error})`);
  }
  const lines = [];
  if (missing.length) lines.push(`❌ MISSING tables: ${missing.join(', ')}`);
  if (errored.length) lines.push(`⚠ unverifiable: ${errored.join('; ')}`);
  if (!missing.length && !errored.length) lines.push(`All ${REQUIRED_TABLES.length} required tables present.`);
  lines.push(`${NV}: migration ledger (0011–0015) + index/constraint existence (incl. unique(stripe_checkout_session_id), 0015) not introspectable via PostgREST. Verify with \`supabase migration list\` / SQL on pg_indexes,pg_constraint.`);
  const status = missing.length || errored.length ? FAIL : PASS;
  return gate('GATE 2', 'Migration State / Tables', true, status, lines);
}

// --- GATE 3: tenancy columns (store_id) --------------------------------------
const STORE_ID_TABLES = ['products', 'categories', 'orders', 'order_items', 'coupons', 'carts', 'reviews', 'subscriptions'];
async function gate3(connected) {
  if (!connected) return gate('GATE 3', 'Database Structure (store_id)', true, SKIP, ['Supabase not connected.']);
  const client = await supabase('service');
  const missing = [];
  for (const t of STORE_ID_TABLES) {
    /** @type {any} */
    let error = null;
    try {
      // NOT head:true — a HEAD request returns no body, so PostgREST's error
      // (e.g. undefined column) can't be parsed. A tiny GET surfaces it.
      const q = client.from(t).select('store_id').limit(1);
      const sig = timeoutSignal();
      const res = await (sig ? q.abortSignal(sig) : q);
      error = res.error;
    } catch (e) {
      error = e;
    }
    if (error && (error.code === '42703' || /column .* does not exist/i.test(error.message ?? ''))) missing.push(t);
    else if (error && error.code === '42P01') missing.push(`${t} (table missing)`);
    else if (error) missing.push(`${t} (error: ${error.message ?? error})`);
  }
  const lines = [
    missing.length ? `store_id MISSING on: ${missing.join(', ')}` : `store_id present on all ${STORE_ID_TABLES.length} checked tenant tables.`,
    `${NV}: foreign keys + indexes require pg_catalog access (not via PostgREST) — verify via SQL.`,
  ];
  return gate('GATE 3', 'Database Structure (store_id)', true, missing.length ? FAIL : PASS, lines);
}

// --- GATE 4: RLS validation (anon must not read protected tables) ------------
async function gate4(connected) {
  if (!connected) return gate('GATE 4', 'RLS Validation', true, SKIP, ['Supabase not connected.']);
  if (!ENV.anonKey) return gate('GATE 4', 'RLS Validation', true, SKIP, ['No anon key — cannot test anon access.']);
  const service = await supabase('service');
  const anon = await supabase('anon');
  const lines = [];
  let anyLeak = false;
  let anyInconclusive = false;
  let anyMissing = false;
  for (const t of ['orders', 'store_members']) {
    // Existence first (GET) — a missing table can't be RLS-tested and must not
    // be misreported as "no rows".
    const exists = await probeTable(service, t);
    if (exists.state === 'missing') {
      anyMissing = true;
      lines.push(`❌ ${t}: table MISSING — RLS cannot be tested (apply migrations).`);
      continue;
    }
    const s = await headCount(service, t).catch((e) => ({ count: null, error: e }));
    const a = await headCount(anon, t).catch((e) => ({ count: null, error: e }));
    const serviceN = s.count;
    const anonN = a.error ? 0 : a.count; // RLS-denied reads return [] (no error)
    if ((anonN ?? 0) > 0) {
      anyLeak = true;
      lines.push(`❌ anon can read ${anonN} ${t} row(s) — RLS LEAK.`);
    } else if ((serviceN ?? 0) > 0) {
      lines.push(`✔ anon sees 0 ${t} (service sees ${serviceN}) — RLS enforced.`);
    } else {
      anyInconclusive = true;
      lines.push(`⚠ ${t}: no rows exist (service=0) — cannot prove RLS without seeded data.`);
    }
  }
  const status = anyLeak || anyMissing ? FAIL : anyInconclusive ? WARN : PASS;
  return gate('GATE 4', 'RLS Validation', true, status, lines);
}

// --- GATE 5: tenant isolation (needs authed store-scoped sessions) -----------
async function gate5(connected) {
  return gate('GATE 5', 'Tenant Isolation', true, NV, [
    'Cross-tenant isolation (Store A operator cannot read Store B orders/members/analytics)',
    'requires authenticated, store-scoped sessions + ≥2 seeded stores — not performable from a',
    'pure service-role/anon API probe without faking it.',
    'Validate via the Playwright spec: `npm run test:e2e` (tests/e2e/store-isolation.spec.ts)',
    'with E2E_ROOT_DOMAIN + E2E_STORE_A/B + per-role creds (see docs/TESTING.md).',
  ]);
}

// --- GATE 6: RBAC (app-layer; pure DB probe cannot exercise it) --------------
async function gate6() {
  return gate('GATE 6', 'RBAC Validation', true, NV, [
    'Role resolution (incl. the legacy global-admin → customer fix on non-default stores)',
    'is enforced in application server code per request — not observable from a DB probe.',
    'Covered by: unit regression `src/lib/rbac/permissions.test.ts` (runs in CI) and the',
    'E2E `tests/e2e/rbac.spec.ts`. Run `npm test` + `npm run test:e2e` against the target.',
  ]);
}

// --- GATE 7: Stripe configuration --------------------------------------------
async function gate7() {
  if (!ENV.stripeKey) return gate('GATE 7', 'Stripe Configuration', true, SKIP, ['No STRIPE_SECRET_KEY in env.']);
  const lines = [];
  let status = PASS;
  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(ENV.stripeKey, { timeout: NET_TIMEOUT_MS, maxNetworkRetries: 0 });
    const mode = ENV.stripeKey.startsWith('sk_live_') ? 'live' : ENV.stripeKey.startsWith('sk_test_') ? 'test' : 'unknown';
    lines.push(`Key mode: ${mode}`);

    await stripe.balance.retrieve(); // validates key + reachability
    lines.push('✔ Stripe API key valid and account reachable.');

    try {
      await stripe.accounts.list({ limit: 1 });
      lines.push('✔ Stripe Connect is enabled (accounts.list succeeded).');
    } catch (e) {
      status = WARN;
      lines.push(`⚠ Connect check failed (Connect may be disabled): ${e?.message ?? e}`);
    }

    try {
      const eps = await stripe.webhookEndpoints.list({ limit: 100 });
      const match = eps.data.some((e) => (e.url ?? '').includes('/api/webhooks/stripe'));
      if (match) lines.push('✔ Webhook endpoint for /api/webhooks/stripe is configured.');
      else { status = status === PASS ? WARN : status; lines.push('⚠ No webhook endpoint matching /api/webhooks/stripe found.'); }
    } catch (e) {
      status = status === PASS ? WARN : status;
      lines.push(`⚠ Could not list webhook endpoints: ${e?.message ?? e}`);
    }
  } catch (e) {
    return gate('GATE 7', 'Stripe Configuration', true, FAIL, [`Stripe key invalid or unreachable: ${e?.message ?? e}`]);
  }
  return gate('GATE 7', 'Stripe Configuration', true, status, lines);
}

// --- GATE 8: Stripe test flow (optional, --payments) -------------------------
async function gate8() {
  if (!FLAG_PAYMENTS) {
    return gate('GATE 8', 'Stripe Payment Flow', false, SKIP, ['Pass --payments to exercise a real test-mode charge + refund.']);
  }
  if (!ENV.stripeKey) return gate('GATE 8', 'Stripe Payment Flow', true, SKIP, ['No STRIPE_SECRET_KEY.']);
  if (!ENV.stripeKey.startsWith('sk_test_')) {
    return gate('GATE 8', 'Stripe Payment Flow', true, FAIL, ['Refusing to run payment ops with a non-test key. Use sk_test_* for --payments.']);
  }
  const lines = [];
  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(ENV.stripeKey, { timeout: NET_TIMEOUT_MS, maxNetworkRetries: 0 });
    const pi = await stripe.paymentIntents.create({
      amount: 500, currency: 'myr', payment_method: 'pm_card_visa', confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    });
    lines.push(`✔ PaymentIntent ${pi.id} status=${pi.status}`);
    const refund = await stripe.refunds.create({ payment_intent: pi.id });
    lines.push(`✔ Refund ${refund.id} status=${refund.status}`);
    const ok = pi.status === 'succeeded' && refund.status === 'succeeded';
    lines.push(
      `${NV}: app-integrated flow (checkout.session → webhook → order creation → idempotency → platform fee → refund sync) requires the running app + \`stripe listen\`. See docs/SETUP_AND_VALIDATION.md §5.`,
    );
    return gate('GATE 8', 'Stripe Payment Flow', true, ok ? PASS : FAIL, lines);
  } catch (e) {
    return gate('GATE 8', 'Stripe Payment Flow', true, FAIL, [`Test charge/refund failed: ${e?.message ?? e}`]);
  }
}

// --- GATE 9: production configuration (static) -------------------------------
function gate9() {
  const lines = [];
  let bad = false;
  let missing = 0;
  const need = (k, v) => {
    if (!v) { missing += 1; bad = bad || IS_PROD; lines.push(`${IS_PROD ? '❌' : '⚠'} ${k} missing`); }
    else lines.push(`✔ ${k} present`);
  };
  need('NEXT_PUBLIC_SITE_URL', ENV.siteUrl);
  need('SUPABASE URL', ENV.supabaseUrl);
  need('SUPABASE anon key', ENV.anonKey);
  need('SUPABASE service-role key', ENV.serviceKey);
  need('STRIPE_SECRET_KEY', ENV.stripeKey);
  need('STRIPE_WEBHOOK_SECRET', ENV.webhookSecret);

  if (IS_PROD) {
    if (/^http:\/\//.test(ENV.siteUrl) || /localhost|127\.0\.0\.1/.test(ENV.siteUrl)) {
      bad = true; lines.push(`❌ NEXT_PUBLIC_SITE_URL must be HTTPS, non-localhost (got "${ENV.siteUrl}")`);
    } else if (ENV.siteUrl) lines.push('✔ Site URL is HTTPS/non-localhost');
    if (ENV.stripeKey.startsWith('sk_test_')) { bad = true; lines.push('❌ sk_test key in production mode'); }
    else if (ENV.stripeKey.startsWith('sk_live_')) lines.push('✔ Stripe live key in production');
  } else {
    lines.push(`(target=${TARGET}: production-only constraints relaxed)`);
  }
  const status = bad ? FAIL : missing > 0 ? WARN : PASS;
  return gate('GATE 9', 'Production Configuration', true, status, lines);
}

// --- runner ------------------------------------------------------------------
const ICON = { [PASS]: '✅', [FAIL]: '❌', [WARN]: '⚠️ ', [SKIP]: '⏭️ ', [NV]: '🚫' };

async function main() {
  console.log('\n==================================================');
  console.log(' INFRA VALIDATION REPORT');
  console.log(`  target=${TARGET}  payments=${FLAG_PAYMENTS}  strict=${FLAG_STRICT}  ${new Date().toISOString()}`);
  console.log('==================================================\n');

  const g1 = await gate1();
  const connected = g1.status === PASS;
  /** @type {GateResult[]} */
  const results = [
    g1,
    await gate2(connected),
    await gate3(connected),
    await gate4(connected),
    await gate5(connected),
    await gate6(),
    await gate7(),
    await gate8(),
    gate9(),
  ];

  for (const r of results) {
    console.log(`${ICON[r.status] ?? '  '} ${r.status.padEnd(13)} ${r.id} — ${r.name}`);
    for (const l of r.lines) console.log(`        ${l}`);
  }

  const criticalFails = results.filter((r) => r.critical && r.status === FAIL);
  const warnings = results.filter((r) => r.status === WARN);
  const criticalNotPass = results.filter((r) => r.critical && r.status !== PASS);

  console.log('\n--------------------------------------------------');
  console.log(` Critical Failures: ${criticalFails.length}`);
  console.log(` Warnings:          ${warnings.length}`);
  console.log(` Skipped/NotValid:  ${results.filter((r) => r.status === SKIP || r.status === NV).length}`);

  const ready = criticalNotPass.length === 0;
  console.log('');
  console.log(` PRODUCTION READY: ${ready ? 'YES' : 'NO'}`);
  if (!ready) {
    console.log(' Reason: the following critical gates are not PASS —');
    for (const r of criticalNotPass) console.log(`   - ${r.id} ${r.name}: ${r.status}`);
  }
  console.log('==================================================\n');

  const exit = criticalFails.length > 0 || (FLAG_STRICT && criticalNotPass.length > 0) ? 1 : 0;
  process.exit(exit);
}

main().catch((err) => {
  console.error('infra-validate crashed:', err);
  process.exit(1);
});
