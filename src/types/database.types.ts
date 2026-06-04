/**
 * Database types for the Vitalis schema.
 *
 * This file is hand-authored to mirror what `supabase gen types typescript`
 * produces, so the Supabase clients are fully type-safe today. Once you have a
 * live/local Supabase project, regenerate it with `npm run db:types` to keep it
 * in perfect sync with the migrations.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// --- Enums (mirror 0001/0002/0008 migrations) -------------------------------
export type UserRole = 'customer' | 'staff' | 'admin';
export type OrderStatus =
  | 'pending' | 'paid' | 'processing' | 'shipped'
  | 'delivered' | 'cancelled' | 'refunded' | 'partially_refunded';
export type PaymentStatus =
  | 'unpaid' | 'paid' | 'refunded' | 'partially_refunded' | 'failed';
export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'past_due';
export type SubscriptionInterval = 'monthly' | 'quarterly';
export type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type LoyaltyTxnType = 'earn' | 'redeem' | 'expire' | 'adjust' | 'referral';
export type ReferralStatus = 'pending' | 'qualified' | 'rewarded' | 'expired';
export type CartStatus = 'active' | 'converted' | 'abandoned' | 'recovered';
export type AddressType = 'shipping' | 'billing';
export type RelationshipType =
  | 'cross_sell' | 'upsell' | 'frequently_bought_together' | 'related';
export type EmailFlowKey =
  | 'welcome_series' | 'abandoned_cart' | 'post_purchase'
  | 'subscription_reminder' | 'win_back' | 'referral' | 'newsletter';

/** Flatten an intersection into a single object literal so the postgrest-js
 * select parser sees a clean Row type (intersections can resolve to `never`). */
type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * Helper: build a table definition with Row + Insert + Update.
 * - `Row` is the full selected shape.
 * - `Insert` omits DB-generated columns (id, created_at, …) and makes
 *   defaulted columns optional via the `Defaults` union.
 * - `Update` is a partial of Insert.
 */
type TableDef<Row, Generated extends keyof Row, Defaults extends keyof Row> = {
  Row: Prettify<Row>;
  Insert: Prettify<Omit<Row, Generated | Defaults> & Partial<Pick<Row, Defaults>>>;
  Update: Prettify<Partial<Omit<Row, Generated>>>;
  Relationships: [];
};

