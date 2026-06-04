import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Accessible star rating. Renders 5 stars with a partial fill for the average. */
export function RatingStars({
  rating,
  count,
  size = 16,
  className,
}: {
  rating: number;
  count?: number;
  size?: number;
  className?: string;
}) {
  const rounded = Math.round(rating * 2) / 2; // nearest half
  return (
    <div
      className={cn('flex items-center gap-1.5', className)}
      aria-label={`Rated ${rating.toFixed(1)} out of 5${count != null ? ` from ${count} reviews` : ''}`}
    >
      <div className="flex" role="img" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => {
          const fill = rounded - i;
          return (
            <Star
              key={i}
              width={size}
              height={size}
              className={cn(
                fill >= 1
                  ? 'fill-accent text-accent'
                  : fill >= 0.5
                    ? 'fill-accent/50 text-accent'
                    : 'fill-transparent text-muted-foreground/40',
              )}
            />
          );
        })}
      </div>
      {count != null && (
        <span className="text-sm text-muted-foreground">
          {rating > 0 ? rating.toFixed(1) : 'New'}
          {count > 0 && ` (${count})`}
        </span>
      )}
    </div>
  );
}
