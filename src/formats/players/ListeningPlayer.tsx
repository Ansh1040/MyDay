// Listening exercises. Everything audible is synthesised live with Web Audio (no media files) and only starts on a tap.
// Kinds: tones, soundscape, rhythm, mood-pair; 'silence' is guided environmental listening with a timer.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Play, Square, Check, Plus, X, Eye, Ear } from 'lucide-react';
import type { ListeningPayload } from '../../data/types';
import type { PlayerProps } from '../registry';
import { Button, IconButton, Segmented, Toggle, useAutosave } from '../../components/ui';
import { TimerControl } from '../../components/common';
import { NotesField, PlayerBlock, Slider, draftOf, useReducedMotion } from './kit';
import { AudioError, VolumeControl, midiToHz, noiseBuffer, playDrum, playNote, useAudioEngine, type AudioEngine } from './audio';

type Pick3 = 'A' | 'B' | 'same';
interface PairState { happier?: Pick3; calmer?: Pick3; revealed?: boolean; played?: ('A' | 'B')[] }
interface SoundItem { id: string; text: string; distance: 'near' | 'middle' | 'far' }
interface ListenDraft { notes?: string; pairs?: Record<string, PairState>; flips?: Record<string, boolean>; sounds?: SoundItem[] }

export function ListeningPlayer({ experience, draft, saveDraft, onComplete, completed }: PlayerProps) {
  const p = (experience.payload ?? {}) as Partial<ListeningPayload>;
  const kind = String(p.kind ?? '');
  const prompts = Array.isArray(p.prompts) ? p.prompts.filter(Boolean) : [];
  const d = draftOf<ListenDraft>(draft);
  const [notes, setNotes] = useState(typeof d.notes === 'string' ? d.notes : '');
  const [pairs, setPairs] = useState<Record<string, PairState>>(d.pairs ?? {});
  const [flips] = useState<Record<string, boolean>>(() => d.flips ?? Object.fromEntries(MOOD_PAIRS.map((x) => [x.id, Math.random() < 0.5])));
  const [sounds, setSounds] = useState<SoundItem[]>(Array.isArray(d.sounds) ? d.sounds : []);
  const [done, setDone] = useState(false);
  const value = useMemo<ListenDraft>(() => ({ notes, pairs, flips, sounds }), [notes, pairs, flips, sounds]);
  useAutosave(value, saveDraft);

  const finish = () => {
    setDone(true);
    const result: Record<string, unknown> = { kind, notes };
    if (kind === 'mood-pair') {
      result.pairs = MOOD_PAIRS.filter((x) => pairs[x.id]?.happier || pairs[x.id]?.calmer).map((x) => {
        const [a, b] = flips[x.id] ? [x.names[1], x.names[0]] : [x.names[0], x.names[1]];
        const name = (v?: Pick3) => (v === 'A' ? a : v === 'B' ? b : v === 'same' ? 'no difference' : null);
        return { id: x.id, happier: name(pairs[x.id].happier), calmer: name(pairs[x.id].calmer) };
      });
    }
    if (kind === 'silence') result.sounds = sounds;
    const summary = kind === 'silence' && sounds.length ? `${sounds.length} sound${sounds.length === 1 ? '' : 's'} noted` : notes.trim() ? 'Listening notes saved' : 'Listening done';
    onComplete(result, summary);
  };

  return (
    <div className="fx-player fx-listen">
      {prompts.length > 0 && (
        <PlayerBlock label={<span className="row" style={{ gap: 6 }}><Ear size={14} aria-hidden /> Listen for</span>} className="fx-prompts glass fx-panel">
          <ol>{prompts.map((t, i) => <li key={i}>{t}</li>)}</ol>
        </PlayerBlock>
      )}

      {kind === 'tones' && <TonesLab />}
      {kind === 'soundscape' && <Soundscape />}
      {kind === 'rhythm' && <RhythmBox />}
      {kind === 'mood-pair' && <MoodPairs state={pairs} setState={setPairs} flips={flips} />}
      {kind === 'silence' && (
        <SilenceListen expId={experience.id} title={experience.title} seconds={typeof p.seconds === 'number' && p.seconds > 0 ? p.seconds : 180} sounds={sounds} setSounds={setSounds} />
      )}
      {!['tones', 'soundscape', 'rhythm', 'mood-pair', 'silence'].includes(kind) && (
        <div className="banner warn">This listening mode (“{kind || 'unknown'}”) isn’t built into this version. You can still follow the prompts and take notes.</div>
      )}

      <div className="glass fx-panel">
        <NotesField label="What did you hear and notice?" value={notes} onChange={setNotes} placeholder="Sounds, feelings, surprises…" />
      </div>
      <div className="fx-nav end">
        <Button variant="primary" icon={<Check size={18} aria-hidden />} onClick={finish}>{done || completed ? 'Save again' : 'Finish'}</Button>
      </div>
    </div>
  );
}
export default ListeningPlayer;

