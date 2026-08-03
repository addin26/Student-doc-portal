'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  ChevronRight,
  Download,
  FileStack,
  Loader2,
  Star,
  Upload,
  Zap,
} from 'lucide-react';
import { ResourceCard, formatCount } from '@/components/resource-card';
import { Button } from '@/components/ui/button';
import type { Resource } from '@/lib/catalog-types';
import { cn } from '@/lib/utils';

type TabId = 'overview' | 'uploads';
type DashboardProfile = {
  id: string;
  name: string;
  avatar: string;
  university: string;
  points: number;
  level: number;
  uploads: number;
  downloads: number;
  badge: string;
  verified: boolean;
  averageRating: number;
};

export default function DashboardPage() {
  const [tab, setTab] = useState<TabId>('overview');
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch('/api/dashboard', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message ?? 'Dashboard could not be loaded.');
        setProfile(body.profile);
        setResources(body.resources ?? []);
      })
      .catch((fetchError) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        setProfile(null);
        setError(fetchError instanceof Error ? fetchError.message : 'Dashboard could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retryKey]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!profile) return <div className="mx-auto max-w-3xl px-4 py-20 text-center" role="alert"><div className="rounded-3xl border border-border bg-card p-10 shadow-soft"><h1 className="font-display text-2xl font-bold">Dashboard unavailable</h1><p className="mt-3 text-sm text-muted-foreground">{error}</p><Button className="mt-6" onClick={() => setRetryKey((value) => value + 1)}>Try again</Button></div></div>;

  const nextLevelTarget = Math.max(1000, profile.level * 2000);
  const levelProgress = Math.min(100, (profile.points / nextLevelTarget) * 100);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 blur-3xl" />
        <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-center">
          <div className="relative"><div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-secondary text-2xl font-bold text-white shadow-glow">{profile.avatar}</div>{profile.verified && <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-card shadow-md"><BadgeCheck className="h-5 w-5 text-primary" /></div>}</div>
          <div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-2xl font-bold">{profile.name}</h1><span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-xs font-bold text-white">{profile.badge}</span></div><p className="mt-1 text-sm text-muted-foreground">{profile.university} · Level {profile.level}</p><p className="mt-2 text-sm text-muted-foreground">Your private dashboard uses live profile and upload data.</p></div>
          <div className="rounded-2xl bg-muted/50 px-5 py-3 text-center"><div className="flex items-center gap-1 font-display text-xl font-bold text-primary"><Zap className="h-4 w-4" />{formatCount(profile.points)}</div><div className="text-xs text-muted-foreground">XP Points</div></div>
        </div>
        <div className="relative z-10 mt-6"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>Level {profile.level}</span><span>{formatCount(profile.points)} / {formatCount(nextLevelTarget)} XP</span></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"><motion.div initial={{ width: 0 }} animate={{ width: `${levelProgress}%` }} transition={{ duration: 1 }} className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" /></div></div>
      </motion.div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Uploads" value={profile.uploads} icon={Upload} color="from-primary to-secondary" />
        <Stat label="Downloads received" value={profile.downloads} icon={Download} color="from-success to-accent" />
        <Stat label="Visible upload rows" value={resources.length} icon={FileStack} color="from-accent to-primary" />
        <Stat label="Avg rating" value={profile.averageRating ? profile.averageRating.toFixed(1) : '—'} icon={Star} color="from-amber-500 to-orange-500" />
      </div>

      <div className="mt-8 flex gap-2" role="tablist" aria-label="Dashboard sections">
        {([{ id: 'overview', label: 'Overview', icon: Zap }, { id: 'uploads', label: 'My uploads', icon: Upload }] as const).map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={cn('inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all', tab === item.id ? 'bg-primary text-white shadow-glow' : 'border border-border bg-card text-muted-foreground hover:text-foreground')}><item.icon className="h-4 w-4" />{item.label}</button>)}
      </div>

      <div className="mt-6"><AnimatePresence mode="wait"><motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        {tab === 'overview' ? (
          <div><div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-semibold">Recent uploads</h2><p className="mt-1 text-sm text-muted-foreground">Pending, approved, and rejected resources visible to your account.</p></div><Link href="/upload" className="inline-flex items-center gap-1 text-sm font-medium text-primary">Upload new<ChevronRight className="h-4 w-4" /></Link></div><ResourceGrid resources={resources.slice(0, 6)} /></div>
        ) : <ResourceGrid resources={resources} />}
      </motion.div></AnimatePresence></div>
    </div>
  );
}
function Stat({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: typeof Upload; color: string }) {
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5 shadow-soft"><div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-md`}><Icon className="h-5 w-5" /></div><div className="mt-3 font-display text-2xl font-bold">{typeof value === 'number' ? formatCount(value) : value}</div><div className="text-xs text-muted-foreground">{label}</div></motion.div>;
}

function ResourceGrid({ resources }: { resources: Resource[] }) {
  if (!resources.length) return <div className="mt-5 flex flex-col items-center justify-center rounded-3xl border border-border bg-card p-12 text-center shadow-soft"><FileStack className="h-8 w-8 text-muted-foreground" /><p className="mt-4 text-sm text-muted-foreground">You have not uploaded any resources yet.</p><Button className="mt-4" asChild><Link href="/upload">Upload a resource</Link></Button></div>;
  return <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{resources.map((resource, index) => <ResourceCard key={resource.id} resource={resource} index={index} />)}</div>;
}
