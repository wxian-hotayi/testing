'use client';

import { useEffect, useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { Countdown } from './countdown';
import { NewsletterForm } from '@/features/marketing/components/newsletter-form';

const SESSION_KEY = 'vitalis_exit_intent_shown';
const OFFER_CODE = 'WELCOME10';

/** Exit-intent discount offer. Fires once per session when the cursor leaves
 * the top of the viewport (desktop). Offers the real WELCOME10 coupon. */
export function ExitIntentPopup() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setOpen(true);
        sessionStorage.setItem(SESSION_KEY, '1');
        document.removeEventListener('mouseout', onLeave);
      }
    };
    // Delay arming so it doesn't fire immediately on load.
    const armId = setTimeout(
      () => document.addEventListener('mouseout', onLeave),
      4000,
    );
    return () => {
      clearTimeout(armId);
      document.removeEventListener('mouseout', onLeave);
    };
  }, []);

  if (!open) return null;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(OFFER_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-background p-8 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-md hover:bg-secondary"
        >
          <X className="size-5" />
        </button>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Wait — don’t go!
        </p>
        <h2 id="exit-intent-title" className="mt-2 text-2xl font-bold">
          Here’s 10% off your first order
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Offer expires in <Countdown durationSeconds={600} storageKey="exit_intent" />
        </p>

        <button
          onClick={copyCode}
          className="mx-auto mt-5 flex items-center gap-2 rounded-lg border-2 border-dashed border-primary bg-primary/5 px-6 py-3 text-lg font-bold tracking-widest text-primary"
        >
          {OFFER_CODE}
          {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
        </button>
        <p className="mt-1 text-xs text-muted-foreground">
          {copied ? 'Copied!' : 'Tap to copy'}
        </p>

        <div className="mt-6 text-left">
          <p className="mb-2 text-sm font-semibold">
            Want it sent to your inbox? Subscribe:
          </p>
          <NewsletterForm source="exit_intent" />
        </div>
      </div>
    </div>
  );
}
