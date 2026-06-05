'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Box,
  FolderTree,
  Ticket,
  Star,
  Users,
  UserCog,
  Store,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Permission } from '@/lib/rbac/permissions';

/** Each item declares the permission required to see it. */
const ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
}[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, permission: 'orders.read' },
  { href: '/admin/products', label: 'Products', icon: Box, permission: 'products.read' },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree, permission: 'categories.write' },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket, permission: 'coupons.write' },
  { href: '/admin/reviews', label: 'Reviews', icon: Star, permission: 'reviews.moderate' },
  { href: '/admin/users', label: 'Users', icon: Users, permission: 'platform.manage' },
  { href: '/admin/members', label: 'Members', icon: UserCog, permission: 'members.manage' },
  { href: '/admin/store', label: 'Store', icon: Store, permission: 'store.manage' },
  { href: '/admin/access', label: 'Access', icon: ShieldCheck, permission: 'dashboard.view' },
];

export function AdminNav({ permissions }: { permissions: Permission[] }) {
  const pathname = usePathname();
  const allowed = new Set(permissions);
  const items = ITEMS.filter((i) => allowed.has(i.permission));
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Admin">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
