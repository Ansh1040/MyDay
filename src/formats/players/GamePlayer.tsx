// Games: pattern-memory (Simon-like), rhythm-tap (tap along to a synthesised beat, measured timing) and estimate.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Play, RotateCcw, Check, Square, Eye, Volume2, VolumeX } from 'lucide-react';
import type { GamePayload } from '../../data/types';
import type { PlayerProps } from '../registry';
import { Button, Toggle, useAutosave } from '../../components/ui';
import { useStore } from '../../store/store';
import { draftOf, num, useReducedMotion, PlayerBlock } from './kit';
import { AudioError, VolumeControl, playDrum, playNote, useAudioEngine } from './audio';

export function GamePlayer(props: PlayerProps) {
  const p = (props.experience.payload ?? {}) as Partial<GamePayload>;
  switch (p.kind) {
    case 'pattern-memory':
      return <PatternMemory {...props} params={p.params} />;
    case 'rhythm-tap':
      return <RhythmTap {...props} params={p.params} />;
    case 'estimate':
      return <Estimate {...props} items={Array.isArray(p.items) ? p.items : []} />;
    default:
      return (
        <div className="fx-player">
          <p className="muted glass fx-panel">This game (“{String(p.kind ?? 'unknown')}”) isn’t available in this version of Elsewhere.</p>
          <Button variant="secondary" onClick={() => props.onComplete({ unsupported: p.kind }, 'Marked as done')}>Mark as done</Button>
        </div>
      );
  }
}
export default GamePlayer;

type GameProps = PlayerProps & { params?: Record<string, number | string> };

// ============ Pattern memory ============
const PAD_NOTES = [261.63, 329.63, 392.0, 523.25, 440.0, 293.66, 349.23, 587.33, 659.25];

