-- =============================================================================
-- seed.sql — Demo catalog + marketing config.
-- Compliance note: all copy uses structure/function language ("supports",
-- "helps maintain"). No disease-treatment or "cure"/"guaranteed" claims.
-- Run with `supabase db reset` (applies migrations then this seed).
-- =============================================================================

-- --- categories --------------------------------------------------------------
insert into public.categories (id, slug, name, description, meta_title, meta_description, position) values
  ('11111111-1111-1111-1111-111111111101', 'performance', 'Performance',
   'Formulas to support training, strength, and recovery.',
   'Performance Supplements | Vitalis', 'Support your training and recovery with science-backed performance supplements.', 1),
  ('11111111-1111-1111-1111-111111111102', 'wellness', 'Daily Wellness',
   'Everyday essentials to support overall wellbeing.',
   'Daily Wellness Supplements | Vitalis', 'Everyday vitamins and essentials to support your overall wellbeing.', 2),
  ('11111111-1111-1111-1111-111111111103', 'sleep-recovery', 'Sleep & Recovery',
   'Support restful sleep and day-to-day recovery.',
   'Sleep & Recovery Supplements | Vitalis', 'Support restful sleep and recovery with our calming formulas.', 3);

-- --- products ----------------------------------------------------------------
insert into public.products
  (id, slug, sku, name, subtitle, description, category_id, price_sen, compare_at_price_sen, cost_sen,
   ingredients, benefits, usage_instructions, is_featured, is_best_seller, stock_quantity, low_stock_threshold,
   meta_title, meta_description)
values
  ('22222222-2222-2222-2222-222222222201', 'whey-protein-isolate', 'VL-WHEY-001',
   'Whey Protein Isolate', '27g protein • low lactose',
   'A clean, fast-absorbing whey protein isolate to support muscle recovery and daily protein intake.',
   '11111111-1111-1111-1111-111111111101', 9900, 12900, 4200,
   'Whey protein isolate, natural cocoa, stevia leaf extract, sunflower lecithin.',
   '["Supports muscle recovery", "27g protein per serving", "Low in lactose and sugar"]'::jsonb,
   'Mix one scoop with 250ml of water or milk. Take 1–2 servings daily.',
   true, true, 140, 20,
   'Whey Protein Isolate | Vitalis', 'Clean 27g whey protein isolate to support muscle recovery. Low lactose, low sugar.'),

  ('22222222-2222-2222-2222-222222222202', 'creatine-monohydrate', 'VL-CREA-001',
   'Creatine Monohydrate', 'Micronized • 5g per serving',
   'Pure micronized creatine monohydrate to support strength and high-intensity performance.',
   '11111111-1111-1111-1111-111111111101', 9900, null, 2800,
   '100% micronized creatine monohydrate.',
   '["Supports strength output", "5g pure creatine", "Unflavored, mixes easily"]'::jsonb,
   'Mix one 5g scoop with water or your favourite beverage daily.',
   true, true, 200, 20,
   'Creatine Monohydrate | Vitalis', 'Micronized 5g creatine monohydrate to support strength and performance.'),

  ('22222222-2222-2222-2222-222222222203', 'daily-multivitamin', 'VL-MULTI-001',
   'Daily Multivitamin', '23 vitamins & minerals',
   'A comprehensive daily multivitamin to help fill nutritional gaps and support overall wellbeing.',
   '11111111-1111-1111-1111-111111111102', 9900, 11900, 3100,
   'Vitamins A, C, D, E, K, B-complex, zinc, magnesium, selenium, iodine.',
   '["Supports immune function", "Helps fill dietary gaps", "Once-daily convenience"]'::jsonb,
   'Take one capsule daily with food.',
   false, true, 95, 15,
   'Daily Multivitamin | Vitalis', '23 essential vitamins and minerals to support everyday wellbeing.'),

  ('22222222-2222-2222-2222-222222222204', 'omega-3-fish-oil', 'VL-OMEGA-001',
   'Omega-3 Fish Oil', '1000mg EPA/DHA',
   'High-purity omega-3 fish oil to support heart, brain, and joint health.',
   '11111111-1111-1111-1111-111111111102', 9900, null, 3300,
   'Fish oil concentrate (EPA, DHA), gelatin softgel, mixed tocopherols.',
   '["Supports heart and brain health", "1000mg EPA/DHA", "Molecularly distilled for purity"]'::jsonb,
   'Take two softgels daily with food.',
   false, false, 8, 15,
   'Omega-3 Fish Oil | Vitalis', 'High-purity 1000mg omega-3 to support heart, brain, and joint health.'),

  ('22222222-2222-2222-2222-222222222205', 'magnesium-glycinate', 'VL-MAG-001',
   'Magnesium Glycinate', 'Gentle • highly absorbable',
   'A gentle, highly absorbable form of magnesium to support muscle relaxation and restful sleep.',
   '11111111-1111-1111-1111-111111111103', 9900, null, 2600,
   'Magnesium bisglycinate chelate, vegetable capsule.',
   '["Supports muscle relaxation", "Supports restful sleep", "Gentle on the stomach"]'::jsonb,
   'Take two capsules in the evening with water.',
   true, false, 60, 15,
   'Magnesium Glycinate | Vitalis', 'Gentle, highly absorbable magnesium glycinate to support relaxation and sleep.'),

  ('22222222-2222-2222-2222-222222222206', 'ashwagandha-ksm66', 'VL-ASH-001',
   'Ashwagandha KSM-66', '600mg standardized extract',
   'A clinically studied ashwagandha extract to support the body''s response to everyday stress.',
   '11111111-1111-1111-1111-111111111103', 9900, 10900, 2900,
   'KSM-66 ashwagandha root extract (standardized to 5% withanolides).',
   '["Supports stress resilience", "600mg standardized extract", "Supports calm focus"]'::jsonb,
   'Take one capsule daily, or as directed.',
   false, false, 75, 15,
   'Ashwagandha KSM-66 | Vitalis', 'Clinically studied 600mg ashwagandha to support the body''s response to stress.');

