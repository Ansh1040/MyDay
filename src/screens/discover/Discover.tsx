// Discover tab: three horizontally swipeable views — For you (rule-based feed + Possibility Shelf), Explore (browse)
// and Saved — plus the Search, Saved and Topic pages. Everything sits on glass over the theme artwork (docs/GLASS.md).
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { create } from 'zustand';
import {
  ArrowRight, Bookmark, BookmarkCheck, BookmarkMinus, Check, ChevronLeft, ChevronRight, Clock, Dices, Ellipsis, EyeOff, FolderPlus, History,
  Info, Lightbulb, MessagesSquare, PenLine, Plus, Rabbit, RotateCcw, Search, Shuffle, SlidersHorizontal, ThumbsDown, ThumbsUp,
  Ticket, X, Zap, Gamepad2, Hash, BookOpen, Users,
} from 'lucide-react';
import type { Energy, Experience, PerspectiveQuestion, RabbitHole, Skill, TwistTemplate } from '../../data/types';
import { useStore } from '../../store/store';
import { navigate, useRoute, replaceUrlSilently } from '../../lib/router';
import {
  Button, Chip, EmptyState, IconButton, Screen, Section, Segmented, Sheet, Skeleton, Swipeable, toast,
} from '../../components/ui';
import { AddToCollectionSheet, COMFORT_LABEL, ENERGY_LABEL, ExperienceCard, MetaLine, TopicTags } from '../../components/common';
import { GlassArt } from '../../components/GlassArt';
import {
  PERSPECTIVES as CATALOG_PERSPECTIVES, RABBIT_HOLES as CATALOG_RABBIT_HOLES, SKILLS as CATALOG_SKILLS, TOPICS,
  TWIST_TEMPLATES as CATALOG_TWISTS, allExperiences, getExperience, getRabbitHole, topicLabel,
} from '../../data/catalog';
import { FORMAT_KEYS, formatMeta } from '../../formats/meta';
import { diversePicks, rankExperiences, rankingExplanation, searchExperiences, surpriseMe, textScore, type Ranked } from '../../lib/recommend';
import { skillProgress } from '../../lib/progress';
import { prefersReducedMotion } from '../../lib/theme';
import { refUrl } from '../../lib/timers';
import { hash, relTime, todayKey } from '../../lib/id';
import { SurpriseDial } from './PlotTwist';
import '../../styles/discover.css';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
// Typed views of the curated catalog.
const RABBIT_HOLES: RabbitHole[] = CATALOG_RABBIT_HOLES;
const PERSPECTIVES: PerspectiveQuestion[] = CATALOG_PERSPECTIVES;
const SKILLS: Skill[] = CATALOG_SKILLS;
const TWIST_TEMPLATES: TwistTemplate[] = CATALOG_TWISTS;
/** Items shown in For you (feed + Possibility Shelf together) — a finite list. */
const FEED_LIMIT = 24;
const SHELF_SIZE = 8;
const SHELF_MIN = 4;
const EMPTY: string[] = [];

const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'instant' : 'smooth');
const supportsScrollEnd = typeof window !== 'undefined' && 'onscrollend' in window;
/** Horizontal swipes inside nested scrollers (shelf, chip rows) must never reach the view pager or other swipe handlers. */
const stopTouch = (e: React.TouchEvent) => e.stopPropagation();

/**
 * Ref callback for horizontal scrollers. Chrome can turn a horizontal swipe that nothing can scroll (e.g. rightwards on
 * the first view, or at the start of the shelf) into the browser's back/forward swipe — even inside a scroller with
 * overscroll-behavior: none. At an edge, only panning that can actually move the scroller is allowed (touch-action via
 * data-hedge in discover.css), so those swipes do nothing instead of leaving the app or moving an outer scroller.
 */
function edgePan(el: HTMLElement | null) {
  if (!el) return;
  const update = () => {
    const max = el.scrollWidth - el.clientWidth;
    const edge = max <= 1 ? 'both' : el.scrollLeft <= 1 ? 'start' : el.scrollLeft >= max - 1 ? 'end' : '';
    if (el.dataset.hedge !== edge) el.dataset.hedge = edge;
  };
  update();
  el.addEventListener('scroll', update, { passive: true });
  const ro = new ResizeObserver(update);
  ro.observe(el);
  return () => {
    el.removeEventListener('scroll', update);
    ro.disconnect();
  };
}

/** Filters live for the app session (survive navigating into an experience and back; reset on reload). */
interface Filters { topics: string[]; maxMinutes: number; energy: 0 | Energy; formats: string[] }
const NO_FILTERS: Filters = { topics: [], maxMinutes: 0, energy: 0, formats: [] };
const useFilters = create<Filters>(() => ({ ...NO_FILTERS }));
const setFilters = (f: Partial<Filters>) => useFilters.setState(f);
const resetFilters = () => useFilters.setState({ ...NO_FILTERS });

const countFilters = (f: Filters) => (f.maxMinutes ? 1 : 0) + (f.energy ? 1 : 0) + f.formats.length + f.topics.length;
const toRankOpts = (f: Filters) => ({
  topics: f.topics.length ? f.topics : undefined,
  maxMinutes: f.maxMinutes || undefined,
  energy: f.energy || undefined,
  formats: f.formats.length ? f.formats : undefined,
});

/** Explore's own browse filters (separate from For you's), also kept for the session. */
interface ExploreFilters { maxMinutes: number; energy: 0 | Energy; formats: string[] }
const NO_EXPLORE: ExploreFilters = { maxMinutes: 0, energy: 0, formats: [] };
const useExplore = create<ExploreFilters>(() => ({ ...NO_EXPLORE }));

const TIME_OPTIONS = [{ value: 0, label: 'Any' }, { value: 5, label: '5 min' }, { value: 15, label: '15' }, { value: 30, label: '30' }, { value: 60, label: '60' }];
const ENERGY_OPTIONS = [{ value: 0, label: 'Any' }, { value: 1, label: 'Low' }, { value: 2, label: 'Medium' }, { value: 3, label: 'High' }];

type FeedbackSnap = { topic: Record<string, number | undefined>; format: Record<string, number | undefined> };
function snapFeedback(e: Experience): FeedbackSnap {
  const f = useStore.getState().feedback;
  return {
    topic: Object.fromEntries(e.topics.map((t) => [t, f.topic[t]])),
    format: { [e.format]: f.format[e.format] },
  };
}
function restoreFeedback(snap: FeedbackSnap) {
  useStore.setState((s) => {
    const topic = { ...s.feedback.topic };
    const format = { ...s.feedback.format };
    for (const [k, v] of Object.entries(snap.topic)) { if (v === undefined) delete topic[k]; else topic[k] = v; }
    for (const [k, v] of Object.entries(snap.format)) { if (v === undefined) delete format[k]; else format[k] = v; }
    return { feedback: { ...s.feedback, topic, format } };
  });
}

function moreLikeThis(e: Experience) {
  const snap = snapFeedback(e);
  useStore.getState().giveFeedback(e, 1);
  toast('Noted — more like this.', { action: { label: 'Undo', run: () => restoreFeedback(snap) } });
}
function lessLikeThis(e: Experience, onUndo?: () => void) {
  const snap = snapFeedback(e);
  useStore.getState().giveFeedback(e, -1);
  toast('Noted — less like this.', { action: { label: 'Undo', run: () => { restoreFeedback(snap); onUndo?.(); } } });
}
function hideExperience(e: Experience, onUndo?: () => void) {
  useStore.getState().hide(e.id);
  toast('Hidden. You won’t see it again.', { action: { label: 'Undo', run: () => { useStore.getState().unhide(e.id); onUndo?.(); } } });
}
function saveExperience(e: Experience) {
  const s = useStore.getState();
  if (s.saved.includes(e.id)) { toast('Already in Saved'); return; }
  s.toggleSave(e.id);
  toast('Saved', { action: { label: 'Undo', run: () => useStore.getState().saved.includes(e.id) && useStore.getState().toggleSave(e.id) } });
}

function doSurprise(comfort: Parameters<typeof surpriseMe>[0]) {
  const e = surpriseMe(comfort);
  if (!e) { toast('Nothing left to surprise you with. Hidden items can be restored in You → Settings.'); return; }
  navigate(`/x/${e.id}`);
}

function greeting(name: string) {
  const h = new Date().getHours();
  const g = h < 5 ? 'Hello' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Hello';
  return name.trim() ? `${g}, ${name.trim()}` : g;
}

// ---------------------------------------------------------------------------
// Discover (tab root): For you · Explore · Saved in a scroll-snap pager
// ---------------------------------------------------------------------------
const VIEWS = [
  { id: 'foryou', label: 'For you' },
  { id: 'explore', label: 'Explore' },
  { id: 'saved', label: 'Saved' },
] as const;
const LAST_VIEW = VIEWS.length - 1;
const clampView = (i: number) => Math.max(0, Math.min(LAST_VIEW, i));
const viewFromParam = (v: string | null) => Math.max(0, VIEWS.findIndex((x) => x.id === v));

