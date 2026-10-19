// Built-in simulations: random-walk, life, flocking, waves, spread, sound-mood.
// Canvas sims are DPR- and resize-aware, use theme colours read from CSS variables, start paused under reduced motion
// (with a Step button), and end with an observation note saved on completion.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, StepForward, Check, Eye, Square } from 'lucide-react';
import type { SimulationPayload } from '../../data/types';
import type { PlayerProps } from '../registry';
import { Button, Segmented, Toggle, useAutosave } from '../../components/ui';
import {
  NotesField, PlayerBlock, Slider, draftOf, num, rng, toRGB, useCanvasSize, useReducedMotion, useThemeColors, withAlpha, type ThemeColors,
} from './kit';
import { AudioError, VolumeControl, midiToHz, playNote, useAudioEngine } from './audio';

type Vals = Record<string, number>;
// `aliases` = other payload.params names accepted for the same control (content may use either).
type Ctl =
  | { type: 'slider'; key: string; label: string; min: number; max: number; step?: number; def: number; format?: (v: number) => string; reset?: boolean; aliases?: string[] }
  | { type: 'toggle'; key: string; label: string; def: number; reset?: boolean; aliases?: string[] }
  | { type: 'segmented'; key: string; label: string; options: { value: number; label: string }[]; def: number; reset?: boolean; aliases?: string[] };

interface Sim {
  reset(w: number, h: number): void;
  step(w: number, h: number): void;
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, c: ThemeColors): void;
  resize?(w: number, h: number, pw: number, ph: number): void;
  /** Pointer interaction; return true if something changed. */
  tap?(x: number, y: number, w: number, h: number, drag: boolean): boolean;
  readout?(): string;
  finished?(): boolean;
  act?(i: number, w: number, h: number): void;
}
interface SimDef {
  title: string;
  notice: string[];
  help?: string;
  aspect: number;
  controls: Ctl[];
  rate: (v: Vals) => number; // ticks per second while playing
  stepTicks: number; // ticks per Step press
  touch?: boolean;
  resumeOnTap?: boolean;
  actions?: string[];
  legend?: { cls: string; label: string }[];
  create(v: { current: Vals }): Sim;
}