function PatternMemory({ experience, draft, saveDraft, onComplete, params }: GameProps) {
  const pads = [4, 6, 9].includes(num(params, 'pads', 4)) ? num(params, 'pads', 4) : 4;
  const cols = pads === 4 ? 2 : 3;
  const startLen = Math.max(1, Math.min(8, Math.round(num(params, 'start', 1))));
  const reduced = useReducedMotion();
  const audio = useAudioEngine(0.5);
  const d = draftOf<{ best: number }>(draft);
  // Finishing clears the draft, so the personal best also has to come from earlier saved runs.
  const savedBest = useStore((s) => {
    let m = 0;
    for (const c of Object.values(s.completions)) {
      const b = (c.result as { best?: unknown } | undefined)?.best;
      if (c.ref.kind === 'experience' && c.ref.id === experience.id && typeof b === 'number' && b > m) m = b;
    }
    return m;
  });
  const [best, setBest] = useState(() => Math.max(typeof d.best === 'number' ? d.best : 0, savedBest));
  const [phase, setPhase] = useState<'idle' | 'show' | 'input' | 'over'>('idle');
  const [seq, setSeq] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const [sound, setSound] = useState(true);
  const [say, setSay] = useState('');
  const [games, setGames] = useState(0);
  const timers = useRef<number[]>([]);
  const padRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useAutosave(best, (b) => saveDraft({ best: b }));
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clearTimers, []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const beep = (i: number, dur = 0.25) => {
    if (!sound) return;
    const a = audio.get() ?? audio.ensure();
    if (!a) return;
    playNote(a.ctx, a.master, { freq: PAD_NOTES[i % PAD_NOTES.length], at: a.ctx.currentTime + 0.01, dur, type: 'triangle', gain: 0.25 });
  };

  const show = (s: number[]) => {
    setPhase('show');
    setPos(0);
    const on = reduced ? 800 : Math.max(280, 620 - s.length * 25);
    const gap = reduced ? 400 : 180;
    setSay(`Watch ${s.length} pad${s.length === 1 ? '' : 's'}.`);
    s.forEach((padIdx, k) => {
      later(() => { setLit(padIdx); beep(padIdx, on / 1000); setSay(`Pad ${padIdx + 1}`); }, 700 + k * (on + gap));
      later(() => setLit(null), 700 + k * (on + gap) + on);
    });
    later(() => {
      setPhase('input');
      setSay(`Your turn: repeat ${s.length} pad${s.length === 1 ? '' : 's'}. Use the pads or number keys 1 to ${pads}.`);
      padRefs.current[0]?.focus();
    }, 700 + s.length * (on + gap));
  };

  const start = () => {
    clearTimers();
    if (sound) audio.ensure();
    const s = Array.from({ length: startLen }, () => Math.floor(Math.random() * pads));
    setSeq(s);
    show(s);
  };

  const press = (i: number) => {
    if (phase !== 'input') return;
    setLit(i);
    beep(i, 0.18);
    later(() => setLit(null), 180);
    if (seq[pos] !== i) {
      // Longest pattern fully repeated: the previous round's, or none if the first round was missed.
      const reached = seq.length > startLen ? seq.length - 1 : 0;
      setPhase('over');
      setGames((g) => g + 1);
      if (reached > best) setBest(reached);
      setSay(`Missed — that was pad ${seq[pos] + 1}. ${reached ? `You remembered ${reached} in a row.` : 'No full pattern this time.'}`);
      return;
    }
    if (pos === seq.length - 1) {
      const next = [...seq, Math.floor(Math.random() * pads)];
      if (seq.length > best) setBest(seq.length);
      setSay(`Correct — ${seq.length} in a row. Next round.`);
      setSeq(next);
      setPhase('show');
      later(() => show(next), 500);
    } else setPos(pos + 1);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= pads) {
      e.preventDefault();
      press(n - 1);
    }
  };

  return (
    <div className="fx-player fx-game" onKeyDown={onKey}>
      <div className="fx-board glass fx-panel">
        <div className="row between">
          <span className="label">{phase === 'idle' ? 'Pattern memory' : `Round ${seq.length}`}</span>
          <span className="small mono">Best: {best}</span>
        </div>
        <div className="fx-pads" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} role="group" aria-label="Pads">
          {Array.from({ length: pads }, (_, i) => (
            <button
              key={i}
              ref={(el) => { padRefs.current[i] = el; }}
              type="button"
              className={'fx-pad' + (lit === i ? ' lit' : '')}
              aria-label={`Pad ${i + 1}`}
              aria-disabled={phase !== 'input' || undefined}
              onClick={() => press(i)}
            >
              <span className="fx-pad-n" aria-hidden>{i + 1}</span>
            </button>
          ))}
        </div>
        <p className="fx-game-status" aria-live="polite">{say || 'Watch the pads light up, then repeat the pattern. It grows by one each round.'}</p>
        <AudioError error={audio.error} />
        <div className="row wrap between">
          <label className="row small fx-toggle-row" style={{ gap: 10 }}>
            <Toggle checked={sound} onChange={setSound} label="Pad tones" /> {sound ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />} Tones
          </label>
          <Button variant={phase === 'idle' || phase === 'over' ? 'primary' : 'secondary'} icon={phase === 'idle' ? <Play size={18} aria-hidden /> : <RotateCcw size={18} aria-hidden />} onClick={start}>
            {phase === 'idle' ? 'Start' : phase === 'over' ? 'Play again' : 'Restart'}
          </Button>
        </div>
      </div>
      {games > 0 && (
        <div className="fx-nav end">
          <Button variant="primary" icon={<Check size={18} aria-hidden />} onClick={() => onComplete({ kind: 'pattern-memory', best, games }, `Best: ${best} in a row`)}>
            Save best ({best}) & finish
          </Button>
        </div>
      )}
    </div>
  );
}

// ============ Rhythm tap ============
interface TapStats { hits: number; beats: number; meanMs: number; spreadMs: number; within50: number; missed: number; offsets: number[] }