export function Discover() {
  const route = useRoute();
  const theme = useStore((s) => s.settings.theme);
  const name = useStore((s) => s.prefs.name);
  const savedCount = useStore((s) => s.saved.length);
  const f = useFilters();
  const prominent = theme === 'cobalt';
  const [view, setView] = useState(() => viewFromParam(route.query.get('view')));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const openFilters = useCallback(() => setFiltersOpen(true), []);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  const pagerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLElement | null)[]>([]);
  const viewRef = useRef(view);
  const heights = useRef<number[]>([]);
  const lastHeight = useRef(0);
  const scrollMem = useRef<(number | undefined)[]>([]);

  // The pager is exactly as tall as the view(s) on screen: the page itself keeps scrolling vertically (no nested
  // vertical scroller) and short views don't leave a long blank page. Also moves the tab indicator with the swipe.
  const syncLayout = useCallback(() => {
    const p = pagerRef.current;
    if (!p) return;
    const pos = p.scrollLeft / (p.clientWidth || 1);
    const lo = clampView(Math.floor(pos + 0.01));
    const hi = clampView(Math.ceil(pos - 0.01));
    let h = heights.current[viewRef.current] ?? 0;
    for (let i = lo; i <= hi; i++) h = Math.max(h, heights.current[i] ?? 0);
    if (h && h !== lastHeight.current) {
      lastHeight.current = h;
      p.style.height = `${h}px`;
    }
    tabsRef.current?.style.setProperty('--dc-pos', String(Math.max(0, Math.min(LAST_VIEW, pos))));
  }, []);

  const commit = useCallback((next: number) => {
    if (next === viewRef.current) return;
    scrollMem.current[viewRef.current] = window.scrollY;
    viewRef.current = next;
    setView(next);
  }, []);

  const select = useCallback((i: number, instant = false) => {
    const next = clampView(i);
    const p = pagerRef.current;
    if (p) p.scrollTo({ left: next * p.clientWidth, behavior: instant ? 'instant' : scrollBehavior() });
    commit(next);
  }, [commit]);
  const showForYou = useCallback(() => select(0), [select]);
  const pagerRefCb = useCallback((el: HTMLDivElement | null) => {
    pagerRef.current = el;
    return edgePan(el);
  }, []);

  // Swipes settle on a view (scroll-snap); the tabs follow. Width changes keep the current view aligned.
  useEffect(() => {
    const p = pagerRef.current;
    if (!p) return;
    let raf = 0;
    let timer = 0;
    let width = p.clientWidth;
    const settle = () => {
      commit(clampView(Math.round(p.scrollLeft / (p.clientWidth || 1))));
      syncLayout();
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; syncLayout(); });
      if (!supportsScrollEnd) { clearTimeout(timer); timer = window.setTimeout(settle, 140); }
    };
    p.addEventListener('scroll', onScroll, { passive: true });
    if (supportsScrollEnd) p.addEventListener('scrollend', settle);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const i = pageRefs.current.indexOf(e.target as HTMLElement);
        if (i >= 0) heights.current[i] = (e.target as HTMLElement).offsetHeight;
      }
      if (p.clientWidth !== width) {
        width = p.clientWidth;
        p.scrollTo({ left: viewRef.current * width, behavior: 'instant' });
      }
      syncLayout();
    });
    ro.observe(p);
    pageRefs.current.forEach((el) => el && ro.observe(el));
    return () => {
      p.removeEventListener('scroll', onScroll);
      p.removeEventListener('scrollend', settle);
      ro.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [commit, syncLayout]);

  // The switcher gets a full-width glass backing once it sticks under the header (content scrolls beneath it).
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const stuckAt = parseFloat(getComputedStyle(bar).top) || 0;
      bar.classList.toggle('stuck', window.scrollY > 0 && bar.getBoundingClientRect().top <= stuckAt + 0.5);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Open on the view from the URL (?view=…) before the first paint.
  useLayoutEffect(() => {
    const p = pagerRef.current;
    if (!p) return;
    pageRefs.current.forEach((el, i) => { if (el) heights.current[i] = el.offsetHeight; });
    p.scrollTo({ left: viewRef.current * p.clientWidth, behavior: 'instant' });
    syncLayout();
  }, [syncLayout]);

  // After a view change: size the pager, give each view its own vertical scroll position, and keep the URL in step.
  const firstRun = useRef(true);
  useLayoutEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    syncLayout();
    const p = pagerRef.current;
    const bar = barRef.current;
    if (p && bar) {
      const stuckAt = parseFloat(getComputedStyle(bar).top) || 0;
      const top = Math.max(0, p.getBoundingClientRect().top + window.scrollY - stuckAt - bar.offsetHeight - 8);
      const y = window.scrollY;
      const mem = scrollMem.current[view];
      const target = mem !== undefined && mem > top ? mem : Math.min(y, top);
      if (Math.abs(target - y) > 2) window.scrollTo({ top: target, behavior: 'instant' });
    }
    replaceUrlSilently('/discover' + (view ? `?view=${VIEWS[view].id}` : ''));
  }, [view, syncLayout]);

  // Real navigation to /discover or /discover?view=… while this screen is open (e.g. the Discover tab).
  const routeRef = useRef(route);
  const wanted = viewFromParam(route.query.get('view'));
  useEffect(() => {
    if (routeRef.current === route) return;
    routeRef.current = route;
    if (wanted !== viewRef.current) select(wanted, true);
  }, [route, wanted, select]);

  const step = (d: number) => {
    const next = view + d;
    if (next >= 0 && next <= LAST_VIEW) select(next);
  };
  const onTabKey = (e: ReactKeyboardEvent) => {
    let next: number;
    if (e.key === 'ArrowRight') next = view === LAST_VIEW ? 0 : view + 1;
    else if (e.key === 'ArrowLeft') next = view === 0 ? LAST_VIEW : view - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = LAST_VIEW;
    else return;
    e.preventDefault();
    select(next);
    tabsRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus({ preventScroll: true });
  };

  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const prev = view > 0 ? VIEWS[view - 1] : undefined;
  const next = view < LAST_VIEW ? VIEWS[view + 1] : undefined;

  return (
    <Screen
      title="Discover"
      eyebrow={`${date} · ${greeting(name)}`}
      backTo={false}
      actions={!prominent ? <IconButton label="Search" onClick={() => navigate('/search')}><Search size={22} /></IconButton> : undefined}
    >
      <div ref={barRef} className={'dc-bar' + (prominent ? ' prominent' : '')}>
        {prominent && <FilterBar prominent filters={f} onOpenFilters={openFilters} onPicked={showForYou} />}
        <div className="dc-switch">
          <IconButton
            label={prev ? `Previous view: ${prev.label}` : 'Previous view'}
            className="liquid dc-step"
            aria-disabled={!prev}
            onClick={() => step(-1)}
          >
            <ChevronLeft size={22} />
          </IconButton>
          <div ref={tabsRef} className="dc-tabs liquid" role="tablist" aria-label="Discover views" onKeyDown={onTabKey}>
            <span className="dc-lens" aria-hidden />
            {VIEWS.map((v, i) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                id={`dc-tab-${v.id}`}
                aria-selected={i === view}
                aria-controls={`dc-panel-${v.id}`}
                tabIndex={i === view ? 0 : -1}
                onClick={() => select(i)}
              >
                {v.label}
                {v.id === 'saved' && savedCount > 0 && (
                  <>
                    <span className="dc-tab-count" data-long={savedCount > 99 || undefined} aria-hidden>{savedCount > 99 ? '99+' : savedCount}</span>
                    <span className="sr-only">, {savedCount} saved</span>
                  </>
                )}
              </button>
            ))}
          </div>
          <IconButton
            label={next ? `Next view: ${next.label}` : 'Next view'}
            className="liquid dc-step"
            aria-disabled={!next}
            onClick={() => step(1)}
          >
            <ChevronRight size={22} />
          </IconButton>
        </div>
      </div>

      <div ref={pagerRefCb} className="dc-pager dc-area">
        {VIEWS.map((v, i) => (
          <section
            key={v.id}
            ref={(el) => { pageRefs.current[i] = el; }}
            className={'dc-page dc-page-' + v.id}
            id={`dc-panel-${v.id}`}
            role="tabpanel"
            aria-labelledby={`dc-tab-${v.id}`}
            inert={i !== view}
          >
            {v.id === 'foryou' ? <ForYouView prominent={prominent} onOpenFilters={openFilters} />
              : v.id === 'explore' ? <ExploreView prominent={prominent} />
              : <SavedView onBrowse={showForYou} />}
          </section>
        ))}
      </div>

      <FiltersSheet open={filtersOpen} onClose={closeFilters} onApplied={showForYou} />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// For you
// ---------------------------------------------------------------------------
type Block =
  | { k: 'feature'; r: Ranked }
  | { k: 'standard'; r: Ranked }
  | { k: 'pair'; a: Ranked; b: Ranked }
  | { k: 'shelf' }
  | { k: 'twist' }
  | { k: 'rabbit' };

function buildFeed(items: Ranked[], teasers: { shelf: boolean; twist: boolean; rabbit: boolean }): Block[] {
  const out: Block[] = [];
  let i = 0;
  if (items[i]) out.push({ k: 'feature', r: items[i++] });
  if (teasers.shelf) out.push({ k: 'shelf' });
  for (let n = 0; n < 2 && items[i]; n++) out.push({ k: 'standard', r: items[i++] });
  if (teasers.twist) out.push({ k: 'twist' });
  let cycle = 0;
  let rabbitPlaced = !teasers.rabbit;
  while (i < items.length) {
    if (cycle % 2 === 0 && items[i + 1]) { out.push({ k: 'pair', a: items[i], b: items[i + 1] }); i += 2; }
    else out.push({ k: 'standard', r: items[i++] });
    cycle++;
    if (!rabbitPlaced && cycle === 2) { out.push({ k: 'rabbit' }); rabbitPlaced = true; }
  }
  if (!rabbitPlaced) out.push({ k: 'rabbit' });
  return out;
}

