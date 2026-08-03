'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { ResourceCard } from '@/components/resource-card';
import { resources, universities, categories } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const sortOptions = [
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
  { value: 'downloads', label: 'Most Downloaded' },
  { value: 'rating', label: 'Highest Rated' },
];

const fileTypes = ['pdf', 'ppt', 'docx', 'zip', 'img', 'xlsx', 'video'];

function ExploreContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [university, setUniversity] = useState('all');
  const [fileType, setFileType] = useState('all');
  const [sort, setSort] = useState('trending');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = [...resources];
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.subject.toLowerCase().includes(q) ||
          r.courseCode.toLowerCase().includes(q) ||
          r.university.toLowerCase().includes(q) ||
          r.tags.some((t) => t.includes(q))
      );
    }
    if (category !== 'all') result = result.filter((r) => r.category === category);
    if (university !== 'all') result = result.filter((r) => r.university === university);
    if (fileType !== 'all') result = result.filter((r) => r.fileType === fileType);

    switch (sort) {
      case 'newest':
        result.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
        break;
      case 'downloads':
        result.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'trending':
      default:
        result.sort((a, b) => Number(b.trending) - Number(a.trending) || b.downloads - a.downloads);
    }
    return result;
  }, [query, category, university, fileType, sort]);

  const activeFilters =
    (category !== 'all' ? 1 : 0) +
    (university !== 'all' ? 1 : 0) +
    (fileType !== 'all' ? 1 : 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Explore Resources
        </h1>
        <p className="mt-2 text-muted-foreground">
          Search through {resources.length * 10000}+ resources from universities worldwide.
        </p>
      </motion.div>

      {/* search bar */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by subject, course code, university, or keyword..."
            className="h-12 w-full rounded-2xl border border-border bg-card pl-12 pr-4 text-sm shadow-soft outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          className="h-12 shrink-0 rounded-2xl"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
          {activeFilters > 0 && (
            <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {activeFilters}
            </span>
          )}
        </Button>
      </div>

      {/* filters panel */}
      <motion.div
        initial={false}
        animate={{ height: showFilters ? 'auto' : 0, opacity: showFilters ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="mt-4 grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft md:grid-cols-3">
          <FilterGroup label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="filter-select"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FilterGroup>
          <FilterGroup label="University">
            <select
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              className="filter-select"
            >
              <option value="all">All universities</option>
              {universities.map((u) => (
                <option key={u.id} value={u.name}>{u.name}</option>
              ))}
            </select>
          </FilterGroup>
          <FilterGroup label="File type">
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All types</option>
              {fileTypes.map((t) => (
                <option key={t} value={t}>{t.toUpperCase()}</option>
              ))}
            </select>
          </FilterGroup>
        </div>
      </motion.div>

      {/* sort + count */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{filtered.length}</span> resources found
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by</span>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="filter-select w-auto"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* results grid */}
      {filtered.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource, i) => (
            <ResourceCard key={resource.id} resource={resource} index={i} />
          ))}
        </div>
      ) : (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Search className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">No resources found</h3>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
          <Button
            variant="outline"
            className="mt-4 rounded-xl"
            onClick={() => {
              setQuery('');
              setCategory('all');
              setUniversity('all');
              setFileType('all');
            }}
          >
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8">Loading...</div>}>
      <ExploreContent />
    </Suspense>
  );
}
