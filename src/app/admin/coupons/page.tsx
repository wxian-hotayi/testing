import { listCoupons } from '@/features/admin/queries';
import { CouponManager } from '@/features/admin/components/coupon-manager';

export default async function AdminCouponsPage() {
  const coupons = await listCoupons();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Coupons</h1>
      <CouponManager coupons={coupons} />
    </div>
  );
}