type Timestamps = { created_at: string; updated_at: string };

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<
        {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          role: UserRole;
          marketing_opt_in: boolean;
          referral_code: string | null;
          referred_by: string | null;
          stripe_customer_id: string | null;
        } & Timestamps,
        'created_at' | 'updated_at',
        'role' | 'marketing_opt_in' | 'referral_code' | 'full_name'
          | 'avatar_url' | 'phone' | 'referred_by' | 'stripe_customer_id'
      >;
      addresses: TableDef<
        {
          id: string;
          user_id: string;
          type: AddressType;
          is_default: boolean;
          recipient_name: string;
          phone: string | null;
          line1: string;
          line2: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
        } & Timestamps,
        'id' | 'created_at' | 'updated_at',
        'type' | 'is_default' | 'country' | 'phone' | 'line2'
      >;
      categories: TableDef<
        {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          image_url: string | null;
          parent_id: string | null;
          position: number;
          is_active: boolean;
          meta_title: string | null;
          meta_description: string | null;
        } & Timestamps,
        'id' | 'created_at' | 'updated_at',
        'description' | 'image_url' | 'parent_id' | 'position' | 'is_active'
          | 'meta_title' | 'meta_description'
      >;
      products: TableDef<
        {
          id: string;
          slug: string;
          sku: string | null;
          name: string;
          subtitle: string | null;
          description: string | null;
          category_id: string | null;
          price_sen: number;
          compare_at_price_sen: number | null;
          cost_sen: number | null;
          ingredients: string | null;
          benefits: Json;
          usage_instructions: string | null;
          supplement_facts: Json | null;
          is_active: boolean;
          is_featured: boolean;
          is_best_seller: boolean;
          is_subscribable: boolean;
          rating_avg: number;
          rating_count: number;
          stock_quantity: number;
          low_stock_threshold: number;
          track_inventory: boolean;
          stripe_product_id: string | null;
          stripe_price_id: string | null;
          meta_title: string | null;
          meta_description: string | null;
        } & Timestamps,
        'id' | 'created_at' | 'updated_at',
        'sku' | 'subtitle' | 'description' | 'category_id' | 'compare_at_price_sen'
          | 'cost_sen' | 'ingredients' | 'benefits' | 'usage_instructions'
          | 'supplement_facts' | 'is_active' | 'is_featured' | 'is_best_seller'
          | 'is_subscribable' | 'rating_avg' | 'rating_count' | 'stock_quantity'
          | 'low_stock_threshold' | 'track_inventory' | 'stripe_product_id'
          | 'stripe_price_id' | 'meta_title' | 'meta_description'
      >;
      product_images: TableDef<
        {
          id: string;
          product_id: string;
          url: string;
          alt: string | null;
          position: number;
          is_primary: boolean;
          created_at: string;
        },
        'id' | 'created_at',
        'alt' | 'position' | 'is_primary'
      >;
      bundles: TableDef<
        {
          id: string;
          product_id: string;
          quantity: number;
          price_sen: number;
          label: string | null;
          is_active: boolean;
          position: number;
        } & Timestamps,
        'id' | 'created_at' | 'updated_at',
        'label' | 'is_active' | 'position'
      >;
      product_relationships: TableDef<
        {
          id: string;
          product_id: string;
          related_product_id: string;
          type: RelationshipType;
          position: number;
          created_at: string;
        },
        'id' | 'created_at',
        'type' | 'position'
      >;
      inventory_adjustments: TableDef<
        {
          id: string;
          product_id: string;
          delta: number;
          reason: string;
          created_by: string | null;
          created_at: string;
        },
        'id' | 'created_at',
        'created_by'
      >;
      reviews: TableDef<
        {
          id: string;
          product_id: string;
          user_id: string | null;
          author_name: string;
          rating: number;
          title: string | null;
          body: string | null;
          is_verified_purchase: boolean;
          status: ReviewStatus;
          helpful_count: number;
        } & Timestamps,
        'id' | 'created_at' | 'updated_at',
        'user_id' | 'title' | 'body' | 'is_verified_purchase' | 'status'
          | 'helpful_count'
      >;
      wishlist_items: TableDef<
        {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        },
        'id' | 'created_at',
        never
      >;
      newsletter_subscribers: TableDef<
        {
          id: string;
          email: string;
          user_id: string | null;
          source: string | null;
          is_confirmed: boolean;
          unsubscribed_at: string | null;
          created_at: string;
        },
        'id' | 'created_at',
        'user_id' | 'source' | 'is_confirmed' | 'unsubscribed_at'
      >;
      carts: TableDef<
        {
          id: string;
          user_id: string | null;
          session_token: string | null;
          email: string | null;
          status: CartStatus;
          abandoned_at: string | null;
          recovered_at: string | null;
          recovery_emails_sent: number;
          last_recovery_email_at: string | null;
          applied_coupon_id: string | null;
        } & Timestamps,
        'id' | 'created_at' | 'updated_at',
        'user_id' | 'session_token' | 'email' | 'status' | 'abandoned_at'
          | 'recovered_at' | 'recovery_emails_sent' | 'last_recovery_email_at'
          | 'applied_coupon_id'
      >;
      cart_items: TableDef<
        {
          id: string;
          cart_id: string;
          product_id: string;
          bundle_id: string | null;
          quantity: number;
          unit_price_sen: number;
          is_subscription: boolean;
          subscription_interval: SubscriptionInterval | null;
        } & Timestamps,
        'id' | 'created_at' | 'updated_at',
        'bundle_id' | 'is_subscription' | 'subscription_interval'
      >;
      orders: TableDef<
        {
          id: string;
          order_number: string;
          user_id: string | null;
          email: string;
          status: OrderStatus;
          payment_status: PaymentStatus;
          fulfillment_status: FulfillmentStatus;
          subtotal_sen: number;
          discount_sen: number;
          shipping_sen: number;
          tax_sen: number;
          total_sen: number;
          loyalty_points_redeemed: number;
          loyalty_points_earned: number;
          currency: string;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          coupon_id: string | null;
          subscription_id: string | null;
          cart_id: string | null;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          shipping_address: Json | null;
          billing_address: Json | null;
          tracking_number: string | null;
          tracking_url: string | null;
          notes: string | null;
          placed_at: string | null;
        } & Timestamps,
        'id' | 'order_number' | 'created_at' | 'updated_at',
        'user_id' | 'status' | 'payment_status' | 'fulfillment_status'
          | 'subtotal_sen' | 'discount_sen' | 'shipping_sen' | 'tax_sen'
          | 'total_sen' | 'loyalty_points_redeemed' | 'loyalty_points_earned'
          | 'currency' | 'utm_source' | 'utm_medium' | 'utm_campaign'
          | 'coupon_id' | 'subscription_id' | 'cart_id'
          | 'stripe_checkout_session_id' | 'stripe_payment_intent_id'
          | 'shipping_address' | 'billing_address' | 'tracking_number'
          | 'tracking_url' | 'notes' | 'placed_at'
      >;
      order_items: TableDef<
        {
          id: string;
          order_id: string;
          product_id: string | null;
          bundle_id: string | null;
          product_name: string;
          product_sku: string | null;
          quantity: number;
          unit_price_sen: number;
          total_sen: number;
          is_subscription: boolean;
          created_at: string;
        },
        'id' | 'created_at',
        'product_id' | 'bundle_id' | 'product_sku' | 'is_subscription'
      >;
      subscriptions: TableDef<
        {
          id: string;
          user_id: string;
          status: SubscriptionStatus;
          interval: SubscriptionInterval;
          discount_percent: number;
          next_billing_date: string | null;
          paused_until: string | null;
          skip_next: boolean;
          cancelled_at: string | null;
          cancel_reason: string | null;
          shipping_address_id: string | null;
          stripe_subscription_id: string | null;
          stripe_customer_id: string | null;
          stripe_price_id: string | null;
          recurring_total_sen: number;
        } & Timestamps,
        'id' | 'created_at' | 'updated_at',
        'status' | 'interval' | 'discount_percent' | 'next_billing_date'
          | 'paused_until' | 'skip_next' | 'cancelled_at' | 'cancel_reason'
          | 'shipping_address_id' | 'stripe_subscription_id'
          | 'stripe_customer_id' | 'stripe_price_id' | 'recurring_total_sen'
      >;
      subscription_items: TableDef<
        {
          id: string;
          subscription_id: string;
          product_id: string;
          quantity: number;
          unit_price_sen: number;
        } & Timestamps,
        'id' | 'created_at' | 'updated_at',
        never
      >;
      loyalty_accounts: TableDef<
        {
          user_id: string;
          balance: number;
          lifetime_earned: number;
        } & Timestamps,
        'created_at' | 'updated_at',
        'balance' | 'lifetime_earned'
      >;
      loyalty_transactions: TableDef<
        {
          id: string;
          user_id: string;
          type: LoyaltyTxnType;
          points: number;
          description: string | null;
          order_id: string | null;
          created_at: string;
        },
        'id' | 'created_at',
        'description' | 'order_id'
      >;
      referrals: TableDef<
        {
          id: string;
          referrer_id: string;
          referee_id: string | null;
          referee_email: string | null;
          code: string;
          status: ReferralStatus;
          reward_points: number;
          qualifying_order_id: string | null;
          rewarded_at: string | null;
        } & Timestamps,
        'id' | 'created_at' | 'updated_at',
        'referee_id' | 'referee_email' | 'status' | 'reward_points'
          | 'qualifying_order_id' | 'rewarded_at'
      >;
      coupons: TableDef<
        {
          id: string;
          code: string;
          description: string | null;
          discount_type: DiscountType;
          discount_value: number;
          min_order_sen: number;
          max_discount_sen: number | null;
          usage_limit: number | null;
          usage_limit_per_user: number | null;
          times_used: number;
          starts_at: string | null;
          expires_at: string | null;
          is_active: boolean;
          is_automatic: boolean;
        } & Timestamps,
        'id' | 'created_at' | 'updated_at',
        'description' | 'discount_value' | 'min_order_sen' | 'max_discount_sen'
          | 'usage_limit' | 'usage_limit_per_user' | 'times_used' | 'starts_at'
          | 'expires_at' | 'is_active' | 'is_automatic'
      >;
      coupon_redemptions: TableDef<
        {
          id: string;
          coupon_id: string;
          user_id: string | null;
          order_id: string | null;
          discount_sen: number;
          created_at: string;
        },
        'id' | 'created_at',
        'user_id' | 'order_id' | 'discount_sen'
      >;
      email_templates: TableDef<
        {
          id: string;
          key: string;
          flow: EmailFlowKey | null;
          name: string;
          subject: string;
          preheader: string | null;
          body_html: string;
          body_text: string | null;
          is_active: boolean;
        } & Timestamps,
        'id' | 'created_at' | 'updated_at',
        'flow' | 'preheader' | 'body_text' | 'is_active'
      >;
      email_flows: TableDef<
        {
          id: string;
          key: EmailFlowKey;
          name: string;
          is_enabled: boolean;
          steps: Json;
        } & Timestamps,
        'id' | 'created_at' | 'updated_at',
        'is_enabled' | 'steps'
      >;
      email_logs: TableDef<
        {
          id: string;
          to_email: string;
          user_id: string | null;
          template_key: string | null;
          flow: EmailFlowKey | null;
          subject: string | null;
          related_cart_id: string | null;
          related_order_id: string | null;
          related_subscription_id: string | null;
          provider_message_id: string | null;
          status: string;
          error: string | null;
          created_at: string;
        },
        'id' | 'created_at',
        'user_id' | 'template_key' | 'flow' | 'subject' | 'related_cart_id'
          | 'related_order_id' | 'related_subscription_id'
          | 'provider_message_id' | 'status' | 'error'
      >;
      settings: TableDef<
        {
          key: string;
          value: Json;
          description: string | null;
          updated_at: string;
        },
        'updated_at',
        'description'
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      validate_coupon: {
        Args: { p_code: string; p_subtotal_sen: number };
        Returns: Json;
      };
      next_billing_date: {
        Args: { p_from: string; p_interval: SubscriptionInterval };
        Returns: string;
      };
      decrement_stock: {
        Args: { p_product_id: string; p_qty: number };
        Returns: undefined;
      };
      current_user_role: { Args: Record<string, never>; Returns: UserRole };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      fulfillment_status: FulfillmentStatus;
      subscription_status: SubscriptionStatus;
      subscription_interval: SubscriptionInterval;
      discount_type: DiscountType;
      review_status: ReviewStatus;
      loyalty_txn_type: LoyaltyTxnType;
      referral_status: ReferralStatus;
      cart_status: CartStatus;
      address_type: AddressType;
      relationship_type: RelationshipType;
      email_flow_key: EmailFlowKey;
    };
    CompositeTypes: { [_ in never]: never };
  };
}

// --- Convenience row aliases -------------------------------------------------
type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row'];
export type InsertTables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];

export type Product = Tables<'products'>;
export type Category = Tables<'categories'>;
export type ProductImage = Tables<'product_images'>;
export type Bundle = Tables<'bundles'>;
export type Review = Tables<'reviews'>;
export type Cart = Tables<'carts'>;
export type CartItem = Tables<'cart_items'>;
export type Order = Tables<'orders'>;
export type OrderItem = Tables<'order_items'>;
export type Subscription = Tables<'subscriptions'>;
export type Profile = Tables<'profiles'>;
export type Coupon = Tables<'coupons'>;
