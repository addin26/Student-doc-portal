'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { ResourceCard } from '@/components/resource-card';
import type {
  CatalogOptions,
  Resource,
  ResourceSearchResponse,
} from '@/lib/catalog-types';
import { Button } from '@/components/ui/button';

const sortOptions = [
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
  { value: 'downloads', label: 'Most Downloaded' },
  { value: 'rating', label: 'Highest Rated' },
] as const;

const fileTypes = ['pdf', 'ppt', 'docx', 'zip', 'img', 'xlsx', 'video'] as const;
const emptyOptions: CatalogOptions = { universities: [], courses: [], categories: [] };

function safePage(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [queryInput, setQueryInput] = useState(searchParams.get('q') ?? '');
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? 'all');
  const [university, setUniversity] = useState(searchParams.get('university') ?? 'all');
  const [course, setCourse] = useState(searchParams.get('course') ?? 'all');
  const [fileType, setFileType] = useState(searchParams.get('fileType') ?? 'all');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'trending');
  const [page, setPage] = useState(safePage(searchParams.get('page')));
  const [showFilters, setShowFilters] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [options, setOptions] = useState<CatalogOptions>(emptyOptions);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setQuery(queryInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    const controller = new AbortController();
    setOptionsLoading(true);

    fetch('/api/catalog/options', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message ?? 'Filter options could not be loaded.');
        setOptions({
          universities: body.universities ?? [],
          courses: body.courses ?? [],
          categories: body.categories ?? [],
        });
      })
      .catch((fetchError) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        setError(fetchError instanceof Error ? fetchError.message : 'Filter options could not be loaded.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setOptionsLoading(false);
      });

    return () => controller.abort();
  }, [retryKey]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category !== 'all') params.set('category', category);
    if (university !== 'all') params.set('university', university);
    if (course !== 'all') params.set('course', course);
    if (fileType !== 'all') params.set('fileType', fileType);
    if (sort !== 'trending') params.set('sort', sort);
    if (page > 1) params.set('page', String(page));
    const nextUrl = params.size > 0 ? `/explore?${params.toString()}` : '/explore';
    router.replace(nextUrl, { scroll: false });
  }, [category, course, fileType, page, query, router, sort, university]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      q: query,
      sort,
      page: String(page),
      pageSize: '18',
    });
    if (category !== 'all') params.set('category', category);
    if (university !== 'all') params.set('university', university);
    if (course !== 'all') params.set('course', course);
    if (fileType !== 'all') params.set('fileType', fileType);

    setLoading(true);
    setError('');
    fetch(`/api/resources/search?${params.toString()}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const body = (await response.json()) as ResourceSearchResponse & {
          error?: { message?: string };
        };
        if (!response.ok) throw new Error(body.error?.message ?? 'Resources could not be loaded.');
        setResources(body.resources ?? []);
        setTotal(body.total ?? 0);
        setTotalPages(body.totalPages ?? 0);
      })
      .catch((fetchError) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        setResources([]);
        setTotal(0);
        setTotalPages(0);
        setError(fetchError instanceof Error ? fetchError.message : 'Resources could not be loaded.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [category, course, fileType, page, query, retryKey, sort, university]);

  const availableCourses = useMemo(
    () => options.courses.filter((item) => university === 'all' || item.universityId === university),
    [options.courses, university],
  );

  const activeFilters =
    (category !== 'all' ? 1 : 0) +
    (university !== 'all' ? 1 : 0) +
    (course !== 'all' ? 1 : 0) +
    (fileType !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setQueryInput('');
    setQuery('');
    setCategory('all');
    setUniversity('all');
    setCourse('all');
    setFileType('all');
    setPage(1);
  };

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
          Search approved study resources from the live StudyDock catalog.
        </p>
      </motion.div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Search by title, course code, university, topic, or keyword..."
            aria-label="Search resources"
            className="h-12 w-full rounded-2xl border border-border bg-card pl-12 pr-11 text-sm shadow-soft outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {queryInput && (
            <button
              type="button"
              onClick={() => setQueryInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          className="h-12 shrink-0 rounded-2xl"
          onClick={() => setShowFilters((current) => !current)}
          aria-expanded={showFilters}
          aria-controls="resource-filters"
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

      <motion.div
        id="resource-filters"
        initial={false}
        animate={{ height: showFilters ? 'auto' : 0, opacity: showFilters ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="mt-4 grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft md:grid-cols-2 lg:grid-cols-4">
          <FilterGroup label="Category">
            <select
              value={category}
              onChange={(event) => { setCategory(event.target.value); setPage(1); }}
              className="filter-select"
              disabled={optionsLoading}
            >
              <option value="all">All categories</option>
              {options.categories.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </FilterGroup>
          <FilterGroup label="University">
            <select
              value={university}
              onChange={(event) => {
                setUniversity(event.target.value);
                setCourse('all');
                setPage(1);
              }}
              className="filter-select"
              disabled={optionsLoading}
            >
              <option value="all">All universities</option>
              {options.universities.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </FilterGroup>
          <FilterGroup label="Course">
            <select
              value={course}
              onChange={(event) => { setCourse(event.target.value); setPage(1); }}
              className="filter-select"
              disabled={optionsLoading || availableCourses.length === 0}
            >
              <option value="all">All courses</option>
              {availableCourses.map((item) => (
                <option key={item.id} value={item.id}>{item.code} — {item.name}</option>
              ))}
            </select>
          </FilterGroup>
          <FilterGroup label="File type">
            <select
              value={fileType}
              onChange={(event) => { setFileType(event.target.value); setPage(1); }}
              className="filter-select"
            >
              <option value="all">All types</option>
              {fileTypes.map((item) => (
                <option key={item} value={item}>{item.toUpperCase()}</option>
              ))}
            </select>
          </FilterGroup>
        </div>
      </motion.div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {loading ? 'Loading resources…' : <><span className="font-semibold text-foreground">{total}</span> resources found</>}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="resource-sort" className="text-sm text-muted-foreground">Sort by</label>
          <select
            id="resource-sort"
            value={sort}
            onChange={(event) => { setSort(event.target.value); setPage(1); }}
            className="filter-select w-auto"
          >
            {sortOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading resources">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-80 animate-pulse rounded-3xl border border-border bg-card" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-12 rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center" role="alert">
          <h2 className="font-display text-lg font-semibold">Resources could not be loaded</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-5 rounded-xl" onClick={() => setRetryKey((value) => value + 1)}>
            Try again
          </Button>
        </div>
      ) : resources.length > 0 ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource, index) => (
              <ResourceCard key={resource.id} resource={resource} index={index} />
            ))}
          </div>
          {totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Resource result pages">
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </nav>
          )}
        </>
      ) : (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Search className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold">No resources found</h2>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={clearFilters}>
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={(
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-24">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      )}
    >
      <ExploreContent />
    </Suspense>
  );
}
