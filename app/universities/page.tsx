'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, ChevronRight, Building2 } from 'lucide-react';
import { universities } from '@/lib/data';
import { formatCount } from '@/components/resource-card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function UniversitiesPage() {
  const [query, setQuery] = useState('');

  const filtered = universities.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.country.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Universities
        </h1>
        <p className="mt-2 text-muted-foreground">
          Explore resources from {universities.length * 40}+ universities worldwide.
        </p>
      </motion.div>

      <div className="mt-8 relative max-w-xl">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search universities..."
          className="h-12 w-full rounded-2xl border border-border bg-card pl-12 pr-4 text-sm shadow-soft outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((uni, i) => (
          <motion.div
            key={uni.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: Math.min(i * 0.08, 0.4) }}
          >
            <Link href={`/universities/${uni.id}`}>
              <div className="card-hover relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft">
                <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${uni.color} opacity-10 blur-2xl`} />
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${uni.color} text-lg font-bold text-white shadow-lg`}>
                    {uni.short}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold leading-tight">{uni.name}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{uni.country}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-6 text-sm">
                  <div>
                    <div className="font-semibold">{formatCount(uni.resources)}</div>
                    <div className="text-xs text-muted-foreground">Resources</div>
                  </div>
                  <div>
                    <div className="font-semibold">{formatCount(uni.contributors)}</div>
                    <div className="text-xs text-muted-foreground">Contributors</div>
                  </div>
                  <div>
                    <div className="font-semibold">{uni.departments}</div>
                    <div className="text-xs text-muted-foreground">Depts</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {uni.popularSubjects.slice(0, 3).map((s) => (
                    <span key={s} className="rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Explore resources
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Building2 className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">No universities found</h3>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search.</p>
        </div>
      )}

      <div className="mt-12 rounded-3xl border border-border bg-gradient-to-br from-primary/5 to-secondary/5 p-8 text-center">
        <h3 className="font-display text-xl font-semibold">Don&apos;t see your university?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You can still upload and access resources — list it during upload.
        </p>
        <Button className="mt-4 rounded-xl" asChild>
          <Link href="/upload">Upload your first resource</Link>
        </Button>
      </div>
    </div>
  );
}
