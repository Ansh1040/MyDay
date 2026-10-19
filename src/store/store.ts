// Global app state. Persisted to IndexedDB (key "state") with debounced autosave; restored on launch.
import { create } from 'zustand';
import type {
  Capsule, Collection, Completion, Draft, Experience, Feedback, FieldNote, HistoryEntry, ID, PerspectiveSession,
  Preferences, Ref, Reminder, ReturnTicket, Settings, TimerState, Twist, TwoPersonQuest,
} from '../data/types';
import { kv } from '../lib/db';
import { nowISO, uid } from '../lib/id';

export interface Entities {
  experiences: Record<ID, Experience>; // user-created / remixed / imported experiences (curated live in the catalog)
  notes: Record<ID, FieldNote>;
  entries: Record<ID, HistoryEntry>;
  capsules: Record<ID, Capsule>;
  collections: Record<ID, Collection>;
  tickets: Record<ID, ReturnTicket>;
  quests: Record<ID, TwoPersonQuest>;
  twists: Record<ID, Twist>;
  perspectives: Record<ID, PerspectiveSession>;
  completions: Record<ID, Completion>;
  drafts: Record<string, Draft>;
  timers: Record<ID, TimerState>;
  reminders: Record<ID, Reminder>;
}
export type EntityKey = keyof Entities;

export interface PersistedState extends Entities {
  version: number;
  onboarded: boolean;
  prefs: Preferences;
  settings: Settings;
  feedback: Feedback;
  saved: ID[]; // bookmarked experience ids
  visited: Record<string, ISOString>; // "rabbit:<id>:<node>" | "exp:<id>" → last visited
  rabbitProgress: Record<ID, { node: ID; path: ID[] }>; // where I am in each rabbit hole
}
type ISOString = string;

export interface AppState extends PersistedState {
  hydrated: boolean;
  storageError: string | null;
  /** Insert or replace an entity. */
  upsert: <K extends EntityKey>(key: K, item: Entities[K][string]) => void;
  /** Shallow-merge fields into an existing entity. */
  patch: <K extends EntityKey>(key: K, id: ID, fields: Partial<Entities[K][string]>) => void;
  remove: <K extends EntityKey>(key: K, id: ID) => void;
  setPrefs: (p: Partial<Preferences>) => void;
  setSettings: (s: Partial<Settings>) => void;
  setNotificationSettings: (n: Partial<Settings['notifications']>) => void;
  completeOnboarding: () => void;
  toggleSave: (experienceId: ID) => void;
  isSaved: (experienceId: ID) => boolean;
  /** "More like this" (+1) / "Less like this" (-1) on an experience's topics and format. */
  giveFeedback: (exp: Experience, dir: 1 | -1) => void;
  hide: (experienceId: ID) => void;
  unhide: (experienceId: ID) => void;
  resetFeedback: () => void;
  /** Record a completion (progress). Returns the completion id. */
  complete: (ref: Ref, data?: Partial<Completion>) => ID;
  isComplete: (ref: Ref) => boolean;
  addToCollection: (collectionId: ID, ref: Ref) => void;
  removeFromCollection: (collectionId: ID, ref: Ref) => void;
  saveDraft: (key: string, data: unknown) => void;
  clearDraft: (key: string) => void;
  markVisited: (key: string) => void;
  setRabbitProgress: (rabbitId: ID, node: ID) => void;
  replaceAll: (data: Partial<PersistedState>) => void;
  wipe: () => void;
}

export const defaultPrefs: Preferences = {
  name: '',
  interests: [],
  skills: [],
  goals: [],
  minutes: 20,
  energy: 2,
  comfort: 2,
  budget: 0,
  social: 'either',
  formats: [],
};

export const defaultSettings: Settings = {
  theme: 'vermilion',
  appearance: 'auto',
  reducedMotion: 'system',
  textScale: 1,
  notifications: {
    timers: true,
    reminders: true,
    capsules: true,
    shared: true,
    tickets: true,
    quietStart: '22:00',
    quietEnd: '08:00',
    quietEnabled: false,
  },
  privacy: { blurPrivate: false, excludePrivateFromExport: false },
  haptics: true,
  sound: true,
};

function seedCollections(): Record<ID, Collection> {
  const at = nowISO();
  const mk = (id: string, name: string, description: string): Collection => ({ id, name, description, items: [], createdAt: at, system: true });
  return {
    'col-surprised': mk('col-surprised', 'Things that surprised me', 'Moments and ideas that caught me off guard.'),
    'col-try': mk('col-try', 'Projects I want to try', 'A shelf of things to make or do next.'),
    'col-changed': mk('col-changed', 'Ideas I changed my mind about', 'Where my thinking moved.'),
  };
}

export function initialState(): PersistedState {
  return {
    version: 1,
    onboarded: false,
    prefs: { ...defaultPrefs },
    settings: structuredClone(defaultSettings),
    feedback: { topic: {}, format: {}, hidden: [] },
    saved: [],
    visited: {},
    rabbitProgress: {},
    experiences: {},
    notes: {},
    entries: {},
    capsules: {},
    collections: seedCollections(),
    tickets: {},
    quests: {},
    twists: {},
    perspectives: {},
    completions: {},
    drafts: {},
    timers: {},
    reminders: {},
  };
}

const sameRef = (a: Ref, b: Ref) => a.kind === b.kind && a.id === b.id;