// ================= Tones =================
interface ToneSpec { f: number; type?: OscillatorType; level?: number; dur?: number }
const TONE_GROUPS: { title: string; items: { id: string; label: string; sub: string; tones: ToneSpec[] }[] }[] = [
  {
    title: 'Pitch',
    items: [
      { id: 'low', label: 'Low', sub: '110 Hz', tones: [{ f: 110 }] },
      { id: 'mid', label: 'Middle', sub: '440 Hz — the tuning A', tones: [{ f: 440 }] },
      { id: 'high', label: 'High', sub: '1760 Hz', tones: [{ f: 1760 }] },
    ],
  },
  {
    title: 'Loudness and length',
    items: [
      { id: 'soft', label: 'Soft', sub: '440 Hz, quiet', tones: [{ f: 440, level: 0.05 }] },
      { id: 'loud', label: 'Loud', sub: '440 Hz, about four times stronger', tones: [{ f: 440, level: 0.3 }] },
      { id: 'short', label: 'Short', sub: '440 Hz for a quarter second', tones: [{ f: 440, dur: 0.25 }] },
      { id: 'long', label: 'Long', sub: '440 Hz for four seconds', tones: [{ f: 440, dur: 4 }] },
    ],
  },
  {
    title: 'Tone colour',
    items: [
      { id: 'pure', label: 'Pure', sub: '220 Hz sine wave', tones: [{ f: 220, type: 'sine' }] },
      { id: 'hollow', label: 'Hollow', sub: '220 Hz square wave', tones: [{ f: 220, type: 'square' }] },
      { id: 'buzzy', label: 'Buzzy', sub: '220 Hz sawtooth — same pitch, more overtones', tones: [{ f: 220, type: 'sawtooth' }] },
    ],
  },
  {
    title: 'Two notes together',
    items: [
      { id: 'fifth', label: 'Open fifth', sub: '220 + 330 Hz (ratio 3 : 2)', tones: [{ f: 220 }, { f: 330 }] },
      { id: 'clash', label: 'Clash', sub: '220 + 233 Hz (a semitone apart)', tones: [{ f: 220 }, { f: 233.08 }] },
      { id: 'beat', label: 'Beating', sub: '220 + 223 Hz — listen for a wobble, 3 times a second', tones: [{ f: 220 }, { f: 223 }] },
    ],
  },
];