function pickRabbitHole(opts: { topics: string[]; interests: string[]; progress: Record<string, { path: string[] }>; doneIds: Set<string> }): RabbitHole | undefined {
  let pool = RABBIT_HOLES;
  if (opts.topics.length) pool = pool.filter((r) => r.topics.some((t) => opts.topics.includes(t)));
  if (!pool.length) return undefined;
  const day = todayKey();
  const scored = pool.map((r) => {
    let s = r.topics.filter((t) => opts.interests.includes(t)).length * 2;
    const p = opts.progress[r.id];
    if (opts.doneIds.has(r.id)) s -= 3;
    else if (p && p.path.length < r.nodes.length) s += 1.5;
    else if (!p) s += 1;
    return { r, s: s + hash(`${day}:rabbit:${r.id}`) * 1.5 };
  });
  return scored.sort((a, b) => b.s - a.s)[0]?.r;
}

function ForYouView({ prominent, onOpenFilters }: { prominent: boolean; onOpenFilters: () => void }) {
  const hydrated = useStore((s) => s.hydrated);
  const prefs = useStore((s) => s.prefs);
  const hidden = useStore((s) => s.feedback.hidden);
  const userExps = useStore((s) => s.experiences);
  const completions = useStore((s) => s.completions);
  const f = useFilters();
  const [refresh, setRefresh] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [menu, setMenu] = useState<Ranked | null>(null);
  const [collect, setCollect] = useState<Experience | null>(null);
  const [dialOpen, setDialOpen] = useState(false);
  const closeMenu = useCallback(() => setMenu(null), []);
  const closeCollect = useCallback(() => setCollect(null), []);
  const closeDial = useCallback(() => setDialOpen(false), []);

  // Ranking is recomputed when filters/preferences change (or on Refresh). Feedback given on this screen is applied
  // immediately to the card you acted on and to the whole ranking on refresh — so the feed doesn't jump under your thumb.
  const ranked = useMemo(
    () => (hydrated ? rankExperiences(toRankOpts(f)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hydrated, f, prefs, userExps, completions, refresh],
  );
  // Possibility Shelf: one well-ranked pick per format (after the top pick). Those items move from the feed to the shelf.
  const shelf = useMemo(() => {
    const picks = diversePicks(ranked, SHELF_SIZE);
    return picks.length >= SHELF_MIN ? picks : [];
  }, [ranked]);
  const visible = useMemo(() => {
    const onShelf = new Set(shelf.map((r) => r.experience.id));
    return ranked
      .filter((r) => !hidden.includes(r.experience.id) && !dismissed.includes(r.experience.id) && !onShelf.has(r.experience.id))
      .slice(0, FEED_LIMIT - onShelf.size);
  }, [ranked, hidden, dismissed, shelf]);

  const progress = useStore((s) => s.rabbitProgress);
  const rabbit = useMemo(() => {
    const doneIds = new Set(Object.values(completions).filter((c) => c.ref.kind === 'rabbit').map((c) => c.ref.id));
    return pickRabbitHole({ topics: f.topics, interests: prefs.interests, progress, doneIds });
  }, [f.topics, prefs.interests, progress, completions]);

  const filtered = countFilters(f) > 0;
  const blocks = useMemo(
    () => buildFeed(visible, { shelf: shelf.length > 0, twist: TWIST_TEMPLATES.length > 0 && !f.formats.length, rabbit: !!rabbit && !f.formats.length }),
    [visible, shelf.length, rabbit, f.formats.length],
  );
  const nothing = visible.length === 0 && shelf.length === 0;

  const dismiss = (id: string) => setDismissed((d) => (d.includes(id) ? d : [...d, id]));
  const undismiss = (id: string) => setDismissed((d) => d.filter((x) => x !== id));
  const onLess = (e: Experience) => { dismiss(e.id); lessLikeThis(e, () => undismiss(e.id)); };
  const onHide = (e: Experience) => { hideExperience(e); };

  const singleTopic = f.topics.length === 1 ? TOPICS.find((t) => t.id === f.topics[0]) : undefined;

  const renderCard = (r: Ranked, variant: 'feature' | 'standard' | 'compact') => (
    <FeedCard key={r.experience.id} r={r} variant={variant} onMore={setMenu} />
  );

  return (
    <>
      {!prominent && <FilterBar prominent={false} filters={f} onOpenFilters={onOpenFilters} />}

      {singleTopic && (
        <div className="dc-topic-head glass">
          <div className="grow">
            <div className="display t-md">{singleTopic.label}</div>
            <div className="small muted">{singleTopic.blurb}</div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => navigate(`/topic/${singleTopic.id}`)}>Topic page <ArrowRight size={16} aria-hidden /></Button>
        </div>
      )}
      <ActiveFilters f={f} />

      {!hydrated ? (
        <div className="stack" aria-busy="true" aria-label="Loading your feed">
          <Skeleton h={220} />
          <Skeleton h={140} />
          <div className="grid-2"><Skeleton h={130} /><Skeleton h={130} /></div>
        </div>
      ) : (
        <>
          {!filtered && <ResumeRow />}

          <div className="dc-surprise glass">
            <div className="grow">
              <div className="label">Surprise me</div>
              <div className="small muted">
                One random pick near your Surprise Dial:{' '}
                <button type="button" className="dc-link" onClick={() => setDialOpen(true)} aria-label={`Surprise Dial: ${COMFORT_LABEL[prefs.comfort]}. Change`}>
                  {COMFORT_LABEL[prefs.comfort]}
                </button>
              </div>
            </div>
            <Button variant="dark" icon={<Dices size={18} />} onClick={() => doSurprise(prefs.comfort)}>Surprise me</Button>
          </div>

          <Section title={filtered ? 'Filtered for you' : 'For you'} action={<span className="tiny on-art dc-tagline">Rule-based · curated</span>}>
            {nothing ? (
              filtered ? (
                <EmptyState
                  icon={<SlidersHorizontal size={24} />}
                  title="Nothing matches these filters"
                  body="Try a longer time, a different energy level, or fewer formats and topics."
                  action={<Button variant="primary" onClick={resetFilters}>Reset filters</Button>}
                />
              ) : (
                <EmptyState
                  title="You’ve seen everything here"
                  body="Everything is either done or hidden. Hidden items and feedback can be reset in You → Settings."
                  action={<Button variant="primary" onClick={() => navigate('/settings/profile')}>Open settings</Button>}
                />
              )
            ) : (
              <div className="dc-feed">
                {blocks.map((b, i) => {
                  switch (b.k) {
                    case 'feature':
                      return (
                        <div key={'f' + b.r.experience.id}>
                          <div className="dc-kicker"><span className="label accent on-art">Top pick today</span></div>
                          <div style={{ marginTop: 10 }}>{renderCard(b.r, 'feature')}</div>
                        </div>
                      );
                    case 'standard':
                      return renderCard(b.r, 'standard');
                    case 'pair': {
                      const quick = b.a.experience.minutes <= 15 && b.b.experience.minutes <= 15;
                      return (
                        <div key={'p' + b.a.experience.id + b.b.experience.id}>
                          <div className="dc-kicker"><span className="label on-art">{quick ? 'Quick ones' : 'Two more'}</span></div>
                          <div className="dc-pair" style={{ marginTop: 10 }}>
                            {renderCard(b.a, 'compact')}
                            {renderCard(b.b, 'compact')}
                          </div>
                        </div>
                      );
                    }
                    case 'shelf':
                      return <PossibilityShelf key="shelf" items={shelf} />;
                    case 'twist':
                      return <TwistTeaser key={'twist' + i} />;
                    case 'rabbit':
                      return rabbit ? <RabbitTeaser key={'rabbit' + rabbit.id} r={rabbit} /> : null;
                  }
                })}
              </div>
            )}
          </Section>

          {!nothing && (
            <div className="dc-end glass">
              <div className="label">The end</div>
              <h3 className="display t-md">You’ve reached the end</h3>
              <p className="muted">Try Surprise me or adjust filters. This is a finite list, ranked by simple rules from your preferences and feedback.</p>
              <div className="row wrap">
                <Button variant="primary" icon={<Dices size={18} />} onClick={() => doSurprise(prefs.comfort)}>Surprise me</Button>
                <Button icon={<SlidersHorizontal size={18} />} onClick={onOpenFilters}>Adjust filters</Button>
                <Button icon={<RotateCcw size={18} />} onClick={() => { setDismissed([]); setRefresh((n) => n + 1); window.scrollTo({ top: 0 }); toast('Feed re-ranked with your latest feedback'); }}>Refresh</Button>
              </div>
            </div>
          )}
          <p className="tiny dc-method glass">
            Suggestions come from curated content ranked by rules — your interests, formats, time, energy, Surprise Dial and “more / less like this”. No AI, and nothing leaves this device.
          </p>
        </>
      )}

      <CardMenu r={menu} onClose={closeMenu} onLess={onLess} onHide={onHide} onCollect={setCollect} />
      <AddToCollectionSheet open={!!collect} onClose={closeCollect} target={collect ? { kind: 'experience', id: collect.id } : null} />
      <Sheet open={dialOpen} onClose={closeDial} title="Surprise Dial">
        <div className="dc-area">
          <SurpriseDial value={prefs.comfort} onChange={(c) => useStore.getState().setPrefs({ comfort: c })} hideTitle />
          <p className="small muted">Sets how far outside your comfort zone Surprise me, Plot Twist and your For You ranking go.</p>
          <Button variant="primary" block icon={<Dices size={18} />} onClick={() => { closeDial(); doSurprise(useStore.getState().prefs.comfort); }}>Surprise me</Button>
        </div>
      </Sheet>
    </>
  );
}

function SearchEntry({ prominent }: { prominent: boolean }) {
  return (
    <button type="button" className="search dc-searchbtn" onClick={() => navigate('/search')} aria-label="Search experiences, rabbit holes, skills and notes">
      <Search size={prominent ? 20 : 18} aria-hidden />
      <span>Search experiences, ideas, skills…</span>
    </button>
  );
}