// ---------------- Random walk ----------------
const RANDOM_WALK: SimDef = {
  title: 'Random walk',
  notice: [
    'Every walker takes the same size of step in a random direction. None of them is heading anywhere.',
    'The cloud still spreads. Its typical distance from the start grows with the square root of the number of steps: four times the steps gives about twice the distance.',
    'Compare the measured “typical distance” with step size × √steps in the readout.',
  ],
  aspect: 0.8,
  controls: [
    { type: 'slider', key: 'walkers', label: 'Walkers', min: 1, max: 200, def: 40, reset: true, aliases: ['count'] },
    { type: 'slider', key: 'stepSize', label: 'Step size', min: 1, max: 12, def: 4, format: (v) => `${v} px`, reset: true },
    { type: 'slider', key: 'speed', label: 'Steps per second', min: 2, max: 120, def: 30 },
  ],
  rate: (v) => v.speed,
  stepTicks: 10,
  create(v) {
    let xs = new Float32Array(0);
    let ys = new Float32Array(0);
    let trails: number[][] = [];
    let n = 0;
    const MAXT = 400;
    const rms = () => {
      if (!xs.length) return 0;
      let s = 0;
      for (let i = 0; i < xs.length; i++) s += xs[i] * xs[i] + ys[i] * ys[i];
      return Math.sqrt(s / xs.length);
    };
    return {
      reset() {
        const count = Math.max(1, Math.round(v.current.walkers));
        xs = new Float32Array(count);
        ys = new Float32Array(count);
        trails = Array.from({ length: count }, () => [0, 0]);
        n = 0;
      },
      step() {
        const s = v.current.stepSize;
        for (let i = 0; i < xs.length; i++) {
          const a = Math.random() * Math.PI * 2;
          xs[i] += Math.cos(a) * s;
          ys[i] += Math.sin(a) * s;
          const t = trails[i];
          t.push(xs[i], ys[i]);
          if (t.length > MAXT * 2) t.splice(0, t.length - MAXT * 2);
        }
        n++;
      },
      draw(ctx, w, h, c) {
        const cx = w / 2, cy = h / 2;
        ctx.fillStyle = c.canvas;
        ctx.fillRect(0, 0, w, h);
        const alpha = xs.length > 60 ? 0.12 : xs.length > 15 ? 0.22 : 0.5;
        ctx.strokeStyle = withAlpha(c.ink, alpha);
        ctx.lineWidth = 1;
        for (const t of trails) {
          if (t.length < 4) continue;
          ctx.beginPath();
          ctx.moveTo(cx + t[0], cy + t[1]);
          for (let k = 2; k < t.length; k += 2) ctx.lineTo(cx + t[k], cy + t[k + 1]);
          ctx.stroke();
        }
        const r = rms();
        if (r > 2) {
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = c.ink2;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.strokeStyle = c.ink;
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy); ctx.lineTo(cx + 7, cy); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7);
        ctx.stroke();
        ctx.fillStyle = c.accent;
        for (let i = 0; i < xs.length; i++) {
          ctx.beginPath();
          ctx.arc(cx + xs[i], cy + ys[i], 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      readout: () => `Steps ${n} · typical distance ${rms().toFixed(0)} px · step size × √steps = ${(v.current.stepSize * Math.sqrt(n)).toFixed(0)} px`,
    };
  },
};

// ---------------- Conway's Life ----------------
const LIFE: SimDef = {
  title: 'Game of Life',
  notice: [
    'Each cell follows two rules: a live cell survives with 2 or 3 live neighbours; an empty cell comes alive with exactly 3.',
    'From those rules come blinkers, still blocks and “gliders” that travel across the grid. Nobody designed them into the rules.',
    'Newly born cells are highlighted. Try drawing a small shape and predicting what it becomes.',
  ],
  help: 'Tap or drag on the grid to switch cells on and off.',
  aspect: 1,
  controls: [
    { type: 'slider', key: 'speed', label: 'Generations per second', min: 1, max: 30, def: 8 },
    { type: 'slider', key: 'density', label: 'Starting density (for Randomise)', min: 5, max: 60, def: 28, format: (v) => `${v}%` },
  ],
  rate: (v) => v.speed,
  stepTicks: 1,
  touch: true,
  actions: ['Randomise', 'Clear', 'Add a glider'],
  legend: [
    { cls: 'ink', label: 'Alive' },
    { cls: 'accent', label: 'Just born' },
  ],
  create(v) {
    const C = 40, R = 40;
    let grid = new Uint8Array(C * R);
    let prev = new Uint8Array(C * R);
    let gen = 0, alive = 0, stable = false, paint = 1;
    const count = () => { alive = 0; for (let i = 0; i < grid.length; i++) alive += grid[i]; };
    const randomize = () => {
      const dens = v.current.density / 100;
      for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < dens ? 1 : 0;
      prev = grid.slice();
      gen = 0;
      stable = false;
      count();
    };
    const geom = (w: number, h: number) => {
      const cell = Math.max(2, Math.floor(Math.min(w / C, h / R)));
      return { cell, ox: Math.floor((w - cell * C) / 2), oy: Math.floor((h - cell * R) / 2) };
    };
    return {
      reset: randomize,
      step() {
        const next = new Uint8Array(C * R);
        let same = true;
        for (let y = 0; y < R; y++) {
          for (let x = 0; x < C; x++) {
            let nb = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue;
              nb += grid[((y + dy + R) % R) * C + ((x + dx + C) % C)];
            }
            const i = y * C + x;
            next[i] = nb === 3 || (nb === 2 && grid[i]) ? 1 : 0;
            if (next[i] !== grid[i]) same = false;
          }
        }
        stable = same;
        prev = grid;
        grid = next;
        gen++;
        count();
      },
      draw(ctx, w, h, c) {
        const { cell, ox, oy } = geom(w, h);
        ctx.fillStyle = c.canvas;
        ctx.fillRect(0, 0, w, h);
        if (cell >= 7) {
          ctx.strokeStyle = c.line;
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = 0; x <= C; x++) { ctx.moveTo(ox + x * cell + 0.5, oy); ctx.lineTo(ox + x * cell + 0.5, oy + R * cell); }
          for (let y = 0; y <= R; y++) { ctx.moveTo(ox, oy + y * cell + 0.5); ctx.lineTo(ox + C * cell, oy + y * cell + 0.5); }
          ctx.stroke();
        }
        const inset = cell >= 7 ? 1.5 : 0;
        for (let i = 0; i < grid.length; i++) {
          if (!grid[i]) continue;
          ctx.fillStyle = prev[i] ? c.ink : c.accent;
          ctx.fillRect(ox + (i % C) * cell + inset, oy + Math.floor(i / C) * cell + inset, cell - inset * 2 + (inset ? 1 : 0), cell - inset * 2 + (inset ? 1 : 0));
        }
      },
      tap(x, y, w, h, drag) {
        const { cell, ox, oy } = geom(w, h);
        const gx = Math.floor((x - ox) / cell), gy = Math.floor((y - oy) / cell);
        if (gx < 0 || gy < 0 || gx >= C || gy >= R) return false;
        const i = gy * C + gx;
        if (!drag) paint = grid[i] ? 0 : 1;
        if (grid[i] === paint) return false;
        grid[i] = paint;
        prev[i] = paint;
        stable = false;
        count();
        return true;
      },
      act(i) {
        if (i === 0) randomize();
        if (i === 1) { grid.fill(0); prev.fill(0); gen = 0; stable = false; count(); }
        if (i === 2) {
          const ox = Math.floor(Math.random() * (C - 3)), oy = Math.floor(Math.random() * (R - 3));
          [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]].forEach(([x, y]) => { grid[(oy + y) * C + ox + x] = 1; prev[(oy + y) * C + ox + x] = 1; });
          stable = false;
          count();
        }
      },
      readout: () => `Generation ${gen} · ${alive} alive${stable && gen > 0 ? ' · stable: nothing is changing' : alive === 0 ? ' · empty' : ''}`,
    };
  },
};