function TonesLab() {
  const audio = useAudioEngine(0.5);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [freePlaying, setFreePlaying] = useState(false);
  const [freeV, setFreeV] = useState(50);
  const [wave, setWave] = useState<OscillatorType>('sine');
  const current = useRef<{ g: GainNode; t: number } | null>(null);
  const free = useRef<{ o: OscillatorNode; g: GainNode } | null>(null);
  const freeHz = Math.round(60 * Math.pow(2, (freeV / 100) * Math.log2(2000 / 60)));

  const stopPreset = useCallback((a?: AudioEngine | null) => {
    const c = current.current;
    if (!c) return;
    clearTimeout(c.t);
    const eng = a ?? audio.get();
    if (eng) c.g.gain.setTargetAtTime(0.0001, eng.ctx.currentTime, 0.03);
    setTimeout(() => { try { c.g.disconnect(); } catch { /* ignore */ } }, 200);
    current.current = null;
    setPlayingId(null);
  }, [audio]);

  const playPreset = (id: string, tones: ToneSpec[]) => {
    const a = audio.ensure();
    if (!a) return;
    if (playingId === id) { stopPreset(a); return; }
    stopPreset(a);
    const g = a.ctx.createGain();
    g.connect(a.master);
    const at = a.ctx.currentTime + 0.02;
    const dur = Math.max(...tones.map((t) => t.dur ?? 2.6));
    tones.forEach((t) => {
      const d = t.dur ?? 2.6;
      playNote(a.ctx, g, { freq: t.f, at, dur: d, type: t.type ?? 'sine', gain: (t.level ?? (t.type === 'sawtooth' || t.type === 'square' ? 0.12 : 0.25)) / tones.length, attack: Math.min(0.05, d / 5), release: Math.min(0.4, d / 3) });
    });
    current.current = { g, t: window.setTimeout(() => { current.current = null; setPlayingId(null); }, dur * 1000 + 150) };
    setPlayingId(id);
  };

  const toggleFree = () => {
    if (freePlaying) {
      const f = free.current, a = audio.get();
      if (f && a) { f.g.gain.setTargetAtTime(0.0001, a.ctx.currentTime, 0.04); f.o.stop(a.ctx.currentTime + 0.3); }
      free.current = null;
      setFreePlaying(false);
      return;
    }
    const a = audio.ensure();
    if (!a) return;
    const o = a.ctx.createOscillator();
    const g = a.ctx.createGain();
    o.type = wave;
    o.frequency.value = freeHz;
    g.gain.setValueAtTime(0.0001, a.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(wave === 'sine' || wave === 'triangle' ? 0.22 : 0.1, a.ctx.currentTime + 0.05);
    o.connect(g).connect(a.master);
    o.start();
    free.current = { o, g };
    setFreePlaying(true);
  };

  useEffect(() => {
    const f = free.current, a = audio.get();
    if (!f || !a) return;
    f.o.frequency.setTargetAtTime(freeHz, a.ctx.currentTime, 0.03);
    f.o.type = wave;
    f.g.gain.setTargetAtTime(wave === 'sine' || wave === 'triangle' ? 0.22 : 0.1, a.ctx.currentTime, 0.03);
  }, [freeHz, wave, audio]);

  return (
    <div className="stack glass fx-panel fx-listen-panel">
      <AudioError error={audio.error} />
      {TONE_GROUPS.map((g) => (
        <PlayerBlock key={g.title} label={g.title}>
          <div className="fx-tone-grid">
            {g.items.map((it) => (
              <button key={it.id} type="button" className={'fx-tone' + (playingId === it.id ? ' on' : '')} aria-pressed={playingId === it.id} onClick={() => playPreset(it.id, it.tones)}>
                <span className="row" style={{ gap: 8 }}>
                  {playingId === it.id ? <Square size={14} aria-hidden /> : <Play size={14} aria-hidden />}
                  <strong>{it.label}</strong>
                </span>
                <span className="tiny muted">{it.sub}</span>
              </button>
            ))}
          </div>
        </PlayerBlock>
      ))}
      <PlayerBlock label="Free tone">
        <div className="stack">
          <Slider label="Pitch" value={freeV} min={0} max={100} onChange={setFreeV} format={() => `${freeHz} Hz`} />
          <Segmented label="Wave shape" value={wave} onChange={setWave} options={[{ value: 'sine', label: 'Sine' }, { value: 'triangle', label: 'Triangle' }, { value: 'square', label: 'Square' }, { value: 'sawtooth', label: 'Saw' }]} />
          <div>
            <Button variant={freePlaying ? 'primary' : 'secondary'} icon={freePlaying ? <Square size={16} aria-hidden /> : <Play size={16} aria-hidden />} onClick={toggleFree} aria-pressed={freePlaying}>
              {freePlaying ? 'Stop tone' : 'Play tone'}
            </Button>
          </div>
        </div>
      </PlayerBlock>
      <VolumeControl volume={audio.volume} onChange={audio.setVolume} />
      <p className="tiny faint">Start quietly — very high and very low tones can sound louder or softer than expected, and small phone speakers can’t play the lowest ones.</p>
    </div>
  );
}

// ================= Soundscape =================
type LayerId = 'rain' | 'wind' | 'drone' | 'hum' | 'chimes' | 'birds';
const LAYERS: { id: LayerId; label: string; sub: string }[] = [
  { id: 'rain', label: 'Rain', sub: 'filtered pink noise' },
  { id: 'wind', label: 'Wind', sub: 'brown noise with a slow gust' },
  { id: 'hum', label: 'Distant city', sub: 'low rumble' },
  { id: 'drone', label: 'Drone', sub: 'two slightly detuned low notes' },
  { id: 'chimes', label: 'Chimes', sub: 'random pentatonic bells' },
  { id: 'birds', label: 'Birds', sub: 'synthesised chirps' },
];

interface LayerNode { gain: GainNode; stop: () => void }

function buildLayer(a: AudioEngine, id: LayerId, level: number): LayerNode {
  const { ctx, master } = a;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), ctx.currentTime + 0.8);
  gain.connect(master);
  const sources: AudioScheduledSourceNode[] = [];
  let timer = 0;
  const loopNoise = (kind: 'white' | 'pink' | 'brown') => {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuffer(ctx, kind, 4);
    s.loop = true;
    s.start(ctx.currentTime, Math.random() * 3);
    sources.push(s);
    return s;
  };
  if (id === 'rain') {
    const s = loopNoise('pink');
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 450;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 7000;
    s.connect(hp).connect(lp).connect(gain);
  } else if (id === 'wind') {
    const s = loopNoise('brown');
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 500;
    f.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain).connect(f.frequency);
    lfo.start();
    sources.push(lfo);
    s.connect(f).connect(gain);
  } else if (id === 'hum') {
    const s = loopNoise('brown');
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 160;
    s.connect(f).connect(gain);
  } else if (id === 'drone') {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    lp.connect(gain);
    [55, 55.35, 82.4].forEach((fr, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = fr;
      g.gain.value = i === 2 ? 0.05 : 0.08;
      o.connect(g).connect(lp);
      o.start();
      sources.push(o);
    });
  } else if (id === 'chimes') {
    const notes = [72, 74, 76, 79, 81, 84, 86];
    timer = window.setInterval(() => {
      if (Math.random() < 0.45) {
        const m = notes[Math.floor(Math.random() * notes.length)];
        playNote(ctx, gain, { freq: midiToHz(m), at: ctx.currentTime + Math.random() * 0.3, dur: 2.4, type: 'sine', gain: 0.18, attack: 0.005, release: 2.2 });
        playNote(ctx, gain, { freq: midiToHz(m) * 2.76, at: ctx.currentTime + 0.01, dur: 0.8, type: 'sine', gain: 0.03, attack: 0.005, release: 0.7 });
      }
    }, 700);
  } else if (id === 'birds') {
    timer = window.setInterval(() => {
      if (Math.random() < 0.35) {
        const n = 2 + Math.floor(Math.random() * 4);
        const base = 2200 + Math.random() * 1800;
        for (let k = 0; k < n; k++) {
          const at = ctx.currentTime + 0.05 + k * (0.09 + Math.random() * 0.05);
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(base, at);
          o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.5), at + 0.06);
          g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(0.12, at + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
          o.connect(g).connect(gain);
          o.start(at);
          o.stop(at + 0.1);
        }
      }
    }, 900);
  }
  return {
    gain,
    stop: () => {
      clearInterval(timer);
      const t = ctx.currentTime;
      try {
        gain.gain.cancelScheduledValues(t);
        gain.gain.setTargetAtTime(0.0001, t, 0.2);
      } catch { /* closed */ }
      sources.forEach((s) => { try { s.stop(t + 1); } catch { /* already stopped */ } });
      setTimeout(() => { try { gain.disconnect(); } catch { /* ignore */ } }, 1200);
    },
  };
}

