// Small sculptural glass objects for discovery cards. Deterministic per seed (same card → same sculpture),
// shaped by the experience format, tinted by the theme accent. Purely decorative (aria-hidden).
import { useId } from 'react';
import { hash } from '../lib/id';

type Shape = 'ring' | 'orb' | 'arch' | 'prism' | 'wave' | 'stack';

const FORMAT_SHAPE: Record<string, Shape> = {
  reading: 'arch', quiz: 'prism', experiment: 'orb', simulation: 'ring', listening: 'wave', sketch: 'stack',
  writing: 'arch', coding: 'prism', project: 'stack', challenge: 'prism', outdoor: 'wave', debate: 'ring',
  reflection: 'orb', game: 'ring', collab: 'orb', journey: 'wave',
};

export function GlassArt({ seed, format, size = 96, className = '' }: { seed: string; format?: string; size?: number; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const r = (n: number) => hash(seed + ':' + n);
  const shape: Shape = (format && FORMAT_SHAPE[format]) || (['ring', 'orb', 'arch', 'prism', 'wave', 'stack'] as Shape[])[Math.floor(r(0) * 6)];
  const tilt = Math.round(r(1) * 50 - 25);
  const g = `ga-g-${uid}`, h = `ga-h-${uid}`, s = `ga-s-${uid}`;

  const body = (() => {
    switch (shape) {
      case 'ring':
        return (
          <>
            <circle cx="50" cy="52" r="30" fill="none" stroke={`url(#${g})`} strokeWidth="14" />
            <circle cx="50" cy="52" r="30" fill="none" stroke={`url(#${h})`} strokeWidth="3" strokeDasharray="40 160" strokeLinecap="round" />
          </>
        );
      case 'orb':
        return (
          <>
            <circle cx="46" cy="54" r="30" fill={`url(#${g})`} />
            <circle cx={62} cy={36} r={14 + r(2) * 6} fill={`url(#${g})`} opacity=".8" />
            <ellipse cx="36" cy="42" rx="10" ry="6" fill={`url(#${h})`} transform="rotate(-30 36 42)" />
          </>
        );
      case 'arch':
        return (
          <>
            <path d="M22 86 V48 a28 28 0 0 1 56 0 V86 h-14 V50 a14 14 0 0 0 -28 0 V86 z" fill={`url(#${g})`} />
            <path d="M28 82 V50 a22 22 0 0 1 20 -21" fill="none" stroke={`url(#${h})`} strokeWidth="3" strokeLinecap="round" />
          </>
        );
      case 'prism':
        return (
          <>
            <path d="M50 14 L84 76 L16 76 Z" fill={`url(#${g})`} />
            <path d="M50 14 L60 76 L16 76 Z" fill="#fff" opacity=".14" />
            <path d="M48 22 L26 66" stroke={`url(#${h})`} strokeWidth="3" strokeLinecap="round" />
          </>
        );
      case 'wave':
        return (
          <>
            <path d="M10 60 C26 36, 40 36, 50 54 S76 74, 90 46 L90 70 C76 96, 60 90, 50 74 S26 58, 10 82 Z" fill={`url(#${g})`} />
            <path d="M14 58 C28 40, 40 42, 48 54" fill="none" stroke={`url(#${h})`} strokeWidth="3" strokeLinecap="round" />
          </>
        );
      case 'stack':
        return (
          <>
            <rect x="20" y="50" width="60" height="26" rx="13" fill={`url(#${g})`} />
            <rect x="28" y="30" width="44" height="24" rx="12" fill={`url(#${g})`} opacity=".85" />
            <rect x="38" y="14" width="24" height="20" rx="10" fill={`url(#${g})`} opacity=".7" />
            <path d="M30 56 h26" stroke={`url(#${h})`} strokeWidth="3" strokeLinecap="round" />
          </>
        );
    }
  })();

  return (
    <svg className={'glass-art ' + className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--accent)', stopOpacity: 0.55 }} />
          <stop offset=".55" style={{ stopColor: '#ffffff', stopOpacity: 0.28 }} />
          <stop offset="1" style={{ stopColor: 'var(--accent)', stopOpacity: 0.3 }} />
        </linearGradient>
        <linearGradient id={h} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={s} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000" floodOpacity=".18" />
        </filter>
      </defs>
      <g transform={`rotate(${tilt} 50 50)`} filter={`url(#${s})`} style={{ mixBlendMode: 'normal' }}>
        {body}
      </g>
    </svg>
  );
}
