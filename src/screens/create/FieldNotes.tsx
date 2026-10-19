// Field Notes — quick capture of text, voice, sketches, photos and links, connected to everything else.
// Also exports small capture building blocks (VoiceRecorder, useBlobUrl, TopicPicker, SaveStatus…) used by
// the other Create screens.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Camera, Check, Circle, Ellipsis, ExternalLink, Eye, EyeOff, FolderPlus, ImagePlus, Link as LinkIcon, Lock, Mic,
  NotebookPen, PenTool, Search, Shuffle, Square, Trash2, TriangleAlert, Type, type LucideIcon,
} from 'lucide-react';
import type { FieldNote, NoteKind, Ref } from '../../data/types';
import { useStore } from '../../store/store';
import { blobs } from '../../lib/db';
import { nowISO, relTime, uid, fmtDuration } from '../../lib/id';
import { navigate, back, useRoute, replaceUrlSilently } from '../../lib/router';
import { parseLinkParam, linkParam } from '../../lib/links';
import { useOnline } from '../../lib/online';
import { remixSource } from '../../lib/remix';
import { TOPICS, topicLabel } from '../../data/catalog';
import { Button, Chip, EmptyState, IconButton, Screen, Section, Sheet, Swipeable, Toggle, confirmDialog, toast } from '../../components/ui';
import { AddToCollectionSheet, LinkedRefs } from '../../components/common';
import { SketchCanvas, type SketchHandle, type SketchStroke } from '../../formats/players/SketchCanvas';
import '../../styles/create.css';

// ---------------------------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------------------------

export const NOTE_KINDS: { kind: NoteKind; label: string; noun: string; icon: LucideIcon }[] = [
  { kind: 'text', label: 'Text', noun: 'Text note', icon: Type },
  { kind: 'voice', label: 'Voice', noun: 'Voice note', icon: Mic },
  { kind: 'sketch', label: 'Sketch', noun: 'Sketch', icon: PenTool },
  { kind: 'photo', label: 'Photo', noun: 'Photo note', icon: Camera },
  { kind: 'link', label: 'Link', noun: 'Link', icon: LinkIcon },
];
export const noteKindMeta = (k: NoteKind) => NOTE_KINDS.find((x) => x.kind === k) ?? NOTE_KINDS[0];
const isNoteKind = (v: string | null): v is NoteKind => !!v && NOTE_KINDS.some((k) => k.kind === v);