const LAYER_DEFAULT: Record<LayerId, number> = { rain: 0.5, wind: 0.6, hum: 0.7, drone: 0.35, chimes: 0.5, birds: 0.4 };

function Soundscape() {
  const audio = useAudioEngine(0.6);
  const [on, setOn] = useState<Record<string, boolean>>({});
  const [levels, setLevels] = useState<Record<string, number>>(LAYER_DEFAULT);
  const nodes = useRef<Partial<Record<LayerId, LayerNode>>>({});

  useEffect(() => () => { Object.values(nodes.current).forEach((n) => n?.stop()); nodes.current = {}; }, []);

  const toggle = (id: LayerId, v: boolean) => {
    if (v) {
      const a = audio.ensure();
      if (!a) return;
      nodes.current[id]?.stop();
      nodes.current[id] = buildLayer(a, id, levels[id]);
    } else {
      nodes.current[id]?.stop();
      delete nodes.current[id];
    }
    setOn((s) => ({ ...s, [id]: v }));
  };
  const setLevel = (id: LayerId, v: number) => {
    setLevels((s) => ({ ...s, [id]: v }));
    const n = nodes.current[id], a = audio.get();
    if (n && a) n.gain.gain.setTargetAtTime(Math.max(0.0002, v), a.ctx.currentTime, 0.05);
  };
  const stopAll = () => {
    Object.values(nodes.current).forEach((n) => n?.stop());
    nodes.current = {};
    setOn({});
  };
  const anyOn = Object.values(on).some(Boolean);

  return (
    <div className="stack glass fx-panel fx-listen-panel">
      <AudioError error={audio.error} />
      <p className="small muted">Switch layers on and mix them. Every sound is generated on this device.</p>
      <ul className="fx-layers">
        {LAYERS.map((l) => (
          <li key={l.id} className={'fx-layer' + (on[l.id] ? ' on' : '')}>
            {/* The whole row is the switch's label, so the touch target is the full row, not just the 50×30 switch. */}
            <label className="row between fx-toggle-row">
              <span>
                <strong>{l.label}</strong>
                <span className="tiny faint" style={{ display: 'block' }}>{l.sub}</span>
              </span>
              <Toggle checked={!!on[l.id]} onChange={(v) => toggle(l.id, v)} label={`${l.label} layer`} />
            </label>
            {on[l.id] && <Slider label={`${l.label} level`} value={Math.round(levels[l.id] * 100)} min={0} max={100} onChange={(v) => setLevel(l.id, v / 100)} format={(v) => `${v}%`} />}
          </li>
        ))}
      </ul>
      <div className="row wrap between">
        <span className="tiny faint" aria-live="polite">{anyOn ? `${Object.values(on).filter(Boolean).length} layer(s) playing` : 'Silent'}</span>
        <Button variant="secondary" size="sm" icon={<Square size={14} aria-hidden />} onClick={stopAll} disabled={!anyOn}>Stop all</Button>
      </div>
      <VolumeControl volume={audio.volume} onChange={audio.setVolume} />
    </div>
  );
}