// ---------------- Flocking (boids) ----------------
const FLOCKING: SimDef = {
  title: 'Flocking',
  notice: [
    'No bird leads. Each one only steers to keep a little space, match its neighbours’ heading and drift toward their middle.',
    'Turn alignment to zero and the flock dissolves into a swarm; turn separation down and birds clump.',
    'The highlighted bird’s circle shows how far it can “see”. Everything it does comes from what is inside that circle.',
  ],
  aspect: 0.75,
  controls: [
    { type: 'slider', key: 'count', label: 'Birds', min: 10, max: 200, def: 70, aliases: ['boids', 'birds'] },
    { type: 'slider', key: 'separation', label: 'Separation', min: 0, max: 3, step: 0.1, def: 1.5, format: (v) => v.toFixed(1) },
    { type: 'slider', key: 'alignment', label: 'Alignment', min: 0, max: 3, step: 0.1, def: 1, format: (v) => v.toFixed(1) },
    { type: 'slider', key: 'cohesion', label: 'Cohesion', min: 0, max: 3, step: 0.1, def: 1, format: (v) => v.toFixed(1) },
    { type: 'slider', key: 'vision', label: 'Vision range', min: 20, max: 120, def: 50, format: (v) => `${v} px` },
  ],
  rate: () => 60,
  stepTicks: 10,
  create(v) {
    let x: number[] = [], y: number[] = [], vx: number[] = [], vy: number[] = [];
    let W = 1, H = 1;
    /** How many birds the highlighted bird (index 0) can currently see — measured, so it is right after a reset too. */
    const seen = () => {
      if (!x.length) return 0;
      const vis2 = v.current.vision * v.current.vision;
      let n = 0;
      for (let j = 1; j < x.length; j++) {
        let dx = x[j] - x[0], dy = y[j] - y[0];
        if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
        if (dy > H / 2) dy -= H; else if (dy < -H / 2) dy += H;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 <= vis2) n++;
      }
      return n;
    };
    const sync = () => {
      const n = Math.round(v.current.count);
      while (x.length < n) {
        x.push(Math.random() * W);
        y.push(Math.random() * H);
        const a = Math.random() * Math.PI * 2;
        vx.push(Math.cos(a) * 1.8);
        vy.push(Math.sin(a) * 1.8);
      }
      if (x.length > n) { x.length = n; y.length = n; vx.length = n; vy.length = n; }
    };
    return {
      reset(w, h) { W = w; H = h; x = []; y = []; vx = []; vy = []; sync(); },
      resize(w, h, pw, ph) {
        for (let i = 0; i < x.length; i++) { x[i] *= w / pw; y[i] *= h / ph; }
        W = w; H = h;
      },
      step(w, h) {
        W = w; H = h;
        sync();
        const n = x.length;
        const vis = v.current.vision, vis2 = vis * vis, sepR = Math.max(10, vis * 0.4);
        const A = v.current.alignment, Co = v.current.cohesion, S = v.current.separation;
        const maxS = 2.6, minS = 1.1;
        const nvx = new Float32Array(n), nvy = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          let ax = 0, ay = 0, cx = 0, cy = 0, sx = 0, sy = 0, cnt = 0;
          for (let j = 0; j < n; j++) {
            if (j === i) continue;
            let dx = x[j] - x[i], dy = y[j] - y[i];
            if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
            if (dy > H / 2) dy -= H; else if (dy < -H / 2) dy += H;
            const d2 = dx * dx + dy * dy;
            if (d2 > vis2 || d2 === 0) continue;
            cnt++;
            ax += vx[j]; ay += vy[j]; cx += dx; cy += dy;
            const d = Math.sqrt(d2);
            if (d < sepR) { const f = (sepR - d) / sepR / d; sx -= dx * f; sy -= dy * f; }
          }
          let ux = vx[i], uy = vy[i];
          if (cnt) {
            ux += (ax / cnt - vx[i]) * 0.05 * A + (cx / cnt) * 0.002 * Co;
            uy += (ay / cnt - vy[i]) * 0.05 * A + (cy / cnt) * 0.002 * Co;
          }
          ux += sx * 0.14 * S;
          uy += sy * 0.14 * S;
          const sp = Math.hypot(ux, uy) || 1;
          const cl = Math.min(maxS, Math.max(minS, sp));
          nvx[i] = (ux / sp) * cl;
          nvy[i] = (uy / sp) * cl;
        }
        for (let i = 0; i < n; i++) {
          vx[i] = nvx[i]; vy[i] = nvy[i];
          x[i] = (x[i] + vx[i] + W) % W;
          y[i] = (y[i] + vy[i] + H) % H;
        }
      },
      draw(ctx, w, h, c) {
        ctx.fillStyle = c.canvas;
        ctx.fillRect(0, 0, w, h);
        if (x.length) {
          ctx.strokeStyle = c.line;
          ctx.fillStyle = withAlpha(c.accent, 0.08);
          ctx.beginPath();
          ctx.arc(x[0], y[0], v.current.vision, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        for (let i = x.length - 1; i >= 0; i--) {
          const a = Math.atan2(vy[i], vx[i]);
          const s = i === 0 ? 8 : 6;
          ctx.fillStyle = i === 0 ? c.accent : withAlpha(c.ink, 0.85);
          ctx.beginPath();
          ctx.moveTo(x[i] + Math.cos(a) * s, y[i] + Math.sin(a) * s);
          ctx.lineTo(x[i] + Math.cos(a + 2.5) * s * 0.7, y[i] + Math.sin(a + 2.5) * s * 0.7);
          ctx.lineTo(x[i] + Math.cos(a - 2.5) * s * 0.7, y[i] + Math.sin(a - 2.5) * s * 0.7);
          ctx.closePath();
          ctx.fill();
        }
      },
      readout: () => {
        const n = seen();
        return `${x.length} birds · the highlighted bird can see ${n} neighbour${n === 1 ? '' : 's'}`;
      },
    };
  },
};

