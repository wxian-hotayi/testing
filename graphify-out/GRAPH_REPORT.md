# Graph Report - .  (2026-06-04)

## Corpus Check
- Corpus is ~32,770 words - fits in a single context window. You may not need a graph.

## Summary
- 488 nodes · 1344 edges · 12 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Storefront Pages & SEO|Storefront Pages & SEO]]
- [[_COMMUNITY_Admin Actions & CRUD|Admin Actions & CRUD]]
- [[_COMMUNITY_Admin Dashboard & Analytics|Admin Dashboard & Analytics]]
- [[_COMMUNITY_Account Area & Data|Account Area & Data]]
- [[_COMMUNITY_Cart Actions & State|Cart Actions & State]]
- [[_COMMUNITY_API Routes & Order Service|API Routes & Order Service]]
- [[_COMMUNITY_Data Types & Supabase Clients|Data Types & Supabase Clients]]
- [[_COMMUNITY_Account Self-Service Actions|Account Self-Service Actions]]
- [[_COMMUNITY_Cart UI & CRO Components|Cart UI & CRO Components]]
- [[_COMMUNITY_Authentication|Authentication]]
- [[_COMMUNITY_Analytics & Root Layout|Analytics & Root Layout]]

## God Nodes (most connected - your core abstractions)
1. `createAdminClient()` - 47 edges
2. `formatMoney()` - 37 edges
3. `cn()` - 27 edges
4. `Badge()` - 18 edges
5. `createClient()` - 18 edges
6. `getCartView()` - 17 edges
7. `buildMetadata()` - 17 edges
8. `Button` - 16 edges
9. `buttonVariants` - 15 edges
10. `useCart()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `generateStaticParams()` --calls--> `getCategorySlugs()`  [INFERRED]
  src/app/(storefront)/categories/[slug]/page.tsx → src/features/catalog/queries.ts
- `generateMetadata()` --calls--> `buildMetadata()`  [INFERRED]
  src/app/(storefront)/legal/[slug]/page.tsx → src/lib/seo.ts
- `LegalPage()` --calls--> `NotFound()`  [INFERRED]
  src/app/(storefront)/legal/[slug]/page.tsx → src/app/not-found.tsx
- `generateStaticParams()` --calls--> `getProductSlugs()`  [INFERRED]
  src/app/(storefront)/products/[slug]/page.tsx → src/features/catalog/queries.ts
- `ProductsPage()` --calls--> `getActiveProducts()`  [INFERRED]
  src/app/(storefront)/products/page.tsx → src/features/catalog/queries.ts

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "Storefront Pages & SEO"
Cohesion: 0.06
Nodes (50): metadata, NotFound(), sitemap(), metadata, getCartRecommendations(), getActiveProducts(), getBestSellers(), getCategories() (+42 more)

### Community 1 - "Admin Actions & CRUD"
Cohesion: 0.05
Nodes (46): AdminResult, deleteCategoryAction(), deleteProductAction(), num(), refundOrderAction(), requireStaff(), setReviewStatusAction(), setUserRoleAction() (+38 more)

### Community 2 - "Admin Dashboard & Analytics"
Cohesion: 0.08
Nodes (35): getDashboardMetrics(), AdminDashboard(), pct(), Analytics, Props, Window, useCart(), BundleOption (+27 more)

### Community 3 - "Account Area & Data"
Cohesion: 0.07
Nodes (35): AccountLayout(), AccountDashboard(), getLoyaltyBalance(), getMyOrders(), getMySubscriptions(), getProfile(), SubscriptionWithItems, AdminLayout() (+27 more)

### Community 4 - "Cart Actions & State"
Cohesion: 0.12
Nodes (38): addToCartAction(), applyCouponAction(), clearCartAction(), getCartAction(), message(), removeCouponAction(), removeLineAction(), safeView() (+30 more)

### Community 5 - "API Routes & Order Service"
Cohesion: 0.12
Nodes (30): GET(), DashboardMetrics, EMPTY, createSubscription(), extractAddress(), finalizeOrderFromSession(), grantReferralReward(), recordCouponRedemption() (+22 more)

### Community 6 - "Data Types & Supabase Clients"
Cohesion: 0.06
Nodes (32): CategoryVM, ProductDetailVM, config, middleware(), CookieToSet, updateSession(), AddressType, Bundle (+24 more)

### Community 7 - "Account Self-Service Actions"
Cohesion: 0.10
Nodes (24): ActionResult, addressSchema, cancelSubscriptionAction(), changeSubscriptionAddressAction(), deleteAddressAction(), pauseSubscriptionAction(), requireUser(), resumeSubscriptionAction() (+16 more)

### Community 8 - "Cart UI & CRO Components"
Cohesion: 0.14
Nodes (11): CartProvider(), CartIcon(), Countdown(), ExitIntentPopup(), RecentPurchaseToast(), getRecentPurchaseActivity(), PurchaseActivity, FOOTER_LINKS (+3 more)

### Community 9 - "Authentication"
Cohesion: 0.21
Nodes (9): AuthState, baseUrl, credentials, safeNext(), signInWithGoogle(), signInWithPassword(), signUpWithPassword(), AuthForm() (+1 more)

### Community 10 - "Analytics & Root Layout"
Cohesion: 0.19
Nodes (6): AnalyticsProvider(), AnalyticsScripts(), inter, metadata, viewport, Providers()

## Knowledge Gaps
- **73 isolated node(s):** `metadata`, `metadata`, `metadata`, `metadata`, `metadata` (+68 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createAdminClient()` connect `API Routes & Order Service` to `Admin Actions & CRUD`, `Admin Dashboard & Analytics`, `Account Area & Data`, `Cart Actions & State`, `Cart UI & CRO Components`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `formatMoney()` connect `Admin Dashboard & Analytics` to `Admin Actions & CRUD`, `Account Area & Data`, `API Routes & Order Service`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `buildMetadata()` connect `Storefront Pages & SEO` to `Authentication`, `Analytics & Root Layout`, `Admin Dashboard & Analytics`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `metadata`, `metadata`, `metadata` to the rest of the system?**
  _73 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Storefront Pages & SEO` be split into smaller, more focused modules?**
  _Cohesion score 0.05827505827505827 - nodes in this community are weakly interconnected._
- **Should `Admin Actions & CRUD` be split into smaller, more focused modules?**
  _Cohesion score 0.05189189189189189 - nodes in this community are weakly interconnected._
- **Should `Admin Dashboard & Analytics` be split into smaller, more focused modules?**
  _Cohesion score 0.08143839238498149 - nodes in this community are weakly interconnected._