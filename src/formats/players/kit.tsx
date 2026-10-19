// Shared helpers for format players: theme colours for canvases, DPR/resize-aware canvas sizing,
// reduced-motion state, labelled sliders and small text helpers. Only theme tokens are used for colour.
import { Fragment, useEffect, useId, useState, type ReactNode, type RefObject } from 'react';
import { prefersReducedMotion } from '../../lib/theme';
import { useStore } from '../../store/store';
import type { Completion } from '../../data/types';

// ---------- theme colours (for canvas drawing) ----------
export interface ThemeColors {
  bg: string;
  /** Opaque fill for canvases. Panels (--surface, --glass-*) are translucent glass, so canvases use --glass-solid. */
  canvas: string;
  surface: string;
  surface2: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  accent: string;
  accentText: string;
  accentInk: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
}

function readColors(): ThemeColors {
  const root = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  // Fallbacks come from computed body styles, never hard-coded colours.
  const ink = root.getPropertyValue('--ink').trim() || body.color;
  const bg = root.getPropertyValue('--bg').trim() || body.backgroundColor;
  const v = (name: string, fb: string) => root.getPropertyValue(name).trim() || fb;
  return {
    bg,
    // Canvas fill and PNG export background: the opaque --glass-solid, falling back to the old --surface, then --bg.
    canvas: v('--glass-solid', v('--surface', bg)),
    surface: v('--surface', bg),
    surface2: v('--surface-2', bg),
    ink,
    ink2: v('--ink-2', ink),
    ink3: v('--ink-3', ink),
    line: v('--line', ink),
    accent: v('--accent', ink),
    accentText: v('--accent-text', ink),
    accentInk: v('--accent-ink', bg),
    accentSoft: v('--accent-soft', bg),
    success: v('--success', ink),
    warning: v('--warning', ink),
    danger: v('--danger', ink),
  };
}

/** Subscribe to changes of attributes on <html> (theme, mode, motion). */
function useHtmlAttributes(attrs: string[], cb: () => void) {
  useEffect(() => {
    const mo = new MutationObserver(cb);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: attrs });
    return () => mo.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Current theme colours, re-read whenever the theme or appearance changes. */
export function useThemeColors(): ThemeColors {
  const [c, setC] = useState<ThemeColors>(() => readColors());
  useHtmlAttributes(['data-theme', 'data-mode', 'style'], () => setC(readColors()));
  return c;
}

/** True when the user (or the app setting) asks for reduced motion. Live-updating. */
export function useReducedMotion(): boolean {
  const [r, setR] = useState(() => prefersReducedMotion());
  useHtmlAttributes(['data-motion'], () => setR(prefersReducedMotion()));
  return r;
}

// ---------- colour maths (for pixel-level rendering) ----------
const rgbCache = new Map<string, [number, number, number]>();
let probe: CanvasRenderingContext2D | null = null;
/** Resolve any CSS colour string to [r,g,b] using a 1×1 canvas. */
export function toRGB(color: string): [number, number, number] {
  const hit = rgbCache.get(color);
  if (hit) return hit;
  if (!probe) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1;
    probe = cv.getContext('2d', { willReadFrequently: true });
  }
  if (!probe) return [128, 128, 128];
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  const out: [number, number, number] = [d[0], d[1], d[2]];
  rgbCache.set(color, out);
  return out;
}
export function withAlpha(color: string, a: number) {
  const [r, g, b] = toRGB(color);
  return `rgba(${r},${g},${b},${a})`;
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---------- canvas sizing ----------
export interface CanvasSize { w: number; h: number; dpr: number }

/**
 * Keeps a canvas's backing store matched to its CSS size × devicePixelRatio.
 * `aspect` = height / width. Returns the CSS-pixel size; draw after `ctx.setTransform(dpr,0,0,dpr,0,0)`.
 */
export function useCanvasSize(wrapRef: RefObject<HTMLElement | null>, canvasRef: RefObject<HTMLCanvasElement | null>, aspect: number, maxH = 560): CanvasSize {
  const [size, setSize] = useState<CanvasSize>({ w: 0, h: 0, dpr: 1 });
  useEffect(() => {
    const wrap = wrapRef.current;
    const cv = canvasRef.current;
    if (!wrap || !cv) return;
    const apply = () => {
      const w = Math.max(1, Math.floor(wrap.clientWidth));
      const h = Math.max(1, Math.floor(Math.min(maxH, w * aspect)));
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      cv.style.width = w + 'px';
      cv.style.height = h + 'px';
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      setSize((s) => (s.w === w && s.h === h && s.dpr === dpr ? s : { w, h, dpr }));
    };
    apply();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null;
    ro?.observe(wrap);
    window.addEventListener('resize', apply);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, [wrapRef, canvasRef, aspect, maxH]);
  return size;
}

// ---------- small UI pieces ----------
export function Slider({ label, value, min, max, step = 1, onChange, format, hint }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string; hint?: string;
}) {
  const id = useId();
  return (
    <div className="fx-slider">
      <div className="row between">
        <label htmlFor={id} className="small fx-slider-label">{label}</label>
        <output htmlFor={id} className="mono tiny muted">{format ? format(value) : value}</output>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format ? format(value) : String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <small className="faint tiny">{hint}</small>}
    </div>
  );
}