function FilterBar({ prominent, filters, onOpenFilters, onPicked }: { prominent: boolean; filters: Filters; onOpenFilters: () => void; onPicked?: () => void }) {
  const interests = useStore((s) => s.prefs.interests);
  const ordered = useMemo(() => [...TOPICS.filter((t) => interests.includes(t.id)), ...TOPICS.filter((t) => !interests.includes(t.id))], [interests]);
  const extra = (filters.maxMinutes ? 1 : 0) + (filters.energy ? 1 : 0) + filters.formats.length + (filters.topics.length > 1 ? filters.topics.length : 0);
  const pick = (id: string) => {
    setFilters({ topics: filters.topics.length === 1 && filters.topics[0] === id ? [] : [id] });
    onPicked?.();
  };
  return (
    <div className={'dc-filterbar' + (prominent ? ' prominent' : '')}>
      <SearchEntry prominent={prominent} />
      <div ref={edgePan} className="chips scroll" role="group" aria-label="Filter For you by topic" onTouchStart={stopTouch} onTouchMove={stopTouch}>
        <Chip active={extra > 0} onClick={onOpenFilters} icon={<SlidersHorizontal size={14} aria-hidden />}>
          Filters{extra > 0 && <span className="dc-count" aria-label={`${extra} active`}>{extra}</span>}
        </Chip>
        <Chip accent active={!filters.topics.length} onClick={() => { setFilters({ topics: [] }); onPicked?.(); }}>All topics</Chip>
        {ordered.map((t) => (
          <Chip key={t.id} accent active={filters.topics.includes(t.id)} onClick={() => pick(t.id)}>{t.label}</Chip>
        ))}
      </div>
    </div>
  );
}

function ActiveFilters({ f }: { f: Filters }) {
  const parts: string[] = [];
  if (f.maxMinutes) parts.push(`Up to ${f.maxMinutes} min`);
  if (f.energy) parts.push(f.energy === 3 ? 'Any energy' : `${ENERGY_LABEL[f.energy]} or less`);
  if (f.formats.length) parts.push(f.formats.map((k) => formatMeta(k).label).join(', '));
  if (f.topics.length > 1) parts.push(f.topics.map(topicLabel).join(', '));
  if (!parts.length) return null;
  return (
    <div className="dc-active glass small muted" role="status">
      <SlidersHorizontal size={14} aria-hidden />
      <span className="grow">{parts.join(' · ')}</span>
      <Button size="sm" variant="ghost" onClick={resetFilters} icon={<X size={16} />}>Clear</Button>
    </div>
  );
}

/**
 * Feed cards live in the first view of a horizontal pager: swiping a card right saves it, and a left swipe is left to
 * the pager (→ Explore), so moving between views never gives "less like this" feedback by accident. Less like this,
 * Hide and the rest stay one tap away in the card's ⋯ menu.
 */
function FeedCard({ r, variant, onMore }: { r: Ranked; variant: 'feature' | 'standard' | 'compact'; onMore: (r: Ranked) => void }) {
  const e = r.experience;
  return (
    <Swipeable onRight={() => saveExperience(e)} rightLabel="Save" rightIcon={<Bookmark size={18} />}>
      <div className={'dc-card dc-' + variant}>
        <ExperienceCard e={e} variant={variant} reason={variant === 'compact' ? undefined : r.reasons[0]} />
        <IconButton label={`More options for ${e.title}`} className="dc-more liquid" onClick={() => onMore(r)}>
          <Ellipsis size={20} />
        </IconButton>
      </div>
    </Swipeable>
  );
}

// ---- Possibility Shelf: a swipeable row of diverse picks (scroll-snap) with buttons, dots and arrow keys ----
function PossibilityShelf({ items }: { items: Ranked[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const trackRefCb = useCallback((el: HTMLDivElement | null) => {
    trackRef.current = el;
    return edgePan(el);
  }, []);
  const titleId = useId();
  const [idx, setIdx] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });
  const n = items.length;

  // Snap offsets of each card (scroll-snap-align: start, respecting the track's scroll padding).
  const offsets = useCallback(() => {
    const t = trackRef.current;
    if (!t) return [] as number[];
    const pad = parseFloat(getComputedStyle(t).scrollPaddingLeft) || 0;
    return Array.from(t.children, (c) => Math.max(0, (c as HTMLElement).offsetLeft - pad));
  }, []);

  const measure = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth;
    const x = t.scrollLeft;
    let i = 0;
    if (max > 2 && x >= max - 2) i = n - 1;
    else {
      const offs = offsets();
      offs.forEach((o, k) => { if (Math.abs(o - x) < Math.abs(offs[i] - x)) i = k; });
    }
    setIdx(i);
    setEdges({ start: x <= 2, end: max <= 2 || x >= max - 2 });
  }, [n, offsets]);

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    let raf = 0;
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; measure(); }); };
    t.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(t);
    measure();
    return () => { t.removeEventListener('scroll', onScroll); ro.disconnect(); cancelAnimationFrame(raf); };
  }, [measure]);

  const scrollToX = (left: number) => trackRef.current?.scrollTo({ left, behavior: scrollBehavior() });
  const go = (i: number) => { const offs = offsets(); if (offs.length) scrollToX(offs[Math.max(0, Math.min(n - 1, i))]); };
  const step = (dir: 1 | -1) => {
    const t = trackRef.current;
    if (!t) return;
    const x = t.scrollLeft;
    const offs = offsets();
    const target = dir > 0 ? offs.find((o) => o > x + 2) : [...offs].reverse().find((o) => o < x - 2);
    if (target !== undefined) scrollToX(target);
  };
  const onKey = (e: ReactKeyboardEvent) => {
    const t = trackRef.current;
    if (!t) return;
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'Home') scrollToX(0);
    else if (e.key === 'End') scrollToX(t.scrollWidth);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <section className="dc-shelf" aria-roledescription="carousel" aria-labelledby={titleId}>
      <div className="section-head dc-shelf-head">
        <h2 className="label" id={titleId}>Possibility shelf</h2>
        <div className="dc-shelf-nav">
          <IconButton label="Previous possibility" className="liquid" aria-disabled={edges.start} onClick={() => step(-1)}><ChevronLeft size={20} /></IconButton>
          <IconButton label="Next possibility" className="liquid" aria-disabled={edges.end} onClick={() => step(1)}><ChevronRight size={20} /></IconButton>
        </div>
      </div>
      <div
        ref={trackRefCb}
        className="dc-shelf-track"
        tabIndex={0}
        role="group"
        aria-label={`${n} possibilities in different formats. Use the arrow keys to move between them.`}
        onKeyDown={onKey}
        onTouchStart={stopTouch}
        onTouchMove={stopTouch}
      >
        {items.map((r, i) => <ShelfCard key={r.experience.id} r={r} i={i} n={n} />)}
      </div>
      <div className="dc-shelf-foot">
        <div className="dc-dots" role="group" aria-label="Go to a possibility">
          {items.map((r, i) => (
            <button
              key={r.experience.id}
              type="button"
              className="dc-dot"
              aria-label={`${i + 1} of ${n}: ${r.experience.title}`}
              aria-current={i === idx ? 'true' : undefined}
              onClick={() => go(i)}
            >
              <i aria-hidden />
            </button>
          ))}
        </div>
        <span className="tiny on-art">One per format · rule-based</span>
      </div>
      <p className="sr-only" aria-live="polite">{`Possibility ${idx + 1} of ${n}: ${items[idx]?.experience.title ?? ''}`}</p>
    </section>
  );
}

function ShelfCard({ r, i, n }: { r: Ranked; i: number; n: number }) {
  const e = r.experience;
  const F = formatMeta(e.format);
  return (
    <article className="card dc-shelf-card" aria-roledescription="slide" aria-label={`${i + 1} of ${n}`}>
      <button type="button" className="card-tap dc-shelf-tap" onClick={() => navigate(`/x/${e.id}`)}>
        <span className="dc-shelf-art" aria-hidden><GlassArt seed={e.id} format={e.format} size={96} /></span>
        <span className="label accent row" style={{ gap: 6 }}><F.icon size={14} aria-hidden /> {F.label}</span>
        <span className="display t-sm dc-shelf-title">{e.title}</span>
        <MetaLine e={e} showFormat={false} />
        <span className="tiny faint dc-shelf-why">{r.reasons[0]}</span>
      </button>
    </article>
  );
}

