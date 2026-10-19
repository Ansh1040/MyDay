// Reusable drawing surface: pointer-events drawing with pressure (pen) or speed-based (finger/mouse) width,
// theme ink/accent colours, eraser, undo, clear, and save-as-PNG into the IndexedDB blob store.
// Strokes are stored as vectors in normalised coordinates, so they redraw crisply on resize and theme changes.
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Eraser, Undo2, Trash, Save, PenTool, Check } from 'lucide-react';
import { Button, IconButton, confirmDialog } from '../../components/ui';
import { toRGB, useCanvasSize, useThemeColors, type ThemeColors } from './kit';
import { storeBlob, useBlobUrl } from './media';
import '../../styles/formats.css';

export type SketchTool = 'ink' | 'accent' | 'eraser';
export interface SketchStroke {
  tool: SketchTool;
  size: number; // base width as a fraction of canvas width ×500
  pts: number[]; // flat [x, y, w, x, y, w…], x/y normalised 0..1, w = width multiplier
}

export interface SketchHandle {
  /** Save the current drawing as a PNG blob. Returns the new blob id, or null if empty / failed. */
  save: () => Promise<string | null>;
  isDirty: () => boolean;
  isEmpty: () => boolean;
}

const SIZES = [
  { v: 3, label: 'Fine' },
  { v: 6, label: 'Medium' },
  { v: 12, label: 'Bold' },
];
const MAX_POINTS = 60000; // keep drafts a sensible size

/**
 * The opaque paper colour for exported PNGs: the current computed --glass-solid (falling back to --bg), forced to full
 * opacity so a translucent value can never leak into a saved file.
 */
function paperColor() {
  const root = getComputedStyle(document.documentElement);
  const raw = root.getPropertyValue('--glass-solid').trim() || root.getPropertyValue('--bg').trim() || getComputedStyle(document.body).backgroundColor;
  const [r, g, b] = toRGB(raw);
  return `rgb(${r}, ${g}, ${b})`;
}

function strokeColor(tool: SketchTool, c: ThemeColors) {
  return tool === 'accent' ? c.accent : c.ink;
}

