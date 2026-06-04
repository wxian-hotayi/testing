'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setReviewStatusAction } from '../actions';
import { RatingStars } from '@/components/ui/rating-stars';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Tables, ReviewStatus } from '@/types/database.types';

type Review = Tables<'reviews'> & { productName: string };

export function ReviewModeration({ reviews }: { reviews: Review[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const setStatus = (id: string, status: ReviewStatus) =>
    startTransition(async () => {
      await setReviewStatusAction(id, status);
      router.refresh();
    });

  if (reviews.length === 0) {
    return <p className="rounded-lg border p-6 text-sm text-muted-foreground">No reviews yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <RatingStars rating={r.rating} size={14} />
              <span className="text-sm text-muted-foreground">on {r.productName}</span>
            </div>
            <Badge variant={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'destructive' : 'muted'}>
              {r.status}
            </Badge>
          </div>
          {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
          {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            {r.author_name}{r.is_verified_purchase && ' · Verified purchase'}
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" disabled={pending || r.status === 'approved'} onClick={() => setStatus(r.id, 'approved')}>
              Approve
            </Button>
            <Button size="sm" variant="ghost" disabled={pending || r.status === 'rejected'} className="text-destructive" onClick={() => setStatus(r.id, 'rejected')}>
              Reject
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