// ================= Rhythm =================
interface Pattern { label: string; steps: number; parts: { voice: 'kick' | 'snare' | 'hat' | 'click' | 'clickHi'; at: number[] }[]; note: string }
const RHYTHMS: Record<string, Pattern> = {
  steady: { label: 'Steady four', steps: 16, parts: [{ voice: 'kick', at: [0, 4, 8, 12] }, { voice: 'hat', at: [2, 6, 10, 14] }], note: 'A kick on every beat — the simplest pulse to walk to.' },
  backbeat: { label: 'Backbeat', steps: 16, parts: [{ voice: 'kick', at: [0, 7, 8] }, { voice: 'snare', at: [4, 12] }, { voice: 'hat', at: [0, 2, 4, 6, 8, 10, 12, 14] }], note: 'Snare on beats 2 and 4: the backbone of most pop and rock.' },
  synco: { label: 'Syncopated', steps: 16, parts: [{ voice: 'kick', at: [0, 3, 6, 10] }, { voice: 'snare', at: [4, 12] }, { voice: 'hat', at: [2, 5, 8, 11, 14] }], note: 'Accents land between the beats, which pulls you forward.' },
  poly: { label: '3 against 2', steps: 12, parts: [{ voice: 'clickHi', at: [0, 4, 8] }, { voice: 'kick', at: [0, 6] }], note: 'High clicks in threes over low beats in twos. Try following one, then the other.' },
};