function drawStroke(ctx: CanvasRenderingContext2D, s: SketchStroke, w: number, h: number, c: ThemeColors) {
  const p = s.pts;
  if (p.length < 3) return;
  ctx.save();
  ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = strokeColor(s.tool, c);
  ctx.fillStyle = strokeColor(s.tool, c);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const base = (s.size / 500) * w * (s.tool === 'eraser' ? 3 : 1);
  if (p.length === 3) {
    ctx.beginPath();
    ctx.arc(p[0] * w, p[1] * h, Math.max(0.6, (base * p[2]) / 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  // Variable width: draw short quadratic segments between midpoints.
  for (let i = 3; i < p.length; i += 3) {
    const x0 = p[i - 3] * w, y0 = p[i - 2] * h;
    const x1 = p[i] * w, y1 = p[i + 1] * h;
    const prevMidX = i >= 6 ? (p[i - 6] * w + x0) / 2 : x0;
    const prevMidY = i >= 6 ? (p[i - 5] * h + y0) / 2 : y0;
    const midX = (x0 + x1) / 2, midY = (y0 + y1) / 2;
    ctx.lineWidth = Math.max(0.6, base * (p[i - 1] + p[i + 2]) / 2);
    ctx.beginPath();
    ctx.moveTo(prevMidX, prevMidY);
    ctx.quadraticCurveTo(x0, y0, midX, midY);
    ctx.stroke();
  }
  // finish to the last point
  const n = p.length;
  ctx.lineWidth = Math.max(0.6, base * p[n - 1]);
  ctx.beginPath();
  ctx.moveTo((p[n - 6] * w + p[n - 3] * w) / 2, (p[n - 5] * h + p[n - 2] * h) / 2);
  ctx.lineTo(p[n - 3] * w, p[n - 2] * h);
  ctx.stroke();
  ctx.restore();
}

export function SketchCanvas({
  ref, label, initialStrokes, onChange, onSaved, savedBlobId, aspect = 0.75, showSave = true,
}: {
  ref?: Ref<SketchHandle>;
  label: string;
  initialStrokes?: SketchStroke[];
  onChange?: (strokes: SketchStroke[]) => void;
  /** Called with the blob id after a successful save. */
  onSaved?: (blobId: string) => void;
  /** Last saved PNG (shown when there are no vector strokes, e.g. an older draft). */
  savedBlobId?: string;
  aspect?: number;
  showSave?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(wrapRef, canvasRef, aspect, 640);
  const colors = useThemeColors();
  const [strokes, setStrokes] = useState<SketchStroke[]>(() => (Array.isArray(initialStrokes) ? initialStrokes : []));
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;
  const [tool, setTool] = useState<SketchTool>('ink');
  const [penSize, setPenSize] = useState(6);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; msg: string } | null>(null);
  const dirty = useRef(false);
  const active = useRef<{ id: number; stroke: SketchStroke; lastX: number; lastY: number; lastT: number; lastW: number } | null>(null);
  const { url: savedUrl } = useBlobUrl(strokes.length === 0 ? savedBlobId : undefined);

  const redraw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv || !size.w) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    for (const s of strokesRef.current) drawStroke(ctx, s, size.w, size.h, colors);
    if (active.current) drawStroke(ctx, active.current.stroke, size.w, size.h, colors);
  }, [size, colors]);

  useEffect(() => { redraw(); }, [redraw, strokes]);

  const commit = (next: SketchStroke[]) => {
    dirty.current = true;
    setStrokes(next);
    onChange?.(next);
  };

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const widthFor = (e: React.PointerEvent, speed: number, prev: number) => {
    if (e.pointerType === 'pen' && e.pressure > 0) return 0.35 + e.pressure * 1.3;
    // Finger/mouse: faster strokes get thinner, like ink from a brush pen. Smoothed.
    const target = Math.max(0.45, Math.min(1.35, 1.35 - speed * 0.55));
    return prev + (target - prev) * 0.35;
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (active.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = pos(e);
    const w0 = e.pointerType === 'pen' && e.pressure > 0 ? 0.35 + e.pressure * 1.3 : 1;
    active.current = { id: e.pointerId, stroke: { tool, size: penSize, pts: [x, y, w0] }, lastX: x, lastY: y, lastT: performance.now(), lastW: w0 };
    setStatus(null);
    redraw();
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = active.current;
    if (!a || a.id !== e.pointerId) return;
    e.preventDefault();
    const evs = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent];
    const r = canvasRef.current!.getBoundingClientRect();
    for (const ev of evs) {
      const x = (ev.clientX - r.left) / r.width;
      const y = (ev.clientY - r.top) / r.height;
      const dx = (x - a.lastX) * size.w, dy = (y - a.lastY) * size.h;
      const dist = Math.hypot(dx, dy);
      if (dist < 1.2) continue;
      const now = performance.now();
      const speed = dist / Math.max(1, now - a.lastT); // css px per ms
      const w = widthFor(e, speed, a.lastW);
      a.stroke.pts.push(Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4, Math.round(w * 100) / 100);
      a.lastX = x; a.lastY = y; a.lastT = now; a.lastW = w;
    }
    redraw();
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = active.current;
    if (!a || a.id !== e.pointerId) return;
    active.current = null;
    const total = strokesRef.current.reduce((n, s) => n + s.pts.length, 0);
    if (total + a.stroke.pts.length > MAX_POINTS) {
      setStatus({ kind: 'error', msg: 'This sketch is very detailed — save it, then clear to keep drawing.' });
      redraw();
      return;
    }
    commit([...strokesRef.current, a.stroke]);
  };

  const undo = () => {
    if (!strokes.length) return;
    commit(strokes.slice(0, -1));
  };
  const clear = async () => {
    if (!strokes.length) return;
    if (await confirmDialog({ title: 'Clear the sketch?', body: 'This removes every stroke. Saved copies stay saved.', confirmLabel: 'Clear', danger: true })) commit([]);
  };

  const save = useCallback(async (): Promise<string | null> => {
    const cv = canvasRef.current;
    if (!cv || !strokesRef.current.length) return null;
    setSaving(true);
    setStatus(null);
    try {
      // Composite onto the opaque --glass-solid (--surface is translucent glass now), so the saved PNG has a solid
      // background wherever it is shown. The variable is read at export time, not from the cached theme colours.
      const out = document.createElement('canvas');
      out.width = cv.width;
      out.height = cv.height;
      const octx = out.getContext('2d');
      if (!octx) throw new Error('no 2d context');
      octx.fillStyle = paperColor();
      octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(cv, 0, 0);
      const blob = await new Promise<Blob | null>((res) => out.toBlob(res, 'image/png'));
      if (!blob) throw new Error('toBlob failed');
      const id = await storeBlob(blob);
      dirty.current = false;
      onSaved?.(id);
      setStatus({ kind: 'ok', msg: 'Sketch saved on this device.' });
      return id;
    } catch (e) {
      console.warn(e);
      setStatus({ kind: 'error', msg: 'The sketch couldn’t be saved on this device (storage unavailable or full).' });
      return null;
    } finally {
      setSaving(false);
    }
  }, [onSaved]);

  useImperativeHandle(ref, () => ({ save, isDirty: () => dirty.current, isEmpty: () => strokesRef.current.length === 0 }), [save]);

  return (
    <div className="fx-sketch">
      <div className="fx-sketch-tools" role="toolbar" aria-label="Drawing tools">
        <div className="fx-swatches" role="radiogroup" aria-label="Pen">
          {(['ink', 'accent', 'eraser'] as SketchTool[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tool === t}
              className={'fx-swatch' + (tool === t ? ' on' : '')}
              onClick={() => setTool(t)}
              aria-label={t === 'ink' ? 'Ink pen' : t === 'accent' ? 'Accent pen' : 'Eraser'}
              title={t === 'ink' ? 'Ink' : t === 'accent' ? 'Accent' : 'Eraser'}
            >
              {t === 'eraser' ? <Eraser size={18} aria-hidden /> : <span className={'fx-dot ' + t} aria-hidden />}
            </button>
          ))}
        </div>
        <div className="fx-swatches" role="radiogroup" aria-label="Pen size">
          {SIZES.map((s) => (
            <button key={s.v} type="button" role="radio" aria-checked={penSize === s.v} className={'fx-swatch' + (penSize === s.v ? ' on' : '')} onClick={() => setPenSize(s.v)} aria-label={`${s.label} line`} title={s.label}>
              <span className="fx-size" style={{ width: 4 + s.v, height: 4 + s.v }} aria-hidden />
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 2, marginLeft: 'auto' }}>
          <IconButton label="Undo last stroke" onClick={undo} disabled={!strokes.length}><Undo2 size={20} /></IconButton>
          <IconButton label="Clear sketch" onClick={clear} disabled={!strokes.length}><Trash size={20} /></IconButton>
        </div>
      </div>
      <div ref={wrapRef} className="fx-sketch-surface">
        {savedUrl && !strokes.length && <img className="fx-sketch-prev" src={savedUrl} alt="Your last saved sketch" />}
        <canvas
          ref={canvasRef}
          className="fx-sketch-canvas"
          role="img"
          aria-label={`${label}. Drawing area: draw with a finger, stylus or mouse.`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onLostPointerCapture={onUp}
        />
        {!strokes.length && !savedUrl && (
          <div className="fx-sketch-empty" aria-hidden>
            <PenTool size={20} /> <span>Draw here</span>
          </div>
        )}
      </div>
      <div className="row between wrap" style={{ gap: 10 }}>
        <span className="tiny faint">{strokes.length} stroke{strokes.length === 1 ? '' : 's'} · drawing needs touch, pen or mouse</span>
        {showSave && (
          <Button size="sm" variant="secondary" icon={<Save size={16} aria-hidden />} onClick={() => save()} disabled={saving || !strokes.length}>
            {saving ? 'Saving…' : 'Save sketch'}
          </Button>
        )}
      </div>
      <div aria-live="polite" className="small">
        {status && (
          <p className={status.kind === 'ok' ? 'fx-ok row' : 'fx-error'} role={status.kind === 'error' ? 'alert' : undefined} style={{ gap: 6 }}>
            {status.kind === 'ok' && <Check size={16} aria-hidden />} {status.msg}
          </p>
        )}
      </div>
    </div>
  );
}
