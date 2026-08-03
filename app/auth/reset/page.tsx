'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Loader2, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(Boolean(data.user));
      setChecking(false);
    });
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError('The reset session is invalid or expired. Request a new recovery email.');
      setLoading(false);
      return;
    }

    await supabase.auth.signOut({ scope: 'global' });
    window.location.assign('/auth?message=Password%20updated.%20Sign%20in%20with%20your%20new%20password.');
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
          <h1 className="font-display text-2xl font-bold">Choose a new password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Updating your password signs out your existing sessions.
          </p>

          {checking ? (
            <Loader2 className="mx-auto mt-8 h-7 w-7 animate-spin text-primary" />
          ) : !hasSession ? (
            <div className="mt-6">
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                This reset link is invalid or expired.
              </p>
              <Button asChild className="mt-5 h-11 w-full rounded-xl">
                <Link href="/auth/forgot">Request another link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <PasswordField id="new-password" label="New password" value={password} onChange={setPassword} />
              <PasswordField id="confirm-password" label="Confirm password" value={confirmation} onChange={setConfirmation} />
              {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-2xl bg-gradient-to-r from-primary to-secondary shadow-glow"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          required
          id={id}
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="form-input pl-10"
          placeholder="8+ characters"
        />
      </div>
    </div>
  );
}