/** Lines that look like text art / code (frames, indented code) keep their spacing in a monospace block. */
const looksPreformatted = (line: string) => /^(\s{2,}\S|[+|#=_~<>\\/[\]{}`])/.test(line) || /\S {2,}\S/.test(line);

/** Plain text with blank-line paragraphs and single-newline line breaks. */
export function Paragraphs({ text, className, preformat }: { text: string; className?: string; preformat?: boolean }) {
  const paras = String(text ?? '').split(/\n\s*\n/).map((p) => p.replace(/^\n+|\s+$/g, '')).filter((p) => p.trim());
  const lineBlock = (lines: string[], key: number) => (
    <p key={key}>
      {lines.map((line, j, arr) => (
        <Fragment key={j}>
          {line.trim()}
          {j < arr.length - 1 && <br />}
        </Fragment>
      ))}
    </p>
  );
  return (
    <div className={className}>
      {paras.map((p, i) => {
        const lines = p.split('\n');
        if (!preformat || !lines.some(looksPreformatted)) return lineBlock(lines, i);
        // Group consecutive preformatted lines into <pre>, the rest into paragraphs.
        const groups: { pre: boolean; lines: string[] }[] = [];
        for (const l of lines) {
          const pre = looksPreformatted(l);
          const last = groups[groups.length - 1];
          if (last && last.pre === pre) last.lines.push(l);
          else groups.push({ pre, lines: [l] });
        }
        return (
          <Fragment key={i}>
            {groups.map((g, k) => (g.pre ? <pre key={k} className="fx-pre">{g.lines.join('\n')}</pre> : lineBlock(g.lines, k)))}
          </Fragment>
        );
      })}
    </div>
  );
}

/** Eyebrow + content block used inside players. */
export function PlayerBlock({ label, children, className = '' }: { label?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={'fx-block ' + className}>
      {label && <h3 className="label fx-block-label">{label}</h3>}
      {children}
    </section>
  );
}

export function NotesField({ label, value, onChange, placeholder, rows = 4, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; hint?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} className="fx-field-label">{label}</label>
      <textarea id={id} className="textarea" rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {hint && <small className="faint">{hint}</small>}
    </div>
  );
}

export const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** The most recent completion of an experience (its saved work lives in `result`), or undefined. */
export function useLastCompletion(experienceId: string): Completion | undefined {
  return useStore((s) => {
    let last: Completion | undefined;
    for (const c of Object.values(s.completions)) {
      if (c.ref.kind === 'experience' && c.ref.id === experienceId && (!last || c.at > last.at)) last = c;
    }
    return last;
  });
}

/** Read a property from an unknown draft object safely. */
export function draftOf<T extends object>(draft: unknown): Partial<T> {
  return draft && typeof draft === 'object' ? (draft as Partial<T>) : {};
}

/** Deterministic PRNG (mulberry32) so simulations/networks can be regenerated. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Read a number from a loose params record, with a fallback. */
export function num(params: Record<string, number | string> | undefined, key: string, fb: number) {
  const v = params?.[key];
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fb;
}
