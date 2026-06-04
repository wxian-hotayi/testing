# Admin Manual

Access `/admin` (requires role `admin` or `staff`). Set your role via Supabase:
`update public.profiles set role='admin' where email='you@example.com';`

## Dashboard
KPIs: Revenue, Orders, AOV, Customer LTV, Conversion rate (cart→order),
Subscription MRR, Return-customer rate, Active subscriptions. Plus a 14-day
revenue chart, top products, traffic sources, and low-stock alerts.

## Orders
- **List**: status, payment status, total. Click **View** for detail.
- **Detail**: line items, totals, shipping address. Update **status**, add a
  **tracking number** (the customer sees it under their account), or **Refund**
  (issues a Stripe refund and marks the order refunded).

## Products
- **New / Edit**: name, slug, SKU, category, price + compare-at (RM), stock,
  low-stock threshold, descriptions, ingredients, usage, benefits (one per
  line), and flags (active/featured/best-seller/subscribable).
- Bundle tiers (RM99/179/249 ladder) live in the `bundles` table; seed creates
  them per product. Pricing is always stored/charged in sen.

## Categories & Coupons
- **Categories**: name, slug, description, position, active toggle.
- **Coupons**: code, type (percentage / fixed amount RM / free shipping), value,
  min order, per-customer use limit, active toggle. Enable/disable inline.

## Reviews
Approve or reject submitted reviews. Only **approved** reviews appear on the
storefront and count toward a product's rating (kept in sync by a DB trigger).

## Users
View all customers. **Admins only** can change roles (customer / staff / admin).

## Marketing automation
Email flows + templates live in `email_flows` / `email_templates` (admin-
editable via SQL or a future UI). The abandoned-cart flow's steps (timing +
discount) drive the hourly recovery cron.

## Compliance reminder
Never use disease, cure, treat, or guarantee claims in product copy. Use
structure/function language ("supports", "helps maintain").
