/**
 * Supabase database types.
 *
 * ⚠️ HAND-WRITTEN, reconstructed from `supabase/migrations/0001–0011`.
 * The generated file (`npm run db:types`, which runs
 * `supabase gen types typescript --local`) had been truncated to empty by a
 * failed run against a non-running local Postgres — the `>` redirect wipes the
 * file even when the command errors. Once a live Supabase schema exists,
 * regenerate with `npm run db:types` to replace this file.
 *
 * Shape mirrors modern `supabase gen types` output (supabase-js / postgrest-js
 * 2.107): the top-level `__InternalSupabase.PostgrestVersion` is REQUIRED so the
 * typed client infers `.select()` correctly — without it (or with a stale
 * ssr/js pair) every typed `.select()` silently collapses to `never`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '12.2.3 (519615d)';
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          role: Database['public']['Enums']['user_role'];
          marketing_opt_in: boolean;
          referral_code: string | null;
          referred_by: string | null;
          stripe_customer_id: string | null;
          is_platform_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: Database['public']['Enums']['user_role'];
          marketing_opt_in?: boolean;
          referral_code?: string | null;
          referred_by?: string | null;
          stripe_customer_id?: string | null;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: Database['public']['Enums']['user_role'];
          marketing_opt_in?: boolean;
          referral_code?: string | null;
          referred_by?: string | null;
          stripe_customer_id?: string | null;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          type: Database['public']['Enums']['address_type'];
          is_default: boolean;
          recipient_name: string;
          phone: string | null;
          line1: string;
          line2: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type?: Database['public']['Enums']['address_type'];
          is_default?: boolean;
          recipient_name: string;
          phone?: string | null;
          line1: string;
          line2?: string | null;
          city: string;
          state: string;
          postal_code: string;
          country?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: Database['public']['Enums']['address_type'];
          is_default?: boolean;
          recipient_name?: string;
          phone?: string | null;
          line1?: string;
          line2?: string | null;
          city?: string;
          state?: string;
          postal_code?: string;
          country?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          store_id: string;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          parent_id?: string | null;
          position?: number;
          is_active?: boolean;
          meta_title?: string | null;
          meta_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          parent_id?: string | null;
          position?: number;
          is_active?: boolean;
          meta_title?: string | null;
          meta_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          store_id: string;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          slug: string;
          sku?: string | null;
          name: string;
          subtitle?: string | null;
          description?: string | null;
          category_id?: string | null;
          price_sen: number;
          compare_at_price_sen?: number | null;
          cost_sen?: number | null;
          ingredients?: string | null;
          benefits?: Json;
          usage_instructions?: string | null;
          supplement_facts?: Json | null;
          is_active?: boolean;
          is_featured?: boolean;
          is_best_seller?: boolean;
          is_subscribable?: boolean;
          rating_avg?: number;
          rating_count?: number;
          stock_quantity?: number;
          low_stock_threshold?: number;
          track_inventory?: boolean;
          stripe_product_id?: string | null;
          stripe_price_id?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          slug?: string;
          sku?: string | null;
          name?: string;
          subtitle?: string | null;
          description?: string | null;
          category_id?: string | null;
          price_sen?: number;
          compare_at_price_sen?: number | null;
          cost_sen?: number | null;
          ingredients?: string | null;
          benefits?: Json;
          usage_instructions?: string | null;
          supplement_facts?: Json | null;
          is_active?: boolean;
          is_featured?: boolean;
          is_best_seller?: boolean;
          is_subscribable?: boolean;
          rating_avg?: number;
          rating_count?: number;
          stock_quantity?: number;
          low_stock_threshold?: number;
          track_inventory?: boolean;
          stripe_product_id?: string | null;
          stripe_price_id?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_images: {
        Row: {
          store_id: string;
          id: string;
          product_id: string;
          url: string;
          alt: string | null;
          position: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          product_id: string;
          url: string;
          alt?: string | null;
          position?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          product_id?: string;
          url?: string;
          alt?: string | null;
          position?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      bundles: {
        Row: {
          store_id: string;
          id: string;
          product_id: string;
          quantity: number;
          price_sen: number;
          label: string | null;
          is_active: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          product_id: string;
          quantity: number;
          price_sen: number;
          label?: string | null;
          is_active?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
          price_sen?: number;
          label?: string | null;
          is_active?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_relationships: {
        Row: {
          store_id: string;
          id: string;
          product_id: string;
          related_product_id: string;
          type: Database['public']['Enums']['relationship_type'];
          position: number;
          created_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          product_id: string;
          related_product_id: string;
          type?: Database['public']['Enums']['relationship_type'];
          position?: number;
          created_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          product_id?: string;
          related_product_id?: string;
          type?: Database['public']['Enums']['relationship_type'];
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      inventory_adjustments: {
        Row: {
          store_id: string;
          id: string;
          product_id: string;
          delta: number;
          reason: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          product_id: string;
          delta: number;
          reason: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          product_id?: string;
          delta?: number;
          reason?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          store_id: string;
          id: string;
          product_id: string;
          user_id: string | null;
          author_name: string;
          rating: number;
          title: string | null;
          body: string | null;
          is_verified_purchase: boolean;
          status: Database['public']['Enums']['review_status'];
          helpful_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          product_id: string;
          user_id?: string | null;
          author_name: string;
          rating: number;
          title?: string | null;
          body?: string | null;
          is_verified_purchase?: boolean;
          status?: Database['public']['Enums']['review_status'];
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          product_id?: string;
          user_id?: string | null;
          author_name?: string;
          rating?: number;
          title?: string | null;
          body?: string | null;
          is_verified_purchase?: boolean;
          status?: Database['public']['Enums']['review_status'];
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      wishlist_items: {
        Row: {
          store_id: string;
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: {
          store_id: string;
          id: string;
          email: string;
          user_id: string | null;
          source: string | null;
          is_confirmed: boolean;
          unsubscribed_at: string | null;
          created_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          email: string;
          user_id?: string | null;
          source?: string | null;
          is_confirmed?: boolean;
          unsubscribed_at?: string | null;
          created_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          email?: string;
          user_id?: string | null;
          source?: string | null;
          is_confirmed?: boolean;
          unsubscribed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      carts: {
        Row: {
          store_id: string;
          id: string;
          user_id: string | null;
          session_token: string | null;
          email: string | null;
          status: Database['public']['Enums']['cart_status'];
          abandoned_at: string | null;
          recovered_at: string | null;
          recovery_emails_sent: number;
          last_recovery_email_at: string | null;
          applied_coupon_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          user_id?: string | null;
          session_token?: string | null;
          email?: string | null;
          status?: Database['public']['Enums']['cart_status'];
          abandoned_at?: string | null;
          recovered_at?: string | null;
          recovery_emails_sent?: number;
          last_recovery_email_at?: string | null;
          applied_coupon_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          user_id?: string | null;
          session_token?: string | null;
          email?: string | null;
          status?: Database['public']['Enums']['cart_status'];
          abandoned_at?: string | null;
          recovered_at?: string | null;
          recovery_emails_sent?: number;
          last_recovery_email_at?: string | null;
          applied_coupon_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          store_id: string;
          id: string;
          cart_id: string;
          product_id: string;
          bundle_id: string | null;
          quantity: number;
          unit_price_sen: number;
          is_subscription: boolean;
          subscription_interval: Database['public']['Enums']['subscription_interval'] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          cart_id: string;
          product_id: string;
          bundle_id?: string | null;
          quantity: number;
          unit_price_sen: number;
          is_subscription?: boolean;
          subscription_interval?: Database['public']['Enums']['subscription_interval'] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          cart_id?: string;
          product_id?: string;
          bundle_id?: string | null;
          quantity?: number;
          unit_price_sen?: number;
          is_subscription?: boolean;
          subscription_interval?: Database['public']['Enums']['subscription_interval'] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          store_id: string;
          id: string;
          order_number: string;
          user_id: string | null;
          email: string;
          status: Database['public']['Enums']['order_status'];
          payment_status: Database['public']['Enums']['payment_status'];
          fulfillment_status: Database['public']['Enums']['fulfillment_status'];
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          order_number?: string;
          user_id?: string | null;
          email: string;
          status?: Database['public']['Enums']['order_status'];
          payment_status?: Database['public']['Enums']['payment_status'];
          fulfillment_status?: Database['public']['Enums']['fulfillment_status'];
          subtotal_sen?: number;
          discount_sen?: number;
          shipping_sen?: number;
          tax_sen?: number;
          total_sen?: number;
          loyalty_points_redeemed?: number;
          loyalty_points_earned?: number;
          currency?: string;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          coupon_id?: string | null;
          subscription_id?: string | null;
          cart_id?: string | null;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          shipping_address?: Json | null;
          billing_address?: Json | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
          notes?: string | null;
          placed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          order_number?: string;
          user_id?: string | null;
          email?: string;
          status?: Database['public']['Enums']['order_status'];
          payment_status?: Database['public']['Enums']['payment_status'];
          fulfillment_status?: Database['public']['Enums']['fulfillment_status'];
          subtotal_sen?: number;
          discount_sen?: number;
          shipping_sen?: number;
          tax_sen?: number;
          total_sen?: number;
          loyalty_points_redeemed?: number;
          loyalty_points_earned?: number;
          currency?: string;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          coupon_id?: string | null;
          subscription_id?: string | null;
          cart_id?: string | null;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          shipping_address?: Json | null;
          billing_address?: Json | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
          notes?: string | null;
          placed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          store_id: string;
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
        };
        Insert: {
          store_id?: string;
          id?: string;
          order_id: string;
          product_id?: string | null;
          bundle_id?: string | null;
          product_name: string;
          product_sku?: string | null;
          quantity: number;
          unit_price_sen: number;
          total_sen: number;
          is_subscription?: boolean;
          created_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          order_id?: string;
          product_id?: string | null;
          bundle_id?: string | null;
          product_name?: string;
          product_sku?: string | null;
          quantity?: number;
          unit_price_sen?: number;
          total_sen?: number;
          is_subscription?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          store_id: string;
          id: string;
          user_id: string;
          status: Database['public']['Enums']['subscription_status'];
          interval: Database['public']['Enums']['subscription_interval'];
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          user_id: string;
          status?: Database['public']['Enums']['subscription_status'];
          interval?: Database['public']['Enums']['subscription_interval'];
          discount_percent?: number;
          next_billing_date?: string | null;
          paused_until?: string | null;
          skip_next?: boolean;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          shipping_address_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          recurring_total_sen?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          user_id?: string;
          status?: Database['public']['Enums']['subscription_status'];
          interval?: Database['public']['Enums']['subscription_interval'];
          discount_percent?: number;
          next_billing_date?: string | null;
          paused_until?: string | null;
          skip_next?: boolean;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          shipping_address_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          recurring_total_sen?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscription_items: {
        Row: {
          store_id: string;
          id: string;
          subscription_id: string;
          product_id: string;
          quantity: number;
          unit_price_sen: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          subscription_id: string;
          product_id: string;
          quantity: number;
          unit_price_sen: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          subscription_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price_sen?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      loyalty_accounts: {
        Row: {
          store_id: string;
          user_id: string;
          balance: number;
          lifetime_earned: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_id?: string;
          user_id: string;
          balance?: number;
          lifetime_earned?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          user_id?: string;
          balance?: number;
          lifetime_earned?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      loyalty_transactions: {
        Row: {
          store_id: string;
          id: string;
          user_id: string;
          type: Database['public']['Enums']['loyalty_txn_type'];
          points: number;
          description: string | null;
          order_id: string | null;
          created_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          user_id: string;
          type: Database['public']['Enums']['loyalty_txn_type'];
          points: number;
          description?: string | null;
          order_id?: string | null;
          created_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          user_id?: string;
          type?: Database['public']['Enums']['loyalty_txn_type'];
          points?: number;
          description?: string | null;
          order_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      referrals: {
        Row: {
          store_id: string;
          id: string;
          referrer_id: string;
          referee_id: string | null;
          referee_email: string | null;
          code: string;
          status: Database['public']['Enums']['referral_status'];
          reward_points: number;
          qualifying_order_id: string | null;
          rewarded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          referrer_id: string;
          referee_id?: string | null;
          referee_email?: string | null;
          code: string;
          status?: Database['public']['Enums']['referral_status'];
          reward_points?: number;
          qualifying_order_id?: string | null;
          rewarded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          referrer_id?: string;
          referee_id?: string | null;
          referee_email?: string | null;
          code?: string;
          status?: Database['public']['Enums']['referral_status'];
          reward_points?: number;
          qualifying_order_id?: string | null;
          rewarded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      coupons: {
        Row: {
          store_id: string;
          id: string;
          code: string;
          description: string | null;
          discount_type: Database['public']['Enums']['discount_type'];
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          code: string;
          description?: string | null;
          discount_type: Database['public']['Enums']['discount_type'];
          discount_value?: number;
          min_order_sen?: number;
          max_discount_sen?: number | null;
          usage_limit?: number | null;
          usage_limit_per_user?: number | null;
          times_used?: number;
          starts_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          is_automatic?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          code?: string;
          description?: string | null;
          discount_type?: Database['public']['Enums']['discount_type'];
          discount_value?: number;
          min_order_sen?: number;
          max_discount_sen?: number | null;
          usage_limit?: number | null;
          usage_limit_per_user?: number | null;
          times_used?: number;
          starts_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          is_automatic?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      coupon_redemptions: {
        Row: {
          store_id: string;
          id: string;
          coupon_id: string;
          user_id: string | null;
          order_id: string | null;
          discount_sen: number;
          created_at: string;
        };
        Insert: {
          store_id?: string;
          id?: string;
          coupon_id: string;
          user_id?: string | null;
          order_id?: string | null;
          discount_sen?: number;
          created_at?: string;
        };
        Update: {
          store_id?: string;
          id?: string;
          coupon_id?: string;
          user_id?: string | null;
          order_id?: string | null;
          discount_sen?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      email_templates: {
        Row: {
          id: string;
          key: string;
          flow: Database['public']['Enums']['email_flow_key'] | null;
          name: string;
          subject: string;
          preheader: string | null;
          body_html: string;
          body_text: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          flow?: Database['public']['Enums']['email_flow_key'] | null;
          name: string;
          subject: string;
          preheader?: string | null;
          body_html: string;
          body_text?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          flow?: Database['public']['Enums']['email_flow_key'] | null;
          name?: string;
          subject?: string;
          preheader?: string | null;
          body_html?: string;
          body_text?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_flows: {
        Row: {
          id: string;
          key: Database['public']['Enums']['email_flow_key'];
          name: string;
          is_enabled: boolean;
          steps: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: Database['public']['Enums']['email_flow_key'];
          name: string;
          is_enabled?: boolean;
          steps?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: Database['public']['Enums']['email_flow_key'];
          name?: string;
          is_enabled?: boolean;
          steps?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_logs: {
        Row: {
          id: string;
          to_email: string;
          user_id: string | null;
          template_key: string | null;
          flow: Database['public']['Enums']['email_flow_key'] | null;
          subject: string | null;
          related_cart_id: string | null;
          related_order_id: string | null;
          related_subscription_id: string | null;
          provider_message_id: string | null;
          status: string;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          to_email: string;
          user_id?: string | null;
          template_key?: string | null;
          flow?: Database['public']['Enums']['email_flow_key'] | null;
          subject?: string | null;
          related_cart_id?: string | null;
          related_order_id?: string | null;
          related_subscription_id?: string | null;
          provider_message_id?: string | null;
          status?: string;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          to_email?: string;
          user_id?: string | null;
          template_key?: string | null;
          flow?: Database['public']['Enums']['email_flow_key'] | null;
          subject?: string | null;
          related_cart_id?: string | null;
          related_order_id?: string | null;
          related_subscription_id?: string | null;
          provider_message_id?: string | null;
          status?: string;
          error?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      stores: {
        Row: {
          id: string;
          slug: string;
          name: string;
          custom_domain: string | null;
          owner_id: string | null;
          status: Database['public']['Enums']['store_status'];
          logo_url: string | null;
          primary_color: string | null;
          currency: string;
          stripe_account_id: string | null;
          stripe_charges_enabled: boolean;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          custom_domain?: string | null;
          owner_id?: string | null;
          status?: Database['public']['Enums']['store_status'];
          logo_url?: string | null;
          primary_color?: string | null;
          currency?: string;
          stripe_account_id?: string | null;
          stripe_charges_enabled?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          custom_domain?: string | null;
          owner_id?: string | null;
          status?: Database['public']['Enums']['store_status'];
          logo_url?: string | null;
          primary_color?: string | null;
          currency?: string;
          stripe_account_id?: string | null;
          stripe_charges_enabled?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      store_members: {
        Row: {
          id: string;
          store_id: string;
          user_id: string;
          role: Database['public']['Enums']['store_member_role'];
          status: Database['public']['Enums']['store_member_status'];
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          user_id: string;
          role?: Database['public']['Enums']['store_member_role'];
          status?: Database['public']['Enums']['store_member_status'];
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          user_id?: string;
          role?: Database['public']['Enums']['store_member_role'];
          status?: Database['public']['Enums']['store_member_status'];
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      store_invitations: {
        Row: {
          id: string;
          store_id: string;
          email: string;
          role: Database['public']['Enums']['store_member_role'];
          status: Database['public']['Enums']['store_invitation_status'];
          token: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          email: string;
          role?: Database['public']['Enums']['store_member_role'];
          status?: Database['public']['Enums']['store_invitation_status'];
          token?: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          email?: string;
          role?: Database['public']['Enums']['store_member_role'];
          status?: Database['public']['Enums']['store_invitation_status'];
          token?: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      membership_audit: {
        Row: {
          id: string;
          store_id: string;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          target_user_id: string | null;
          target_email: string | null;
          old_value: Json | null;
          new_value: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action: string;
          target_user_id?: string | null;
          target_email?: string | null;
          old_value?: Json | null;
          new_value?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action?: string;
          target_user_id?: string | null;
          target_email?: string | null;
          old_value?: Json | null;
          new_value?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      validate_coupon: {
        Args: { p_code: string; p_subtotal_sen: number };
        Returns: Json;
      };
      next_billing_date: {
        Args: {
          p_from: string;
          p_interval: Database['public']['Enums']['subscription_interval'];
        };
        Returns: string;
      };
      decrement_stock: {
        Args: { p_product_id: string; p_qty: number };
        Returns: undefined;
      };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database['public']['Enums']['user_role'];
      };
      is_staff: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_platform_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      store_role_rank: {
        Args: { r: Database['public']['Enums']['store_member_role'] };
        Returns: number;
      };
      is_store_member: {
        Args: {
          p_store: string;
          p_min_role?: Database['public']['Enums']['store_member_role'];
        };
        Returns: boolean;
      };
    };
    Enums: {
      address_type: 'shipping' | 'billing';
      cart_status: 'active' | 'converted' | 'abandoned' | 'recovered';
      discount_type: 'percentage' | 'fixed_amount' | 'free_shipping';
      email_flow_key:
        | 'welcome_series'
        | 'abandoned_cart'
        | 'post_purchase'
        | 'subscription_reminder'
        | 'win_back'
        | 'referral'
        | 'newsletter';
      fulfillment_status: 'unfulfilled' | 'partial' | 'fulfilled';
      loyalty_txn_type: 'earn' | 'redeem' | 'expire' | 'adjust' | 'referral';
      order_status:
        | 'pending'
        | 'paid'
        | 'processing'
        | 'shipped'
        | 'delivered'
        | 'cancelled'
        | 'refunded'
        | 'partially_refunded';
      payment_status: 'unpaid' | 'paid' | 'refunded' | 'partially_refunded' | 'failed';
      referral_status: 'pending' | 'qualified' | 'rewarded' | 'expired';
      relationship_type: 'cross_sell' | 'upsell' | 'frequently_bought_together' | 'related';
      review_status: 'pending' | 'approved' | 'rejected';
      store_member_role:
        | 'owner'
        | 'admin'
        | 'staff'
        | 'manager'
        | 'marketing'
        | 'warehouse'
        | 'support';
      store_member_status: 'active' | 'suspended' | 'removed';
      store_invitation_status: 'pending' | 'accepted' | 'revoked' | 'expired';
      store_status: 'active' | 'suspended' | 'pending';
      subscription_interval: 'monthly' | 'quarterly';
      subscription_status: 'active' | 'paused' | 'cancelled' | 'past_due';
      user_role: 'customer' | 'staff' | 'admin';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// --- Helper types ------------------------------------------------------------
// Simplified single-schema helpers (the codebase never uses the multi-schema
// `{ schema: ... }` option form that `gen types` emits).
type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row'];
export type InsertTables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];

// --- Convenience aliases (consumed across features) --------------------------
// Row aliases
export type Profile = Tables<'profiles'>;
export type Product = Tables<'products'>;
export type ProductImage = Tables<'product_images'>;
export type Bundle = Tables<'bundles'>;
export type Category = Tables<'categories'>;
export type Review = Tables<'reviews'>;
export type Order = Tables<'orders'>;
export type Subscription = Tables<'subscriptions'>;
// Enum aliases
export type UserRole = Enums<'user_role'>;
export type OrderStatus = Enums<'order_status'>;
export type PaymentStatus = Enums<'payment_status'>;
export type ReviewStatus = Enums<'review_status'>;
export type DiscountType = Enums<'discount_type'>;
export type SubscriptionInterval = Enums<'subscription_interval'>;
export type EmailFlowKey = Enums<'email_flow_key'>;