function RhythmBox() {
  const audio = useAudioEngine(0.7);
  const reduced = useReducedMotion();
  const [pat, setPat] = useState<keyof typeof RHYTHMS>('backbeat');
  const [tempo, setTempo] = useState(96);
  const [swing, setSwing] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const live = useRef({ pat, tempo, swing });
  live.current = { pat, tempo, swing };
  const eng = useRef<{ timer: number; next: number; i: number; bus: GainNode; ui: number[] } | null>(null);

  const stop = useCallback(() => {
    const e = eng.current;
    if (!e) return;
    clearInterval(e.timer);
    e.ui.forEach(clearTimeout);
    try { e.bus.disconnect(); } catch { /* ignore */ }
    eng.current = null;
    setPlaying(false);
    setStep(-1);
  }, []);
  useEffect(() => () => { const e = eng.current; if (e) { clearInterval(e.timer); e.ui.forEach(clearTimeout); } }, []);

  const start = () => {
    const a = audio.ensure();
    if (!a) return;
    const { ctx, master } = a;
    const bus = ctx.createGain();
    bus.connect(master);
    const e = { timer: 0, next: ctx.currentTime + 0.1, i: 0, bus, ui: [] as number[] };
    const schedule = () => {
      const L = live.current;
      const P = RHYTHMS[L.pat];
      const barDur = (60 / L.tempo) * 4;
      const sd = barDur / P.steps;
      while (e.next < ctx.currentTime + 0.12) {
        const s = e.i % P.steps;
        const swingDelay = P.steps === 16 && s % 2 === 1 ? (L.swing / 100) * sd * 0.6 : 0;
        const at = e.next + swingDelay;
        P.parts.forEach((part) => part.at.includes(s) && playDrum(ctx, bus, part.voice, at));
        const wait = Math.max(0, (at - ctx.currentTime) * 1000);
        e.ui.push(window.setTimeout(() => setStep(s), wait));
        if (e.ui.length > 64) e.ui.splice(0, 32);
        e.next += sd;
        e.i++;
      }
    };
    schedule();
    e.timer = window.setInterval(schedule, 25);
    eng.current = e;
    setPlaying(true);
  };

  const P = RHYTHMS[pat];
  return (
    <div className="stack glass fx-panel fx-listen-panel">
      <AudioError error={audio.error} />
      <div className="fx-slider">
        <span className="small fx-slider-label">Pattern</span>
        <div className="chips" role="group" aria-label="Rhythm pattern">
          {Object.entries(RHYTHMS).map(([k, r]) => (
            <button key={k} type="button" className="chip" aria-pressed={pat === k} onClick={() => { setPat(k as keyof typeof RHYTHMS); if (eng.current) eng.current.i = 0; }}>{r.label}</button>
          ))}
        </div>
        <p className="small muted" style={{ margin: '6px 0 0' }}>{P.note}</p>
      </div>
      <div className="fx-beatrow" aria-hidden style={{ gridTemplateColumns: `repeat(${P.steps}, 1fr)` }}>
        {Array.from({ length: P.steps }, (_, i) => {
          const hit = P.parts.some((pt) => pt.at.includes(i) && pt.voice !== 'hat');
          return <span key={i} className={'fx-beat' + (hit ? ' hit' : '') + (i === step ? ' now' : '') + (i % (P.steps / 4) === 0 ? ' down' : '') + (reduced ? ' still' : '')} />;
        })}
      </div>
      <Slider label="Tempo" value={tempo} min={60} max={160} onChange={setTempo} format={(v) => `${v} BPM`} />
      {P.steps === 16 && <Slider label="Swing" value={swing} min={0} max={60} onChange={setSwing} format={(v) => (v === 0 ? 'Straight' : `${v}%`)} />}
      <div className="row wrap">
        {playing ? (
          <Button variant="primary" icon={<Square size={16} aria-hidden />} onClick={stop}>Stop</Button>
        ) : (
          <Button variant="primary" icon={<Play size={18} aria-hidden />} onClick={start}>Play rhythm</Button>
        )}
      </div>
      <VolumeControl volume={audio.volume} onChange={audio.setVolume} />
    </div>
  );
}

// ================= Mood pairs =================
interface Clip { mode: 'major' | 'minor'; tempo: number; octave: number; bright: boolean; busy: boolean }
const BASE_CLIP: Clip = { mode: 'major', tempo: 96, octave: 0, bright: false, busy: false };
const MOOD_PAIRS: { id: string; what: string; variants: [Partial<Clip>, Partial<Clip>]; names: [string, string]; explain: string }[] = [
  { id: 'mode', what: 'Major vs minor', variants: [{ mode: 'major' }, { mode: 'minor' }], names: ['in a major key', 'in a minor key'], explain: 'Only the key changed — a few notes moved down by a semitone. Speed, pitch range and tone colour were identical.' },
  { id: 'tempo', what: 'Fast vs slow', variants: [{ tempo: 138 }, { tempo: 70 }], names: ['fast (138 BPM)', 'slow (70 BPM)'], explain: 'Same notes in the same key — only the speed changed.' },
  { id: 'register', what: 'High vs low', variants: [{ octave: 1 }, { octave: -1 }], names: ['an octave higher', 'an octave lower'], explain: 'Same melody, same speed, moved up or down by an octave.' },
  { id: 'density', what: 'Sparse vs busy', variants: [{ busy: false }, { busy: true }], names: ['sparse (just the tune)', 'busy (the tune over a running accompaniment)'], explain: 'Same tune, key and speed; one version added a stream of quick notes underneath.' },
  { id: 'timbre', what: 'Bright vs mellow', variants: [{ bright: true }, { bright: false }], names: ['a bright, buzzy tone', 'a soft, mellow tone'], explain: 'Same notes and speed; only the tone colour (how many overtones) changed.' },
];
const MELODY: [number, number][] = [[0, 0.5], [2, 0.5], [4, 0.5], [7, 0.5], [5, 1], [4, 0.5], [2, 0.5], [3, 1], [1, 1], [0, 2]];
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const deg = (scale: number[], d: number) => scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);