// ---------------- Two-source waves ----------------
const WAVES: SimDef = {
  title: 'Two-source waves',
  notice: [
    'Where crest meets crest the waves add up (bright bands); where crest meets trough they cancel (calm lines).',
    'The calm lines stay put even while the waves move — switch to “Average loudness” to see them as a still pattern.',
    'Shorter wavelengths or wider spacing give more bands. The phase offset slides the whole pattern sideways.',
  ],
  aspect: 0.8,
  controls: [
    { type: 'slider', key: 'wavelength', label: 'Wavelength', min: 12, max: 80, def: 32, format: (v) => `${v} px` },
    { type: 'slider', key: 'separation', label: 'Source spacing', min: 0, max: 60, def: 24, format: (v) => `${v}% of width` },
    { type: 'slider', key: 'phase', label: 'Phase offset (source B)', min: 0, max: 360, step: 15, def: 0, format: (v) => `${v}°` },
    { type: 'toggle', key: 'second', label: 'Second source (B)', def: 1 },
    { type: 'segmented', key: 'view', label: 'View', options: [{ value: 0, label: 'Moving waves' }, { value: 1, label: 'Average loudness' }], def: 0 },
  ],
  rate: () => 60,
  stepTicks: 4,
  legend: [
    { cls: 'accent', label: 'Crest / loud' },
    { cls: 'ink', label: 'Trough' },
    { cls: 'surface', label: 'Calm' },
  ],
  create(v) {
    let t = 0;
    let off: HTMLCanvasElement | null = null;
    let img: ImageData | null = null;
    return {
      reset() { t = 0; },
      step() { t += 1 / 60; },
      draw(ctx, w, h, c) {
        const cell = 3;
        const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
        if (!off) off = document.createElement('canvas');
        if (off.width !== cols || off.height !== rows) { off.width = cols; off.height = rows; img = null; }
        const octx = off.getContext('2d');
        if (!octx) return;
        if (!img) img = octx.createImageData(cols, rows);
        const k = (2 * Math.PI) / v.current.wavelength;
        const sep = (v.current.separation / 100) * w;
        const s1x = w / 2 - sep / 2, s2x = w / 2 + sep / 2, sy = h / 2;
        const two = v.current.second >= 0.5;
        const phi = (v.current.phase * Math.PI) / 180;
        const wt = 2 * Math.PI * 1.1 * t;
        const avg = v.current.view === 1;
        const [sr, sg, sb] = toRGB(c.canvas), [ar, ag, ab] = toRGB(c.accent), [ir, ig, ib] = toRGB(c.ink);
        const d = img.data;
        for (let row = 0; row < rows; row++) {
          const py = (row + 0.5) * cell;
          for (let col = 0; col < cols; col++) {
            const px = (col + 0.5) * cell;
            const r1 = Math.hypot(px - s1x, py - sy);
            let val: number;
            if (avg) {
              const A = two ? Math.abs(Math.cos((k * (r1 - Math.hypot(px - s2x, py - sy)) - phi) / 2)) : 1;
              val = A * A;
            } else {
              val = two ? (Math.sin(k * r1 - wt) + Math.sin(k * Math.hypot(px - s2x, py - sy) - wt + phi)) / 2 : Math.sin(k * r1 - wt);
            }
            const idx = (row * cols + col) * 4;
            if (val >= 0) {
              d[idx] = sr + (ar - sr) * val; d[idx + 1] = sg + (ag - sg) * val; d[idx + 2] = sb + (ab - sb) * val;
            } else {
              const m = -val * 0.8;
              d[idx] = sr + (ir - sr) * m; d[idx + 1] = sg + (ig - sg) * m; d[idx + 2] = sb + (ib - sb) * m;
            }
            d[idx + 3] = 255;
          }
        }
        octx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(off, 0, 0, cols * cell, rows * cell);
        const dot = (x: number, label: string) => {
          ctx.fillStyle = c.canvas;
          ctx.strokeStyle = c.ink;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, sy, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = c.ink;
          ctx.font = '600 11px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, x, sy + 0.5);
        };
        dot(s1x, 'A');
        if (two) dot(s2x, 'B');
      },
    };
  },
};

// ---------------- Idea spreading through a network ----------------
const SPREAD: SimDef = {
  title: 'How an idea spreads',
  notice: [
    'Each round, everyone who is still excited about the idea tells each of their connections with the “share chance”.',
    'Small changes in connections or share chance can flip the result from fizzling out to reaching nearly everyone — there is a tipping point.',
    'A few long-distance links (people who know someone far away) speed things up dramatically.',
  ],
  help: 'Tap a person to start the idea from them.',
  aspect: 0.9,
  controls: [
    { type: 'slider', key: 'connections', label: 'Connections per person', min: 1, max: 8, def: 3, reset: true },
    { type: 'slider', key: 'share', label: 'Share chance', min: 5, max: 100, step: 5, def: 30, format: (v) => `${v}%` },
    { type: 'slider', key: 'window', label: 'Keeps sharing for', min: 1, max: 10, def: 3, format: (v) => `${v} round${v === 1 ? '' : 's'}` },
    { type: 'slider', key: 'longLinks', label: 'Long-distance links', min: 0, max: 30, def: 4, format: (v) => `${v}%`, reset: true },
  ],
  rate: () => 3,
  stepTicks: 1,
  touch: true,
  resumeOnTap: true,
  actions: ['New network', 'Start from someone random'],
  legend: [
    { cls: 'hollow', label: 'Hasn’t heard' },
    { cls: 'accent', label: 'Sharing now' },
    { cls: 'ink2', label: 'Heard, stopped sharing' },
  ],
  create(v) {
    const N = 110, COLS = 11, ROWS = 10, PAD = 14;
    let seed = 11;
    let px: number[] = [], py: number[] = [];
    let adj: number[][] = [];
    let long: [number, number][] = [];
    const heard = new Int16Array(N).fill(-1);
    let round = 0;
    const place = () => {
      const r = rng(seed);
      px = []; py = [];
      for (let i = 0; i < N; i++) {
        const cx = i % COLS, cy = Math.floor(i / COLS);
        px.push((cx + 0.15 + r() * 0.7) / COLS);
        py.push((cy + 0.15 + r() * 0.7) / ROWS);
      }
    };
    const build = () => {
      const r = rng(seed * 31 + Math.round(v.current.connections) * 7 + Math.round(v.current.longLinks) * 131);
      const k = Math.round(v.current.connections);
      const sets = Array.from({ length: N }, () => new Set<number>());
      for (let i = 0; i < N; i++) {
        const ds: [number, number][] = [];
        for (let j = 0; j < N; j++) if (j !== i) ds.push([j, (px[j] - px[i]) ** 2 + ((py[j] - py[i]) * 0.9) ** 2]);
        ds.sort((a, b) => a[1] - b[1]);
        for (let m = 0; m < k; m++) { sets[i].add(ds[m][0]); sets[ds[m][0]].add(i); }
      }
      long = [];
      for (let i = 0; i < N; i++) {
        if (r() < v.current.longLinks / 100) {
          const j = Math.floor(r() * N);
          if (j !== i && !sets[i].has(j)) { sets[i].add(j); sets[j].add(i); long.push([i, j]); }
        }
      }
      adj = sets.map((s) => [...s]);
    };
    const center = () => {
      let best = 0, bd = Infinity;
      for (let i = 0; i < N; i++) { const d = (px[i] - 0.5) ** 2 + (py[i] - 0.5) ** 2; if (d < bd) { bd = d; best = i; } }
      return best;
    };
    const win = () => Math.round(v.current.window);
    const active = () => { let a = 0; for (let i = 0; i < N; i++) if (heard[i] >= 0 && round - heard[i] < win()) a++; return a; };
    const total = () => { let a = 0; for (let i = 0; i < N; i++) if (heard[i] >= 0) a++; return a; };
    const pos = (i: number, w: number, h: number) => [PAD + px[i] * (w - PAD * 2), PAD + py[i] * (h - PAD * 2)] as const;
    place();
    return {
      reset() { heard.fill(-1); round = 0; build(); heard[center()] = 0; },
      step() {
        const p = v.current.share / 100, wn = win();
        const newly: number[] = [];
        for (let i = 0; i < N; i++) {
          if (heard[i] < 0 || round - heard[i] >= wn) continue;
          for (const j of adj[i]) if (heard[j] < 0 && Math.random() < p) newly.push(j);
        }
        round++;
        for (const j of newly) if (heard[j] < 0) heard[j] = round;
      },
      draw(ctx, w, h, c) {
        ctx.fillStyle = c.canvas;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = c.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < N; i++) for (const j of adj[i]) {
          if (j < i) continue;
          const [x1, y1] = pos(i, w, h), [x2, y2] = pos(j, w, h);
          ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        }
        ctx.stroke();
        const wn = win();
        for (let i = 0; i < N; i++) {
          const [x, y] = pos(i, w, h);
          const sharing = heard[i] >= 0 && round - heard[i] < wn;
          ctx.beginPath();
          ctx.arc(x, y, sharing ? 5.5 : 4.5, 0, Math.PI * 2);
          if (heard[i] < 0) {
            ctx.fillStyle = c.canvas; ctx.fill();
            ctx.strokeStyle = c.ink3; ctx.lineWidth = 1.5; ctx.stroke();
          } else {
            ctx.fillStyle = sharing ? c.accent : c.ink2;
            ctx.fill();
          }
        }
      },
      tap(x, y, w, h) {
        let best = -1, bd = 22 * 22;
        for (let i = 0; i < N; i++) { const [nx, ny] = pos(i, w, h); const d = (nx - x) ** 2 + (ny - y) ** 2; if (d < bd) { bd = d; best = i; } }
        if (best < 0 || heard[best] >= 0) return false;
        heard[best] = round;
        return true;
      },
      act(i) {
        if (i === 0) { seed++; place(); heard.fill(-1); round = 0; build(); heard[center()] = 0; }
        if (i === 1) {
          const left = [];
          for (let k = 0; k < N; k++) if (heard[k] < 0) left.push(k);
          if (left.length) heard[left[Math.floor(Math.random() * left.length)]] = round;
        }
      },
      finished: () => active() === 0,
      readout: () => {
        const t = total(), a = active();
        return `Round ${round} · heard it: ${t} of ${N} (${Math.round((t / N) * 100)}%) · sharing now: ${a}${a === 0 && t > 0 ? ' · the spread has stopped' : ''}`;
      },
    };
  },
};

