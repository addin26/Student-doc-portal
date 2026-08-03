'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  Loader2,
  Medal,
  Trophy,
  Upload,
  Zap,
} from 'lucide-react';
import { formatCount } from '@/components/resource-card';
import { Button } from '@/components/ui/button';
import type { PublicContributor } from '@/lib/catalog-types';
import { cn } from '@/lib/utils';

const badgeColors: Record<string, string> = {
  Diamond: 'from-cyan-400 to-blue-500',
  Platinum: 'from-slate-300 to-slate-500',
  Gold: 'from-amber-400 to-orange-500',
  Silver: 'from-slate-200 to-slate-400',
  Bronze: 'from-orange-300 to-amber-600',
  Newbie: 'from-indigo-400 to-purple-500',
};

export default function LeaderboardPage() {
  const [contributors, setContributors] = useState<PublicContributor[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`/api/leaderboard?page=${page}&pageSize=20`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message ?? 'Leaderboard could not be loaded.');
        setContributors(body.contributors ?? []);
        setTotal(body.total ?? 0);
        setTotalPages(body.totalPages ?? 0);
      })
      .catch((fetchError) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        setContributors([]);
        setError(fetchError instanceof Error ? fetchError.message : 'Leaderboard could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, retryKey]);

  const podium = page === 1 && contributors.length >= 3 ? contributors.slice(0, 3) : [];
  const listed = podium.length ? contributors.slice(3) : contributors;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-600 dark:bg-amber-500/10"><Trophy className="h-4 w-4" />All-time leaderboard</div>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">Top Contributors</h1>
        <p className="mt-2 text-muted-foreground">Live contribution totals for {total} StudyDock community members.</p>
      </motion.div>

      {loading ? (
        <div className="flex min-h-[360px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : error ? (
        <div className="mt-12 rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center" role="alert"><h2 className="font-display text-lg font-semibold">Leaderboard unavailable</h2><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-5" onClick={() => setRetryKey((value) => value + 1)}>Try again</Button></div>
      ) : contributors.length === 0 ? (
        <div className="mt-16 rounded-3xl border border-border bg-card p-10 text-center shadow-soft"><Trophy className="mx-auto h-10 w-10 text-muted-foreground" /><h2 className="mt-4 font-display text-lg font-semibold">No contributors yet</h2><p className="mt-2 text-sm text-muted-foreground">The first verified uploads will populate this leaderboard.</p></div>
      ) : (
        <>
          {podium.length === 3 && (
            <div className="mt-12 grid grid-cols-3 items-end gap-4">
              <PodiumCard contributor={podium[1]} place={2} delay={0.1} />
              <PodiumCard contributor={podium[0]} place={1} delay={0} />
              <PodiumCard contributor={podium[2]} place={3} delay={0.2} />
            </div>
          )}

          <div className="mt-10 space-y-3">
            {listed.map((contributor, index) => (
              <motion.div key={contributor.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:shadow-glass">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">{contributor.rank}</div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">{contributor.avatar}</div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="truncate font-semibold">{contributor.name}</span>{contributor.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}<span className={cn('shrink-0 rounded-full bg-gradient-to-r px-2 py-0.5 text-[10px] font-bold text-white', badgeColors[contributor.badge] ?? badgeColors.Newbie)}>{contributor.badge}</span></div><div className="truncate text-xs text-muted-foreground">{contributor.university} · Level {contributor.level}</div></div>
                <div className="hidden gap-6 text-center sm:flex"><Metric icon={Upload} value={String(contributor.uploads)} label="Uploads" /><Metric icon={Download} value={formatCount(contributor.downloads)} label="Downloads" /></div>
                <div className="text-right"><div className="flex items-center gap-1 font-bold text-primary"><Zap className="h-3.5 w-3.5" />{formatCount(contributor.points)}</div><div className="text-[10px] text-muted-foreground">XP</div></div>
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Leaderboard pages"><Button variant="outline" className="rounded-xl" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span><Button variant="outline" className="rounded-xl" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></nav>}
        </>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mt-10 flex flex-col items-center justify-between gap-4 rounded-3xl border border-border bg-gradient-to-br from-primary/5 to-secondary/5 p-6 sm:flex-row"><div><h2 className="font-display text-lg font-semibold">Climb the leaderboard</h2><p className="mt-1 text-sm text-muted-foreground">Upload approved resources and help the community to earn XP.</p></div><a href="/upload" className="shrink-0 rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-105">Upload a resource</a></motion.div>
    </div>
  );
}
function Metric({ icon: Icon, value, label }: { icon: typeof Upload; value: string; label: string }) {
  return <div><div className="flex items-center gap-1 text-sm font-bold"><Icon className="h-3.5 w-3.5 text-muted-foreground" />{value}</div><div className="text-[10px] text-muted-foreground">{label}</div></div>;
}

function PodiumCard({ contributor, place, delay }: { contributor: PublicContributor; place: 1 | 2 | 3; delay: number }) {
  const placeConfig = {
    1: { icon: Crown, color: 'from-amber-400 to-orange-500', height: 'h-44', ring: 'ring-amber-400/50', label: '1st' },
    2: { icon: Medal, color: 'from-slate-300 to-slate-500', height: 'h-36', ring: 'ring-slate-400/50', label: '2nd' },
    3: { icon: Medal, color: 'from-orange-300 to-amber-600', height: 'h-32', ring: 'ring-orange-400/50', label: '3rd' },
  };
  const config = placeConfig[place];
  const Icon = config.icon;
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }} className="flex flex-col items-center"><div className="relative"><div className={cn('flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-lg font-bold text-white ring-4 shadow-lg md:h-20 md:w-20', config.ring)}>{contributor.avatar}</div><div className={cn('absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md', config.color)}><Icon className="h-4 w-4" /></div></div><div className={cn('mt-3 flex w-full flex-col items-center rounded-2xl border border-border bg-card p-4 shadow-soft', config.height)}><span className="text-center text-sm font-semibold">{contributor.name.split(' ')[0]}</span><span className="mt-0.5 max-w-full truncate text-xs text-muted-foreground">{contributor.university}</span><div className="mt-auto pt-3"><div className="flex items-center gap-1 font-display text-lg font-bold text-primary"><Zap className="h-3.5 w-3.5" />{formatCount(contributor.points)}</div><div className="text-center text-[10px] text-muted-foreground">XP · {config.label}</div></div></div></motion.div>
  );
}