function playClip(a: AudioEngine, clip: Clip, out: GainNode) {
  const { ctx } = a;
  const scale = SCALES[clip.mode];
  const root = 60 + clip.octave * 12;
  const beat = 60 / clip.tempo;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = clip.bright ? 7000 : 1400;
  lp.connect(out);
  let t = ctx.currentTime + 0.05;
  const start = t;
  for (const [d, len] of MELODY) {
    playNote(ctx, lp, { freq: midiToHz(root + deg(scale, d)), at: t, dur: len * beat * 0.95, type: clip.bright ? 'sawtooth' : 'triangle', gain: clip.bright ? 0.1 : 0.22, attack: 0.02, release: Math.min(0.3, len * beat * 0.5) });
    t += len * beat;
  }
  const total = t - start;
  if (clip.busy) {
    const sixteenth = beat / 4;
    const arp = [0, 2, 4, 2];
    for (let k = 0; k * sixteenth < total - 0.05; k++) {
      playNote(ctx, lp, { freq: midiToHz(root - 12 + deg(scale, arp[k % 4] + (Math.floor(k / 8) % 2 ? 3 : 0))), at: start + k * sixteenth, dur: sixteenth * 0.9, type: 'triangle', gain: 0.07, attack: 0.005, release: sixteenth * 0.5 });
    }
  }
  [0, 2, 4].forEach((dd) => playNote(ctx, lp, { freq: midiToHz(root - 12 + deg(scale, dd)), at: start, dur: total, type: 'triangle', gain: 0.05, attack: 0.3, release: 0.8 }));
  return total;
}

function MoodPairs({ state, setState, flips }: { state: Record<string, PairState>; setState: React.Dispatch<React.SetStateAction<Record<string, PairState>>>; flips: Record<string, boolean> }) {
  const audio = useAudioEngine(0.6);
  const [playing, setPlaying] = useState<string | null>(null);
  const cur = useRef<{ g: GainNode; t: number } | null>(null);
  useEffect(() => () => { if (cur.current) clearTimeout(cur.current.t); }, []);

  const stopClip = () => {
    const c = cur.current, a = audio.get();
    if (!c) return;
    clearTimeout(c.t);
    if (a) c.g.gain.setTargetAtTime(0.0001, a.ctx.currentTime, 0.03);
    setTimeout(() => { try { c.g.disconnect(); } catch { /* ignore */ } }, 200);
    cur.current = null;
    setPlaying(null);
  };

  const play = (pairId: string, side: 'A' | 'B') => {
    const key = pairId + side;
    if (playing === key) { stopClip(); return; }
    stopClip();
    const a = audio.ensure();
    if (!a) return;
    const pair = MOOD_PAIRS.find((x) => x.id === pairId)!;
    const vi = (side === 'A') !== !!flips[pairId] ? 0 : 1;
    const clip = { ...BASE_CLIP, ...pair.variants[vi] };
    const g = a.ctx.createGain();
    g.connect(a.master);
    const secs = playClip(a, clip, g);
    cur.current = { g, t: window.setTimeout(() => { cur.current = null; setPlaying(null); }, secs * 1000 + 300) };
    setPlaying(key);
    setState((s) => {
      const ps = s[pairId] ?? {};
      const played = ps.played ?? [];
      return played.includes(side) ? s : { ...s, [pairId]: { ...ps, played: [...played, side] } };
    });
  };

  const set = (pairId: string, f: Partial<PairState>) => setState((s) => ({ ...s, [pairId]: { ...(s[pairId] ?? {}), ...f } }));

  return (
    <div className="stack glass fx-panel fx-listen-panel">
      <AudioError error={audio.error} />
      <p className="small muted">Each pair is the same short tune with one thing changed. Play both, answer from your gut, then reveal what was different. Which side got which version was shuffled.</p>
      {MOOD_PAIRS.map((pair, n) => {
        const ps = state[pair.id] ?? {};
        const bothPlayed = (ps.played ?? []).length >= 2;
        const [aName, bName] = flips[pair.id] ? [pair.names[1], pair.names[0]] : [pair.names[0], pair.names[1]];
        const opts = [{ value: 'A' as Pick3, label: 'A' }, { value: 'B' as Pick3, label: 'B' }, { value: 'same' as Pick3, label: 'Same' }];
        const said = (v?: Pick3) => (v === 'A' ? 'A' : v === 'B' ? 'B' : 'neither');
        return (
          <article key={pair.id} className="card fx-pair">
            <span className="label">Pair {n + 1} of {MOOD_PAIRS.length}</span>
            <div className="row" style={{ gap: 10, margin: '10px 0' }}>
              {(['A', 'B'] as const).map((side) => (
                <Button key={side} className="grow" variant={playing === pair.id + side ? 'primary' : 'secondary'} icon={playing === pair.id + side ? <Square size={16} aria-hidden /> : <Play size={16} aria-hidden />} onClick={() => play(pair.id, side)} aria-label={`${playing === pair.id + side ? 'Stop' : 'Play'} clip ${side} of pair ${n + 1}`}>
                  Clip {side}
                </Button>
              ))}
            </div>
            {!bothPlayed && <p className="tiny faint">Play both clips to answer.</p>}
            <fieldset className="fx-pair-q" disabled={!bothPlayed}>
              <legend className="small">Which felt happier?</legend>
              <Segmented label={`Pair ${n + 1}: which felt happier`} value={ps.happier ?? ('' as Pick3)} options={opts} onChange={(v) => set(pair.id, { happier: v })} />
            </fieldset>
            <fieldset className="fx-pair-q" disabled={!bothPlayed}>
              <legend className="small">Which felt calmer?</legend>
              <Segmented label={`Pair ${n + 1}: which felt calmer`} value={ps.calmer ?? ('' as Pick3)} options={opts} onChange={(v) => set(pair.id, { calmer: v })} />
            </fieldset>
            <div aria-live="polite">
              {ps.revealed ? (
                <div className="fx-reveal">
                  <p><strong>{pair.what}.</strong> A was {aName}; B was {bName}.</p>
                  <p className="small muted">{pair.explain}</p>
                  <p className="small">You heard {said(ps.happier)} as happier and {said(ps.calmer)} as calmer.</p>
                </div>
              ) : (
                <Button size="sm" variant="soft" icon={<Eye size={16} aria-hidden />} disabled={!ps.happier || !ps.calmer} onClick={() => set(pair.id, { revealed: true })}>
                  Reveal what differed
                </Button>
              )}
            </div>
          </article>
        );
      })}
      <p className="tiny faint">Links between sound and mood (like minor = sad) are partly learned and differ between people and musical cultures — your answers are yours, not right or wrong.</p>
      <VolumeControl volume={audio.volume} onChange={audio.setVolume} />
    </div>
  );
}

