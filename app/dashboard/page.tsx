'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Upload,
  Download,
  Bookmark,
  Bell,
  Trophy,
  Settings,
  TrendingUp,
  FileStack,
  Eye,
  Star,
  BadgeCheck,
  Zap,
  Award,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResourceCard, formatCount } from '@/components/resource-card';
import { resources, contributors, badges, notifications } from '@/lib/data';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'uploads', label: 'My Uploads', icon: Upload },
  { id: 'downloads', label: 'Downloads', icon: Download },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
  { id: 'notifications', label: 'Notifications', icon: Bell },
] as const;

type TabId = (typeof tabs)[number]['id'];

const notifIcons: Record<string, LucideIcon> = {
  download: Download,
  like: Star,
  badge: Award,
  comment: FileStack,
  summary: TrendingUp,
};

export default function DashboardPage() {
  const [tab, setTab] = useState<TabId>('overview');

  const user = contributors[0];
  const myUploads = resources.filter((r) => r.uploader === user.name);
  const myDownloads = resources.slice(2, 6);
  const myBookmarks = resources.filter((r) => r.featured).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* profile header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8"
      >
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 blur-3xl" />
        <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-secondary text-2xl font-bold text-white shadow-glow">
              {user.avatar}
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-card shadow-md">
              <BadgeCheck className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold">{user.name}</h1>
              <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-xs font-bold text-white">
                {user.badge}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{user.university} • Level {user.level}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Sharing knowledge, one upload at a time.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl bg-muted/50 px-5 py-3 text-center">
              <div className="flex items-center gap-1 font-display text-xl font-bold text-primary">
                <Zap className="h-4 w-4" />
                {formatCount(user.points)}
              </div>
              <div className="text-xs text-muted-foreground">XP Points</div>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl self-center">
              <Settings className="mr-1.5 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* level progress */}
        <div className="relative z-10 mt-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Level {user.level}</span>
            <span>{formatCount(user.points)} / 20,000 XP</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(user.points / 20000) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
            />
          </div>
        </div>
      </motion.div>

      {/* stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Uploads', value: user.uploads, icon: Upload, color: 'from-primary to-secondary' },
          { label: 'Downloads', value: user.downloads, icon: Download, color: 'from-success to-accent' },
          { label: 'Followers', value: 1280, icon: BadgeCheck, color: 'from-accent to-primary' },
          { label: 'Avg Rating', value: 4.8, icon: Star, color: 'from-amber-500 to-orange-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-soft"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-md`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 font-display text-2xl font-bold">
              {typeof stat.value === 'number' && stat.value > 1000 ? formatCount(stat.value) : stat.value}
            </div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* tabs */}
      <div className="mt-8 flex gap-2 overflow-x-auto scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-primary text-white shadow-glow'
                : 'border border-border bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.id === 'notifications' && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white">
                {notifications.filter((n) => !n.read).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* tab content */}
      <div className="mt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {tab === 'overview' && <OverviewTab user={user} uploads={myUploads} />}
            {tab === 'uploads' && <ResourceGrid resources={myUploads} emptyMessage="You haven't uploaded any resources yet." />}
            {tab === 'downloads' && <ResourceGrid resources={myDownloads} emptyMessage="No downloads yet." />}
            {tab === 'bookmarks' && <ResourceGrid resources={myBookmarks} emptyMessage="No bookmarks yet." />}
            {tab === 'achievements' && <AchievementsTab />}
            {tab === 'notifications' && <NotificationsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function OverviewTab({ user, uploads }: { user: typeof contributors[0]; uploads: typeof resources }) {
  return (
    <div className="space-y-8">
      {/* recent activity chart */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Activity this week</h3>
          <span className="inline-flex items-center gap-1 text-sm text-success">
            <TrendingUp className="h-4 w-4" />
            +18%
          </span>
        </div>
        <div className="mt-6 flex items-end justify-between gap-2 h-40">
          {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 rounded-t-lg bg-gradient-to-t from-primary/40 to-primary"
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </div>

      {/* recent uploads */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Recent uploads</h3>
          <Link href="/upload" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            Upload new
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {uploads.slice(0, 3).map((r, i) => (
            <ResourceCard key={r.id} resource={r} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ResourceGrid({ resources: items, emptyMessage }: { resources: typeof resources; emptyMessage: string }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card p-12 text-center shadow-soft">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <FileStack className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{emptyMessage}</p>
        <Button className="mt-4 rounded-xl" asChild>
          <Link href="/upload">Upload a resource</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((r, i) => (
        <ResourceCard key={r.id} resource={r} index={i} />
      ))}
    </div>
  );
}

function AchievementsTab() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {badges.map((badge, i) => (
        <motion.div
          key={badge.name}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: i * 0.06 }}
          className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft"
        >
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${badge.color} text-white shadow-lg`}>
            <Trophy className="h-7 w-7" />
          </div>
          <div>
            <div className="font-semibold">{badge.name}</div>
            <div className="text-sm text-muted-foreground">{badge.description}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function NotificationsTab() {
  return (
    <div className="space-y-3">
      {notifications.map((n, i) => {
        const Icon = notifIcons[n.type] ?? Bell;
        return (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className={cn(
              'flex items-start gap-4 rounded-2xl border bg-card p-4 shadow-soft',
              n.read ? 'border-border' : 'border-primary/30 bg-primary/5'
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{n.title}</span>
                {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
              <span className="mt-1 block text-xs text-muted-foreground">{n.time}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