function RhythmTap({ onComplete, params }: GameProps) {
  const bpm = Math.max(50, Math.min(180, num(params, 'bpm', 90)));
  const beats = Math.max(8, Math.min(48, num(params, 'beats', 16)));
  const COUNT_IN = 4;
  const period = 60 / bpm;
  const audio = useAudioEngine(0.7);
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [beatNo, setBeatNo] = useState(-COUNT_IN);
  const [last, setLast] = useState<string>('');
  const [stats, setStats] = useState<TapStats | null>(null);
  const run = useRef<{ t0: number; taps: number[]; gain: GainNode; raf: number; timer: number } | null>(null);
  const tapBtn = useRef<HTMLButtonElement>(null);

  const stopRun = () => {
    const r = run.current;
    if (!r) return;
    cancelAnimationFrame(r.raf);
    clearInterval(r.timer);
    try { r.gain.disconnect(); } catch { /* ignore */ }
    run.current = null;
  };
  useEffect(() => stopRun, []);

  const analyse = (taps: number[], t0: number, latency: number): TapStats => {
    const firstBeat = t0 + COUNT_IN * period;
    const matched = new Map<number, number>();
    for (const t of taps) {
      const heard = t - latency;
      const k = Math.round((heard - firstBeat) / period);
      if (k < 0 || k >= beats) continue;
      const off = (heard - (firstBeat + k * period)) * 1000;
      if (Math.abs(off) > (period * 1000) / 2) continue;
      if (!matched.has(k)) matched.set(k, off);
    }
    const offs = [...matched.values()];
    const mean = offs.length ? offs.reduce((a, b) => a + b, 0) / offs.length : 0;
    const spread = offs.length ? offs.reduce((a, b) => a + Math.abs(b - mean), 0) / offs.length : 0;
    return { hits: offs.length, beats, meanMs: Math.round(mean), spreadMs: Math.round(spread), within50: offs.filter((o) => Math.abs(o) <= 50).length, missed: beats - offs.length, offsets: offs.map(Math.round) };
  };

  const start = () => {
    stopRun();
    const a = audio.ensure();
    if (!a) return;
    const { ctx, master } = a;
    const gain = ctx.createGain();
    gain.connect(master);
    const t0 = ctx.currentTime + 0.4;
    for (let i = 0; i < COUNT_IN + beats; i++) {
      const at = t0 + i * period;
      if (i < COUNT_IN) playDrum(ctx, gain, 'clickHi', at, 0.8);
      else playDrum(ctx, gain, (i - COUNT_IN) % 4 === 0 ? 'kick' : 'hat', at, (i - COUNT_IN) % 4 === 0 ? 1 : 0.9);
      if (i >= COUNT_IN) playDrum(ctx, gain, 'click', at, 0.35);
    }
    const end = t0 + (COUNT_IN + beats) * period;
    const latency = (ctx as AudioContext & { outputLatency?: number }).outputLatency || ctx.baseLatency || 0;
    const r = { t0, taps: [] as number[], gain, raf: 0, timer: 0 };
    run.current = r;
    setStats(null);
    setLast('');
    setPhase('running');
    setBeatNo(-COUNT_IN);
    const tick = () => {
      const cur = run.current;
      if (!cur) return;
      const b = Math.max(-COUNT_IN, Math.floor((ctx.currentTime - latency - t0) / period) - COUNT_IN);
      setBeatNo((prev) => (prev === b ? prev : b));
      cur.raf = requestAnimationFrame(tick);
    };
    r.raf = requestAnimationFrame(tick);
    // Wait on the audio clock, not wall-clock time: an audio clock that starts late or runs behind (slow devices,
    // Bluetooth, a busy page) otherwise ended the run before the last beats had even played.
    r.timer = window.setInterval(() => {
      const cur = run.current;
      if (!cur || (ctx.state !== 'closed' && ctx.currentTime < end + period / 2)) return;
      const s = analyse(cur.taps, cur.t0, latency);
      stopRun();
      setStats(s);
      setPhase('done');
    }, 100);
    setTimeout(() => tapBtn.current?.focus(), 0);
  };

  const tap = () => {
    const r = run.current;
    const a = audio.get();
    if (!r || !a) return;
    const t = a.ctx.currentTime;
    r.taps.push(t);
    const latency = (a.ctx as AudioContext & { outputLatency?: number }).outputLatency || a.ctx.baseLatency || 0;
    const firstBeat = r.t0 + COUNT_IN * period;
    const k = Math.round((t - latency - firstBeat) / period);
    if (k >= 0 && k < beats) {
      const off = Math.round((t - latency - (firstBeat + k * period)) * 1000);
      setLast(Math.abs(off) <= 15 ? 'On the beat' : off < 0 ? `${-off} ms early` : `${off} ms late`);
    } else setLast(k < 0 ? 'Wait for the count-in' : '');
  };

  const counting = phase === 'running' && beatNo < 0;
  const range = (period * 1000) / 2;

  return (
    <div className="fx-player fx-game">
      <div className="fx-board glass fx-panel">
        <p className="muted">Tap along with the beat — {beats} beats at {bpm} BPM after a four-click count-in. Your timing is measured against the audio clock.</p>
        <div className="fx-tap-wrap">
          <button
            ref={tapBtn}
            type="button"
            className="fx-tap"
            onPointerDown={(e) => { e.preventDefault(); tap(); }}
            onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); tap(); } }}
            disabled={phase !== 'running'}
            aria-label="Tap on the beat (Space or Enter)"
          >
            {phase === 'running' && !reduced && <span key={beatNo} className="fx-tap-pulse" aria-hidden />}
            <span className="display t-lg">{phase !== 'running' ? 'Tap' : counting ? String(-beatNo) : 'Tap'}</span>
            <span className="tiny">{phase === 'running' ? (counting ? 'count-in' : `beat ${Math.min(beats, beatNo + 1)} of ${beats}`) : 'press Start first'}</span>
          </button>
        </div>
        <p className="fx-game-status small" aria-live="polite">{phase === 'running' ? last : ''}</p>
        <AudioError error={audio.error} />
        <VolumeControl volume={audio.volume} onChange={audio.setVolume} />
        <div className="row wrap between">
          <span className="tiny faint">Bluetooth headphones add a delay this page can’t always measure — wired or speaker is most accurate.</span>
          {phase === 'running' ? (
            <Button variant="secondary" icon={<Square size={16} aria-hidden />} onClick={() => { stopRun(); setPhase('idle'); }}>Stop</Button>
          ) : (
            <Button variant="primary" icon={<Play size={18} aria-hidden />} onClick={start}>{phase === 'done' ? 'Go again' : 'Start'}</Button>
          )}
        </div>
      </div>

      {stats && (
        <PlayerBlock label="How it went" className="fx-result glass fx-panel">
          <p aria-live="polite">
            {stats.hits === 0
              ? 'No taps landed near the beats. Press Start, wait for the four clicks, then tap with each beat.'
              : <>
                  {Math.abs(stats.meanMs) <= 10 ? 'On average you were right on the beat' : `On average you tapped ${Math.abs(stats.meanMs)} ms ${stats.meanMs < 0 ? 'early (before the beat)' : 'late (after the beat)'}`}.
                  {' '}{stats.within50} of {stats.beats} beats got a tap within 50 ms.
                  {' '}Your taps varied by about {stats.spreadMs} ms from your own average{stats.spreadMs <= 25 ? ' — very steady' : stats.spreadMs <= 50 ? ' — fairly steady' : ''}.
                  {stats.missed > 0 && ` ${stats.missed} beat${stats.missed === 1 ? '' : 's'} had no tap.`}
                </>}
          </p>
          {stats.hits > 0 && (
            <svg className="fx-offsets" viewBox="0 0 300 44" role="img" aria-label={`Tap timing chart: ${stats.hits} taps between ${-Math.round(range)} and ${Math.round(range)} milliseconds of the beat`}>
              <line x1="0" y1="22" x2="300" y2="22" className="axis" />
              <line x1="150" y1="6" x2="150" y2="38" className="beatline" />
              {stats.offsets.map((o, i) => (
                <circle key={i} cx={150 + (o / range) * 145} cy={22} r={4} className="tapdot" />
              ))}
              <text x="2" y="42" className="lbl">early</text>
              <text x="150" y="42" textAnchor="middle" className="lbl">beat</text>
              <text x="298" y="42" textAnchor="end" className="lbl">late</text>
            </svg>
          )}
          <div className="fx-nav end">
            <Button variant="primary" icon={<Check size={18} aria-hidden />} onClick={() => onComplete({ kind: 'rhythm-tap', bpm, ...stats }, `${stats.within50} of ${stats.beats} taps within 50 ms`)}>
              Save this run
            </Button>
          </div>
        </PlayerBlock>
      )}
    </div>
  );
}

