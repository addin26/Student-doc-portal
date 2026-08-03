'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  BadgeCheck,
  Crown,
  Medal,
  TrendingUp,
  Upload,
  Download,
  Zap,
} from 'lucide-react';
import { contributors } from '@/lib/data';
import { formatCount } from '@/components/resource-card';
import { cn } from '@/lib/utils';

const periods = ['This Month', 'All Time', 'This Week'] as const;

const badgeColors: Record<string, string> = {
  Diamond: 'from-cyan-400 to-blue-500',
  Platinum: 'from-slate-300 to-slate-500',
  Gold: 'from-amber-400 to-orange-500',
  Silver: 'from-slate-200 to-slate-400',
  Bronze: 'from-orange-300 to-amber-600',
};

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<(typeof periods)[number]>('This Month');

  const top3 = contributors.slice(0, 3);
  const rest = contributors.slice(3);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-600 dark:bg-amber-500/10">
          <Trophy className="h-4 w-4" />
          Leaderboard
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Top Contributors
        </h1>
        <p className="mt-2 text-muted-foreground">
          The students who power the StudyDock community.
        </p>
      </motion.div>

      {/* period selector */}
      <div className="mt-8 flex justify-center">
        <div className="inline-flex gap-1 rounded-2xl border border-border bg-card p-1 shadow-soft">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-medium transition-all',
                period === p ? 'bg-primary text-white shadow-glow' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* podium */}
      <div className="mt-12 grid grid-cols-3 gap-4 items-end">
        {/* 2nd */}
        <PodiumCard contributor={top3[1]} place={2} delay={0.1} />
        {/* 1st */}
        <PodiumCard contributor={top3[0]} place={1} delay={0} />
        {/* 3rd */}
        <PodiumCard contributor={top3[2]} place={3} delay={0.2} />
      </div>

      {/* rest of leaderboard */}
      <div className="mt-10 space-y-3">
        {rest.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.06 }}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:shadow-glass"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">
              {c.rank}
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
              {c.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-semibold">{c.name}</span>
                {c.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
                <span className={cn('shrink-0 rounded-full bg-gradient-to-r px-2 py-0.5 text-[10px] font-bold text-white', badgeColors[c.badge] ?? badgeColors.Bronze)}>
                  {c.badge}
                </span>
              </div>
              <div className="truncate text-xs text-muted-foreground">{c.university} • Level {c.level}</div>
            </div>
            <div className="hidden gap-6 text-center sm:flex">
              <div>
                <div className="flex items-center gap-1 text-sm font-bold">
                  <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                  {c.uploads}
                </div>
                <div className="text-[10px] text-muted-foreground">Uploads</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-sm font-bold">
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatCount(c.downloads)}
                </div>
                <div className="text-[10px] text-muted-foreground">Downloads</div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 font-bold text-primary">
                <Zap className="h-3.5 w-3.5" />
                {formatCount(c.points)}
              </div>
              <div className="text-[10px] text-muted-foreground">XP</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* your rank CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mt-10 flex flex-col items-center justify-between gap-4 rounded-3xl border border-border bg-gradient-to-br from-primary/5 to-secondary/5 p-6 sm:flex-row"
      >
        <div>
          <h3 className="font-display text-lg font-semibold">Climb the leaderboard</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload resources and help the community to earn XP and climb the ranks.
          </p>
        </div>
        <a
          href="/upload"
          className="shrink-0 rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-105"
        >
          Upload a resource
        </a>
      </motion.div>
    </div>
  );
}

function PodiumCard({ contributor, place, delay }: { contributor: typeof contributors[0]; place: number; delay: number }) {
  const placeConfig = {
    1: { icon: Crown, color: 'from-amber-400 to-orange-500', height: 'h-44', ring: 'ring-amber-400/50', label: '1st' },
    2: { icon: Medal, color: 'from-slate-300 to-slate-500', height: 'h-36', ring: 'ring-slate-400/50', label: '2nd' },
    3: { icon: Medal, color: 'from-orange-300 to-amber-600', height: 'h-32', ring: 'ring-orange-400/50', label: '3rd' },
  };
  const config = placeConfig[place as 1 | 2 | 3];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center"
    >
      <div className="relative">
        <div className={cn('flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-lg font-bold text-white ring-4 shadow-lg md:h-20 md:w-20', config.ring)}>
          {contributor.avatar}
        </div>
        <div className={cn('absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md', config.color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className={cn('mt-3 flex w-full flex-col items-center rounded-2xl border border-border bg-card p-4 shadow-soft', config.height)}>
        <span className="text-sm font-semibold">{contributor.name.split(' ')[0]}</span>
        <span className="mt-0.5 text-xs text-muted-foreground">{contributor.university.split(' ').slice(-1)}</span>
        <div className="mt-auto pt-3">
          <div className="flex items-center gap-1 font-display text-lg font-bold text-primary">
            <Zap className="h-3.5 w-3.5" />
            {formatCount(contributor.points)}
          </div>
          <div className="text-center text-[10px] text-muted-foreground">XP • {config.label}</div>
        </div>
      </div>
    </motion.div>
  );
}