// ================= Silence (guided environmental listening) =================
function SilenceListen({ expId, title, seconds, sounds, setSounds }: { expId: string; title: string; seconds: number; sounds: SoundItem[]; setSounds: React.Dispatch<React.SetStateAction<SoundItem[]>> }) {
  const [text, setText] = useState('');
  const [dist, setDist] = useState<SoundItem['distance']>('near');
  const id = useId();
  const add = () => {
    const t = text.trim();
    if (!t) return;
    setSounds((s) => [...s, { id: `${Date.now().toString(36)}${s.length}`, text: t, distance: dist }]);
    setText('');
  };
  const counts = { near: 0, middle: 0, far: 0 };
  sounds.forEach((s) => counts[s.distance]++);
  return (
    <div className="stack glass fx-panel fx-listen-panel">
      <p className="small muted">No audio here — the sound comes from wherever you are. Start the timer, close your eyes if it’s safe, and listen.</p>
      <TimerControl id={`exp:${expId}:listen`} label={`Listening: ${title}`} minutes={Math.max(0.5, seconds / 60)} refTo={{ kind: 'experience', id: expId }} />
      <PlayerBlock label="Sound list">
        <form className="stack sm" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <label htmlFor={id} className="fx-field-label">A sound you heard</label>
          <div className="row">
            <input id={id} className="input grow" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. a fridge hum, a far-off dog" />
            <IconButton label="Add sound" className="filled" type="submit" disabled={!text.trim()}><Plus size={20} /></IconButton>
          </div>
          <Segmented label="How far away" value={dist} onChange={setDist} options={[{ value: 'near', label: 'Near' }, { value: 'middle', label: 'Middle' }, { value: 'far', label: 'Far' }]} />
        </form>
        {sounds.length > 0 ? (
          <>
            <ul className="fx-soundlist">
              {sounds.map((s) => (
                <li key={s.id}>
                  <span className="tag">{s.distance}</span>
                  <span className="grow">{s.text}</span>
                  <IconButton label={`Remove ${s.text}`} onClick={() => setSounds((l) => l.filter((x) => x.id !== s.id))}><X size={16} /></IconButton>
                </li>
              ))}
            </ul>
            <p className="tiny faint">{sounds.length} sound{sounds.length === 1 ? '' : 's'}: {counts.near} near, {counts.middle} middle, {counts.far} far.</p>
          </>
        ) : (
          <p className="tiny faint">Nothing listed yet. Add sounds as you notice them — even quiet ones count.</p>
        )}
      </PlayerBlock>
    </div>
  );
}