-- --- product images (placeholder photography from Unsplash) ------------------
insert into public.product_images (product_id, url, alt, position, is_primary)
select id,
       'https://images.unsplash.com/photo-1556227702-d1e4e7b5c232?w=800&q=80',
       name || ' product image', 0, true
from public.products;

-- --- bundles (the RM99 / RM179 / RM249 ladder for every product) -------------
insert into public.bundles (product_id, quantity, price_sen, label, position)
select p.id, t.quantity, t.price_sen, t.label, t.position
from public.products p
cross join (values
  (1, 9900, null, 0),
  (2, 17900, 'Most Popular', 1),
  (3, 24900, 'Best Value', 2)
) as t(quantity, price_sen, label, position);

-- --- cross-sell relationships ------------------------------------------------
-- Whey + Creatine + Magnesium = classic training stack.
insert into public.product_relationships (product_id, related_product_id, type, position) values
  ('22222222-2222-2222-2222-222222222201', '22222222-2222-2222-2222-222222222202', 'frequently_bought_together', 0),
  ('22222222-2222-2222-2222-222222222201', '22222222-2222-2222-2222-222222222205', 'cross_sell', 1),
  ('22222222-2222-2222-2222-222222222202', '22222222-2222-2222-2222-222222222201', 'frequently_bought_together', 0),
  ('22222222-2222-2222-2222-222222222205', '22222222-2222-2222-2222-222222222206', 'cross_sell', 0),
  ('22222222-2222-2222-2222-222222222203', '22222222-2222-2222-2222-222222222204', 'cross_sell', 0),
  ('22222222-2222-2222-2222-222222222206', '22222222-2222-2222-2222-222222222205', 'frequently_bought_together', 0);

-- --- approved reviews (drive social proof + rating averages via trigger) -----
insert into public.reviews (product_id, author_name, rating, title, body, is_verified_purchase, status) values
  ('22222222-2222-2222-2222-222222222201', 'Aisyah R.', 5, 'Mixes perfectly', 'No clumps and tastes great. Part of my daily routine now.', true, 'approved'),
  ('22222222-2222-2222-2222-222222222201', 'Daniel T.', 4, 'Solid protein', 'Good value and light on the stomach.', true, 'approved'),
  ('22222222-2222-2222-2222-222222222202', 'Wei Ming', 5, 'Does the job', 'Unflavored and dissolves easily. Noticed better gym sessions.', true, 'approved'),
  ('22222222-2222-2222-2222-222222222203', 'Priya S.', 5, 'Easy daily habit', 'One capsule a day, no aftertaste.', true, 'approved'),
  ('22222222-2222-2222-2222-222222222205', 'Hafiz', 5, 'Sleep improved', 'Gentle and helps me wind down at night.', true, 'approved'),
  ('22222222-2222-2222-2222-222222222206', 'Mei Ling', 4, 'Feeling calmer', 'A few weeks in and I feel more balanced during busy days.', false, 'approved');

