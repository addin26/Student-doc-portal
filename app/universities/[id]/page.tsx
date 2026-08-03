'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, FileStack, Building2, TrendingUp, ChevronRight } from 'lucide-react';
import { universities, resources, contributors } from '@/lib/data';
import { ResourceCard, formatCount } from '@/components/resource-card';
import { Button } from '@/components/ui/button';

export default function UniversityDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const uni = universities.find((u) => u.id === id) ?? universities[0];

  const uniResources = resources.filter((r) => r.university === uni.name);
  const uniContributors = contributors.filter((c) => c.university === uni.name);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link href="/universities" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        All universities
      </Link>

      {/* hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative mt-6 overflow-hidden rounded-[2rem] border border-border bg-card p-8 shadow-soft md:p-12"
      >
        <div className={`absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gradient-to-br ${uni.color} opacity-15 blur-3xl`} />
        <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-center">
          <div className={`flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${uni.color} text-2xl font-bold text-white shadow-lg`}>
            {uni.short}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{uni.name}</h1>
            <p className="mt-1 text-muted-foreground">{uni.country}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <FileStack className="h-4 w-4 text-primary" />
                <span className="font-semibold">{formatCount(uni.resources)}</span> resources
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-accent" />
                <span className="font-semibold">{formatCount(uni.contributors)}</span> contributors
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-secondary" />
                <span className="font-semibold">{uni.departments}</span> departments
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* departments */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">Departments</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {uni.departments_list.map((dept, i) => (
            <motion.div
              key={dept}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.3) }}
            >
              <Link href={`/explore?category=${encodeURIComponent(dept)}`}>
                <div className="card-hover flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{dept}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* popular subjects */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">Popular Subjects</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          {uni.popularSubjects.map((subject, i) => (
            <motion.div
              key={subject}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <Link href={`/explore?category=${encodeURIComponent(subject)}`}>
                <div className="card-hover inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-soft">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {subject}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* top contributors */}
      {uniContributors.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold">Top Contributors</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uniContributors.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
                  {c.avatar}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">Level {c.level} • {c.uploads} uploads</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-primary">{formatCount(c.points)}</div>
                  <div className="text-xs text-muted-foreground">XP</div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* resources */}
      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Resources from {uni.short}</h2>
          <Link href="/explore" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {uniResources.length > 0 ? (
            uniResources.map((r, i) => (
              <ResourceCard key={r.id} resource={r} index={i} />
            ))
          ) : (
            <p className="col-span-full text-sm text-muted-foreground">No resources yet for this university.</p>
          )}
        </div>
      </section>
    </div>
  );
}