export function noteTitle(n: FieldNote): string {
  if (n.title.trim()) return n.title.trim();
  const firstLine = n.text.trim().split('\n')[0];
  if (firstLine) return firstLine.length > 70 ? firstLine.slice(0, 68) + '…' : firstLine;
  if (n.kind === 'link' && n.url) return n.url.replace(/^https?:\/\//, '');
  return `Untitled ${noteKindMeta(n.kind).noun.toLowerCase()}`;
}

/** Human message for storage failures (quota, blocked IndexedDB…). */
export function storageErrorMessage(e: unknown): string {
  const name = (e as { name?: string } | null)?.name ?? '';
  const msg = (e as { message?: string } | null)?.message ?? '';
  if (name === 'QuotaExceededError' || /quota/i.test(msg)) return 'There isn’t enough storage space on this device to save it. Free up space, or delete some older recordings or photos.';
  if (/IndexedDB unavailable/i.test(msg) || name === 'InvalidStateError' || name === 'SecurityError') return 'This device’s storage isn’t available (private browsing can block it), so the file couldn’t be saved.';
  return 'The file couldn’t be saved on this device. Please try again.';
}

/** Load a blob from IndexedDB and expose it as an object URL (revoked on change/unmount). */
export function useBlobUrl(id: string | undefined) {
  const [state, setState] = useState<{ url?: string; error?: string; loading: boolean }>({ loading: !!id });
  useEffect(() => {
    if (!id) {
      setState({ loading: false });
      return;
    }
    let alive = true;
    let url: string | undefined;
    setState({ loading: true });
    blobs
      .get(id)
      .then((b) => {
        if (!alive) return;
        if (!b) {
          setState({ loading: false, error: 'This file is missing from this device’s storage.' });
          return;
        }
        url = URL.createObjectURL(b);
        setState({ url, loading: false });
      })
      .catch(() => alive && setState({ loading: false, error: 'Couldn’t load the file from this device’s storage.' }));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  return state;
}

/**
 * Save a debounced edit right away when the app is hidden or the page unloads (reload, tab close) — unmount
 * cleanup doesn't run then. Capture phase so it lands in the store before the store's own hide/pagehide flush.
 */
export function useFlushOnHide(flush: () => void) {
  const ref = useRef(flush);
  ref.current = flush;
  useEffect(() => {
    const run = () => ref.current();
    const onVis = () => document.visibilityState === 'hidden' && run();
    window.addEventListener('visibilitychange', onVis, true);
    window.addEventListener('pagehide', run, true);
    return () => {
      window.removeEventListener('visibilitychange', onVis, true);
      window.removeEventListener('pagehide', run, true);
    };
  }, []);
}

/** "Saved" / "Saving…" indicator for autosaving editors. */
export function SaveStatus({ status, idleText = 'Not saved yet' }: { status: 'idle' | 'saving' | 'saved'; idleText?: string }) {
  const storageError = useStore((s) => s.storageError);
  if (storageError) {
    return (
      <span className="cr-status error" role="status">
        <TriangleAlert size={14} aria-hidden /> Couldn’t save to this device
      </span>
    );
  }
  return (
    <span className="cr-status" role="status" aria-live="polite">
      {status === 'saved' && <Check size={14} aria-hidden />}
      {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : idleText}
    </span>
  );
}

/** Horizontal, scrollable topic toggles. */
export function TopicPicker({ value, onChange, label = 'Topics' }: { value: string[]; onChange: (t: string[]) => void; label?: string }) {
  return (
    <div className="chips scroll cr-chips" role="group" aria-label={label}>
      {TOPICS.map((t) => {
        const on = value.includes(t.id);
        return (
          <Chip key={t.id} active={on} onClick={() => onChange(on ? value.filter((x) => x !== t.id) : [...value, t.id])}>
            {t.label}
          </Chip>
        );
      })}
    </div>
  );
}

/** Row of capture buttons → /note/new?kind=… */
export function QuickCapture({ link }: { link?: Ref }) {
  return (
    <div className="cr-capture glass" role="group" aria-label="Quick capture">
      {NOTE_KINDS.map((k) => (
        <button
          key={k.kind}
          type="button"
          className="cr-capture-btn cr-tile"
          onClick={() => navigate(`/note/new?kind=${k.kind}${link ? `&link=${linkParam(link)}` : ''}`)}
          aria-label={`New ${k.noun.toLowerCase()}`}
        >
          <k.icon size={22} aria-hidden />
          <span>{k.label}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Voice recorder (MediaRecorder). Permission is requested only when the user taps Record.
// ---------------------------------------------------------------------------------------------

function pickMime(): string | undefined {
  const MR = window.MediaRecorder;
  if (!MR?.isTypeSupported) return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'].find((m) => MR.isTypeSupported(m));
}

function micErrorMessage(e: unknown): string {
  const name = (e as { name?: string } | null)?.name ?? '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError')
    return 'Microphone access was denied. To record, allow microphone access for Elsewhere in your browser or system settings, then tap Record again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No microphone was found on this device.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'The microphone is busy or unavailable — another app may be using it.';
  return 'Recording couldn’t start on this device.';
}

/**
 * Playback for a MediaRecorder recording. Chromium reports an Infinity duration for recorded WebM until the
 * whole file has been read, which leaves the player without a length and with a scrubber that can't seek.
 * Seeking far past the end once makes it read the file and work out the real duration; then rewind.
 */
export function RecordingAudio({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const onMeta = () => {
    const a = ref.current;
    if (!a || Number.isFinite(a.duration)) return;
    const done = () => {
      a.removeEventListener('timeupdate', done);
      a.currentTime = 0;
    };
    a.addEventListener('timeupdate', done);
    a.currentTime = 1e7;
  };
  return <audio ref={ref} className="cr-audio" controls preload="metadata" src={src} aria-label={label} onLoadedMetadata={onMeta} />;
}

export function VoiceRecorder({ blobId, onSaved, maxSeconds = 600, label = 'Recording' }: {
  blobId?: string;
  onSaved: (blobId: string) => void;
  maxSeconds?: number;
  label?: string;
}) {
  const [state, setState] = useState<'idle' | 'requesting' | 'recording' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const startedAt = useRef(0);
  const discard = useRef(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const media = useBlobUrl(blobId);
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined';

  useEffect(() => {
    discard.current = false;
    return () => {
      // Leaving the screen mid-recording discards the take and releases the microphone.
      discard.current = true;
      try {
        if (rec.current && rec.current.state !== 'inactive') rec.current.stop();
      } catch {
        /* ignore */
      }
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (state !== 'recording') return;
    const iv = setInterval(() => {
      const s = (Date.now() - startedAt.current) / 1000;
      setElapsed(s);
      if (s >= maxSeconds) stop();
    }, 250);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, maxSeconds]);

  const start = async () => {
    setError(null);
    if (!supported) {
      setError(window.isSecureContext === false ? 'Recording needs a secure (https) connection.' : 'Voice recording isn’t supported in this browser.');
      return;
    }
    if (blobId) {
      const ok = await confirmDialog({ title: 'Record again?', body: 'The new recording will replace the current one once you stop.', confirmLabel: 'Record again' });
      if (!ok) return;
    }
    setState('requesting');
    let s: MediaStream;
    try {
      s = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setState('idle');
      setError(micErrorMessage(e));
      return;
    }
    if (discard.current) {
      s.getTracks().forEach((t) => t.stop());
      return;
    }
    stream.current = s;
    const mime = pickMime();
    let r: MediaRecorder;
    try {
      r = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s);
    } catch {
      s.getTracks().forEach((t) => t.stop());
      setState('idle');
      setError('Voice recording isn’t supported in this browser.');
      return;
    }
    const chunks: Blob[] = [];
    r.ondataavailable = (ev) => {
      if (ev.data && ev.data.size) chunks.push(ev.data);
    };
    r.onstop = async () => {
      s.getTracks().forEach((t) => t.stop());
      stream.current = null;
      rec.current = null;
      if (discard.current) return;
      const blob = new Blob(chunks, { type: r.mimeType || mime || 'audio/webm' });
      if (!blob.size) {
        setState('idle');
        setError('Nothing was recorded. Please try again.');
        return;
      }
      setState('saving');
      const id = uid('b-');
      try {
        await blobs.put(id, blob);
        onSavedRef.current(id);
        setState('idle');
      } catch (e) {
        setState('idle');
        setError(storageErrorMessage(e));
      }
    };
    r.onerror = () => setError('Recording stopped unexpectedly.');
    try {
      r.start(1000);
    } catch {
      s.getTracks().forEach((t) => t.stop());
      setState('idle');
      setError('Recording couldn’t start on this device.');
      return;
    }
    rec.current = r;
    startedAt.current = Date.now();
    setElapsed(0);
    setState('recording');
  };

  const stop = () => {
    try {
      if (rec.current && rec.current.state !== 'inactive') rec.current.stop();
    } catch {
      setState('idle');
    }
  };

  return (
    <div className="cr-rec card">
      <div className="row" style={{ gap: 14 }}>
        {state === 'recording' ? (
          <button type="button" className="cr-rec-btn stop" onClick={stop} aria-label="Stop recording">
            <Square size={22} aria-hidden fill="currentColor" />
          </button>
        ) : (
          <button type="button" className="cr-rec-btn" onClick={start} disabled={state !== 'idle'} aria-label={blobId ? 'Record again' : 'Record'}>
            <Circle size={22} aria-hidden fill="currentColor" />
          </button>
        )}
        <div className="grow">
          <div className="row" style={{ gap: 8 }}>
            {state === 'recording' && <span className="cr-rec-dot" aria-hidden />}
            <span className="mono cr-rec-time" role="timer" aria-label={`${label} time`}>
              {fmtDuration(elapsed * 1000)}
            </span>
          </div>
          <div className="small muted">
            {state === 'requesting' ? 'Waiting for microphone permission…'
              : state === 'recording' ? `Recording — tap stop when you’re done (max ${Math.round(maxSeconds / 60)} min).`
              : state === 'saving' ? 'Saving recording…'
              : blobId ? 'Tap the red button to record again.' : 'Tap Record. Your browser will ask for the microphone.'}
          </div>
        </div>
      </div>
      {error && (
        <div className="banner error" role="alert" style={{ marginTop: 12 }}>
          <TriangleAlert size={16} aria-hidden /> <span>{error}</span>
        </div>
      )}
      {blobId && state !== 'recording' && (
        <div style={{ marginTop: 12 }}>
          {media.url ? (
            <RecordingAudio src={media.url} label={`${label} playback`} />
          ) : media.error ? (
            <p className="small cr-err">{media.error}</p>
          ) : (
            <p className="small muted">Loading recording…</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Photo capture with downscaling to max 1600px.
// ---------------------------------------------------------------------------------------------

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });
}

export async function downscaleImage(file: File, max = 1600): Promise<Blob> {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(file);
  } catch {
    source = await loadImage(file); // throws if the format can't be decoded (e.g. HEIC on some browsers)
  }
  const w = source.width;
  const h = source.height;
  if (!w || !h) throw new Error('decode');
  const scale = Math.min(1, max / Math.max(w, h));
  const keepOriginal = scale === 1 && file.size < 1_500_000 && /^image\/(jpeg|png|webp|gif)$/.test(file.type);
  if (keepOriginal) {
    if ('close' in source) source.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  // JPEG has no transparency: paint a white backdrop so transparent PNGs don't turn black.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ('close' in source) source.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
  if (!blob) throw new Error('encode');
  return blob;
}

function PhotoCapture({ blobId, onSaved, onRemove }: { blobId?: string; onSaved: (id: string) => void; onRemove: () => void }) {
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const media = useBlobUrl(blobId);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) {
      setError('That file isn’t an image.');
      return;
    }
    setError(null);
    setBusy(true);
    let blob: Blob;
    try {
      blob = await downscaleImage(file);
    } catch {
      setBusy(false);
      setError('This image format can’t be opened here. Try a JPEG or PNG.');
      return;
    }
    const id = uid('b-');
    try {
      await blobs.put(id, blob);
      onSaved(id);
    } catch (err) {
      setError(storageErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card cr-form stack sm">
      {blobId && (
        <figure className="cr-photo">
          {media.url ? <img src={media.url} alt="Your photo" /> : media.error ? <p className="small cr-err" style={{ padding: 16 }}>{media.error}</p> : <div className="skeleton" style={{ height: 220 }} aria-hidden />}
        </figure>
      )}
      <div className="row wrap">
        <Button variant={blobId ? 'secondary' : 'primary'} icon={<Camera size={18} aria-hidden />} onClick={() => camRef.current?.click()} disabled={busy}>
          {blobId ? 'Retake' : 'Take photo'}
        </Button>
        <Button icon={<ImagePlus size={18} aria-hidden />} onClick={() => fileRef.current?.click()} disabled={busy}>
          Choose image
        </Button>
        {blobId && (
          <Button variant="ghost" onClick={onRemove} disabled={busy}>Remove</Button>
        )}
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      {busy && <p className="small muted" role="status">Preparing photo…</p>}
      <p className="tiny faint" style={{ margin: 0 }}>Large photos are resized to 1600px on your device before saving. Nothing is uploaded.</p>
      {error && (
        <div className="banner error" role="alert">
          <TriangleAlert size={16} aria-hidden /> <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------------------------

export function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return t;
  return 'https://' + t.replace(/^\/+/, '');
}
export function isValidUrl(raw: string): boolean {
  try {
    const u = new URL(normalizeUrl(raw));
    // Chrome's parser accepts spaces in a host ("my site.com" → "my%20site.com"), so reject encoded hosts too.
    return (u.protocol === 'http:' || u.protocol === 'https:') && (u.hostname.includes('.') || u.hostname === 'localhost') && !u.hostname.includes('%');
  } catch {
    return false;
  }
}
export function openExternal(url: string) {
  const w = window.open(normalizeUrl(url), '_blank', 'noopener,noreferrer');
  if (!w) toast('The link couldn’t be opened. Your browser may have blocked it.', { kind: 'error' });
}

function LinkCapture({ url, onChange }: { url: string; onChange: (u: string) => void }) {
  const online = useOnline();
  const valid = isValidUrl(url);
  const showErr = url.trim().length > 0 && !valid;
  return (
    <div className="card cr-form stack sm">
      <label className="field">
        <span>Web address</span>
        <input
          className="input"
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://example.com/article"
          value={url}
          aria-invalid={showErr}
          aria-describedby="note-url-help"
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => url.trim() && isValidUrl(url) && onChange(normalizeUrl(url))}
        />
      </label>
      {showErr && <p className="small cr-err" role="alert" style={{ margin: 0 }}>Enter a full web address, like https://example.com</p>}
      <div className="row wrap">
        <Button icon={<ExternalLink size={18} aria-hidden />} disabled={!valid || !online} onClick={() => openExternal(url)}>
          Open link
        </Button>
        {!online && <span className="small muted">You’re offline — links open when you’re back online.</span>}
      </div>
      <p id="note-url-help" className="tiny faint" style={{ margin: 0 }}>
        Elsewhere stores the address only. Link previews would need a network request, so none are fetched.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Notes list
// ---------------------------------------------------------------------------------------------

/** Drafts key holding a sketch note's editable vector strokes. */
export const sketchDraftKey = (noteId: string) => `sketch:note:${noteId}`;

/** Delete a note with an Undo toast. The blob is removed only after the undo window has passed. */
export function deleteNoteWithUndo(n: FieldNote) {
  useStore.getState().remove('notes', n.id);
  toast('Note deleted', { action: { label: 'Undo', run: () => useStore.getState().upsert('notes', n) } });
  setTimeout(() => {
    const st = useStore.getState();
    if (st.notes[n.id]) return; // undone
    if (n.blobId) blobs.del(n.blobId).catch(() => {});
    if (st.drafts[sketchDraftKey(n.id)]) st.clearDraft(sketchDraftKey(n.id));
  }, 6500);
}

function NoteThumb({ n, blurred }: { n: FieldNote; blurred: boolean }) {
  const media = useBlobUrl(n.kind === 'photo' || n.kind === 'sketch' ? n.blobId : undefined);
  if (!media.url) return null;
  return <img className={'cr-thumb' + (blurred ? ' cr-blur' : '')} src={media.url} alt="" aria-hidden />;
}

export function NoteRow({ n, onMenu }: { n: FieldNote; onMenu?: (n: FieldNote) => void }) {
  const blurPrivate = useStore((s) => s.settings.privacy.blurPrivate);
  const blurred = n.private && blurPrivate;
  const M = noteKindMeta(n.kind);
  const title = noteTitle(n);
  const snippet = n.title.trim() ? n.text.trim().split('\n')[0] : n.kind === 'link' ? n.url ?? '' : '';
  return (
    <div className="cr-note glass">
      <button
        type="button"
        className="cr-note-main"
        onClick={() => navigate(`/note/${n.id}`)}
        onKeyDown={(e) => {
          if (e.key === 'Delete' && onMenu) {
            e.preventDefault();
            deleteNoteWithUndo(n);
          }
        }}
        aria-label={blurred ? `Private ${M.noun.toLowerCase()}, ${relTime(n.updatedAt)}. Open to read.` : `${title}. ${M.noun}, ${relTime(n.updatedAt)}`}
      >
        <span className="cr-note-kind" aria-hidden><M.icon size={18} /></span>
        <span className="grow" aria-hidden={blurred}>
          <span className={'cr-note-title' + (blurred ? ' cr-blur' : '')}>{title}</span>
          {snippet && <span className={'cr-note-snippet' + (blurred ? ' cr-blur' : '')}>{snippet}</span>}
          <span className="cr-note-meta">
            {n.private && <span className="row" style={{ gap: 3 }}><Lock size={12} aria-hidden /> Private</span>}
            <span>{M.noun}</span>
            <span>{relTime(n.updatedAt)}</span>
            {n.topics.slice(0, 2).map((t) => <span key={t}>{topicLabel(t)}</span>)}
          </span>
        </span>
        <NoteThumb n={n} blurred={blurred} />
      </button>
      {onMenu && (
        <IconButton label={`More actions for ${blurred ? 'private note' : title}`} onClick={() => onMenu(n)}>
          <Ellipsis size={20} />
        </IconButton>
      )}
    </div>
  );
}

export function NotesScreen() {
  const notes = useStore((s) => s.notes);
  const patch = useStore((s) => s.patch);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<NoteKind | 'all'>('all');
  const [topic, setTopic] = useState<string | null>(null);
  const [menu, setMenu] = useState<FieldNote | null>(null);
  const [collect, setCollect] = useState<Ref | null>(null);

  const all = useMemo(() => Object.values(notes).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [notes]);
  const usedTopics = useMemo(() => [...new Set(all.flatMap((n) => n.topics))].sort((a, b) => topicLabel(a).localeCompare(topicLabel(b))), [all]);
  const ql = q.trim().toLowerCase();
  const shown = all.filter(
    (n) =>
      (kind === 'all' || n.kind === kind) &&
      (!topic || n.topics.includes(topic)) &&
      (!ql || [n.title, n.text, n.url ?? '', ...n.topics.map(topicLabel)].join(' ').toLowerCase().includes(ql)),
  );
  const filtered = kind !== 'all' || !!topic || !!ql;
  const menuNote = menu ? notes[menu.id] ?? menu : null;

  return (
    <Screen title="Field Notes" eyebrow="Create" backTo="/create" subtitle="Quick captures — text, voice, sketches, photos and links.">
      <QuickCapture />

      {all.length === 0 ? (
        <EmptyState
          icon={<NotebookPen size={24} />}
          title="No notes yet"
          body="Capture a thought, a sound, a sketch, a photo or a link. Notes stay on this device and can be connected to anything you explore."
          action={<Button variant="primary" onClick={() => navigate('/note/new?kind=text')}>Write a note</Button>}
        />
      ) : (
        <>
          <div className="stack" style={{ marginTop: 24 }}>
            <label className="search">
              <Search size={18} aria-hidden />
              <input type="search" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search notes" />
            </label>
            <div className="chips scroll cr-chips" role="group" aria-label="Filter by kind">
              <Chip active={kind === 'all'} onClick={() => setKind('all')}>All</Chip>
              {NOTE_KINDS.map((k) => (
                <Chip key={k.kind} active={kind === k.kind} onClick={() => setKind(kind === k.kind ? 'all' : k.kind)} icon={<k.icon size={14} aria-hidden />}>
                  {k.label}
                </Chip>
              ))}
            </div>
            {usedTopics.length > 0 && (
              <div className="chips scroll cr-chips" role="group" aria-label="Filter by topic">
                {usedTopics.map((t) => (
                  <Chip key={t} accent active={topic === t} onClick={() => setTopic(topic === t ? null : t)}>
                    {topicLabel(t)}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          <Section title={filtered ? `${shown.length} of ${all.length} notes` : `${all.length} note${all.length === 1 ? '' : 's'}`}>
            {shown.length === 0 ? (
              <EmptyState
                icon={<Search size={24} />}
                title="Nothing matches"
                body="Try another word, or clear the filters."
                action={<Button onClick={() => { setQ(''); setKind('all'); setTopic(null); }}>Clear filters</Button>}
              />
            ) : (
              <div className="stack sm">
                {shown.map((n) => (
                  <Swipeable key={n.id} onLeft={() => deleteNoteWithUndo(n)} leftLabel="Delete" leftIcon={<Trash2 size={18} aria-hidden />}>
                    <NoteRow n={n} onMenu={setMenu} />
                  </Swipeable>
                ))}
                <p className="tiny on-art cr-caption" style={{ margin: '4px 0 0', alignSelf: 'flex-start' }}>Swipe a note left to delete it, or use its ••• menu. You can undo right after.</p>
              </div>
            )}
          </Section>
        </>
      )}

      <Sheet open={!!menuNote} onClose={() => setMenu(null)} title={menuNote ? noteTitle(menuNote) : 'Note'}>
        {menuNote && (
          <div className="list">
            <button type="button" className="list-row" onClick={() => { setMenu(null); navigate(`/note/${menuNote.id}`); }}>
              <span className="lr-icon"><NotebookPen size={18} aria-hidden /></span><span className="grow lr-title">Open</span>
            </button>
            <button type="button" className="list-row" onClick={() => { patch('notes', menuNote.id, { private: !menuNote.private, updatedAt: nowISO() }); toast(menuNote.private ? 'Note is no longer private' : 'Marked as private'); setMenu(null); }}>
              <span className="lr-icon">{menuNote.private ? <Eye size={18} aria-hidden /> : <EyeOff size={18} aria-hidden />}</span>
              <span className="grow lr-title">{menuNote.private ? 'Make not private' : 'Mark as private'}</span>
            </button>
            <button type="button" className="list-row" onClick={() => { setMenu(null); navigate(`/remix?from=note:${encodeURIComponent(menuNote.id)}`); }}>
              <span className="lr-icon"><Shuffle size={18} aria-hidden /></span><span className="grow lr-title">Remix into an experience</span>
            </button>
            <button type="button" className="list-row" onClick={() => { setCollect({ kind: 'note', id: menuNote.id }); setMenu(null); }}>
              <span className="lr-icon"><FolderPlus size={18} aria-hidden /></span><span className="grow lr-title">Add to collection</span>
            </button>
            <button type="button" className="list-row" onClick={() => { const n = menuNote; setMenu(null); deleteNoteWithUndo(n); }}>
              <span className="lr-icon cr-danger-icon"><Trash2 size={18} aria-hidden /></span><span className="grow lr-title cr-danger-text">Delete</span>
            </button>
          </div>
        )}
      </Sheet>
      <AddToCollectionSheet open={!!collect} onClose={() => setCollect(null)} target={collect} />
    </Screen>
  );
}

// ---------------------------------------------------------------------------------------------
// Note editor
// ---------------------------------------------------------------------------------------------

interface NoteForm {
  title: string;
  text: string;
  url: string;
  blobId?: string;
  topics: string[];
  links: Ref[];
  private: boolean;
}

const meaningful = (f: NoteForm) => !!(f.title.trim() || f.text.trim() || f.url.trim() || f.blobId);

export function NoteScreen({ id }: { id: string }) {
  const route = useRoute();
  const note = useStore((s) => (id !== 'new' ? s.notes[id] : undefined));
  const seen = useRef(false);
  // Every navigation to /note/new gets a fresh editor — even when only the query changes (?kind=…) and the
  // screen isn't remounted — so a new note never reuses (and overwrites) the note created just before it.
  const [fresh, setFresh] = useState(() => ({ route, key: uid('nav-') }));
  if (fresh.route !== route) setFresh({ route, key: uid('nav-') });
  if (note) seen.current = true;
  // Deleted from inside the editor: render nothing while back-navigation completes.
  if (id !== 'new' && !note && seen.current) return null;
  if (id !== 'new' && !note) {
    return (
      <Screen title="Field note" backTo="/notes">
        <EmptyState title="Note not found" body="It may have been deleted." action={<Button variant="primary" onClick={() => navigate('/notes', { replace: true })}>All notes</Button>} />
      </Screen>
    );
  }
  if (note) return <NoteEditor key={note.id} kind={note.kind} existing={note} />;
  const qKind = route.query.get('kind');
  const kind: NoteKind = isNoteKind(qKind) ? qKind : 'text';
  const link = parseLinkParam(route.query.get('link'));
  return <NoteEditor key={fresh.key} kind={kind} initialLink={link} />;
}

function NoteEditor({ kind, existing, initialLink }: { kind: NoteKind; existing?: FieldNote; initialLink?: Ref | null }) {
  const M = noteKindMeta(kind);
  const [form, setForm] = useState<NoteForm>(() => {
    if (existing) {
      return { title: existing.title, text: existing.text, url: existing.url ?? '', blobId: existing.blobId, topics: existing.topics, links: existing.links, private: existing.private };
    }
    const links = initialLink ? [initialLink] : [];
    const topics = initialLink ? (remixSource(initialLink)?.topics ?? []).slice(0, 3) : [];
    return { title: '', text: '', url: '', topics, links, private: false };
  });
  const [noteId, setNoteId] = useState<string | null>(existing?.id ?? null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>(existing ? 'saved' : 'idle');
  const [collect, setCollect] = useState(false);
  const formRef = useRef(form);
  const idRef = useRef<string | null>(existing?.id ?? null);
  const pending = useRef(false);
  const deleted = useRef(false);
  const mounted = useRef(true);
  // The id is decided up front so sketch strokes can be kept (as a draft) before the note exists.
  const [plannedId] = useState(() => existing?.id ?? uid('n-'));
  const sketchKey = sketchDraftKey(plannedId);
  const sketchRef = useRef<SketchHandle>(null);
  const sketchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [initialStrokes] = useState(() => {
    const d = useStore.getState().drafts[sketchKey]?.data;
    return Array.isArray(d) ? (d as SketchStroke[]) : undefined;
  });

  /** Write the current form to the store: create the note on first meaningful input, then patch. */
  const persist = useCallback((): boolean => {
    if (deleted.current) return false;
    const f = formRef.current;
    const st = useStore.getState();
    const fields = { title: f.title, text: f.text, url: kind === 'link' ? f.url.trim() || undefined : undefined, blobId: f.blobId, topics: f.topics, links: f.links, private: f.private };
    const nid = idRef.current;
    if (nid) {
      if (!st.notes[nid]) return false;
      st.patch('notes', nid, { ...fields, updatedAt: nowISO() });
    } else {
      if (!meaningful(f)) return false;
      const newId = plannedId;
      idRef.current = newId;
      const at = nowISO();
      st.upsert('notes', { id: newId, kind, ...fields, createdAt: at, updatedAt: at });
      if (mounted.current) {
        setNoteId(newId);
        // Keep the editor mounted but make the address point at the real note (so reload/back works).
        if (location.hash.startsWith('#/note/new')) replaceUrlSilently(`/note/${newId}`);
      }
    }
    pending.current = false;
    return true;
  }, [kind, plannedId]);

  const update = (p: Partial<NoteForm>, immediate = false) => {
    formRef.current = { ...formRef.current, ...p };
    pending.current = true;
    setForm(formRef.current);
    if (immediate) {
      const ok = persist();
      setStatus(ok ? 'saved' : idRef.current ? 'saved' : 'idle');
    }
  };

  // Debounced autosave while typing.
  useEffect(() => {
    if (!pending.current) return;
    setStatus(idRef.current || meaningful(form) ? 'saving' : 'idle');
    const t = setTimeout(() => {
      const ok = persist();
      setStatus(ok || idRef.current ? 'saved' : 'idle');
    }, 500);
    return () => clearTimeout(t);
  }, [form, persist]);

  // Flush on unmount so nothing typed in the last half-second is lost.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (pending.current) persist();
    };
  }, [persist]);
  // …and when the app is hidden or reloaded mid-debounce (no unmount happens then).
  useFlushOnHide(() => { if (pending.current && persist()) setStatus('saved'); });

  // Sketch: keep vector strokes as a draft (so the drawing stays editable) and autosave a PNG shortly after drawing stops.
  const onStrokes = (strokes: SketchStroke[]) => {
    useStore.getState().saveDraft(sketchKey, strokes);
    clearTimeout(sketchTimer.current);
    sketchTimer.current = strokes.length ? setTimeout(() => { sketchTimer.current = undefined; sketchRef.current?.save(); }, 900) : undefined;
  };
  // Layout cleanup runs before the canvas handle is detached, so a pending sketch can still be saved on leave.
  useLayoutEffect(() => () => {
    if (sketchTimer.current) {
      clearTimeout(sketchTimer.current);
      sketchTimer.current = undefined;
      try {
        sketchRef.current?.save();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const setBlob = (newId: string) => {
    const old = formRef.current.blobId;
    update({ blobId: newId }, true);
    if (old && old !== newId) blobs.del(old).catch(() => {});
  };
  const removeBlob = async () => {
    const old = formRef.current.blobId;
    if (!old) return;
    const ok = await confirmDialog({ title: 'Remove this photo?', body: 'It will be deleted from this device.', confirmLabel: 'Remove', danger: true });
    if (!ok) return;
    update({ blobId: undefined }, true);
    blobs.del(old).catch(() => {});
  };

  const del = async () => {
    const ok = await confirmDialog({ title: 'Delete this note?', body: M.kind === 'text' || M.kind === 'link' ? 'This can’t be undone.' : 'The note and its file will be removed from this device. This can’t be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    deleted.current = true;
    pending.current = false;
    const nid = idRef.current;
    const bid = formRef.current.blobId;
    clearTimeout(sketchTimer.current);
    sketchTimer.current = undefined;
    if (nid) useStore.getState().remove('notes', nid);
    useStore.getState().clearDraft(sketchKey);
    if (bid) blobs.del(bid).catch(() => {});
    toast('Note deleted');
    back('/notes');
  };

  const isNew = !existing && !noteId;
  const bodyLabel = kind === 'text' ? 'Note' : kind === 'link' ? 'Why it caught your eye' : 'Caption or notes';

  return (
    <Screen
      title={isNew ? `New ${M.noun.toLowerCase()}` : M.noun}
      backTo="/notes"
      hideLargeTitle
      actions={
        noteId ? (
          <>
            <IconButton label="Remix this note" onClick={() => { if (pending.current) persist(); navigate(`/remix?from=note:${encodeURIComponent(noteId)}`); }}>
              <Shuffle size={20} />
            </IconButton>
            <IconButton label="Add to collection" onClick={() => setCollect(true)}>
              <FolderPlus size={20} />
            </IconButton>
          </>
        ) : undefined
      }
    >
      <div className="card glass-strong cr-head">
        <div className="row between wrap" style={{ gap: 8 }}>
          <span className="label accent row" style={{ gap: 6 }}><M.icon size={14} aria-hidden /> {M.noun}</span>
          <SaveStatus status={status} idleText={isNew ? 'Saves as you type' : 'Not saved yet'} />
        </div>

        <input
          className="cr-title-input display"
          placeholder="Title"
          aria-label="Title"
          value={form.title}
          onChange={(e) => update({ title: e.target.value })}
          autoFocus={isNew && kind === 'text'}
        />
      </div>

      <div className="stack lg" style={{ marginTop: 16 }}>
        {kind === 'voice' && <VoiceRecorder blobId={form.blobId} onSaved={setBlob} label="Voice note" />}
        {kind === 'sketch' && (
          <div className="card cr-sketch">
            <SketchCanvas ref={sketchRef} label="Sketch note" initialStrokes={initialStrokes} onChange={onStrokes} onSaved={setBlob} savedBlobId={form.blobId} />
            <p className="tiny faint" style={{ margin: '6px 0 0' }}>Your sketch saves automatically a moment after you stop drawing.</p>
          </div>
        )}
        {kind === 'photo' && <PhotoCapture blobId={form.blobId} onSaved={setBlob} onRemove={removeBlob} />}
        {kind === 'link' && <LinkCapture url={form.url} onChange={(u) => update({ url: u })} />}

        <div className="card cr-form stack lg">
          <label className="field">
            <span>{bodyLabel}</span>
            <textarea
              className="textarea"
              rows={kind === 'text' ? 8 : 3}
              placeholder={kind === 'text' ? 'What’s on your mind?' : 'Add a few words…'}
              value={form.text}
              onChange={(e) => update({ text: e.target.value })}
            />
          </label>

          <div className="field">
            <span id="note-topics-label">Topics</span>
            <TopicPicker value={form.topics} onChange={(t) => update({ topics: t }, true)} label="Note topics" />
          </div>

          <div className="field">
            <span>Connected to</span>
            <LinkedRefs value={form.links} onChange={(r) => update({ links: r }, true)} exclude={noteId ? { kind: 'note', id: noteId } : undefined} />
            <small className="faint">Link this note to experiences, skills, quests, rabbit holes or Version History entries.</small>
          </div>

          <div className="card flat row between">
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Private</div>
              <div className="small muted">Private notes can be blurred in lists and left out of exports (Settings → Privacy).</div>
            </div>
            <Toggle checked={form.private} onChange={(v) => update({ private: v }, true)} label="Private note" />
          </div>
        </div>

        {(noteId || meaningful(form)) && (
          <Button variant="danger" className="cr-solo" icon={<Trash2 size={18} aria-hidden />} onClick={del}>
            Delete note
          </Button>
        )}
      </div>
      <AddToCollectionSheet open={collect} onClose={() => setCollect(false)} target={noteId ? { kind: 'note', id: noteId } : null} />
    </Screen>
  );
}

/** Small wrapper so other Create screens can show a short preview of a note. */
export function NotePreviewList({ notes, empty }: { notes: FieldNote[]; empty: ReactNode }) {
  if (!notes.length) return <>{empty}</>;
  return (
    <div className="stack sm">
      {notes.map((n) => (
        <NoteRow key={n.id} n={n} />
      ))}
    </div>
  );
}
