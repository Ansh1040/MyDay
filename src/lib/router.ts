// Tiny hash router with real browser-history back navigation (also used by Android's back button).
import { useSyncExternalStore } from 'react';

export interface Route {
  path: string; // e.g. "/rabbit/music-mood"
  segments: string[]; // ["rabbit", "music-mood"]
  query: URLSearchParams;
  tab: 'discover' | 'journeys' | 'create' | 'you';
}

const TAB_OF: Record<string, Route['tab']> = {
  discover: 'discover', search: 'discover', twist: 'discover', x: 'discover', saved: 'discover', topic: 'discover',
  journeys: 'journeys', rabbit: 'journeys', skills: 'journeys', skill: 'journeys', tickets: 'journeys', quests: 'journeys',
  quest: 'journeys', collections: 'journeys', collection: 'journeys', perspective: 'journeys', perspectives: 'journeys', import: 'journeys',
  create: 'create', notes: 'create', note: 'create', remix: 'create', builder: 'create', capsules: 'create', capsule: 'create',
  you: 'you', history: 'you', entry: 'you', map: 'you', settings: 'you', install: 'you', profile: 'you', progress: 'you',
};

function parse(): Route {
  const raw = location.hash.replace(/^#/, '') || '/discover';
  const [p, q = ''] = raw.split('?');
  const path = p.startsWith('/') ? p : '/' + p;
  const segments = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { path, segments, query: new URLSearchParams(q), tab: TAB_OF[segments[0]] ?? 'discover' };
}

let current = parse();
const listeners = new Set<() => void>();
// History entries the router didn't create (plain <a href="#/…"> links, a typed URL) carry no depth. Give them one,
// so back() steps back to the previous screen instead of jumping to the fallback parent.
if ((history.state as { depth?: number } | null)?.depth == null) history.replaceState({ depth: 0 }, '');
let lastDepth = depth();
const emit = () => {
  if ((history.state as { depth?: number } | null)?.depth == null) history.replaceState({ depth: lastDepth + 1 }, '');
  lastDepth = depth();
  current = parse();
  listeners.forEach((l) => l());
};
window.addEventListener('hashchange', emit);
window.addEventListener('popstate', emit);

function depth(): number {
  return (history.state as { depth?: number } | null)?.depth ?? 0;
}

/** Navigate to a path like "/rabbit/abc?node=n2". */
export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const url = '#' + (to.startsWith('/') ? to : '/' + to);
  if (opts.replace) history.replaceState({ depth: depth() }, '', url);
  else history.pushState({ depth: depth() + 1 }, '', url);
  emit();
  window.scrollTo({ top: 0 });
}

/** Rewrite the URL in place (e.g. /note/new → /note/<id>) without remounting the current screen. */
export function replaceUrlSilently(to: string) {
  history.replaceState(history.state, '', '#' + (to.startsWith('/') ? to : '/' + to));
  current = parse();
}

/** Go back in history if we navigated within the app; otherwise go to a sensible parent. */
export function back(fallback?: string) {
  if (depth() > 0) history.back();
  else navigate(fallback ?? '/' + (TAB_ROOT[current.tab] ?? 'discover'), { replace: true });
}

const TAB_ROOT: Record<Route['tab'], string> = { discover: 'discover', journeys: 'journeys', create: 'create', you: 'you' };

export function useRoute(): Route {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

export const getRoute = () => current;