export const useStore = create<AppState>()((set, get) => ({
  ...initialState(),
  hydrated: false,
  storageError: null,

  upsert: (key, item) => set((s) => ({ [key]: { ...s[key], [(item as { id?: string; key?: string }).id ?? (item as { key: string }).key]: item } }) as Partial<AppState>),
  patch: (key, id, fields) =>
    set((s) => {
      const prev = s[key][id];
      if (!prev) return {};
      return { [key]: { ...s[key], [id]: { ...prev, ...fields } } } as Partial<AppState>;
    }),
  remove: (key, id) =>
    set((s) => {
      const next = { ...s[key] };
      delete next[id];
      return { [key]: next } as Partial<AppState>;
    }),

  setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
  setSettings: (x) => set((s) => ({ settings: { ...s.settings, ...x } })),
  setNotificationSettings: (n) => set((s) => ({ settings: { ...s.settings, notifications: { ...s.settings.notifications, ...n } } })),
  completeOnboarding: () => set({ onboarded: true }),

  toggleSave: (id) => set((s) => ({ saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [id, ...s.saved] })),
  isSaved: (id) => get().saved.includes(id),

  giveFeedback: (exp, dir) =>
    set((s) => {
      const topic = { ...s.feedback.topic };
      exp.topics.forEach((t) => (topic[t] = Math.max(-5, Math.min(5, (topic[t] ?? 0) + dir))));
      const format = { ...s.feedback.format, [exp.format]: Math.max(-5, Math.min(5, (s.feedback.format[exp.format] ?? 0) + dir)) };
      return { feedback: { ...s.feedback, topic, format } };
    }),
  hide: (id) => set((s) => ({ feedback: { ...s.feedback, hidden: [...new Set([...s.feedback.hidden, id])] } })),
  unhide: (id) => set((s) => ({ feedback: { ...s.feedback, hidden: s.feedback.hidden.filter((x) => x !== id) } })),
  resetFeedback: () => set({ feedback: { topic: {}, format: {}, hidden: [] } }),

  complete: (ref, data = {}) => {
    const id = uid('c-');
    set((s) => ({ completions: { ...s.completions, [id]: { id, ref, at: nowISO(), ...data } } }));
    return id;
  },
  isComplete: (ref) => Object.values(get().completions).some((c) => sameRef(c.ref, ref)),

  addToCollection: (cid, ref) =>
    set((s) => {
      const c = s.collections[cid];
      if (!c || c.items.some((r) => sameRef(r, ref))) return {};
      return { collections: { ...s.collections, [cid]: { ...c, items: [ref, ...c.items] } } };
    }),
  removeFromCollection: (cid, ref) =>
    set((s) => {
      const c = s.collections[cid];
      if (!c) return {};
      return { collections: { ...s.collections, [cid]: { ...c, items: c.items.filter((r) => !sameRef(r, ref)) } } };
    }),

  saveDraft: (key, data) => set((s) => ({ drafts: { ...s.drafts, [key]: { key, data, updatedAt: nowISO() } } })),
  clearDraft: (key) =>
    set((s) => {
      const d = { ...s.drafts };
      delete d[key];
      return { drafts: d };
    }),
  markVisited: (key) => set((s) => ({ visited: { ...s.visited, [key]: nowISO() } })),
  setRabbitProgress: (rid, node) =>
    set((s) => {
      const prev = s.rabbitProgress[rid];
      const path = prev ? (prev.path.includes(node) ? prev.path : [...prev.path, node]) : [node];
      return { rabbitProgress: { ...s.rabbitProgress, [rid]: { node, path } } };
    }),

  replaceAll: (data) => set({ ...initialState(), ...data }),
  wipe: () => set({ ...initialState() }),
}));

// ---- persistence ----
const PERSIST_KEYS: (keyof PersistedState)[] = Object.keys(initialState()) as (keyof PersistedState)[];

export function snapshot(): PersistedState {
  const s = useStore.getState();
  const out = {} as Record<string, unknown>;
  PERSIST_KEYS.forEach((k) => (out[k] = s[k]));
  return out as unknown as PersistedState;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
async function flush() {
  try {
    await kv.set('state', snapshot());
    if (useStore.getState().storageError) useStore.setState({ storageError: null });
  } catch (e) {
    // Fallback so data isn't lost if IndexedDB is blocked (e.g. some private modes).
    try {
      localStorage.setItem('elsewhere-state', JSON.stringify(snapshot()));
    } catch {
      useStore.setState({ storageError: 'Your changes could not be saved on this device. Export your data to keep a copy.' });
    }
    console.error(e);
  }
}

export async function hydrate() {
  let data: Partial<PersistedState> | undefined;
  try {
    data = await kv.get<PersistedState>('state');
  } catch {
    /* fall through to localStorage */
  }
  if (!data) {
    try {
      const raw = localStorage.getItem('elsewhere-state');
      if (raw) data = JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }
  const base = initialState();
  if (data) {
    // Merge so new fields added in later versions get defaults.
    useStore.setState({
      ...base,
      ...data,
      prefs: { ...base.prefs, ...data.prefs },
      settings: {
        ...base.settings,
        ...data.settings,
        notifications: { ...base.settings.notifications, ...data.settings?.notifications },
        privacy: { ...base.settings.privacy, ...data.settings?.privacy },
      },
      hydrated: true,
    });
  } else {
    useStore.setState({ hydrated: true });
  }
  useStore.subscribe(() => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 250);
  });
  // Flush promptly when the app goes to background.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      clearTimeout(saveTimer);
      flush();
    }
  });
  window.addEventListener('pagehide', () => flush());
}

/** All experiences (catalog + user-created) — resolved lazily to avoid import cycles. */
export const useEntity = <K extends EntityKey>(key: K, id: ID | undefined) => useStore((s) => (id ? s[key][id] : undefined));
