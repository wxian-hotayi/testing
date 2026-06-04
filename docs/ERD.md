# Vitalis — Entity Relationship Diagram

Generated from the migrations in `supabase/migrations/`. Monetary columns are
integers in **sen** (RM 1 = 100 sen). Render this on GitHub or any Mermaid
viewer.

```mermaid
erDiagram
    profiles ||--o{ addresses : has
    profiles ||--o{ orders : places
    profiles ||--o{ subscriptions : owns
    profiles ||--o{ reviews : writes
    profiles ||--o{ wishlist_items : saves
    profiles ||--|| loyalty_accounts : has
    profiles ||--o{ loyalty_transactions : earns
    profiles ||--o{ referrals : refers
    profiles ||--o{ carts : owns
    profiles }o--o| profiles : referred_by

    categories ||--o{ products : groups
    categories }o--o| categories : parent

    products ||--o{ product_images : has
    products ||--o{ bundles : "priced as"
    products ||--o{ reviews : receives
    products ||--o{ product_relationships : "cross-sells"
    products ||--o{ inventory_adjustments : "stock log"
    products ||--o{ cart_items : "added as"
    products ||--o{ order_items : "sold as"
    products ||--o{ subscription_items : "recurs as"

    carts ||--o{ cart_items : contains
    carts ||--o{ orders : "converts to"
    coupons ||--o{ coupon_redemptions : "redeemed in"
    coupons ||--o{ carts : "applied to"
    coupons ||--o{ orders : "discounts"

    orders ||--o{ order_items : contains
    orders }o--o| subscriptions : "billed from"

    subscriptions ||--o{ subscription_items : contains
    subscriptions }o--o| addresses : "ships to"

    referrals }o--o| orders : "qualified by"

    email_flows ||--o{ email_templates : "uses (by flow)"
    email_logs }o--o| carts : "about"
    email_logs }o--o| orders : "about"
    email_logs }o--o| subscriptions : "about"

    profiles {
        uuid id PK "= auth.users.id"
        citext email
        user_role role "customer|staff|admin"
        text referral_code UK
        uuid referred_by FK
        text stripe_customer_id
    }
    products {
        uuid id PK
        citext slug UK
        int price_sen
        int compare_at_price_sen
        int stock_quantity
        numeric rating_avg
        bool is_best_seller
    }
    bundles {
        uuid id PK
        uuid product_id FK
        int quantity
        int price_sen "total for quantity"
    }
    product_relationships {
        uuid product_id FK
        uuid related_product_id FK
        relationship_type type
    }
    carts {
        uuid id PK
        uuid user_id FK
        text session_token
        cart_status status
        timestamptz abandoned_at
        int recovery_emails_sent
    }
    orders {
        uuid id PK
        text order_number UK
        order_status status
        payment_status payment_status
        int subtotal_sen
        int discount_sen
        int shipping_sen
        int total_sen
        text stripe_checkout_session_id
    }
    subscriptions {
        uuid id PK
        subscription_status status
        subscription_interval interval
        date next_billing_date
        bool skip_next
        text stripe_subscription_id
    }
    loyalty_accounts {
        uuid user_id PK
        int balance
        int lifetime_earned
    }
    coupons {
        uuid id PK
        citext code UK
        discount_type discount_type
        int discount_value
        int min_order_sen
    }
```

## Table groups

| Domain | Tables |
|---|---|
| **Identity** | `profiles`, `addresses` |
| **Catalog** | `categories`, `products`, `product_images`, `bundles`, `product_relationships`, `inventory_adjustments` |
| **Social proof** | `reviews`, `wishlist_items`, `newsletter_subscribers` |
| **Cart & Orders** | `carts`, `cart_items`, `orders`, `order_items` |
| **Subscriptions** | `subscriptions`, `subscription_items` |
| **Loyalty & Referrals** | `loyalty_accounts`, `loyalty_transactions`, `referrals` |
| **Promotions** | `coupons`, `coupon_redemptions` |
| **Marketing** | `email_templates`, `email_flows`, `email_logs`, `settings` |

## Key design decisions

- **Money as integer sen** everywhere — no floats, matching Stripe's amount model.
- **RLS default-deny.** Every table has explicit policies (`0009_rls.sql`).
  Order creation and webhooks run via the service-role key, which bypasses RLS.
- **Snapshots over joins for history.** `order_items` copies product name/SKU/price
  and orders copy address JSON, so historical orders are immutable.
- **Denormalized aggregates** (`products.rating_avg/_count`, `loyalty_accounts.balance`)
  are maintained by triggers for fast reads.
- **Coupon enumeration prevented** — `coupons` is staff-only; customers validate
  codes through the `validate_coupon()` SECURITY DEFINER RPC.
