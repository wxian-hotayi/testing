import { listReviews } from '@/features/admin/queries';
import { ReviewModeration } from '@/features/admin/components/review-moderation';

export default async function AdminReviewsPage() {
  const reviews = await listReviews();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Reviews</h1>
      <ReviewModeration reviews={reviews} />
    </div>
  );
}