function CardMenu({ r, onClose, onLess, onHide, onCollect }: {
  r: Ranked | null; onClose: () => void; onLess: (e: Experience) => void; onHide: (e: Experience) => void; onCollect: (e: Experience) => void;
}) {
  const [why, setWhy] = useState(false);
  const id = r?.experience.id;
  useEffect(() => setWhy(false), [id]);
  const saved = useStore((s) => (id ? s.saved.includes(id) : false));
  if (!r) return null;
  const e = r.experience;
  // Feedback applies to every topic plus the format; topic labels contain "&", so join with commas and "and".
  const boosted = [...e.topics.map(topicLabel), formatMeta(e.format).label];
  const boostedText = boosted.length > 1 ? `${boosted.slice(0, -1).join(', ')} and ${boosted[boosted.length - 1]}` : boosted[0];
  return (
    <Sheet open={!!r} onClose={onClose} title={e.title}>
      <div className="dc-area">
        <div className="list dc-menu">
          <MenuRow icon={saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />} title={saved ? 'Remove from saved' : 'Save'} onClick={() => {
            if (saved) { useStore.getState().toggleSave(e.id); toast('Removed from saved'); } else saveExperience(e);
            onClose();
          }} />
          <MenuRow icon={<ThumbsUp size={20} />} title="More like this" sub={`Ranks ${boostedText} higher`} onClick={() => { moreLikeThis(e); onClose(); }} />
          <MenuRow icon={<ThumbsDown size={20} />} title="Less like this" sub="Ranks similar things lower" onClick={() => { onClose(); onLess(e); }} />
          <MenuRow icon={<EyeOff size={20} />} title="Hide this" sub="Removes it from your feed and search" onClick={() => { onClose(); onHide(e); }} />
          <MenuRow icon={<FolderPlus size={20} />} title="Add to collection" onClick={() => { onClose(); onCollect(e); }} />
          <MenuRow icon={<Info size={20} />} title="Why am I seeing this?" expanded={why} onClick={() => setWhy((w) => !w)} />
        </div>
        {why && (
          <div className="dc-why" aria-live="polite">
            <div className="label">Reasons</div>
            <ul className="small">
              {r.reasons.map((x) => <li key={x}>{x}</li>)}
            </ul>
            <p className="small muted" style={{ margin: '0 0 8px' }}>{rankingExplanation(e)}</p>
            <Button size="sm" variant="ghost" onClick={() => { onClose(); navigate('/settings/profile'); }}>Change my preferences <ArrowRight size={16} aria-hidden /></Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function MenuRow({ icon, title, sub, onClick, expanded }: { icon: ReactNode; title: string; sub?: string; onClick: () => void; expanded?: boolean }) {
  return (
    <button type="button" className="list-row" onClick={onClick} aria-expanded={expanded}>
      <span className="lr-icon">{icon}</span>
      <span className="grow">
        <span className="lr-title" style={{ display: 'block' }}>{title}</span>
        {sub && <span className="lr-sub" style={{ display: 'block' }}>{sub}</span>}
      </span>
    </button>
  );
}

function FiltersSheet({ open, onClose, onApplied }: { open: boolean; onClose: () => void; onApplied?: () => void }) {
  // Draft copy of the filters; applied on "Show".
  const [d, setD] = useState<Filters>(() => useFilters.getState());
  useEffect(() => { if (open) setD(useFilters.getState()); }, [open]);
  const count = useMemo(() => (open ? rankExperiences(toRankOpts(d)).length : 0), [open, d]);
  const toggle = (key: 'formats' | 'topics', v: string) => setD((x) => ({ ...x, [key]: x[key].includes(v) ? x[key].filter((y) => y !== v) : [...x[key], v] }));
  return (
    <Sheet open={open} onClose={onClose} title="Filters">
      <div className="dc-area">
        <div className="dc-filter-group">
          <span className="label">Time</span>
          <Segmented<number> label="Time" value={d.maxMinutes} options={TIME_OPTIONS} onChange={(v) => setD({ ...d, maxMinutes: v })} />
        </div>
        <div className="dc-filter-group">
          <span className="label">Energy</span>
          <Segmented<number> label="Energy" value={d.energy} options={ENERGY_OPTIONS} onChange={(v) => setD({ ...d, energy: v as Filters['energy'] })} />
          <span className="tiny faint">Shows things at or below this energy.</span>
        </div>
        <div className="dc-filter-group">
          <span className="label">Format</span>
          <div className="chips" role="group" aria-label="Formats">
            {FORMAT_KEYS.map((k) => {
              const F = formatMeta(k);
              return <Chip key={k} active={d.formats.includes(k)} onClick={() => toggle('formats', k)} icon={<F.icon size={14} aria-hidden />}>{F.label}</Chip>;
            })}
          </div>
        </div>
        <div className="dc-filter-group">
          <span className="label">Topics</span>
          <div className="chips" role="group" aria-label="Topics">
            {TOPICS.map((t) => <Chip key={t.id} accent active={d.topics.includes(t.id)} onClick={() => toggle('topics', t.id)}>{t.label}</Chip>)}
          </div>
        </div>
        <div className="row dc-sheet-foot">
          <Button onClick={() => setD({ ...NO_FILTERS })}>Reset</Button>
          <Button className="grow" variant="primary" disabled={count === 0} onClick={() => { setFilters(d); onClose(); onApplied?.(); }}>
            {count === 0 ? 'No matches' : count > FEED_LIMIT ? `Show the top ${FEED_LIMIT} of ${count}` : `Show ${count} ${count === 1 ? 'experience' : 'experiences'}`}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

// ---- Teasers ----
function TwistTeaser() {
  const active = useStore((s) => {
    let best: (typeof s.twists)[string] | undefined;
    for (const t of Object.values(s.twists)) if (t.status === 'accepted' && (!best || t.createdAt > best.createdAt)) best = t;
    return best;
  });
  const comfort = useStore((s) => s.prefs.comfort);
  return (
    <article className="card inverse dc-twist">
      <button type="button" className="card-tap" style={{ background: 'none', border: 0, padding: 0 }} onClick={() => navigate(active ? `/twist?id=${active.id}` : '/twist')}>
        <span className="label row" style={{ gap: 6 }}><Shuffle size={14} aria-hidden /> Plot Twist</span>
        {active ? (
          <>
            <h3 className="display t-lg">Your twist is waiting.</h3>
            <p className="dc-quote">“{active.text}”</p>
            <span className="dc-cta">Pick it back up <ArrowRight size={18} aria-hidden /></span>
          </>
        ) : (
          <>
            <h3 className="display t-lg">Break the routine.</h3>
            <p className="muted">A small real-world surprise sized to your time, energy and budget — set by your Surprise Dial ({COMFORT_LABEL[comfort]}). Template-generated from a curated list.</p>
            <span className="dc-cta">Get a twist <ArrowRight size={18} aria-hidden /></span>
          </>
        )}
      </button>
    </article>
  );
}

function RabbitTeaser({ r }: { r: RabbitHole }) {
  const p = useStore((s) => s.rabbitProgress[r.id]);
  return (
    <article className="card dc-rabbit">
      <button type="button" className="card-tap" style={{ background: 'none', border: 0, padding: 0 }} onClick={() => navigate(`/rabbit/${r.id}`)}>
        <span className="label accent row" style={{ gap: 6 }}><Rabbit size={14} aria-hidden /> Rabbit hole</span>
        <h3 className="display t-lg">{r.title}</h3>
        <p className="dc-hook">{r.hook}</p>
        <TopicTags topics={r.topics} />
        <span className="dc-cta" style={{ display: 'flex' }}>
          {p ? `Continue · ${Math.min(p.path.length, r.nodes.length)} of ${r.nodes.length} ideas explored` : 'Start exploring'} <ArrowRight size={18} aria-hidden />
        </span>
      </button>
    </article>
  );
}

// ---- Pick up where you left off ----
interface ResumeItem { key: string; kind: string; icon: ReactNode; title: string; sub: string; url: string; at: string }
const DRAFT_KEY_RE = /^(?:exp|x|experience):(.+?)(?::steps)?$/;
const isEmptyDraft = (data: unknown) => data == null || (typeof data === 'object' && Object.keys(data as object).length === 0);

function ResumeRow() {
  const tickets = useStore((s) => s.tickets);
  const progress = useStore((s) => s.rabbitProgress);
  const drafts = useStore((s) => s.drafts);
  const completions = useStore((s) => s.completions);
  const visited = useStore((s) => s.visited);
  const userExps = useStore((s) => s.experiences);
  const items = useMemo(() => {
    const done = new Set(Object.values(completions).map((c) => `${c.ref.kind}:${c.ref.id}`));
    const out: ResumeItem[] = [];
    const ticketed = new Set<string>();
    Object.values(tickets).filter((t) => !t.resolvedAt).forEach((t) => {
      ticketed.add(`${t.target.kind}:${t.target.id}`);
      out.push({
        key: 't' + t.id,
        kind: 'Return ticket',
        icon: <Ticket size={14} aria-hidden />,
        title: t.title,
        sub: t.next ? `Next: ${t.next}` : t.stoppedAt ? `Stopped at: ${t.stoppedAt}` : `Saved ${relTime(t.createdAt)}`,
        url: t.target.kind === 'rabbit' && t.nodeId ? `/rabbit/${t.target.id}?node=${t.nodeId}` : refUrl(t.target),
        at: t.createdAt,
      });
    });
    Object.entries(progress).forEach(([rid, p]) => {
      if (ticketed.has(`rabbit:${rid}`) || done.has(`rabbit:${rid}`)) return;
      const r = getRabbitHole(rid);
      if (!r || p.path.length >= r.nodes.length) return;
      out.push({
        key: 'r' + rid,
        kind: 'Rabbit hole',
        icon: <Rabbit size={14} aria-hidden />,
        title: r.title,
        sub: `${p.path.length} of ${r.nodes.length} ideas explored`,
        url: `/rabbit/${rid}?node=${p.node}`,
        at: visited[`rabbit:${rid}:${p.node}`] ?? '',
      });
    });
    // Player drafts are keyed "exp:<id>" and guided-step answers "exp:<id>:steps"; show one card per experience.
    const drafted = new Map<string, ResumeItem>();
    Object.values(drafts).forEach((d) => {
      const e = getExperience(DRAFT_KEY_RE.exec(d.key)?.[1] ?? d.key);
      if (!e || isEmptyDraft(d.data) || done.has(`experience:${e.id}`) || ticketed.has(`experience:${e.id}`)) return;
      const prev = drafted.get(e.id);
      if (prev && prev.at >= d.updatedAt) return;
      drafted.set(e.id, {
        key: 'd' + e.id,
        kind: 'Draft',
        icon: <PenLine size={14} aria-hidden />,
        title: e.title,
        sub: `${formatMeta(e.format).label} · saved ${relTime(d.updatedAt)}`,
        url: `/x/${e.id}`,
        at: d.updatedAt,
      });
    });
    out.push(...drafted.values());
    return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, progress, drafts, completions, visited, userExps]);
  if (!items.length) return null;
  const hasTickets = Object.values(tickets).some((t) => !t.resolvedAt);
  return (
    <Section title="Pick up where you left off" action={hasTickets ? <Button size="sm" onClick={() => navigate('/tickets')}>All tickets</Button> : undefined} style={{ marginTop: 18 }}>
      <div ref={edgePan} className="dc-resume" onTouchStart={stopTouch} onTouchMove={stopTouch}>
        {items.map((it) => (
          <button key={it.key} type="button" className="dc-resume-item glass" onClick={() => navigate(it.url)}>
            <span className="label accent row" style={{ gap: 6 }}>{it.icon} {it.kind}</span>
            <span className="dc-resume-title">{it.title}</span>
            {it.sub && <span className="dc-resume-sub">{it.sub}</span>}
          </button>
        ))}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Explore: browse by topic, fit (time / energy / format) and the curated indexes
// ---------------------------------------------------------------------------
const TOPIC_PREVIEW = 8;
const EXPLORE_PREVIEW = 6;
const PERSPECTIVE_PREVIEW = 4;

function ExploreView({ prominent }: { prominent: boolean }) {
  const prefs = useStore((s) => s.prefs);
  const hidden = useStore((s) => s.feedback.hidden);
  const userExps = useStore((s) => s.experiences);
  const completions = useStore((s) => s.completions);
  const rabbitProgress = useStore((s) => s.rabbitProgress);
  const x = useExplore();
  const [allTopics, setAllTopics] = useState(false);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setShowAll(false), [x]);

  const topicCounts = useMemo(() => {
    const hiddenSet = new Set(hidden);
    const counts: Record<string, number> = {};
    for (const e of allExperiences()) if (!hiddenSet.has(e.id)) for (const t of e.topics) counts[t] = (counts[t] ?? 0) + 1;
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, userExps]);
  const topics = useMemo(
    () => [...TOPICS.filter((t) => prefs.interests.includes(t.id)), ...TOPICS.filter((t) => !prefs.interests.includes(t.id))],
    [prefs.interests],
  );
  const shownTopics = allTopics ? topics : topics.slice(0, TOPIC_PREVIEW);

  const results = useMemo(
    () => rankExperiences({ maxMinutes: x.maxMinutes || undefined, energy: x.energy || undefined, formats: x.formats.length ? x.formats : undefined, includeDone: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [x, prefs, hidden, userExps, completions],
  );
  const doneIds = useMemo(() => new Set(Object.values(completions).filter((c) => c.ref.kind === 'experience').map((c) => c.ref.id)), [completions]);
  const filtersOn = !!(x.maxMinutes || x.energy || x.formats.length);
  const shown = showAll ? results : results.slice(0, EXPLORE_PREVIEW);
  const toggleFormat = (k: string) => useExplore.setState((s) => ({ formats: s.formats.includes(k) ? s.formats.filter((y) => y !== k) : [...s.formats, k] }));

  return (
    <>
      {!prominent && <div className="dc-explore-search"><SearchEntry prominent={false} /></div>}

      <Section title="Topics" action={<span className="tiny on-art dc-tagline">{TOPICS.length} topics · curated</span>}>
        <div className="dc-topic-grid" id="dc-topic-grid">
          {shownTopics.map((t) => {
            const count = topicCounts[t.id] ?? 0;
            const following = prefs.interests.includes(t.id);
            return (
              <button key={t.id} type="button" className="dc-topic-tile glass" onClick={() => navigate(`/topic/${t.id}`)}>
                <span className="dc-topic-name">{t.label}</span>
                <span className="tiny muted">{count} {count === 1 ? 'experience' : 'experiences'}{following ? ' · following' : ''}</span>
              </button>
            );
          })}
        </div>
        {topics.length > TOPIC_PREVIEW && (
          <Button className="dc-more-btn" size="sm" aria-expanded={allTopics} aria-controls="dc-topic-grid" onClick={() => setAllTopics((v) => !v)}>
            {allTopics ? 'Fewer topics' : `All ${topics.length} topics`}
          </Button>
        )}
      </Section>

      <Section title="Find something that fits">
        <div className="card dc-x-filters">
          <div className="dc-filter-group">
            <span className="label">Time</span>
            <Segmented<number> label="Time" value={x.maxMinutes} options={TIME_OPTIONS} onChange={(v) => useExplore.setState({ maxMinutes: v })} />
          </div>
          <div className="dc-filter-group">
            <span className="label">Energy</span>
            <Segmented<number> label="Energy" value={x.energy} options={ENERGY_OPTIONS} onChange={(v) => useExplore.setState({ energy: v as ExploreFilters['energy'] })} />
          </div>
          <div className="dc-filter-group">
            <span className="label">Format</span>
            <div ref={edgePan} className="chips scroll dc-x-formats" role="group" aria-label="Formats" onTouchStart={stopTouch} onTouchMove={stopTouch}>
              {FORMAT_KEYS.map((k) => {
                const F = formatMeta(k);
                return <Chip key={k} active={x.formats.includes(k)} onClick={() => toggleFormat(k)} icon={<F.icon size={14} aria-hidden />}>{F.label}</Chip>;
              })}
            </div>
          </div>
          <div className="row between dc-x-count">
            <span className="small muted" role="status">
              {results.length} {results.length === 1 ? 'experience' : 'experiences'} · ranked by simple rules
            </span>
            {filtersOn && <Button size="sm" variant="ghost" icon={<X size={16} />} onClick={() => useExplore.setState({ ...NO_EXPLORE })}>Clear</Button>}
          </div>
        </div>
        {results.length ? (
          <div className="list dc-x-results">
            {shown.map((e) => {
              const F = formatMeta(e.experience.format);
              return (
                <ResultRow key={e.experience.id} icon={<F.icon size={18} aria-hidden />} title={e.experience.title}
                  sub={`${F.label} · ${e.experience.minutes} min · ${ENERGY_LABEL[e.experience.energy]}`}
                  right={doneIds.has(e.experience.id) ? <span className="tag"><Check size={12} aria-hidden /> Done</span> : undefined}
                  onClick={() => navigate(`/x/${e.experience.id}`)} />
              );
            })}
          </div>
        ) : (
          <div className="dc-x-results">
            <EmptyState
              icon={<SlidersHorizontal size={24} />}
              title="Nothing fits all of these"
              body="Try more time, a higher energy level or fewer formats."
              action={<Button variant="primary" onClick={() => useExplore.setState({ ...NO_EXPLORE })}>Clear filters</Button>}
            />
          </div>
        )}
        {results.length > shown.length && (
          <Button className="dc-more-btn" block onClick={() => setShowAll(true)}>Show all {results.length}</Button>
        )}
      </Section>

      <Section title="Rabbit holes" action={<Button size="sm" onClick={() => navigate('/journeys')}>Journeys</Button>}>
        <div className="list">
          {RABBIT_HOLES.map((r) => {
            const p = rabbitProgress[r.id];
            return (
              <ResultRow key={r.id} icon={<Rabbit size={18} aria-hidden />} title={r.title}
                sub={p ? `Continue · ${Math.min(p.path.length, r.nodes.length)} of ${r.nodes.length} ideas explored` : r.hook}
                onClick={() => navigate(`/rabbit/${r.id}`)} />
            );
          })}
        </div>
      </Section>

      <Section title="Skill Arcade" action={<Button size="sm" onClick={() => navigate('/skills')}>All skills</Button>}>
        <div className="list">
          {SKILLS.map((k) => {
            const prog = skillProgress(k, completions);
            return (
              <ResultRow key={k.id} icon={<Gamepad2 size={18} aria-hidden />} title={k.name}
                sub={prog.started ? `Level ${Math.max(1, prog.currentLevel)} of ${k.levels.length} · ${k.tagline}` : k.tagline}
                onClick={() => navigate(`/skill/${k.id}`)} />
            );
          })}
        </div>
      </Section>

      <Section title="Perspective Switch" action={<Button size="sm" onClick={() => navigate('/perspectives')}>All {PERSPECTIVES.length}</Button>}>
        <div className="list">
          {PERSPECTIVES.slice(0, PERSPECTIVE_PREVIEW).map((p) => (
            <ResultRow key={p.id} icon={<MessagesSquare size={18} aria-hidden />} title={p.question} sub={`${p.lenses.length} viewpoints`} onClick={() => navigate(`/perspective/${p.id}`)} />
          ))}
        </div>
      </Section>

      <Section title="More ways in">
        <div className="list">
          <ResultRow icon={<Shuffle size={18} aria-hidden />} title="Plot Twist" sub="A small real-world surprise, template-generated" onClick={() => navigate('/twist')} />
          <ResultRow icon={<Users size={18} aria-hidden />} title="Two-Person Quests" sub="Shared challenges you send as a link or code" onClick={() => navigate('/quests')} />
          <ResultRow icon={<FolderPlus size={18} aria-hidden />} title="Collections" sub="Your named shelves of saved things" onClick={() => navigate('/collections')} />
        </div>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Saved (a Discover view, and the /saved page)
// ---------------------------------------------------------------------------
function useSavedItems() {
  const saved = useStore((s) => s.saved);
  const userExps = useStore((s) => s.experiences);
  const items = useMemo(() => saved.map((id) => getExperience(id)).filter((e): e is Experience => !!e),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saved, userExps]);
  return { items, missing: saved.length - items.length };
}

function unsave(e: Experience) {
  const idx = useStore.getState().saved.indexOf(e.id);
  if (idx < 0) return;
  useStore.getState().toggleSave(e.id);
  toast('Removed from saved', {
    action: {
      label: 'Undo',
      run: () => useStore.setState((s) => {
        if (s.saved.includes(e.id)) return {};
        const next = [...s.saved];
        next.splice(Math.min(idx, next.length), 0, e.id);
        return { saved: next };
      }),
    },
  });
}

function SavedList({ items, missing, onBrowse }: { items: Experience[]; missing: number; onBrowse: () => void }) {
  const cleanMissing = () => {
    useStore.setState((s) => ({ saved: s.saved.filter((id) => !!getExperience(id)) }));
    toast('Removed unavailable items');
  };
  return (
    <>
      {items.length ? (
        <div className="stack">
          {items.map((e) => (
            <Swipeable key={e.id} onLeft={() => unsave(e)} leftLabel="Remove" leftIcon={<BookmarkMinus size={18} />}>
              <ExperienceCard e={e} />
            </Swipeable>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Bookmark size={24} />}
          title="Nothing saved yet"
          body="Tap the bookmark on any card, or swipe a feed card to the right, to keep it here."
          action={<Button variant="primary" onClick={onBrowse}>Browse For you</Button>}
        />
      )}
      {missing > 0 && (
        <div className="banner" style={{ marginTop: 16 }}>
          <Info size={18} aria-hidden />
          <span className="grow">{missing} saved {missing === 1 ? 'item is' : 'items are'} no longer on this device (deleted or removed).</span>
          <Button size="sm" variant="ghost" onClick={cleanMissing}>Remove</Button>
        </div>
      )}
      <Section title="Organise">
        <div className="list">
          <ResultRow icon={<FolderPlus size={18} aria-hidden />} title="Collections" sub="Group saved things into named shelves" onClick={() => navigate('/collections')} />
        </div>
      </Section>
    </>
  );
}

function SavedView({ onBrowse }: { onBrowse: () => void }) {
  const { items, missing } = useSavedItems();
  return (
    <>
      <div className="dc-view-head glass">
        <Bookmark size={20} aria-hidden className="dc-view-icon" />
        <div className="grow">
          <h2 className="display t-md">Saved</h2>
          <p className="small muted">
            {items.length
              ? `${items.length} saved ${items.length === 1 ? 'experience' : 'experiences'}. Swipe a card left or tap its bookmark to remove it.`
              : 'Experiences you bookmark are kept here, on this device.'}
          </p>
        </div>
      </div>
      <SavedList items={items} missing={missing} onBrowse={onBrowse} />
    </>
  );
}

export function SavedScreen() {
  const { items, missing } = useSavedItems();
  return (
    <Screen
      title="Saved"
      eyebrow="Discover"
      backTo="/discover"
      subtitle={items.length ? `${items.length} saved ${items.length === 1 ? 'experience' : 'experiences'}. Swipe left or tap the bookmark to remove.` : undefined}
      actions={<IconButton label="Collections" onClick={() => navigate('/collections')}><FolderPlus size={22} /></IconButton>}
    >
      <div className="dc-area">
        <SavedList items={items} missing={missing} onBrowse={() => navigate('/discover')} />
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
const RECENT_KEY = 'search:recent';

export function SearchScreen() {
  const route = useRoute();
  const [q, setQ] = useState(route.query.get('q') ?? '');
  const [fmt, setFmt] = useState('');
  const [maxMin, setMaxMin] = useState(0);
  const [energy, setEnergy] = useState<0 | Energy>(0);
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recent = useStore((s) => (s.drafts[RECENT_KEY]?.data as string[] | undefined) ?? EMPTY);
  const notes = useStore((s) => s.notes);
  const entries = useStore((s) => s.entries);
  const hidden = useStore((s) => s.feedback.hidden);
  const userExps = useStore((s) => s.experiences);
  const blur = useStore((s) => s.settings.privacy.blurPrivate);
  const done = useStore((s) => s.completions);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);
  // Keep the URL in sync (without a history entry or scroll jump) so back/forward and reloads keep the query.
  useEffect(() => {
    const t = setTimeout(() => {
      const term = q.trim();
      replaceUrlSilently('/search' + (term ? `?q=${encodeURIComponent(term)}` : ''));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => setShowAll(false), [q, fmt, maxMin, energy]);

  const remember = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8);
    useStore.getState().saveDraft(RECENT_KEY, next);
  };
  const forget = (term: string) => {
    const next = recent.filter((x) => x !== term);
    if (next.length) useStore.getState().saveDraft(RECENT_KEY, next);
    else useStore.getState().clearDraft(RECENT_KEY);
  };
  const go = (url: string) => { remember(q); navigate(url); };

  const filtersOn = !!(fmt || maxMin || energy);
  const res = useMemo(() => {
    const term = q.trim();
    if (!term) return null;
    let exps = searchExperiences(term);
    if (fmt) exps = exps.filter((e) => e.format === fmt);
    if (maxMin) exps = exps.filter((e) => e.minutes <= maxMin);
    if (energy) exps = exps.filter((e) => e.energy <= energy);
    const by = <T,>(list: T[], fields: (x: T) => { text: string; weight: number }[]) =>
      list.map((x) => ({ x, s: textScore(term, fields(x)) })).filter((y) => y.s > 0).sort((a, b) => b.s - a.s).map((y) => y.x);
    // Time/energy/format filters only make sense for experiences, so other groups are hidden while they're on.
    const other = !filtersOn;
    return {
      exps,
      topics: !other ? [] : by(TOPICS, (t) => [{ text: t.label, weight: 3 }, { text: t.blurb, weight: 1 }]),
      rabbits: !other ? [] : by(RABBIT_HOLES, (r) => [{ text: r.title, weight: 5 }, { text: r.hook, weight: 2 }, { text: r.topics.map(topicLabel).join(' '), weight: 3 }]),
      ideas: !other ? [] : by(RABBIT_HOLES.flatMap((r) => r.nodes.map((n) => ({ r, n }))), ({ n }) => [{ text: n.title, weight: 4 }, { text: n.question ?? '', weight: 2 }]).slice(0, 6),
      skills: !other ? [] : by(SKILLS, (k) => [{ text: k.name, weight: 5 }, { text: k.tagline, weight: 2 }, { text: k.topics.map(topicLabel).join(' '), weight: 3 }]),
      perspectives: !other ? [] : by(PERSPECTIVES, (p) => [{ text: p.question, weight: 5 }, { text: p.topics.map(topicLabel).join(' '), weight: 3 }, { text: p.lenses.map((l) => l.name).join(' '), weight: 1.5 }]),
      notes: !other ? [] : by(Object.values(notes), (n) => [{ text: n.title || n.text.split('\n')[0] || '', weight: 1 }]),
      entries: !other ? [] : by(Object.values(entries), (e) => [{ text: e.title, weight: 1 }]),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, fmt, maxMin, energy, notes, entries, hidden, userExps]);

  const total = res ? res.exps.length + res.topics.length + res.rabbits.length + res.ideas.length + res.skills.length + res.perspectives.length + res.notes.length + res.entries.length : 0;
  const doneIds = useMemo(() => new Set(Object.values(done).filter((c) => c.ref.kind === 'experience').map((c) => c.ref.id)), [done]);
  const shownExps = res ? (showAll ? res.exps : res.exps.slice(0, 12)) : [];

  return (
    <Screen title="Search" backTo="/discover" hideLargeTitle>
      <div className="dc-area">
        <form role="search" className="dc-search-form" onSubmit={(e) => { e.preventDefault(); remember(q); inputRef.current?.blur(); }}>
          <label className="search dc-search-input">
            <Search size={20} aria-hidden />
            <input
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              autoFocus
              autoComplete="off"
              placeholder="Experiences, rabbit holes, skills, notes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search Elsewhere"
            />
            {q && <IconButton type="button" label="Clear search" onClick={() => { setQ(''); inputRef.current?.focus(); }}><X size={18} /></IconButton>}
          </label>
        </form>
        <div ref={edgePan} className="chips scroll dc-search-chips" role="group" aria-label="Filter experience results">
          <Chip active={maxMin === 15} onClick={() => setMaxMin(maxMin === 15 ? 0 : 15)} icon={<Clock size={14} aria-hidden />}>≤ 15 min</Chip>
          <Chip active={maxMin === 30} onClick={() => setMaxMin(maxMin === 30 ? 0 : 30)} icon={<Clock size={14} aria-hidden />}>≤ 30 min</Chip>
          <Chip active={energy === 1} onClick={() => setEnergy(energy === 1 ? 0 : 1)} icon={<Zap size={14} aria-hidden />}>Low energy</Chip>
          <Chip active={energy === 2} onClick={() => setEnergy(energy === 2 ? 0 : 2)} icon={<Zap size={14} aria-hidden />}>Medium or less</Chip>
          {FORMAT_KEYS.map((k) => {
            const F = formatMeta(k);
            return <Chip key={k} active={fmt === k} onClick={() => setFmt(fmt === k ? '' : k)} icon={<F.icon size={14} aria-hidden />}>{F.label}</Chip>;
          })}
        </div>
        {filtersOn && <p className="tiny on-art dc-results-note">Time, energy and format filters apply to experiences only.</p>}

        {!res ? (
          <>
            {recent.length > 0 ? (
              <Section title="Recent searches" action={<Button size="sm" onClick={() => useStore.getState().clearDraft(RECENT_KEY)}>Clear</Button>}>
                <div className="list dc-recent">
                  {recent.map((r) => (
                    <div key={r} className="list-row" style={{ padding: '4px 4px 4px 16px' }}>
                      <History size={18} aria-hidden className="faint" />
                      <button type="button" className="grow dc-recent-term" onClick={() => setQ(r)}>{r}</button>
                      <IconButton label={`Remove “${r}” from recent searches`} onClick={() => forget(r)}><X size={16} /></IconButton>
                    </div>
                  ))}
                </div>
              </Section>
            ) : (
              <p className="small muted dc-note glass">Search across experiences, rabbit holes, skills, perspective questions and your own notes and entries. Everything is searched on this device.</p>
            )}
            <Section title="Browse topics">
              <div className="chips">
                {TOPICS.map((t) => <Chip key={t.id} onClick={() => navigate(`/topic/${t.id}`)}>{t.label}</Chip>)}
              </div>
            </Section>
          </>
        ) : total === 0 ? (
          <div style={{ marginTop: 16 }}>
            <EmptyState
              icon={<Search size={24} />}
              title={`Nothing matches “${q.trim()}”`}
              body={filtersOn ? 'Try removing a filter, using fewer words, or another spelling.' : 'Try fewer words or another spelling — or browse a topic instead.'}
              action={filtersOn ? <Button onClick={() => { setFmt(''); setMaxMin(0); setEnergy(0); }}>Clear filters</Button> : <Button onClick={() => doSurprise(useStore.getState().prefs.comfort)} icon={<Dices size={18} />}>Surprise me instead</Button>}
            />
          </div>
        ) : (
          <>
            <p className="sr-only" role="status">{total} results</p>
            {res.topics.length > 0 && (
              <Section title="Topics">
                <div className="chips">
                  {res.topics.map((t) => <Chip key={t.id} icon={<Hash size={14} aria-hidden />} onClick={() => go(`/topic/${t.id}`)}>{t.label}</Chip>)}
                </div>
              </Section>
            )}
            {res.exps.length > 0 && (
              <Section title={`Experiences · ${res.exps.length}`}>
                <div className="list">
                  {shownExps.map((e) => {
                    const F = formatMeta(e.format);
                    return (
                      <ResultRow key={e.id} icon={<F.icon size={18} aria-hidden />} title={e.title}
                        sub={`${F.label} · ${e.minutes} min · ${ENERGY_LABEL[e.energy]}`}
                        right={doneIds.has(e.id) ? <span className="tag"><Check size={12} aria-hidden /> Done</span> : undefined}
                        onClick={() => go(`/x/${e.id}`)} />
                    );
                  })}
                </div>
                {res.exps.length > shownExps.length && (
                  <Button className="dc-more-btn" block onClick={() => setShowAll(true)}>Show all {res.exps.length} experiences</Button>
                )}
              </Section>
            )}
            {(res.rabbits.length > 0 || res.ideas.length > 0) && (
              <Section title="Rabbit holes">
                <div className="list">
                  {res.rabbits.map((r) => <ResultRow key={r.id} icon={<Rabbit size={18} aria-hidden />} title={r.title} sub={r.hook} onClick={() => go(`/rabbit/${r.id}`)} />)}
                  {res.ideas.map(({ r, n }) => <ResultRow key={r.id + n.id} icon={<Lightbulb size={18} aria-hidden />} title={n.title} sub={`Idea in “${r.title}”`} onClick={() => go(`/rabbit/${r.id}?node=${n.id}`)} />)}
                </div>
              </Section>
            )}
            {res.skills.length > 0 && (
              <Section title="Skills">
                <div className="list">
                  {res.skills.map((k) => <ResultRow key={k.id} icon={<Gamepad2 size={18} aria-hidden />} title={k.name} sub={k.tagline} onClick={() => go(`/skill/${k.id}`)} />)}
                </div>
              </Section>
            )}
            {res.perspectives.length > 0 && (
              <Section title="Perspective Switch">
                <div className="list">
                  {res.perspectives.map((p) => <ResultRow key={p.id} icon={<MessagesSquare size={18} aria-hidden />} title={p.question} sub={`${p.lenses.length} viewpoints`} onClick={() => go(`/perspective/${p.id}`)} />)}
                </div>
              </Section>
            )}
            {(res.notes.length > 0 || res.entries.length > 0) && (
              <Section title="Yours">
                <div className="list">
                  {res.notes.map((n) => (
                    <ResultRow key={n.id} icon={<PenLine size={18} aria-hidden />} title={n.private && blur ? 'Private note' : n.title || n.text.split('\n')[0] || 'Untitled note'} sub={`Field note · ${relTime(n.updatedAt)}`} onClick={() => go(`/note/${n.id}`)} />
                  ))}
                  {res.entries.map((e) => (
                    <ResultRow key={e.id} icon={<BookOpen size={18} aria-hidden />} title={e.private && blur ? 'Private entry' : e.title || 'Untitled entry'} sub={`Version History · ${relTime(e.updatedAt)}`} onClick={() => go(`/entry/${e.id}`)} />
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </Screen>
  );
}

function ResultRow({ icon, title, sub, right, onClick }: { icon: ReactNode; title: string; sub?: string; right?: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="list-row" onClick={onClick}>
      <span className="lr-icon">{icon}</span>
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="lr-title" style={{ display: 'block' }}>{title}</span>
        {sub && <span className="lr-sub" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>}
      </span>
      {right ?? <ChevronRight size={18} aria-hidden className="faint" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Topic page
// ---------------------------------------------------------------------------
export function TopicScreen({ id }: { id: string }) {
  const topic = TOPICS.find((t) => t.id === id);
  const prefs = useStore((s) => s.prefs);
  const following = prefs.interests.includes(id);
  const fb = useStore((s) => s.feedback.topic[id] ?? 0);
  const hidden = useStore((s) => s.feedback.hidden);
  const userExps = useStore((s) => s.experiences);
  const completions = useStore((s) => s.completions);
  const ranked = useMemo(
    () => (topic ? rankExperiences({ topics: [id], includeDone: true }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, topic, prefs, hidden, userExps, completions],
  );
  const rabbits = useMemo(() => RABBIT_HOLES.filter((r) => r.topics.includes(id)), [id]);
  const skills = useMemo(() => SKILLS.filter((k) => k.topics.includes(id)), [id]);
  const perspectives = useMemo(() => PERSPECTIVES.filter((p) => p.topics.includes(id)), [id]);

  if (!topic) {
    return (
      <Screen title="Topic" backTo="/discover">
        <div className="dc-area">
          <EmptyState title="Unknown topic" body={`There’s no topic called “${id ?? ''}”.`} action={<Button variant="primary" onClick={() => navigate('/discover', { replace: true })}>Back to Discover</Button>} />
        </div>
      </Screen>
    );
  }

  const toggleFollow = () => {
    const s = useStore.getState();
    const interests = s.prefs.interests;
    s.setPrefs({ interests: following ? interests.filter((x) => x !== id) : [...interests, id] });
    toast(following ? `Unfollowed ${topic.label}` : `Following ${topic.label} — it will rank higher in For You`);
  };
  const adjust = (dir: 1 | -1) => {
    const before = useStore.getState().feedback.topic[id];
    useStore.setState((s) => ({ feedback: { ...s.feedback, topic: { ...s.feedback.topic, [id]: Math.max(-5, Math.min(5, (s.feedback.topic[id] ?? 0) + dir)) } } }));
    toast(dir > 0 ? `Noted — more ${topic.label}.` : `Noted — less ${topic.label}.`, {
      action: { label: 'Undo', run: () => restoreFeedback({ topic: { [id]: before }, format: {} }) },
    });
  };

  return (
    <Screen title={topic.label} eyebrow="Topic" backTo="/discover" subtitle={topic.blurb}>
      <div className="dc-area">
        <div className="dc-topic-panel glass">
          <div className="row wrap dc-topic-actions">
            <Button variant={following ? 'soft' : 'primary'} icon={following ? <Check size={18} /> : <Plus size={18} />} onClick={toggleFollow} aria-pressed={following}>
              {following ? 'Following' : 'Follow topic'}
            </Button>
            <Button icon={<ThumbsUp size={18} />} onClick={() => adjust(1)}>More like this</Button>
            {fb > 0 && <Button size="sm" icon={<ThumbsDown size={16} />} onClick={() => adjust(-1)}>Less</Button>}
          </div>
          <p className="tiny muted" style={{ margin: '10px 0 0' }}>
            {fb > 0 ? `You’ve asked for more ${topic.label}. ` : fb < 0 ? `You’ve asked for less ${topic.label}. ` : ''}
            Followed topics and “more like this” rank higher in For You — a rule-based ranking you can change any time.
          </p>
        </div>

        {rabbits.length > 0 && (
          <Section title="Rabbit holes">
            <div className="stack">
              {rabbits.map((r) => <RabbitTeaser key={r.id} r={r} />)}
            </div>
          </Section>
        )}

        <Section title={ranked.length ? `Experiences · ${ranked.length}` : 'Experiences'}>
          {ranked.length ? (
            <div className="stack">
              {ranked.map((r, i) => (
                <ExperienceCard key={r.experience.id} e={r.experience} variant={i === 0 ? 'feature' : 'standard'} reason={r.reasons[0]} />
              ))}
            </div>
          ) : (
            <EmptyState title="No experiences here yet" body="Nothing in this topic right now — or you’ve hidden everything in it." action={<Button onClick={() => navigate('/discover')}>Back to Discover</Button>} />
          )}
        </Section>

        {skills.length > 0 && (
          <Section title="Skills">
            <div className="list">
              {skills.map((k) => <ResultRow key={k.id} icon={<Gamepad2 size={18} aria-hidden />} title={k.name} sub={k.tagline} onClick={() => navigate(`/skill/${k.id}`)} />)}
            </div>
          </Section>
        )}
        {perspectives.length > 0 && (
          <Section title="Perspective Switch">
            <div className="list">
              {perspectives.map((p) => <ResultRow key={p.id} icon={<MessagesSquare size={18} aria-hidden />} title={p.question} sub={`${p.lenses.length} viewpoints`} onClick={() => navigate(`/perspective/${p.id}`)} />)}
            </div>
          </Section>
        )}
      </div>
    </Screen>
  );
}
