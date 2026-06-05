#!/usr/bin/env node
// @ts-check
/**
 * GO-LIVE preflight gate — multi-tenant SaaS (Next.js + Supabase + Stripe).
 *
 * A deterministic, OFFLINE CI safety gate. It blocks deployment unless the
 * critical gates pass. It performs NO network calls and assumes NO Supabase or
 * Stripe connectivity — it validates configuration, schema files, code
 * structure, and (optionally) the local build/test toolchain.
 *
 * Authored as a dependency-free Node ESM script so it runs in CI with zero
 * install (`node scripts/go-live-check.mjs`). Gates that would require live
 * services are intentionally implemented as static checks + explicit warnings,
 * never faked.
 *
 * Knobs (env):
 *   GO_LIVE_TARGET     'production' (default) | 'ci' | 'staging'
 *                      Non-production downgrades env-var absence to warnings
 *                      (PR/CI runners don't hold production secrets).
 *   GO_LIVE_SKIP_BUILD '1' to skip the (slow) build step in Gate 0 — set this
 *                      when CI already ran the build as a separate step.
 *
 * Exit code: 0 if every critical check passes, 1 otherwise.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const TARGET = process.env.GO_LIVE_TARGET ?? 'production';
const IS_PROD = TARGET === 'production';
const SKIP_BUILD = process.env.GO_LIVE_SKIP_BUILD === '1';

// --- tiny fs/util helpers ----------------------------------------------------
/** @param {string} rel */
const abs = (rel) => join(ROOT, rel);
/** @param {string} rel */
const exists = (rel) => existsSync(abs(rel));
/** @param {string} rel @returns {string|null} */
const read = (rel) => {
  try {
    return readFileSync(abs(rel), 'utf8');
  } catch {
    return null;
  }
};
/** @param {string} rel @param {RegExp} re */
const fileMatches = (rel, re) => {
  const c = read(rel);
  return c != null && re.test(c);
};

const IGNORE_DIRS = new Set([
  'node_modules', '.next', '.git', 'dist', 'build', 'coverage',
  'playwright-report', 'test-results',
]);

/**
 * Recursively list files under `dirs` with the given extensions.
 * @param {string[]} dirs @param {string[]} exts @returns {string[]}
 */
function listFiles(dirs, exts) {
  /** @type {string[]} */
  const out = [];
  /** @param {string} dir */
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(abs(dir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith('.env')) continue; // never scan secret files
      const rel = join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.has(e.name)) walk(rel);
      } else if (exts.some((x) => e.name.endsWith(x))) {
        out.push(rel);
      }
    }
  };
  for (const d of dirs) if (exists(d) && statSync(abs(d)).isDirectory()) walk(d);
  return out;
}

// --- result model ------------------------------------------------------------
/** @typedef {{ name: string, status: 'pass'|'fail'|'warn', detail?: string }} Check */
/** @typedef {{ id: string, title: string, checks: Check[] }} Gate */

/** @param {string} name @param {boolean} ok @param {string} [detail] @returns {Check} */
const crit = (name, ok, detail) => ({ name, status: ok ? 'pass' : 'fail', detail });
/** @param {string} name @param {boolean} ok @param {string} [detail] @returns {Check} */
const warnIf = (name, ok, detail) => ({ name, status: ok ? 'pass' : 'warn', detail });

// --- env loading (best-effort; does NOT print values) ------------------------
function loadEnvLocal() {
  const raw = read('.env.local');
  if (!raw) return;
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

/** @param {string} k */
const hasEnv = (k) => typeof process.env[k] === 'string' && process.env[k].trim() !== '';

// --- Gate 0: Code Integrity --------------------------------------------------
/** @param {string} label @param {string} cmd @returns {Check} */
function runStep(label, cmd) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
    return crit(label, true);
  } catch (err) {
    const out = `${err?.stdout ?? ''}${err?.stderr ?? ''}`.trim();
    const tail = out.split('\n').slice(-6).join('\n');
    return crit(label, false, tail || `command failed: ${cmd}`);
  }
}

function gateCodeIntegrity() {
  /** @type {Check[]} */
  const checks = [
    runStep('typecheck (tsc --noEmit)', 'npm run typecheck'),
    runStep('lint', 'npm run lint'),
    runStep('unit tests', 'npm run test'),
  ];
  if (SKIP_BUILD) {
    checks.push(warnIf('build', false, 'skipped via GO_LIVE_SKIP_BUILD (ensure CI built separately)'));
  } else {
    checks.push(runStep('production build', 'npm run build'));
  }
  return { id: 'GATE 0', title: 'Code Integrity', checks };
}

