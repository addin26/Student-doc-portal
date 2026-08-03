'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/auth/reset')}`,
    });

    // Always show the same response so the form does not reveal whether an
    // address is registered.
    setComplete(true);
    setLoading(false);
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden">
      <div className="mesh-bg pointer-events-none absolute inset-0" />
      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center px-4 py-12">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">StudyDock</span>
        </Link>

        <div className="glass-strong mt-8 w-full rounded-3xl p-8 shadow-glass">
          <h1 className="font-display text-2xl font-bold">Reset your password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter your email and we will send recovery instructions if an account is eligible.
          </p>

          {complete ? (
            <div className="mt-6">
              <p role="status" className="flex items-start gap-2 rounded-xl bg-success/10 p-4 text-sm text-success">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                If an account exists for that address, a password-reset email is on its way.
              </p>
              <Button asChild className="mt-5 h-11 w-full rounded-xl">
                <Link href="/auth">Return to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="recovery-email" className="mb-1.5 block text-sm font-semibold">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    id="recovery-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="form-input pl-10"
                    placeholder="you@university.edu"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-2xl bg-gradient-to-r from-primary to-secondary shadow-glow"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send recovery email'}
              </Button>
            </form>
          )}

          <Link href="/auth" className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
