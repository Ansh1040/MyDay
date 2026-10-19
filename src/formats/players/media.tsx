// Photo capture and voice recording inputs. Files are stored in the IndexedDB blob store (src/lib/db.ts);
// only the blob id is kept in drafts/results.
import { useEffect, useId, useRef, useState } from 'react';
import { Camera, Mic, Square, Trash, ImageOff, MicOff } from 'lucide-react';
import { blobs } from '../../lib/db';
// Note: removing a photo/recording only unlinks it here — the blob may already belong to a saved completion.
import { uid } from '../../lib/id';
import { Button } from '../../components/ui';

/** Object URL for a stored blob (revoked automatically). `state` reports loading/missing. */
export function useBlobUrl(blobId: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'missing' | 'error'>('idle');
  useEffect(() => {
    if (!blobId) {
      setUrl(null);
      setState('idle');
      return;
    }
    let alive = true;
    let made: string | null = null;
    setState('loading');
    blobs
      .get(blobId)
      .then((b) => {
        if (!alive) return;
        if (!b) {
          setState('missing');
          return;
        }
        made = URL.createObjectURL(b);
        setUrl(made);
        setState('ready');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [blobId]);
  return { url, state };
}

export async function storeBlob(blob: Blob): Promise<string> {
  const id = uid('blob-');
  await blobs.put(id, blob);
  return id;
}

export function PhotoInput({ value, onChange, label }: { value?: string; onChange: (blobId: string | undefined) => void; label: string }) {
  const inputId = useId();
  const { url, state } = useBlobUrl(value);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setErr('That file isn’t an image. Choose a photo instead.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const id = await storeBlob(f);
      onChange(id);
    } catch (e) {
      console.warn(e);
      setErr('The photo couldn’t be saved on this device (storage is unavailable or full).');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fx-media">
      {value && state === 'ready' && url && <img className="fx-photo" src={url} alt={`Your photo for: ${label}`} />}
      {value && state === 'missing' && <p className="small faint row"><ImageOff size={16} aria-hidden /> This photo is no longer on this device.</p>}
      {value && state === 'loading' && <div className="skeleton" style={{ height: 180 }} aria-hidden />}
      <div className="row wrap">
        <label htmlFor={inputId} className={'btn secondary' + (busy ? ' is-busy' : '')} aria-disabled={busy}>
          <Camera size={18} aria-hidden /> {busy ? 'Saving…' : value ? 'Replace photo' : 'Take or choose a photo'}
        </label>
        <input
          id={inputId}
          className="sr-only"
          type="file"
          accept="image/*"
          capture="environment"
          disabled={busy}
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {value && (
          <Button variant="ghost" icon={<Trash size={18} aria-hidden />} onClick={() => onChange(undefined)}>
            Remove
          </Button>
        )}
      </div>
      {err && <p className="fx-error small" role="alert">{err}</p>}
      <p className="tiny faint">Photos stay on this device.</p>
    </div>
  );
}

const recorderSupported = () => typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia;

function pickMime() {
  const opts = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
  for (const m of opts) {
    try {
      if (MediaRecorder.isTypeSupported?.(m)) return m;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

const MAX_SECONDS = 5 * 60;

export function VoiceRecorder({ value, onChange, label }: { value?: string; onChange: (blobId: string | undefined) => void; label: string }) {
  const { url, state } = useBlobUrl(value);
  const [status, setStatus] = useState<'idle' | 'asking' | 'recording' | 'saving'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [secs, setSecs] = useState(0);
  const rec = useRef<{ mr: MediaRecorder; stream: MediaStream; chunks: Blob[]; started: number; iv?: number } | null>(null);
  const supported = recorderSupported();

  const cleanup = () => {
    const r = rec.current;
    if (!r) return;
    if (r.iv) clearInterval(r.iv);
    r.stream.getTracks().forEach((t) => t.stop());
    rec.current = null;
  };

  useEffect(
    () => () => {
      const r = rec.current;
      if (r) {
        r.mr.onstop = null;
        try { if (r.mr.state !== 'inactive') r.mr.stop(); } catch { /* ignore */ }
      }
      cleanup();
    },
    [],
  );

  const start = async () => {
    setErr(null);
    if (!supported) {
      setErr('Voice recording isn’t supported in this browser. You can write a note instead.');
      return;
    }
    setStatus('asking');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const name = (e as DOMException)?.name;
      setStatus('idle');
      if (name === 'NotAllowedError' || name === 'SecurityError') setErr('Microphone access was blocked. Allow it in your browser or app settings to record — or write a note instead.');
      else if (name === 'NotFoundError' || name === 'OverconstrainedError') setErr('No microphone was found on this device.');
      else if (name === 'NotReadableError') setErr('The microphone is busy in another app. Close it and try again.');
      else setErr('The microphone couldn’t be started.');
      return;
    }
    try {
      const mime = pickMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      mr.onstop = async () => {
        const type = mr.mimeType || mime || 'audio/webm';
        cleanup();
        setStatus('saving');
        try {
          const blob = new Blob(chunks, { type });
          if (!blob.size) throw new Error('empty');
          const id = await storeBlob(blob);
          onChange(id);
        } catch (e) {
          console.warn(e);
          setErr('The recording couldn’t be saved on this device (storage is unavailable or full).');
        }
        setStatus('idle');
      };
      mr.onerror = () => {
        setErr('Recording stopped unexpectedly.');
      };
      const started = Date.now();
      rec.current = { mr, stream, chunks, started };
      rec.current.iv = window.setInterval(() => {
        const s = Math.floor((Date.now() - started) / 1000);
        setSecs(s);
        if (s >= MAX_SECONDS) stop();
      }, 250);
      setSecs(0);
      mr.start(1000);
      setStatus('recording');
    } catch (e) {
      console.warn(e);
      stream.getTracks().forEach((t) => t.stop());
      setStatus('idle');
      setErr('Recording isn’t available on this device. You can write a note instead.');
    }
  };

  const stop = () => {
    const r = rec.current;
    if (!r) return;
    if (r.iv) clearInterval(r.iv);
    try {
      if (r.mr.state !== 'inactive') r.mr.stop();
    } catch {
      cleanup();
      setStatus('idle');
    }
  };

  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  return (
    <div className="fx-media">
      {value && state === 'ready' && url && status !== 'recording' && (
        <audio className="fx-audio" controls src={url} aria-label={`Your recording for: ${label}`} />
      )}
      {value && state === 'missing' && <p className="small faint">This recording is no longer on this device.</p>}
      <div className="row wrap">
        {status === 'recording' ? (
          <Button variant="primary" icon={<Square size={16} aria-hidden />} onClick={stop}>
            Stop · <span className="mono">{mmss}</span>
          </Button>
        ) : (
          <Button variant="secondary" icon={supported ? <Mic size={18} aria-hidden /> : <MicOff size={18} aria-hidden />} onClick={start} disabled={status !== 'idle'}>
            {status === 'asking' ? 'Waiting for microphone…' : status === 'saving' ? 'Saving…' : value ? 'Record again' : 'Record a voice note'}
          </Button>
        )}
        {value && status === 'idle' && (
          <Button variant="ghost" icon={<Trash size={18} aria-hidden />} onClick={() => onChange(undefined)}>
            Remove
          </Button>
        )}
      </div>
      <span className="sr-only" aria-live="polite">{status === 'recording' ? 'Recording started' : status === 'saving' ? 'Saving recording' : ''}</span>
      {status === 'recording' && <p className="tiny faint">Recording… up to {MAX_SECONDS / 60} minutes. Stays on this device.</p>}
      {err && <p className="fx-error small" role="alert">{err}</p>}
    </div>
  );
}
