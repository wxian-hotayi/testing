'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
  type AuthState,
} from '../actions';
import { Button } from '@/components/ui/button';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" fullWidth disabled={pending}>
      {pending ? 'Please wait…' : label}
    </Button>
  );
}

export function AuthForm({ next, initialError }: { next: string; initialError?: string }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const action = mode === 'signin' ? signInWithPassword : signUpWithPassword;
  const [state, formAction] = useActionState<AuthState, FormData>(action, null);

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-bold">
        {mode === 'signin' ? 'Welcome back' : 'Create your account'}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === 'signin'
          ? 'Sign in to manage orders, subscriptions, and rewards.'
          : 'Join to track orders, subscribe & save, and earn rewards.'}
      </p>

      {/* Google */}
      <form action={signInWithGoogle} className="mt-6">
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="outline" fullWidth>
          Continue with Google
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        {mode === 'signup' && (
          <Field id="full_name" name="full_name" type="text" label="Full name" autoComplete="name" />
        )}
        <Field id="email" name="email" type="email" label="Email" autoComplete="email" required />
        <Field
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
        />
        {(state?.error || initialError) && (
          <p className="text-sm text-destructive">
            {state?.error ?? 'Authentication failed. Please try again.'}
          </p>
        )}
        <Submit label={mode === 'signin' ? 'Sign in' : 'Create account'} />
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {mode === 'signin' ? (
          <>
            New here?{' '}
            <button onClick={() => setMode('signup')} className="font-semibold text-primary hover:underline">
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button onClick={() => setMode('signin')} className="font-semibold text-primary hover:underline">
              Sign in
            </button>
          </>
        )}
      </p>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">← Back to store</Link>
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...props}
      />
    </div>
  );
}