// --- Gate 1: Database Schema (static — applied-state needs live DB) ----------
function gateDatabase() {
  const migDir = 'supabase/migrations';
  const required = ['0011', '0012', '0013', '0014', '0015'];
  const files = exists(migDir) ? readdirSync(abs(migDir)) : [];
  /** @type {Check[]} */
  const checks = required.map((n) =>
    crit(`migration ${n}_* present`, files.some((f) => f.startsWith(n) && f.endsWith('.sql'))),
  );

  // RLS enabled + store-scoped policies on tenant tables.
  checks.push(
    crit(
      'RLS enabled on tenancy tables (0011/0014)',
      fileMatches(`${migDir}/0011_multitenant_core.sql`, /enable row level security/i) &&
        fileMatches(`${migDir}/0014_membership.sql`, /enable row level security/i),
    ),
  );
  checks.push(
    crit(
      'store-scoped RLS policies (is_store_member / store_id)',
      fileMatches(`${migDir}/0012_multitenant_scoping.sql`, /is_store_member\(\s*store_id/i),
    ),
  );
  // Required indexes.
  checks.push(
    crit(
      'per-store indexes on commerce tables',
      fileMatches(`${migDir}/0012_multitenant_scoping.sql`, /_store_idx|store_id\)/i),
    ),
  );
  checks.push(
    crit(
      'order idempotency unique index (0015)',
      fileMatches(`${migDir}/0015_idempotency.sql`, /unique index[\s\S]*stripe_checkout_session_id/i),
    ),
  );
  // Applied-state / drift cannot be verified offline.
  checks.push(
    warnIf(
      'migrations applied + no drift',
      false,
      'NOT verifiable offline — run `supabase migration list` / `supabase db diff` against the target DB in CI with DB access.',
    ),
  );
  return { id: 'GATE 1', title: 'Database Schema', checks };
}

