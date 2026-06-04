'use client';

import { useEffect } from 'react';
import { attachReferralIfPending } from '../actions';

/** Fire-and-forget: attribute a pending referral once the user is logged in. */
export function ReferralLinker() {
  useEffect(() => {
    void attachReferralIfPending();
  }, []);
  return null;
}
