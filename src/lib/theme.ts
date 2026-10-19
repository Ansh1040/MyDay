import { useEffect } from 'react';
import { useStore } from '../store/store';
import type { ThemeName } from '../data/types';
import vermilionArt from '../assets/backgrounds/vermilion.jpg';
import cobaltArt from '../assets/backgrounds/cobalt.jpg';
import plumArt from '../assets/backgrounds/plum.jpg';
import graphiteArt from '../assets/backgrounds/graphite.jpg';

export const THEMES: { id: ThemeName; name: string; blurb: string; swatch: [string, string, string]; art: string; artNote: string }[] = [
  { id: 'vermilion', name: 'Vermilion', blurb: 'Warm ivory with tomato-red accents.', swatch: ['#f7f2ea', '#e4572e', '#1e1a16'], art: vermilionArt, artNote: 'Red blossoms against an orange-red sun' },
  { id: 'cobalt', name: 'Cobalt', blurb: 'Cool white and blue, search-forward.', swatch: ['#f6f8fc', '#2350e6', '#0e1726'], art: cobaltArt, artNote: 'Blue and white blossoms on deep blue' },
  { id: 'plum', name: 'Plum', blurb: 'Warm neutrals and berry, quietly editorial.', swatch: ['#f4efea', '#8e2c5c', '#241a22'], art: plumArt, artNote: 'Pink blossoms, pagodas and misty mountains' },
  { id: 'graphite', name: 'Graphite', blurb: 'Monochrome with burnt-orange highlights.', swatch: ['#f3f3f1', '#c2531a', '#111111'], art: graphiteArt, artNote: 'An illustrated stone street under blue sky' },
];

/** Applies theme/appearance/motion/text-scale to <html>. Follows the device in "auto". */
export function useApplyTheme() {
  const { theme, appearance, reducedMotion, textScale, reduceTransparency } = useStore((s) => s.settings);
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      const mode = appearance === 'auto' ? (mq.matches ? 'dark' : 'light') : appearance;
      root.dataset.theme = theme;
      root.dataset.mode = mode;
      root.dataset.motion = reducedMotion === 'on' || (reducedMotion === 'system' && mqMotion.matches) ? 'reduce' : 'full';
      root.style.setProperty('--text-scale', String(textScale));
      root.dataset.transparency = reduceTransparency ? 'reduce' : 'full';
      const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || '#f7f2ea');
    };
    apply();
    mq.addEventListener('change', apply);
    mqMotion.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      mqMotion.removeEventListener('change', apply);
    };
  }, [theme, appearance, reducedMotion, textScale, reduceTransparency]);
}

export const prefersReducedMotion = () => document.documentElement.dataset.motion === 'reduce';