// --- Gate 2: Environment Configuration ---------------------------------------
function gateEnv() {
  /** @type {Check[]} */
  const checks = [];
  const core = [
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const stripe = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'];

  // Core + Stripe are critical for a production go-live; downgraded to warnings
  // for non-production targets (CI/PR runners don't hold prod secrets).
  for (const k of [...core, ...stripe]) {
    const present = hasEnv(k);
    checks.push(IS_PROD ? crit(`${k} present`, present) : warnIf(`${k} present`, present));
  }

  // Test vs live separation (no secret values printed — only the mode marker).
  const sk = process.env.STRIPE_SECRET_KEY ?? '';
  if (sk) {
    const mode = sk.startsWith('sk_live_') ? 'live' : sk.startsWith('sk_test_') ? 'test' : 'unknown';
    if (IS_PROD && mode !== 'live') {
      checks.push(crit('Stripe key is LIVE for production', false, `detected "${mode}" key — production must use sk_live_*`));
    } else {
      checks.push(warnIf(`Stripe mode = ${mode}`, mode === 'live' || !IS_PROD, mode === 'unknown' ? 'unrecognised key prefix' : undefined));
    }
  }
  // Site URL should not be localhost in production.
  if (IS_PROD && /localhost|127\.0\.0\.1/.test(process.env.NEXT_PUBLIC_SITE_URL ?? '')) {
    checks.push(crit('NEXT_PUBLIC_SITE_URL is a real host', false, 'is localhost — set the production domain'));
  }
  checks.push(warnIf('CRON_SECRET present (abandoned-cart cron)', hasEnv('CRON_SECRET')));
  return { id: 'GATE 2', title: `Environment Configuration (target=${TARGET})`, checks };
}

// --- Gate 3: Authentication & RBAC sanity (static) ---------------------------
function gateRbac() {
  const perm = 'src/lib/rbac/permissions.ts';
  const actor = 'src/lib/rbac/actor.ts';
  const roles = ['super_admin', 'admin', 'manager', 'marketing', 'warehouse', 'support', 'customer'];
  const permSrc = read(perm) ?? '';
  /** @type {Check[]} */
  const checks = [
    crit('RBAC matrix module exists', exists(perm)),
    crit('all 7 roles defined in ROLE_KEYS', roles.every((r) => new RegExp(`'${r}'`).test(permSrc))),
    crit('ROLE_PERMISSIONS matrix present', /ROLE_PERMISSIONS\s*:/.test(permSrc)),
    crit('resolveRoleKey() present', /export function resolveRoleKey/.test(permSrc)),
    // The legacy-admin-leak fix: the global-role fallback must be gated by store scope.
    crit(
      'no global-admin leak into tenant scope (isDefaultStore guard)',
      /isDefaultStore/.test(permSrc) &&
        /if\s*\(\s*args\.isDefaultStore\s*\)/.test(permSrc) &&
        fileMatches(actor, /isDefaultStore/),
    ),
  ];
  return { id: 'GATE 3', title: 'Authentication & RBAC Sanity', checks };
}

// --- Gate 4: Multi-tenant safety (static + service-layer enforcement) --------
function gateTenancy() {
  const ctx = 'src/lib/tenant/context.ts';
  const adminQ = 'src/features/admin/queries.ts';
  const metrics = 'src/features/admin/metrics.ts';
  /** @type {Check[]} */
  const checks = [
    crit('tenant resolver exists (getStorefrontStore/getCurrentStore)',
      fileMatches(ctx, /getStorefrontStore/) && fileMatches(ctx, /getCurrentStore/)),
    crit('admin queries are store-scoped (getCurrentStoreId + store_id filter)',
      fileMatches(adminQ, /getCurrentStoreId/) && fileMatches(adminQ, /store_id/)),
    crit('admin dashboard metrics are store-scoped',
      fileMatches(metrics, /getCurrentStoreId/) && fileMatches(metrics, /store_id/)),
  ];
  // Heuristic: flag admin list queries that select commerce tables with no
  // store scoping at all (possible cross-tenant leak). Warning, not blocking.
  const q = read(adminQ) ?? '';
  const scopedEnough = (q.match(/store_id/g) ?? []).length >= 3;
  checks.push(warnIf('admin repository has broad store_id scoping coverage', scopedEnough,
    scopedEnough ? undefined : 'few store_id references — re-audit for unscoped queries'));
  return { id: 'GATE 4', title: 'Multi-Tenant Safety', checks };
}

// --- Gate 5: Payment system readiness (static) -------------------------------
function gatePayments() {
  const route = 'src/app/api/webhooks/stripe/route.ts';
  const src = read(route) ?? '';
  /** @type {Check[]} */
  const checks = [
    crit('Stripe webhook route exists', exists(route)),
    crit('webhook signature verification (constructEvent)', /constructEvent/.test(src)),
    crit('handles checkout.session.completed', /checkout\.session\.completed/.test(src)),
    warnIf('handles account.updated (Connect)', /account\.updated/.test(src)),
    warnIf('handles charge.refunded', /charge\.refunded/.test(src)),
    crit('idempotency index in schema (0015)',
      fileMatches('supabase/migrations/0015_idempotency.sql', /unique index[\s\S]*stripe_checkout_session_id/i)),
    crit('Stripe Connect onboarding action exists',
      exists('src/features/stores/connect.ts')),
  ];
  return { id: 'GATE 5', title: 'Payment System Readiness', checks };
}

// --- Gate 6: E2E test presence (structure only — no browser execution) -------
function gateE2e() {
  const specs = {
    RBAC: 'tests/e2e/rbac.spec.ts',
    'tenant isolation': 'tests/e2e/store-isolation.spec.ts',
    'invite flow': 'tests/e2e/invite-flow.spec.ts',
    'checkout flow': 'tests/e2e/purchase-path.spec.ts',
  };
  /** @type {Check[]} */
  const checks = [crit('playwright config exists', exists('playwright.config.ts'))];
  for (const [label, path] of Object.entries(specs)) {
    checks.push(crit(`E2E spec present: ${label}`, exists(path)));
  }
  return { id: 'GATE 6', title: 'E2E Test Presence', checks };
}

// --- Gate 7: Security baseline (static) --------------------------------------
function gateSecurity() {
  /** @type {Check[]} */
  const checks = [];

  // Rate limiting: warning (not blocking) per spec — exists OR flagged TODO.
  const codeFiles = listFiles(['src'], ['.ts', '.tsx', '.mjs', '.js']);
  const hasRateLimit = codeFiles.some((f) =>
    /rate.?limit|ratelimit|upstash|@vercel\/kv|throttle/i.test(read(f) ?? ''),
  );
  checks.push(
    warnIf('rate limiting middleware present', hasRateLimit,
      hasRateLimit ? undefined : 'NONE found — REQUIRED before production (TODO). Add edge rate limiting (e.g. Upstash/Vercel KV).'),
  );

  // Exposed secrets in committed code (.env files are excluded from the scan).
  const secretRe = /\b(sk_live_[A-Za-z0-9]{8,}|sk_test_[A-Za-z0-9]{8,}|rk_live_[A-Za-z0-9]{8,}|whsec_[A-Za-z0-9]{8,}|AKIA[0-9A-Z]{16})\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/;
  const scanned = listFiles(['src', 'scripts', 'supabase'], ['.ts', '.tsx', '.mjs', '.js', '.sql', '.json']);
  const leaks = scanned.filter((f) => secretRe.test(read(f) ?? ''));
  checks.push(crit('no hardcoded secrets in committed code', leaks.length === 0,
    leaks.length ? `potential secret(s) in: ${leaks.slice(0, 5).join(', ')}` : undefined));

  // .env.local must be gitignored.
  checks.push(crit('.env.local is gitignored', /(^|\n)\s*\.env(\*?\.local|\b)/.test(read('.gitignore') ?? '')));

  // Service-role client must never be imported by a client component.
  const clientFiles = listFiles(['src'], ['.tsx', '.ts']).filter((f) => {
    const c = read(f) ?? '';
    return /^\s*['"]use client['"]/m.test(c);
  });
  const unsafe = clientFiles.filter((f) => {
    const c = read(f) ?? '';
    return /createAdminClient|SUPABASE_SERVICE_ROLE_KEY/.test(c);
  });
  checks.push(crit('no service-role client usage in client components', unsafe.length === 0,
    unsafe.length ? `found in: ${unsafe.slice(0, 5).join(', ')}` : undefined));

  return { id: 'GATE 7', title: 'Security Baseline', checks };
}

// --- runner ------------------------------------------------------------------
const ICON = { pass: '✔', fail: '❌', warn: '⚠' };

async function main() {
  loadEnvLocal();

  /** @type {Gate[]} */
  const gates = [
    gateCodeIntegrity(),
    gateDatabase(),
    gateEnv(),
    gateRbac(),
    gateTenancy(),
    gatePayments(),
    gateE2e(),
    gateSecurity(),
  ];

  console.log('\n=========================================================');
  console.log(` GO-LIVE PREFLIGHT  ·  target=${TARGET}  ·  ${new Date().toISOString()}`);
  console.log('=========================================================');

  /** @type {string[]} */
  const blocking = [];
  /** @type {string[]} */
  const warnings = [];
  let gatesPassed = 0;

  for (const gate of gates) {
    const failed = gate.checks.filter((c) => c.status === 'fail');
    const gateOk = failed.length === 0;
    if (gateOk) gatesPassed += 1;
    console.log(`\n${gateOk ? '✔' : '❌'} ${gate.id} — ${gate.title}  [${gateOk ? 'PASS' : 'FAIL'}]`);
    for (const c of gate.checks) {
      console.log(`    ${ICON[c.status]} ${c.name}${c.detail ? `  — ${c.detail}` : ''}`);
      if (c.status === 'fail') blocking.push(`${gate.id}: ${c.name}${c.detail ? ` (${c.detail.split('\n')[0]})` : ''}`);
      if (c.status === 'warn') warnings.push(`${gate.id}: ${c.name}`);
    }
  }

  const allow = blocking.length === 0;
  console.log('\n---------------------------------------------------------');
  console.log(' SUMMARY');
  console.log('---------------------------------------------------------');
  console.log(` Gates passed:      ${gatesPassed} / ${gates.length}`);
  console.log(` Warnings:          ${warnings.length}`);
  console.log(` Blocking issues:   ${blocking.length}`);
  for (const b of blocking) console.log(`    ❌ ${b}`);
  if (warnings.length) {
    console.log(' Non-blocking warnings:');
    for (const w of warnings) console.log(`    ⚠ ${w}`);
  }
  console.log('');
  console.log(` DEPLOYMENT ALLOWED: ${allow ? 'YES ✅' : 'NO ⛔'}`);
  console.log('=========================================================\n');

  process.exit(allow ? 0 : 1);
}

main().catch((err) => {
  console.error('go-live-check crashed:', err);
  process.exit(1);
});
