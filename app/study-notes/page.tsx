'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  NotebookPen,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Sparkles,
  Copy,
  Check,
  Save,
  Plus,
  Clock,
  FileText,
  Loader2,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

type Note = {
  id: string;
  title: string;
  content: string;
  date: string;
  duration?: string;
  hasRecording?: boolean;
  summary?: string;
};

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: {
    resultIndex: number;
    results: {
      length: number;
      [index: number]: { isFinal: boolean; 0: { transcript: string } };
    };
  }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export default function StudyNotesPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlsRef = useRef<Record<string, string>>({});
  const recordingSecondsRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;
  const autosaveNoteId = activeNote?.id;
  const autosaveTitle = activeNote?.title;
  const autosaveContent = activeNote?.content;

  // Auth gate + initial load
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }
      setAuthChecked(true);
      await loadNotes();
    })();
  }, [router]);

  const loadNotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('study_notes')
      .select('id, title, content, has_recording, recording_duration, summary, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to load notes:', error.message);
      setLoading(false);
      return;
    }

    const mapped: Note[] = (data ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      date: new Date(n.updated_at).toISOString().split('T')[0],
      hasRecording: false,
      duration: undefined,
      summary: n.summary,
    }));

    setNotes(mapped);
    if (mapped.length > 0) {
      setActiveNoteId(mapped[0].id);
      setSummary(mapped[0].summary ?? '');
    }
    setLoading(false);
  };

  const updateNoteLocal = (id: string, patch: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  useEffect(() => {
    if (!authChecked || loading || !autosaveNoteId) return;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      setSaved(false);
      setNoteError('');
      const { error } = await supabase
        .from('study_notes')
        .update({ title: autosaveTitle ?? '', content: autosaveContent ?? '' })
        .eq('id', autosaveNoteId);
      setSaving(false);
      if (error) {
        setNoteError('Autosave failed. Your latest text remains in this browser tab; try saving again.');
      } else {
        setSaved(true);
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [authChecked, autosaveContent, autosaveNoteId, autosaveTitle, loading]);

  const createNote = async () => {
    const { data, error } = await supabase
      .from('study_notes')
      .insert({ title: 'Untitled note', content: '' })
      .select('id, title, content, created_at, updated_at')
      .maybeSingle();

    if (error || !data) {
      alert('Could not create note. Please try again.');
      return;
    }

    const newNote: Note = {
      id: data.id,
      title: data.title,
      content: data.content,
      date: new Date(data.updated_at).toISOString().split('T')[0],
    };
    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setSummary('');
  };

  const deleteNote = async (id: string) => {
    const note = notes.find((item) => item.id === id);
    if (!window.confirm(`Delete “${note?.title || 'Untitled note'}”? This cannot be undone.`)) return;
    const { error } = await supabase.from('study_notes').delete().eq('id', id);
    if (error) {
      alert('Could not delete note. Please try again.');
      return;
    }
    setNotes((prev) => {
      const filtered = prev.filter((n) => n.id !== id);
      if (id === activeNoteId && filtered.length > 0) {
        setActiveNoteId(filtered[0].id);
        setSummary(filtered[0].summary ?? '');
      } else if (filtered.length === 0) {
        setActiveNoteId(null);
        setSummary('');
      }
      return filtered;
    });
  };

  const handleSave = async () => {
    if (!activeNote) return;
    setSaving(true);
    setNoteError('');
    const { error } = await supabase
      .from('study_notes')
      .update({
        title: activeNote.title,
        content: activeNote.content,
        summary: summary || null,
      })
      .eq('id', activeNote.id);

    setSaving(false);
    if (error) {
      setNoteError('Could not save this note. Please try again.');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Recording
  const startRecording = useCallback(async () => {
    if (!activeNoteId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrls((prev) => {
          if (prev[activeNoteId]) URL.revokeObjectURL(prev[activeNoteId]);
          const next = { ...prev, [activeNoteId]: url };
          audioUrlsRef.current = next;
          return next;
        });
        const duration = formatTime(recordingSecondsRef.current);
        updateNoteLocal(activeNoteId, { hasRecording: true, duration });
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordingSecondsRef.current = 0;
      timerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingTime(recordingSecondsRef.current);
      }, 1000);
    } catch {
      alert('Could not access microphone. Please allow microphone permissions and try again.');
    }
  }, [activeNoteId]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const togglePlayback = (noteId: string) => {
    const url = audioUrls[noteId];
    if (!url) return;
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
      audioPlayerRef.current.onended = () => setPlayingId(null);
    }
    if (playingId === noteId) {
      audioPlayerRef.current.pause();
      setPlayingId(null);
    } else {
      audioPlayerRef.current.src = url;
      audioPlayerRef.current.play();
      setPlayingId(noteId);
    }
  };

  const startTranscription = () => {
    if (!activeNoteId) return;
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setNoteError('Live transcription is not supported in this browser. You can continue typing notes manually.');
      return;
    }

    setNoteError('');
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      setInterimTranscript(interimText.trim());
      if (finalText.trim()) {
        setNotes((current) => current.map((note) => note.id === activeNoteId
          ? { ...note, content: `${note.content}${note.content.trim() ? '\n' : ''}${finalText.trim()}` }
          : note));
      }
    };
    recognition.onerror = (event) => {
      setNoteError(`Live transcription stopped: ${event.error}. You can edit or save the captured text.`);
      setIsTranscribing(false);
    };
    recognition.onend = () => {
      setIsTranscribing(false);
      setInterimTranscript('');
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsTranscribing(true);
  };

  const stopTranscription = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsTranscribing(false);
    setInterimTranscript('');
  };

  // Summarize
  const handleSummarize = async () => {
    if (!activeNote?.content.trim()) {
      alert('Add some notes or record your lecture first, then try summarizing.');
      return;
    }
    setSummarizing(true);
    setSummary('');
    setNoteError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ documentText: activeNote.content, title: activeNote.title }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Summary generation failed.');
      setSummary(body.summary);
      updateNoteLocal(activeNote.id, { summary: body.summary });
      const { error } = await supabase
        .from('study_notes')
        .update({ summary: body.summary })
        .eq('id', activeNote.id);
      if (error) throw new Error('The summary was generated but could not be saved.');
    } catch (summaryError) {
      setNoteError(summaryError instanceof Error ? summaryError.message : 'Summary generation failed.');
    } finally {
      setSummarizing(false);
    }
  };

  const copySummary = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    setSpeechSupported(Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition));
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      recognitionRef.current?.stop();
      Object.values(audioUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Auth gate screen
  if (!authChecked) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Empty state — no notes yet
  if (!loading && notes.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-glow">
              <NotebookPen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">In Class Study Notes</h1>
              <p className="mt-1 text-muted-foreground">Take notes, record your lecture, and get an instant AI summary.</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-12 flex flex-col items-center rounded-3xl border border-border bg-card p-12 text-center shadow-soft"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <NotebookPen className="h-8 w-8" />
          </div>
          <h2 className="mt-4 font-display text-xl font-semibold">No notes yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Create your first note to start taking notes, recording lectures, and generating summaries.
          </p>
          <Button
            onClick={createNote}
            className="mt-6 rounded-2xl bg-gradient-to-r from-primary to-secondary shadow-glow"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create your first note
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-glow">
            <NotebookPen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">In Class Study Notes</h1>
            <p className="mt-1 text-muted-foreground">Take notes, record your lecture, and get an instant AI summary.</p>
          </div>
        </div>
      </motion.div>

      {noteError && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {noteError}
        </div>
      )}

      {loading ? (
        <div className="mt-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* sidebar — note list */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="space-y-3">
            <Button onClick={createNote} className="h-11 w-full justify-start rounded-2xl bg-gradient-to-r from-primary to-secondary shadow-glow">
              <Plus className="mr-2 h-4.5 w-4.5" />
              New note
            </Button>
            <div className="space-y-2 rounded-2xl border border-border bg-card p-2 shadow-soft lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => {
                    recognitionRef.current?.stop();
                    setActiveNoteId(note.id);
                    setSummary(note.summary ?? '');
                    if (playingId) {
                      audioPlayerRef.current?.pause();
                      setPlayingId(null);
                    }
                  }}
                  className={cn(
                    'w-full rounded-xl p-3 text-left transition-all',
                    note.id === activeNoteId ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{note.title || 'Untitled'}</span>
                    {note.hasRecording && <Mic className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{note.content.slice(0, 80) || 'Empty note'}</p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {note.date}
                    </span>
                    {note.duration && (
                      <span className="inline-flex items-center gap-1">
                        <Mic className="h-3 w-3" />
                        {note.duration}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* main — editor + recorder + summarizer */}
          {activeNote && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="space-y-5">
              {/* notepad */}
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Notepad
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => deleteNote(activeNote.id)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" aria-label="Delete note">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                        saved ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary hover:bg-primary/20'
                      )}
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                      {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <input
                    value={activeNote.title}
                    onChange={(e) => updateNoteLocal(activeNote.id, { title: e.target.value })}
                    placeholder="Note title..."
                    className="w-full bg-transparent font-display text-lg font-semibold outline-none placeholder:text-muted-foreground/50"
                  />
                  <textarea
                    value={activeNote.content}
                    onChange={(e) => updateNoteLocal(activeNote.id, { content: e.target.value })}
                    placeholder="Start taking notes..."
                    className="mt-3 h-64 w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              {/* voice recorder */}
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
                <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-sm text-muted-foreground">
                  <Mic className="h-4 w-4" />
                  Voice Recorder
                </div>
                <div className="flex flex-col items-center gap-5 p-8">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn(
                      'relative flex h-20 w-20 items-center justify-center rounded-full transition-all',
                      isRecording ? 'bg-destructive text-white shadow-[0_0_40px_rgba(239,68,68,0.4)]' : 'bg-gradient-to-br from-primary to-secondary text-white shadow-glow hover:scale-105'
                    )}
                  >
                    {isRecording ? <Square className="h-7 w-7 fill-current" /> : <Mic className="h-8 w-8" />}
                    {isRecording && <span className="absolute inset-0 animate-ping rounded-full bg-destructive/30" />}
                  </button>

                  <div className="text-center">
                    {isRecording ? (
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
                        <span className="font-display text-2xl font-bold tabular-nums text-destructive">{formatTime(recordingTime)}</span>
                        <span className="text-sm text-muted-foreground">Recording...</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {activeNote.hasRecording ? 'Temporary recording available in this browser tab' : 'Click the mic to start a temporary recording'}
                      </p>
                    )}
                  </div>

                  {activeNote.hasRecording && !isRecording && (
                    <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3">
                      <button disabled={!audioUrls[activeNote.id]} onClick={() => togglePlayback(activeNote.id)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40">
                        {playingId === activeNote.id ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </button>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Lecture recording</div>
                        <div className="text-xs text-muted-foreground">Duration: {activeNote.duration ?? 'Unknown'}</div>
                      </div>
                      {audioUrls[activeNote.id] && (
                        <a href={audioUrls[activeNote.id]} download={`${activeNote.title || 'recording'}.webm`} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary">
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  )}
                  <p className="max-w-md text-center text-xs text-muted-foreground">
                    Recordings are temporary object URLs and are not persisted. Download the WebM file before leaving this tab if you need to keep it.
                  </p>
                  <div className="w-full max-w-md rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Live speech-to-text</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {speechSupported ? 'Final speech segments are appended to the editable notepad.' : 'Not supported by this browser; manual notes remain available.'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant={isTranscribing ? 'destructive' : 'outline'}
                        size="sm"
                        disabled={!speechSupported}
                        onClick={isTranscribing ? stopTranscription : startTranscription}
                        className="shrink-0 rounded-xl"
                      >
                        {isTranscribing ? <><Square className="mr-1.5 h-3.5 w-3.5" />Stop</> : <><Mic className="mr-1.5 h-3.5 w-3.5" />Transcribe</>}
                      </Button>
                    </div>
                    {interimTranscript && <p className="mt-3 text-xs italic text-muted-foreground" aria-live="polite">{interimTranscript}</p>}
                  </div>
                </div>
              </div>

              {/* AI summarizer */}
              <div className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 shadow-soft">
                <div className="flex items-center justify-between border-b border-primary/10 px-5 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Sparkles className="h-4 w-4" />
                    Gemini AI Summarizer
                  </div>
                  <Button onClick={handleSummarize} disabled={summarizing || !activeNote.content.trim()} size="sm" className="rounded-xl bg-gradient-to-r from-primary to-secondary">
                    {summarizing ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Summarizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Summarize
                      </>
                    )}
                  </Button>
                </div>
                <div className="p-5">
                  <AnimatePresence mode="wait">
                    {summarizing ? (
                      <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-primary/20" />
                        <div className="h-4 w-full animate-pulse rounded bg-primary/10" />
                        <div className="h-4 w-5/6 animate-pulse rounded bg-primary/10" />
                        <div className="h-4 w-2/3 animate-pulse rounded bg-primary/15" />
                      </motion.div>
                    ) : summary ? (
                      <motion.div key="summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                            AI-generated summary
                          </span>
                          <button onClick={copySummary} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
                            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="whitespace-pre-wrap rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground/90">{summary}</div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          AI-generated content can contain errors. Verify important details against your original notes.
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-6 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Sparkles className="h-6 w-6" />
                        </div>
                        <p className="mt-3 text-sm font-medium">Get an instant summary</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                          Click &quot;Summarize&quot; to analyze the saved text in this note. Temporary audio is not sent to Gemini.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
