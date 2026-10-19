// Web Audio helpers shared by listening, simulation (sound-mood) and game players.
// Audio is only ever created inside a user gesture (tap/keypress) and is closed on unmount.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Slider } from './kit';

export function audioCtor(): typeof AudioContext | undefined {
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  return w.AudioContext ?? w.webkitAudioContext;
}

export interface AudioEngine { ctx: AudioContext; master: GainNode }

/**
 * Lazily creates an AudioContext + master gain on the first `ensure()` call (which must happen in a tap handler).
 * Closes everything on unmount so no sound continues after leaving the screen.
 */
export function useAudioEngine(initialVolume = 0.7) {
  const ref = useRef<AudioEngine | null>(null);
  const volRef = useRef(initialVolume);
  const [volume, setVolumeState] = useState(initialVolume);
  const [error, setError] = useState<string | null>(null);

  const ensure = useCallback((): AudioEngine | null => {
    const cur = ref.current;
    if (cur && cur.ctx.state !== 'closed') {
      if (cur.ctx.state === 'suspended') cur.ctx.resume().catch(() => {});
      return cur;
    }
    const Ctor = audioCtor();
    if (!Ctor) {
      setError('Sound can’t play here: this browser doesn’t support Web Audio.');
      return null;
    }
    try {
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = volRef.current;
      master.connect(ctx.destination);
      ref.current = { ctx, master };
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      setError(null);
      return ref.current;
    } catch (e) {
      console.warn('AudioContext failed', e);
      setError('Sound couldn’t start on this device. Check that audio isn’t blocked, then try again.');
      return null;
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    volRef.current = v;
    setVolumeState(v);
    const r = ref.current;
    if (r && r.ctx.state !== 'closed') r.master.gain.setTargetAtTime(v, r.ctx.currentTime, 0.03);
  }, []);

  useEffect(
    () => () => {
      const r = ref.current;
      ref.current = null;
      if (r && r.ctx.state !== 'closed') r.ctx.close().catch(() => {});
    },
    [],
  );

  const get = useCallback(() => ref.current, []);
  return useMemo(() => ({ ensure, get, volume, setVolume, error }), [ensure, get, volume, setVolume, error]);
}

export function VolumeControl({ volume, onChange }: { volume: number; onChange: (v: number) => void }) {
  return (
    <div className="fx-volume row">
      {volume === 0 ? <VolumeX size={18} aria-hidden className="faint" /> : <Volume2 size={18} aria-hidden className="faint" />}
      <div className="grow">
        <Slider label="Volume" value={Math.round(volume * 100)} min={0} max={100} onChange={(v) => onChange(v / 100)} format={(v) => `${v}%`} />
      </div>
    </div>
  );
}

const noiseCache = new WeakMap<AudioContext, Record<string, AudioBuffer>>();
/** A looping noise buffer: white (hiss), pink (rain-like) or brown (rumble/wind). */
export function noiseBuffer(ctx: AudioContext, kind: 'white' | 'pink' | 'brown', seconds = 3): AudioBuffer {
  const cache = noiseCache.get(ctx) ?? {};
  if (cache[kind]) return cache[kind];
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w * 0.5;
    else if (kind === 'pink') {
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    } else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  cache[kind] = buf;
  noiseCache.set(ctx, cache);
  return buf;
}

export const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Schedule one enveloped note. Returns the oscillator so callers can stop it early. */
export function playNote(
  ctx: AudioContext,
  dest: AudioNode,
  opts: { freq: number; at: number; dur: number; type?: OscillatorType; gain?: number; attack?: number; release?: number; detune?: number },
) {
  const { freq, at, dur, type = 'sine', gain = 0.2, attack = 0.01, release = 0.12, detune = 0 } = opts;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (detune) o.detune.setValueAtTime(detune, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + attack);
  g.gain.setValueAtTime(Math.max(0.0002, gain), at + Math.max(attack, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(dest);
  o.start(at);
  o.stop(at + dur + 0.05);
  o.onended = () => {
    try { g.disconnect(); } catch { /* already gone */ }
  };
  return o;
}

/** Short percussive sounds for rhythm patterns. */
export function playDrum(ctx: AudioContext, dest: AudioNode, kind: 'kick' | 'snare' | 'hat' | 'click' | 'clickHi', at: number, level = 1) {
  if (kind === 'kick') {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, at);
    o.frequency.exponentialRampToValueAtTime(45, at + 0.18);
    g.gain.setValueAtTime(0.9 * level, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
    o.connect(g).connect(dest);
    o.start(at);
    o.stop(at + 0.32);
    return;
  }
  if (kind === 'click' || kind === 'clickHi') {
    playNote(ctx, dest, { freq: kind === 'clickHi' ? 1760 : 880, at, dur: 0.06, type: 'square', gain: 0.18 * level, attack: 0.002, release: 0.05 });
    return;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 'white');
  const f = ctx.createBiquadFilter();
  f.type = kind === 'hat' ? 'highpass' : 'bandpass';
  f.frequency.value = kind === 'hat' ? 7000 : 1800;
  const g = ctx.createGain();
  const dur = kind === 'hat' ? 0.05 : 0.16;
  g.gain.setValueAtTime((kind === 'hat' ? 0.35 : 0.7) * level, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(at, Math.random() * 1.5);
  src.stop(at + dur + 0.02);
}

export function AudioError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="banner error" role="alert">
      <VolumeX size={18} aria-hidden /> <span>{error}</span>
    </div>
  );
}