const SIMS: Record<string, SimDef> = { 'random-walk': RANDOM_WALK, life: LIFE, flocking: FLOCKING, waves: WAVES, spread: SPREAD };

// ---------------- shared pieces ----------------
interface SimDraft { settings?: Vals; observation?: string }

function initialVals(controls: Ctl[], params: SimulationPayload['params'], saved?: Vals): Vals {
  const out: Vals = {};
  for (const c of controls) {
    const pk = [c.key, ...(c.aliases ?? [])].find((k) => params?.[k] !== undefined);
    let v = pk ? num(params, pk, c.def) : c.def;
    if (saved && typeof saved[c.key] === 'number') v = saved[c.key];
    if (c.type === 'slider') v = Math.max(c.min, Math.min(c.max, v));
    out[c.key] = v;
  }
  return out;
}

function Notice({ items }: { items: string[] }) {
  return (
    <PlayerBlock label={<span className="row" style={{ gap: 6 }}><Eye size={14} aria-hidden /> What to notice</span>} className="fx-notice glass fx-panel">
      <ul>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </PlayerBlock>
  );
}

function ObservationFinish({ observation, setObservation, onFinish, completed, done }: { observation: string; setObservation: (s: string) => void; onFinish: () => void; completed: boolean; done: boolean }) {
  return (
    <>
      <div className="glass fx-panel">
        <NotesField label="What did you observe?" value={observation} onChange={setObservation} placeholder="What changed when you moved the sliders? Anything surprising?" />
      </div>
      <div className="fx-nav end">
        <Button variant="primary" icon={<Check size={18} aria-hidden />} onClick={onFinish}>
          {done || completed ? 'Save again' : 'Finish & save observation'}
        </Button>
      </div>
    </>
  );
}

