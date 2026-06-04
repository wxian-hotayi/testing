'use client';

import { useEffect, useState } from 'react';

/**
 * Session-scoped countdown for a specific, genuinely session-bound offer (e.g.
 * the exit-intent discount). The end time is persisted in sessionStorage so it
 * doesn't reset on navigation within the session. Honest by design: it counts
 * down a real, time-limited offer rather than a perpetually-resetting fake one.
 */
export function Countdown({
  durationSeconds,
  storageKey,
  onExpire,
}: {
  durationSeconds: number;
  storageKey: string;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const key = `countdown:${storageKey}`;
    const now = Date.now();
    let end = Number(sessionStorage.getItem(key));
    if (!end || Number.isNaN(end) || end < now) {
      end = now + durationSeconds * 1000;
      sessionStorage.setItem(key, String(end));
    }
    const tick = () => {
      const secs = Math.max(0, Math.round((end - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0) onExpire?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [durationSeconds, storageKey, onExpire]);

  if (remaining === null) return null;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <span className="font-mono font-bold tabular-nums" aria-live="polite">
      {mm}:{ss}
    </span>
  );
}
