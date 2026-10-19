// Sketching prompt: constraints + drawing surface. Strokes autosave as a draft; finishing saves a PNG on this device.
import { useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { SketchPayload } from '../../data/types';
import type { PlayerProps } from '../registry';
import { Button, useAutosave } from '../../components/ui';
import { fmtDate } from '../../lib/id';
import { draftOf, Paragraphs, useLastCompletion } from './kit';
import { useBlobUrl } from './media';
import { SketchCanvas, type SketchHandle, type SketchStroke } from './SketchCanvas';

interface SketchDraft { strokes: SketchStroke[]; blobId?: string }

export function SketchPlayer({ experience, draft, saveDraft, onComplete, completed }: PlayerProps) {
  const p = (experience.payload ?? {}) as Partial<SketchPayload>;
  const prompt = typeof p.prompt === 'string' ? p.prompt : experience.summary;
  const constraints = Array.isArray(p.constraints) ? p.constraints.filter(Boolean) : [];
  const d = draftOf<SketchDraft>(draft);
  const [strokes, setStrokes] = useState<SketchStroke[]>(Array.isArray(d.strokes) ? d.strokes : []);
  const [blobId, setBlobId] = useState<string | undefined>(d.blobId);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const canvas = useRef<SketchHandle>(null);
  const value = useMemo<SketchDraft>(() => ({ strokes, blobId }), [strokes, blobId]);
  const status = useAutosave(value, saveDraft);
  // The PNG saved when this was last finished. Finishing clears the draft, so without this a revisit showed
  // an empty canvas and the finished sketch was nowhere to be seen.
  const last = useLastCompletion(experience.id);
  const lastBlob = (last?.result as { blobId?: unknown } | undefined)?.blobId;
  const lastFinished = typeof lastBlob === 'string' && lastBlob !== blobId ? { blobId: lastBlob, at: last!.at } : undefined;

  const finish = async () => {
    setBusy(true);
    let id = blobId;
    if (canvas.current && !canvas.current.isEmpty() && (canvas.current.isDirty() || !id)) {
      const saved = await canvas.current.save();
      if (saved) id = saved;
      else { setBusy(false); return; } // save failed: the canvas shows the error
    }
    setBusy(false);
    if (!id) return;
    setDone(true);
    onComplete({ blobId: id, strokes: strokes.length }, 'Sketch saved');
  };

  return (
    <div className="fx-player fx-sketch-player">
      <div className="fx-prompt glass fx-panel">
        <span className="label accent">Draw</span>
        <Paragraphs text={prompt} className="display t-md fx-prompt-text" />
        {constraints.length > 0 && (
          <ul className="fx-constraints" aria-label="Constraints">
            {constraints.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        )}
      </div>
      {lastFinished && <LastSketch blobId={lastFinished.blobId} at={lastFinished.at} />}
      <div className="fx-sketch-panel glass fx-panel">
        <SketchCanvas
          ref={canvas}
          label={prompt}
          initialStrokes={strokes}
          savedBlobId={blobId}
          onChange={setStrokes}
          onSaved={setBlobId}
          showSave
        />
        <div className="fx-nav between">
          <span className="tiny faint" aria-live="polite">{status === 'saving' ? 'Saving draft…' : status === 'saved' ? 'Draft saved' : ''}</span>
          <Button variant="primary" icon={<Check size={18} aria-hidden />} onClick={finish} disabled={busy || (!strokes.length && !blobId)}>
            {busy ? 'Saving…' : done || completed ? 'Save again' : 'Finish'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LastSketch({ blobId, at }: { blobId: string; at: string }) {
  const { url, state } = useBlobUrl(blobId);
  if (state === 'missing' || state === 'error') return <p className="tiny faint on-art fx-on-art">Your last finished sketch is no longer on this device.</p>;
  if (!url) return null;
  return (
    <figure className="fx-last-work glass fx-panel">
      <img src={url} alt={`Your sketch, finished ${fmtDate(at)}`} />
      <figcaption className="tiny muted">Your last finished sketch · {fmtDate(at)}. Draw below to make a new one.</figcaption>
    </figure>
  );
}

export default SketchPlayer;
