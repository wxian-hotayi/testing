# Stripe Test Environment Setup — Phase 4 (MT-11)

Exact setup to make Stripe payment + webhook validation possible (test mode).
**Current blocker:** `.env.local` has a placeholder key (`sk_test_xxx`) → Gates
7/8 FAIL. Follow this to unblock.

## 1. Test keys (Dashboard → Developers → API keys, **Test mode** toggle ON)
```bash
# in .env.staging (gitignored):
STRIPE_SECRET_KEY=sk_test_...            # secret test key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 2. Connect (Dashboard → Connect → Get started, test mode)
- Enable **Connect**; platform profile completed.
- Enable **Express** accounts (the app creates Express connected accounts in
  `src/features/stores/connect.ts`).
- The app uses **destination charges** (`transfer_data.destination` +
  `application_fee`), so no per-account API keys are needed.

## 3. Webhook endpoint
- **Local/staging via CLI:**
  ```bash
  stripe login
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  # copy the printed whsec_... into STRIPE_WEBHOOK_SECRET
  ```
- **Deployed staging:** Dashboard → Developers → Webhooks → add
  `https://staging.<domain>/api/webhooks/stripe`; subscribe to:
  `checkout.session.completed`, `account.updated`, `charge.refunded`,
  `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`.
  Put its signing secret in `STRIPE_WEBHOOK_SECRET`.

## 4. Validate
```bash
npm run infra-validate                 # Gate 7: key valid, account reachable, Connect, webhook endpoint
npm run infra-validate -- --payments   # Gate 8: real test-mode PaymentIntent charge + refund
```
Then the **app-integrated loop** (needs app running + `stripe listen`):
1. Add to cart → checkout → pay with test card `4242 4242 4242 4242`.
2. `checkout.session.completed` delivered → order created (`orders` row).
3. Confirm **one** order (idempotency: the `0015` unique index blocks a dup on
   webhook retry — re-send the event with `stripe events resend <id>` and verify
   no second order).
4. `application_fee` recorded on the charge (Connect destination charge).
5. Refund from Dashboard → `charge.refunded` → order status syncs to refunded.

## Pass criteria
Gate 7 PASS + Gate 8 PASS + the 5 app-integrated steps verified (incl. the
duplicate-webhook → single-order test) → Payments + Webhooks **VALIDATED**.
Record results in reports/stripe-validation.md. Until a real `sk_test_` key is
configured: **NOT VALIDATED**.