// ============ Estimate ============
type EstItem = NonNullable<GamePayload['items']>[number];
interface EstDraft { guesses: Record<number, string>; revealed: number[] }

function closeness(guess: number, answer: number) {
  if (answer === 0) {
    const diff = Math.abs(guess);
    return { within: (q: number) => diff <= q, text: diff === 0 ? 'Exactly right.' : `Off by ${fmt(diff)}.`, pct: diff === 0 ? 0 : Infinity };
  }
  const ratio = guess / answer;
  const pct = Math.abs(ratio - 1);
  let text: string;
  if (pct < 0.005) text = 'Spot on.';
  else if (ratio > 0 && (ratio >= 2 || ratio <= 0.5)) {
    const f = ratio >= 1 ? ratio : 1 / ratio;
    text = `Off by about ×${f < 10 ? f.toFixed(1) : Math.round(f).toLocaleString()} (${ratio > 1 ? 'too high' : 'too low'}).`;
  } else text = `${Math.round(pct * 100)}% ${ratio > 1 ? 'over' : 'under'}${pct <= 0.1 ? ' — very close.' : pct <= 0.25 ? ' — close.' : '.'}`;
  if (ratio <= 0) text = 'Opposite sign — way off.';
  return { within: (q: number) => pct <= q, text, pct };
}
const fmt = (n: number) => (Math.abs(n) >= 1e6 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toLocaleString(undefined, { maximumFractionDigits: 3 }));