// ---------------- canvas simulation shell ----------------
function CanvasSim({ def, experience, draft, saveDraft, onComplete, completed }: PlayerProps & { def: SimDef }) {
  const payload = (experience.payload ?? {}) as Partial<SimulationPayload>;
  const d = draftOf<SimDraft>(draft);
  const reduced = useReducedMotion();
  const colors = useThemeColors();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(wrapRef, canvasRef, def.aspect, 520);
  const [vals, setVals] = useState<Vals>(() => initialVals(def.controls, payload.params, d.settings));
  const valsRef = useRef(vals);
  valsRef.current = vals;
  const sizeRef = useRef(size);
  const colorsRef = useRef(colors);
  colorsRef.current = colors;
  const simRef = useRef<Sim | null>(null);
  const [playing, setPlaying] = useState(() => !reduced);
  const [observation, setObservation] = useState(typeof d.observation === 'string' ? d.observation : '');
  const [done, setDone] = useState(false);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const [announce, setAnnounce] = useState('');
  const dragging = useRef(false);

  const draftValue = useMemo<SimDraft>(() => ({ settings: vals, observation }), [vals, observation]);
  useAutosave(draftValue, saveDraft);

  const render = useCallback(() => {
    const cv = canvasRef.current, sim = simRef.current, s = sizeRef.current;
    if (!cv || !sim || !s.w) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    sim.draw(ctx, s.w, s.h, colorsRef.current);
    if (readoutRef.current && sim.readout) readoutRef.current.textContent = sim.readout();
  }, []);

  // Create / resize.
  useEffect(() => {
    if (!size.w) return;
    const prev = sizeRef.current;
    sizeRef.current = size;
    if (!simRef.current) {
      simRef.current = def.create(valsRef);
      simRef.current.reset(size.w, size.h);
    } else if (prev.w && (prev.w !== size.w || prev.h !== size.h)) {
      if (simRef.current.resize) simRef.current.resize(size.w, size.h, prev.w, prev.h);
    }
    render();
  }, [size, def, render]);

  useEffect(() => { render(); }, [colors, vals, render]);

  // Animation loop.
  useEffect(() => {
    if (!playing || !size.w) return;
    let raf = 0, last = performance.now(), acc = 0;
    const loop = (now: number) => {
      const sim = simRef.current;
      const s = sizeRef.current;
      if (!sim) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt * def.rate(valsRef.current);
      let n = 0;
      while (acc >= 1 && n < 12) { sim.step(s.w, s.h); acc -= 1; n++; }
      if (n === 12) acc = 0;
      render();
      if (sim.finished?.()) {
        setPlaying(false);
        setAnnounce(sim.readout?.() ?? 'Finished.');
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, size.w, def, render]);

  const stepOnce = () => {
    const sim = simRef.current, s = sizeRef.current;
    if (!sim) return;
    for (let i = 0; i < def.stepTicks; i++) sim.step(s.w, s.h);
    render();
    setAnnounce(sim.readout?.() ?? 'Stepped forward.');
  };
  const reset = () => {
    const sim = simRef.current, s = sizeRef.current;
    if (!sim) return;
    sim.reset(s.w, s.h);
    render();
    setAnnounce('Reset.');
  };
  const setVal = (c: Ctl, v: number) => {
    const next = { ...valsRef.current, [c.key]: v };
    valsRef.current = next;
    setVals(next);
    if (c.reset) {
      const sim = simRef.current, s = sizeRef.current;
      sim?.reset(s.w, s.h);
    }
  };

  const pointer = (e: React.PointerEvent<HTMLCanvasElement>, drag: boolean) => {
    const sim = simRef.current;
    if (!sim?.tap) return;
    const r = e.currentTarget.getBoundingClientRect();
    const changed = sim.tap(e.clientX - r.left, e.clientY - r.top, sizeRef.current.w, sizeRef.current.h, drag);
    if (changed) {
      render();
      if (!drag && def.resumeOnTap && !reduced && !playing) setPlaying(true);
    }
  };

  const playLabel = playing ? 'Pause' : 'Play';

  return (
    <div className="fx-player fx-sim">
      <div className="fx-sim-stage glass glass-strong fx-panel">
        <div ref={wrapRef} className="fx-canvas-wrap">
          <canvas
            ref={canvasRef}
            className={'fx-canvas' + (def.touch ? ' touch' : '')}
            role="img"
            aria-label={`${def.title} simulation. ${def.help ?? ''} Use the controls below to change it.`}
            onPointerDown={def.touch ? (e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pointer(e, false); } : undefined}
            onPointerMove={def.touch ? (e) => { if (dragging.current) pointer(e, true); } : undefined}
            onPointerUp={def.touch ? () => { dragging.current = false; } : undefined}
            onPointerCancel={def.touch ? () => { dragging.current = false; } : undefined}
          />
        </div>
        <p className="fx-readout mono tiny" ref={readoutRef} />
        {def.legend && (
          <ul className="fx-legend" aria-label="Legend">
            {def.legend.map((l) => <li key={l.label}><span className={'fx-key ' + l.cls} aria-hidden /> {l.label}</li>)}
          </ul>
        )}
        {def.help && <p className="tiny faint fx-sim-help">{def.help}</p>}
      </div>
      <div className="fx-sim-panel glass fx-panel">
        <div className="fx-sim-controls row wrap">
          <Button variant="primary" icon={playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />} onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
            {playLabel}
          </Button>
          <Button variant="secondary" icon={<StepForward size={18} aria-hidden />} onClick={stepOnce} disabled={playing}>Step</Button>
          <Button variant="ghost" icon={<RotateCcw size={18} aria-hidden />} onClick={reset}>Reset</Button>
          {def.actions?.map((a, i) => (
            <Button key={a} size="sm" variant="soft" onClick={() => { simRef.current?.act?.(i, sizeRef.current.w, sizeRef.current.h); render(); setAnnounce(`${a}. ${simRef.current?.readout?.() ?? ''}`); }}>{a}</Button>
          ))}
        </div>
        {reduced && <p className="tiny faint">Reduced motion is on, so the simulation starts paused. Use Step to move it forward, or Play.</p>}

        <div className="fx-sliders">
          {def.controls.map((c) =>
            c.type === 'slider' ? (
              <Slider key={c.key} label={c.label} value={vals[c.key]} min={c.min} max={c.max} step={c.step ?? 1} format={c.format} onChange={(v) => setVal(c, v)} />
            ) : c.type === 'toggle' ? (
              <label key={c.key} className="row between fx-toggle-row">
                <span className="small fx-slider-label">{c.label}</span>
                <Toggle checked={vals[c.key] >= 0.5} onChange={(b) => setVal(c, b ? 1 : 0)} label={c.label} />
              </label>
            ) : (
              <div key={c.key} className="fx-slider">
                <span className="small fx-slider-label">{c.label}</span>
                <Segmented label={c.label} value={vals[c.key]} options={c.options} onChange={(v) => setVal(c, v)} />
              </div>
            ),
          )}
        </div>
      </div>
      <span className="sr-only" aria-live="polite">{announce}</span>

      <Notice items={def.notice} />
      <ObservationFinish
        observation={observation}
        setObservation={setObservation}
        completed={completed}
        done={done}
        onFinish={() => { setDone(true); onComplete({ kind: def.title, settings: vals, observation }, observation.trim() ? 'Observation saved' : 'Simulation explored'); }}
      />
    </div>
  );
}

// ---------------- Sound & mood synth ----------------
const CHORDS: Record<'major' | 'minor', number[][]> = {
  major: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
  minor: [[60, 63, 67], [56, 60, 63], [53, 56, 60], [55, 58, 62]],
};
const CHORD_NAMES = { major: ['C major', 'A minor', 'F major', 'G major'], minor: ['C minor', 'A♭ major', 'F minor', 'G minor'] };
const ARP = [0, 1, 2, 1, 0, 1, 2, 3];

function SoundMood({ experience, draft, saveDraft, onComplete, completed }: PlayerProps) {
  const payload = (experience.payload ?? {}) as Partial<SimulationPayload>;
  const d = draftOf<SimDraft>(draft);
  const s0 = d.settings ?? {};
  const audio = useAudioEngine(0.6);
  const reduced = useReducedMotion();
  const colors = useThemeColors();
  const [tempo, setTempo] = useState(() => s0.tempo ?? num(payload.params, 'tempo', 96));
  const [minor, setMinor] = useState(() => (s0.minor ?? (payload.params?.mode === 'minor' ? 1 : 0)) === 1);
  const [bright, setBright] = useState(() => s0.brightness ?? num(payload.params, 'brightness', 45));
  const [pitch, setPitch] = useState(() => s0.pitch ?? num(payload.params, 'pitch', 0));
  const [density, setDensity] = useState(() => s0.density ?? num(payload.params, 'density', 1));
  const [playing, setPlaying] = useState(false);
  const [chord, setChord] = useState(0);
  const [observation, setObservation] = useState(typeof d.observation === 'string' ? d.observation : '');
  const [done, setDone] = useState(false);
  const live = useRef({ tempo, minor, bright, pitch, density });
  live.current = { tempo, minor, bright, pitch, density };
  const eng = useRef<{ bus: GainNode; filter: BiquadFilterNode; analyser: AnalyserNode; timer: number; next: number; step: number; uiTimers: number[] } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(wrapRef, canvasRef, 0.32, 200);

  const settings = useMemo(() => ({ tempo, minor: minor ? 1 : 0, brightness: bright, pitch, density }), [tempo, minor, bright, pitch, density]);
  const draftValue = useMemo<SimDraft>(() => ({ settings, observation }), [settings, observation]);
  useAutosave(draftValue, saveDraft);

  const cutoff = (b: number) => 250 * Math.pow(2, (b / 100) * 5.2);

  const stop = useCallback(() => {
    const e = eng.current;
    if (!e) return;
    clearInterval(e.timer);
    e.uiTimers.forEach(clearTimeout);
    const a = audio.get();
    if (a) {
      e.bus.gain.setTargetAtTime(0.0001, a.ctx.currentTime, 0.05);
      setTimeout(() => { try { e.bus.disconnect(); } catch { /* ignore */ } }, 400);
    }
    eng.current = null;
    setPlaying(false);
  }, [audio]);

  useEffect(() => () => { const e = eng.current; if (e) { clearInterval(e.timer); e.uiTimers.forEach(clearTimeout); } }, []);

  const start = () => {
    const a = audio.ensure();
    if (!a) return;
    const { ctx, master } = a;
    const bus = ctx.createGain();
    bus.gain.value = 1;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.8;
    filter.frequency.value = cutoff(live.current.bright);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    bus.connect(filter).connect(analyser).connect(master);
    const e = { bus, filter, analyser, timer: 0, next: ctx.currentTime + 0.12, step: 0, uiTimers: [] as number[] };
    const schedule = () => {
      const L = live.current;
      const sixteenth = 60 / L.tempo / 4;
      while (e.next < ctx.currentTime + 0.15) {
        const s = e.step;
        const ci = Math.floor(s / 16) % 4;
        const notes = CHORDS[L.minor ? 'minor' : 'major'][ci].map((n) => n + L.pitch);
        const b = s % 16;
        const every = L.density === 0 ? 4 : L.density === 1 ? 2 : 1; // sparse: quarters, medium: eighths, busy: sixteenths
        if (b % every === 0) {
          const idx = ARP[(b / every) % 8];
          const midi = idx === 3 ? notes[0] + 12 : notes[idx];
          playNote(ctx, bus, { freq: midiToHz(midi + 12), at: e.next, dur: sixteenth * every * 0.92, type: 'sawtooth', gain: 0.07, attack: 0.008, release: sixteenth * every * 0.5 });
        }
        if (b === 0 || b === 8) playNote(ctx, bus, { freq: midiToHz(notes[0] - 12), at: e.next, dur: sixteenth * 7.2, type: 'triangle', gain: 0.2, attack: 0.02, release: 0.3 });
        if (b === 0) {
          notes.forEach((n) => playNote(ctx, bus, { freq: midiToHz(n), at: e.next, dur: sixteenth * 15.2, type: 'triangle', gain: 0.035, attack: 0.15, release: 0.5 }));
          const wait = Math.max(0, (e.next - ctx.currentTime) * 1000);
          e.uiTimers.push(window.setTimeout(() => setChord(ci), wait));
          if (e.uiTimers.length > 16) e.uiTimers.splice(0, 8);
        }
        e.next += sixteenth;
        e.step++;
      }
    };
    schedule();
    e.timer = window.setInterval(schedule, 25);
    eng.current = e;
    setPlaying(true);
  };

  useEffect(() => {
    const e = eng.current, a = audio.get();
    if (e && a) e.filter.frequency.setTargetAtTime(cutoff(bright), a.ctx.currentTime, 0.05);
  }, [bright, audio]);

  // Oscilloscope of the actual output (static note diagram under reduced motion).
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !size.w) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const buf = new Uint8Array(1024);
    const drawStatic = () => {
      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      ctx.fillStyle = colors.canvas;
      ctx.fillRect(0, 0, size.w, size.h);
      const notes = CHORDS[minor ? 'minor' : 'major'][chord].map((n) => n + pitch);
      const lo = 46, hi = 82;
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      for (let m = lo; m <= hi; m += 2) {
        const y = size.h - ((m - lo) / (hi - lo)) * (size.h - 20) - 10;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size.w, y); ctx.stroke();
      }
      notes.forEach((n, i) => {
        const y = size.h - ((n - lo) / (hi - lo)) * (size.h - 20) - 10;
        const x = size.w * (0.3 + i * 0.2);
        ctx.fillStyle = playing ? colors.accent : colors.ink3;
        ctx.beginPath(); ctx.ellipse(x, y, 9, 6.5, -0.3, 0, Math.PI * 2); ctx.fill();
      });
    };
    const loop = () => {
      const e = eng.current;
      if (!e) { drawStatic(); return; }
      e.analyser.getByteTimeDomainData(buf);
      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      ctx.fillStyle = colors.canvas;
      ctx.fillRect(0, 0, size.w, size.h);
      ctx.strokeStyle = colors.line;
      ctx.beginPath(); ctx.moveTo(0, size.h / 2); ctx.lineTo(size.w, size.h / 2); ctx.stroke();
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < buf.length; i++) {
        const x = (i / (buf.length - 1)) * size.w;
        const y = (buf[i] / 255) * size.h;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
      raf = requestAnimationFrame(loop);
    };
    if (playing && !reduced) raf = requestAnimationFrame(loop);
    else drawStatic();
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced, size, colors, chord, minor, pitch]);

  const names = CHORD_NAMES[minor ? 'minor' : 'major'];

  return (
    <div className="fx-player fx-sim">
      <div className="fx-sim-stage glass glass-strong fx-panel">
        <div className="row between fx-sim-head">
          <span className="label">{playing ? 'Now playing' : 'Ready'}</span>
          <span className="small mono">{names[chord]}</span>
        </div>
        <div ref={wrapRef} className="fx-canvas-wrap">
          <canvas ref={canvasRef} className="fx-canvas" role="img" aria-label={playing ? `Sound wave of the music, currently on ${names[chord]}` : 'Notes of the current chord'} />
        </div>
        <p className="tiny faint fx-sim-help">
          {names.join(' → ')} — all synthesised live on this device.
        </p>
      </div>
      <AudioError error={audio.error} />
      <div className="fx-sim-panel glass fx-panel">
        <div className="fx-sim-controls row wrap">
          {playing ? (
            <Button variant="primary" icon={<Square size={16} aria-hidden />} onClick={stop}>Stop</Button>
          ) : (
            <Button variant="primary" icon={<Play size={18} aria-hidden />} onClick={start}>Start sound</Button>
          )}
        </div>
        <div className="fx-sliders">
          <Slider label="Tempo" value={tempo} min={50} max={170} onChange={setTempo} format={(v) => `${v} BPM`} />
          <div className="fx-slider">
            <span className="small fx-slider-label">Key</span>
            <Segmented label="Key" value={minor ? 'minor' : 'major'} options={[{ value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' }]} onChange={(v) => setMinor(v === 'minor')} />
          </div>
          <Slider label="Pitch" value={pitch} min={-12} max={12} onChange={setPitch} format={(v) => (v === 0 ? 'Middle' : v > 0 ? `${v} semitones higher` : `${-v} semitones lower`)} />
          <div className="fx-slider">
            <span className="small fx-slider-label">Density</span>
            <Segmented label="Density" value={density} options={[{ value: 0, label: 'Sparse' }, { value: 1, label: 'Medium' }, { value: 2, label: 'Busy' }]} onChange={setDensity} />
          </div>
          <Slider label="Brightness" value={bright} min={0} max={100} onChange={setBright} format={(v) => (v < 30 ? 'Dark' : v < 70 ? 'Warm' : 'Bright') + ` (${v}%)`} />
          <VolumeControl volume={audio.volume} onChange={audio.setVolume} />
        </div>
      </div>
      <Notice
        items={[
          'Change one control at a time. Which one shifts the mood most for you?',
          'Major and minor differ by a single note in each chord, moved by a semitone — yet the feel often flips from bright to wistful. That link is partly learned and varies between musical cultures.',
          'Tempo and density (how many notes per beat) tend to change energy more than happiness; higher pitch and more brightness (high-frequency sound) can feel lighter — or more tense.',
        ]}
      />
      <ObservationFinish
        observation={observation}
        setObservation={setObservation}
        completed={completed}
        done={done}
        onFinish={() => { setDone(true); stop(); onComplete({ kind: 'sound-mood', settings, observation }, observation.trim() ? 'Observation saved' : 'Simulation explored'); }}
      />
    </div>
  );
}

// ---------------- entry ----------------
export function SimulationPlayer(props: PlayerProps) {
  const payload = (props.experience.payload ?? {}) as Partial<SimulationPayload>;
  const kind = String(payload.kind ?? '');
  const [observation, setObservation] = useState('');
  const [done, setDone] = useState(false);
  if (kind === 'sound-mood') return <SoundMood {...props} />;
  const def = SIMS[kind];
  if (def) return <CanvasSim {...props} def={def} />;
  return (
    <div className="fx-player">
      <div className="banner warn">This simulation (“{kind || 'unknown'}”) isn’t built into this version of Elsewhere.</div>
      <ObservationFinish
        observation={observation}
        setObservation={setObservation}
        completed={props.completed}
        done={done}
        onFinish={() => { setDone(true); props.onComplete({ kind, observation }, 'Observation saved'); }}
      />
    </div>
  );
}

export default SimulationPlayer;
