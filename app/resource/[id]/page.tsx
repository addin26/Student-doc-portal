'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  Download,
  Eye,
  Bookmark,
  Share2,
  Flag,
  BadgeCheck,
  Calendar,
  FileText,
  Tag,
  ThumbsUp,
  Send,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { resources } from '@/lib/data';
import { FILE_TYPE_META } from '@/lib/data';
import { ResourceCard, formatCount } from '@/components/resource-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const mockComments = [
  { id: '1', name: 'Priya Nair', avatar: 'PN', time: '2 days ago', text: 'This is incredibly well-organized. The section on neural networks saved me hours of studying. Thank you!', likes: 24, verified: true },
  { id: '2', name: 'Marcus Lee', avatar: 'ML', time: '4 days ago', text: 'Could you share the problem set solutions as a separate file? Would be super helpful.', likes: 8, verified: false },
  { id: '3', name: 'Ana Costa', avatar: 'AC', time: '1 week ago', text: 'Used this for my exam prep and got an A. Highly recommend!', likes: 41, verified: true },
];

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const resource = resources.find((r) => r.id === id) ?? resources[0];
  const ft = FILE_TYPE_META[resource.fileType];
  const related = resources.filter((r) => r.id !== resource.id && r.category === resource.category).slice(0, 3);

  const [bookmarked, setBookmarked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const handleDownload = async () => {
    setDownloadError('');
    setDownloading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setDownloadError('Registration required. Only registered users can download study resources.');
        setTimeout(() => router.push('/auth'), 1500);
        return;
      }

      const token = session.access_token;
      const res = await fetch(`/api/download/${id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate download link.');
      }

      const { downloadUrl } = await res.json();
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.download = resource.title;
      link.click();
    } catch (err: any) {
      setDownloadError(err.message || 'Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link href="/explore" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Back to explore
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* main content */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('rounded-lg px-2.5 py-1 text-xs font-bold', ft.bg, ft.color)}>
                {ft.label}
              </span>
              {resource.featured && (
                <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-600 dark:bg-amber-500/10">
                  Featured
                </span>
              )}
            </div>

            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-balance md:text-3xl">
              {resource.title}
            </h1>
            <p className="mt-3 text-muted-foreground">{resource.description}</p>

            {/* meta grid */}
            <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft sm:grid-cols-3">
              <MetaItem icon={FileText} label="Course Code" value={resource.courseCode} />
              <MetaItem icon={Calendar} label="Semester" value={resource.semester} />
              <MetaItem label="University" value={resource.universityShort} />
              <MetaItem label="Department" value={resource.department} />
              <MetaItem label="Subject" value={resource.subject} />
              <MetaItem label="File size" value={resource.fileSize} />
            </div>

            {/* tags */}
            <div className="mt-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Tags
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {resource.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/explore?category=${tag}`}
                    className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* AI Executive Summary section */}
            <div className="mt-8 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-soft">
              <div className="flex items-center gap-2 font-display text-lg font-bold text-primary">
                <Sparkles className="h-5 w-5" />
                Gemini AI Executive Summary
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                This document provides comprehensive coverage of key concepts, formulas, and structural problem sets. Recommended for exam preparation and quick review.
              </p>
            </div>

            {/* comments */}
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold">
                Comments <span className="text-muted-foreground">({mockComments.length})</span>
              </h2>
              <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-white">
                    YOU
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className="h-20 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" className="rounded-xl" disabled={!commentText.trim()}>
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {mockComments.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-white">
                      {c.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold">{c.name}</span>
                        {c.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                        <span className="text-xs text-muted-foreground">• {c.time}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground">{c.text}</p>
                      <button className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary">
                        <ThumbsUp className="h-3.5 w-3.5" />
                        {c.likes}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* sidebar */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="sticky top-24 space-y-4"
          >
            {/* download card */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                  <span className="font-display text-2xl font-bold">{resource.rating}</span>
                  <span className="text-sm text-muted-foreground">/ 5</span>
                </div>
                <span className="text-xs text-muted-foreground">{resource.ratingCount} ratings</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-muted/50 p-3">
                  <Download className="mx-auto h-4 w-4 text-muted-foreground" />
                  <div className="mt-1 text-sm font-bold">{formatCount(resource.downloads)}</div>
                  <div className="text-[10px] text-muted-foreground">Downloads</div>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <Eye className="mx-auto h-4 w-4 text-muted-foreground" />
                  <div className="mt-1 text-sm font-bold">{formatCount(resource.views)}</div>
                  <div className="text-[10px] text-muted-foreground">Views</div>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <Bookmark className="mx-auto h-4 w-4 text-muted-foreground" />
                  <div className="mt-1 text-sm font-bold">{formatCount(resource.bookmarks)}</div>
                  <div className="text-[10px] text-muted-foreground">Saves</div>
                </div>
              </div>

              {downloadError && (
                <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {downloadError}
                </p>
              )}

              <Button
                disabled={downloading}
                onClick={handleDownload}
                className="mt-5 h-12 w-full rounded-2xl bg-gradient-to-r from-primary to-secondary text-base shadow-glow disabled:opacity-50"
              >
                {downloading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
                {downloading ? 'Preparing R2 Link...' : 'Download Content'}
              </Button>

              <div className="mt-2 grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setBookmarked(!bookmarked)}
                >
                  <Bookmark className={cn('h-4 w-4', bookmarked && 'fill-primary text-primary')} />
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl text-destructive hover:text-destructive">
                  <Flag className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Cloudflare R2 Direct Stream • {resource.fileSize}
              </p>
            </div>

            {/* uploader card */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h3 className="text-sm font-semibold">Uploaded by</h3>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
                  {resource.uploaderAvatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">{resource.uploader}</span>
                    {resource.uploaderVerified && <BadgeCheck className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{resource.university}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon: Icon, label, value }: { icon?: any; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