-- --- coupons -----------------------------------------------------------------
insert into public.coupons (code, description, discount_type, discount_value, min_order_sen, max_discount_sen, usage_limit_per_user, is_active) values
  ('WELCOME10', '10% off your first order', 'percentage', 10, 0, 5000, 1, true),
  ('FREESHIP', 'Free shipping on any order', 'free_shipping', 0, 0, null, null, true),
  ('SAVE20', 'RM20 off orders over RM150', 'fixed_amount', 2000, 15000, null, null, true);

-- --- email flows (admin-configurable steps) ----------------------------------
insert into public.email_flows (key, name, is_enabled, steps) values
  ('abandoned_cart', 'Abandoned Cart Recovery', true,
   '[{"afterMinutes":60,"templateKey":"abandoned_cart_1h"},
     {"afterMinutes":1440,"templateKey":"abandoned_cart_24h"},
     {"afterMinutes":2880,"templateKey":"abandoned_cart_48h","discountPercent":10}]'::jsonb),
  ('welcome_series', 'Welcome Series', true,
   '[{"afterMinutes":0,"templateKey":"welcome_1"},
     {"afterMinutes":2880,"templateKey":"welcome_2"}]'::jsonb),
  ('post_purchase', 'Post Purchase', true,
   '[{"afterMinutes":60,"templateKey":"post_purchase_thanks"}]'::jsonb),
  ('subscription_reminder', 'Subscription Reminder', true,
   '[{"afterMinutes":4320,"templateKey":"sub_upcoming"}]'::jsonb),
  ('win_back', 'Win-back Campaign', true,
   '[{"afterMinutes":86400,"templateKey":"win_back_1","discountPercent":15}]'::jsonb);

insert into public.email_templates (key, flow, name, subject, preheader, body_html) values
  ('abandoned_cart_1h', 'abandoned_cart', 'Abandoned Cart — 1 hour',
   'You left something behind 👀', 'Your cart is waiting',
   '<p>Hi {{first_name}},</p><p>You left some items in your cart. Complete your order before they sell out.</p><p><a href="{{cart_url}}">Return to cart</a></p>'),
  ('abandoned_cart_24h', 'abandoned_cart', 'Abandoned Cart — 24 hours',
   'Still thinking it over?', 'Your cart is still saved',
   '<p>Hi {{first_name}},</p><p>Your cart is still saved. Here''s what you picked:</p>{{cart_items}}<p><a href="{{cart_url}}">Checkout now</a></p>'),
  ('abandoned_cart_48h', 'abandoned_cart', 'Abandoned Cart — 48 hours (discount)',
   'Here''s 10% off to complete your order', 'A little something to help you decide',
   '<p>Hi {{first_name}},</p><p>Use code <strong>{{discount_code}}</strong> for 10% off your cart.</p><p><a href="{{cart_url}}">Complete order</a></p>'),
  ('welcome_1', 'welcome_series', 'Welcome #1', 'Welcome to Vitalis 🌿', 'Glad you''re here',
   '<p>Welcome, {{first_name}}! Here''s 10% off your first order with code WELCOME10.</p>'),
  ('welcome_2', 'welcome_series', 'Welcome #2', 'Find your routine', 'Our best sellers',
   '<p>Not sure where to start? Here are our most-loved formulas.</p>'),
  ('post_purchase_thanks', 'post_purchase', 'Post Purchase Thanks', 'Thanks for your order!', 'Order confirmed',
   '<p>Thanks {{first_name}}! Your order {{order_number}} is confirmed.</p>'),
  ('sub_upcoming', 'subscription_reminder', 'Subscription Upcoming', 'Your next delivery is on the way soon', 'Manage anytime',
   '<p>Hi {{first_name}}, your subscription renews on {{next_billing_date}}. <a href="{{manage_url}}">Manage</a></p>'),
  ('win_back', 'win_back', 'Win-back', 'We miss you — 15% off', 'Come back for more',
   '<p>It''s been a while, {{first_name}}. Here''s 15% off to restock with code {{discount_code}}.</p>');

-- --- settings ----------------------------------------------------------------
insert into public.settings (key, value, description) values
  ('store', '{"name":"Vitalis","email":"hello@vitalis.example","phone":"+60 3-0000 0000"}'::jsonb, 'Store contact info'),
  ('shipping', '{"freeThresholdSen":20000,"flatFeeSen":1000}'::jsonb, 'Shipping rules'),
  ('features', '{"exitIntentPopup":true,"recentPurchasePopup":true,"countdownTimer":true}'::jsonb, 'CRO feature flags');
