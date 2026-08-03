'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function AccountSettingsPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSaved(false);
    if (password.length < 8) return setError('Use a password with at least 8 characters.');
    if (password !== confirmation) return setError('The passwords do not match.');
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) return setError('Your password could not be changed. Sign in again and retry.');
    setPassword('');
    setConfirmation('');
    setSaved(true);
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-20 pt-28">
      <div className="glass-strong rounded-3xl p-6 shadow-glass sm:p-8">
        <div className="flex items-center gap-3"><KeyRound className="h-6 w-6 text-primary" /><div><h1 className="font-display text-2xl font-bold">Account security</h1><p className="text-sm text-muted-foreground">Change the password for your signed-in account.</p></div></div>
        <form onSubmit={updatePassword} className="mt-8 max-w-md space-y-4">
          <label className="block text-sm font-semibold">New password<input className="form-input mt-1.5" type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <label className="block text-sm font-semibold">Confirm new password<input className="form-input mt-1.5" type="password" minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
          {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          {saved && <p role="status" className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" />Password changed successfully.</p>}
          <Button type="submit" disabled={loading} className="rounded-xl">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Change password'}</Button>
        </form>
        <p className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">Need to manage uploaded content? <Link href="/dashboard" className="font-semibold text-primary hover:underline">Open your dashboard</Link>.</p>
      </div>
    </main>
  );
}
