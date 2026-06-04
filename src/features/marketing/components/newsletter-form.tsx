'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { subscribeNewsletter, type NewsletterState } from '../actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Joining…' : 'Subscribe'}
    </Button>
  );
}

export function NewsletterForm({
  source = 'footer',
  className,
}: {
  source?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState<NewsletterState, FormData>(
    subscribeNewsletter,
    null,
  );

  return (
    <form action={formAction} className={cn('flex flex-col gap-2', className)}>
      <input type="hidden" name="source" value={source} />
      <div className="flex gap-2">
        <label htmlFor={`newsletter-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`newsletter-${source}`}
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <SubmitButton />
      </div>
      {state && (
        <p
          role="status"
          className={cn(
            'text-sm',
            state.ok ? 'text-success' : 'text-destructive',
          )}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
