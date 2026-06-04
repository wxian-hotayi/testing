import { formatMoney, percentOff } from '@/lib/money';
import { cn } from '@/lib/utils';

/**
 * Displays a price with optional struck-through "compare at" anchor and a
 * savings percentage — a core perceived-value CRO element.
 */
export function Price({
  priceSen,
  compareAtSen,
  size = 'md',
  className,
}: {
  priceSen: number;
  compareAtSen?: number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const showCompare = compareAtSen != null && compareAtSen > priceSen;
  const sizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
  } as const;

  return (
    <div className={cn('flex flex-wrap items-baseline gap-2', className)}>
      <span className={cn('font-bold tracking-tight', sizes[size])}>
        {formatMoney(priceSen)}
      </span>
      {showCompare && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {formatMoney(compareAtSen)}
          </span>
          <span className="text-sm font-semibold text-destructive">
            Save {percentOff(compareAtSen, priceSen)}%
          </span>
        </>
      )}
    </div>
  );
}