function Estimate({ items, draft, saveDraft, onComplete, completed }: GameProps & { items: EstItem[] }) {
  const list = useMemo(() => items.filter((i) => i && typeof i.answer === 'number' && i.q), [items]);
  const d = draftOf<EstDraft>(draft);
  const [guesses, setGuesses] = useState<Record<number, string>>(d.guesses ?? {});
  const [revealed, setRevealed] = useState<number[]>(Array.isArray(d.revealed) ? d.revealed : []);
  const [done, setDone] = useState(false);
  const baseId = useId();
  const value = useMemo(() => ({ guesses, revealed }), [guesses, revealed]);
  useAutosave(value, (v) => saveDraft(v));

  if (!list.length) return <div className="fx-player"><p className="muted glass fx-panel">This estimation game has no questions yet.</p></div>;

  const parse = (s: string | undefined) => {
    if (s == null) return NaN;
    const n = Number(s.replace(/[,\s_]/g, ''));
    return s.trim() === '' ? NaN : n;
  };
  const scored = revealed.filter((i) => Number.isFinite(parse(guesses[i])));
  const within25 = scored.filter((i) => closeness(parse(guesses[i]), list[i].answer).within(0.25)).length;
  const allRevealed = revealed.length >= list.length;

  return (
    <div className="fx-player fx-estimate">
      <p className="muted glass fx-panel">Make your best guess for each, then reveal. Closeness is measured as a percentage of the real answer.</p>
      <ol className="fx-est-list">
        {list.map((it, i) => {
          const id = `${baseId}-${i}`;
          const g = parse(guesses[i]);
          const isRev = revealed.includes(i);
          const c = isRev && Number.isFinite(g) ? closeness(g, it.answer) : null;
          return (
            <li key={i} className="fx-est card">
              <label htmlFor={id} className="fx-est-q">{it.q}</label>
              <div className="row">
                <input
                  id={id}
                  className="input mono"
                  inputMode="decimal"
                  placeholder="Your guess"
                  value={guesses[i] ?? ''}
                  disabled={isRev}
                  onChange={(e) => setGuesses((s) => ({ ...s, [i]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !isRev) setRevealed((r) => [...r, i]); }}
                  aria-invalid={guesses[i] !== undefined && guesses[i] !== '' && !Number.isFinite(g) ? true : undefined}
                />
                {it.unit && <span className="small muted">{it.unit}</span>}
                {!isRev && (
                  <Button variant="secondary" icon={<Eye size={16} aria-hidden />} onClick={() => setRevealed((r) => [...r, i])}>
                    {Number.isFinite(g) ? 'Reveal' : 'Just reveal'}
                  </Button>
                )}
              </div>
              <div aria-live="polite">
                {isRev && (
                  <div className={'fx-est-ans ' + (c ? (c.within(0.25) ? 'ok' : 'no') : '')}>
                    <p><span className="label">Answer</span> <strong className="mono">{fmt(it.answer)}</strong>{it.unit ? ` ${it.unit}` : ''}</p>
                    <p className="small">{c ? `You guessed ${fmt(g)}. ${c.text}` : 'No guess entered.'}</p>
                    {it.note && <p className="small muted">{it.note}</p>}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {revealed.length > 0 && (
        <p className="small glass fx-panel fx-est-sum" aria-live="polite">
          {scored.length ? `${within25} of ${scored.length} guess${scored.length === 1 ? '' : 'es'} within 25% of the answer.` : 'Reveal with a guess entered to see how close you were.'}
        </p>
      )}
      <div className="fx-nav between">
        <Button variant="secondary" icon={<RotateCcw size={16} aria-hidden />} onClick={() => { setGuesses({}); setRevealed([]); setDone(false); }} disabled={!revealed.length && !Object.keys(guesses).length}>Start over</Button>
        <Button
          variant="primary"
          icon={<Check size={18} aria-hidden />}
          disabled={!allRevealed}
          onClick={() => {
            setDone(true);
            onComplete({ kind: 'estimate', guesses: list.map((_, i) => (Number.isFinite(parse(guesses[i])) ? parse(guesses[i]) : null)), within25, total: list.length }, `${within25} of ${list.length} within 25%`);
          }}
        >
          {done || completed ? 'Save again' : allRevealed ? 'Finish' : `Reveal all to finish (${revealed.length}/${list.length})`}
        </Button>
      </div>
    </div>
  );
}
