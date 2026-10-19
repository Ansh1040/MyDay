// Converts a backup exported from the earlier buildless Elsewhere browser prototype
// (`{ app: 'Elsewhere', version: 1, data: { theme, mode, notes, custom, capsules, collections, … } }`,
// file name "elsewhere-backup.json") into this app's data, so nothing written there is lost.
// Items that point at the prototype's own built-in content (its saved/completed/ticket ids) have no
// equivalent in this catalog; they are counted and reported as skipped instead of being guessed.
import type { Capsule, Collection, Comfort, EntryKind, Experience, HistoryEntry, ID, Ref, Step, ThemeName } from '../data/types';
import { nowISO, uid } from './id';
import { FORMAT_META } from '../formats/meta';

interface LegacyData {
  theme?: string;
  mode?: string;
  name?: string;
  surprise?: number;
  saved?: unknown[];
  completed?: unknown[];
  notes?: { id?: unknown; date?: string; kind?: string; title?: string; text?: string }[];
  collections?: { id?: unknown; title?: string; items?: unknown[] }[];
  custom?: { id?: string; type?: string; title?: string; desc?: string; format?: string; minutes?: number; topic?: string; steps?: string[]; prompt?: string }[];
  tickets?: { id?: unknown; note?: string }[];
  capsules?: { id?: unknown; date?: string; text?: string }[];
}

export interface LegacyConversion {
  settings: { theme?: ThemeName; appearance?: 'auto' | 'light' | 'dark' };
  prefs: { name?: string; comfort?: Comfort };
  entries: Record<ID, HistoryEntry>;
  experiences: Record<ID, Experience>;
  capsules: Record<ID, Capsule>;
  collections: Record<ID, Collection>;
  skipped: { saved: number; completed: number; tickets: number; collectionItems: number };
  counts: { entries: number; experiences: number; capsules: number; collections: number };
}

/** True if the parsed JSON looks like a backup from the earlier prototype. */
export function isLegacyBackup(json: unknown): json is { app: 'Elsewhere'; version: number; data: LegacyData } {
  const j = json as { app?: unknown; data?: unknown } | null;
  return !!j && j.app === 'Elsewhere' && typeof j.data === 'object' && j.data !== null && !('experiences' in (j.data as object));
}

const THEMES: ThemeName[] = ['vermilion', 'cobalt', 'plum', 'graphite'];
const ENTRY_KINDS: EntryKind[] = ['reflection', 'opinion', 'interest', 'goal', 'milestone', 'mindchange'];
const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');
const iso = (v: unknown) => {
  const d = typeof v === 'string' || typeof v === 'number' ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d.toISOString() : nowISO();
};

export function convertLegacyBackup(json: { data: LegacyData }): LegacyConversion {
  const d = json.data ?? {};
  const out: LegacyConversion = {
    settings: {},
    prefs: {},
    entries: {},
    experiences: {},
    capsules: {},
    collections: {},
    skipped: { saved: 0, completed: 0, tickets: 0, collectionItems: 0 },
    counts: { entries: 0, experiences: 0, capsules: 0, collections: 0 },
  };

  if (THEMES.includes(d.theme as ThemeName)) out.settings.theme = d.theme as ThemeName;
  if (d.mode === 'day') out.settings.appearance = 'light';
  else if (d.mode === 'night') out.settings.appearance = 'dark';
  else if (d.mode === 'auto') out.settings.appearance = 'auto';
  if (str(d.name)) out.prefs.name = str(d.name, 80);
  if (typeof d.surprise === 'number' && isFinite(d.surprise)) out.prefs.comfort = Math.max(1, Math.min(5, Math.round(d.surprise))) as Comfort;

  // Version History notes
  for (const n of Array.isArray(d.notes) ? d.notes : []) {
    if (!n || (!str(n.text) && !str(n.title))) continue;
    const kind = str(n.kind).toLowerCase().replace(/[^a-z]/g, '') as EntryKind;
    const id = uid('e-');
    const at = iso(n.date);
    out.entries[id] = {
      id, kind: ENTRY_KINDS.includes(kind) ? kind : 'reflection', title: str(n.title, 200), text: str(n.text),
      revisions: [], topics: [], links: [], private: false, createdAt: at, updatedAt: at,
    };
  }

  // Custom experiences
  const customIdMap = new Map<string, ID>();
  for (const c of Array.isArray(d.custom) ? d.custom : []) {
    if (!c || !str(c.title)) continue;
    const id = uid('u-');
    if (c.id) customIdMap.set(String(c.id), id);
    const format = c.format && FORMAT_META[c.format.toLowerCase()] ? c.format.toLowerCase() : 'challenge';
    const lines = (Array.isArray(c.steps) ? c.steps : []).map((s) => str(s, 500)).filter(Boolean);
    const steps: Step[] = (lines.length ? lines : ['Try it and notice what happens.']).map((body, i) => ({ id: `s${i + 1}`, title: `Step ${i + 1}`, body, input: 'none' }));
    if (str(c.prompt)) steps.push({ id: `s${steps.length + 1}`, title: 'Reflect', body: str(c.prompt, 500), input: 'text' });
    out.experiences[id] = {
      id, title: str(c.title, 200), summary: str(c.desc, 500) || 'An experience you created.', area: 'general', format,
      topics: [], minutes: Math.max(1, Math.min(240, Math.round(Number(c.minutes) || 15))), energy: 2, comfort: 2, cost: 0, social: 'either',
      origin: 'user', payload: { steps }, createdAt: nowISO(), visibility: 'private',
    };
  }

  // Capsules (the prototype stored only an open date and text)
  for (const c of Array.isArray(d.capsules) ? d.capsules : []) {
    if (!c || !str(c.text)) continue;
    const id = uid('cap-');
    const text = str(c.text);
    out.capsules[id] = {
      id, kind: 'message', title: text.split(/\s+/).slice(0, 6).join(' ') + (text.split(/\s+/).length > 6 ? '…' : ''), text, links: [],
      sealedAt: typeof c.id === 'number' ? iso(c.id) : nowISO(), opensAt: iso(c.date),
    };
  }

  // Collections: keep names; keep only items that point at imported custom experiences
  for (const c of Array.isArray(d.collections) ? d.collections : []) {
    if (!c || !str(c.title)) continue;
    const id = uid('col-');
    const items: Ref[] = [];
    for (const it of Array.isArray(c.items) ? c.items : []) {
      const mapped = customIdMap.get(String(it));
      if (mapped) items.push({ kind: 'experience', id: mapped });
      else out.skipped.collectionItems++;
    }
    out.collections[id] = { id, name: str(c.title, 120), description: 'Imported from the earlier Elsewhere prototype.', items, createdAt: typeof c.id === 'number' ? iso(c.id) : nowISO() };
  }

  const notCustom = (v: unknown) => !customIdMap.has(String((v as { id?: unknown })?.id ?? v));
  out.skipped.saved = (Array.isArray(d.saved) ? d.saved : []).filter(notCustom).length;
  out.skipped.completed = (Array.isArray(d.completed) ? d.completed : []).filter(notCustom).length;
  out.skipped.tickets = (Array.isArray(d.tickets) ? d.tickets : []).length;
  out.counts = {
    entries: Object.keys(out.entries).length,
    experiences: Object.keys(out.experiences).length,
    capsules: Object.keys(out.capsules).length,
    collections: Object.keys(out.collections).length,
  };
  return out;
}
