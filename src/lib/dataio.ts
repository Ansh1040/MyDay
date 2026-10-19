// Personal data export / import / deletion (owned by the You area).
// Everything lives on this device; an export is a single JSON file the user keeps or moves themselves.
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { initialState, snapshot, useStore, type EntityKey, type PersistedState } from '../store/store';
import type { ID, Ref } from '../data/types';
import { blobs, kv } from './db';
import { downloadFile } from './share';
import { isNative } from './platform';
import { cancelScheduled } from './notify';
import { syncReminderNative } from './background';
import { isLegacyBackup, convertLegacyBackup, type LegacyConversion } from './legacyImport';
import { nowISO, todayKey, uid } from './id';

/** Bump when the export file shape changes. Older files stay importable. */
export const EXPORT_SCHEMA = 1;
const APP_ID = 'elsewhere';

export interface ExportFile {
  app: typeof APP_ID;
  schema: number;
  exportedAt: string;
  options: { includeMedia: boolean; excludePrivate: boolean };
  counts: Record<string, number>;
  state: PersistedState;
  /** blobId → data URL (only when includeMedia). */
  media?: Record<string, string>;
}

export interface ExportOptions { includeMedia: boolean; excludePrivate: boolean }

const ENTITY_KEYS: EntityKey[] = [
  'experiences', 'notes', 'entries', 'capsules', 'collections', 'tickets', 'quests', 'twists', 'perspectives',
  'completions', 'drafts', 'timers', 'reminders',
];

/** Human words for counts shown in previews: [one, many]. */
export const COUNT_LABELS: Partial<Record<EntityKey | 'media' | 'saved', [string, string]>> = {
  saved: ['saved (bookmarked) experience', 'saved (bookmarked) experiences'],
  entries: ['Version History entry', 'Version History entries'],
  notes: ['field note', 'field notes'],
  completions: ['completed activity', 'completed activities'],
  capsules: ['capsule', 'capsules'],
  collections: ['collection', 'collections'],
  experiences: ['experience you made or imported', 'experiences you made or imported'],
  twists: ['plot twist', 'plot twists'],
  perspectives: ['perspective session', 'perspective sessions'],
  quests: ['two-person quest', 'two-person quests'],
  tickets: ['return ticket', 'return tickets'],
  reminders: ['reminder', 'reminders'],
  media: ['media file', 'media files'],
};
/** "3 field notes", "1 reminder" — falls back to the raw key for unknown sections. */
export function countLabel(key: string, n: number) {
  const l = COUNT_LABELS[key as keyof typeof COUNT_LABELS];
  return `${n} ${l ? l[n === 1 ? 0 : 1] : key}`;
}

function countsOf(state: PersistedState, media?: Record<string, string>) {
  const out: Record<string, number> = {};
  ENTITY_KEYS.forEach((k) => {
    if (k === 'drafts' || k === 'timers') return;
    out[k] = Object.keys(state[k] ?? {}).length;
  });
  if (media) out.media = Object.keys(media).length;
  return out;
}

function blobToDataURL(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('Could not read a media file.'));
    r.readAsDataURL(b);
  });
}

async function dataURLToBlob(url: string): Promise<Blob> {
  const m = url.match(/^data:([^;,]*)(;base64)?,(.*)$/s);
  if (!m) throw new Error('A media file in this export is damaged.');
  const type = m[1] || 'application/octet-stream';
  if (m[2]) {
    const bin = atob(m[3]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }
  return new Blob([decodeURIComponent(m[3])], { type });
}

/** Remove private notes/entries and every reference to them. */
function stripPrivate(state: PersistedState): { state: PersistedState; privateBlobIds: Set<string> } {
  const privateNoteIds = new Set(Object.values(state.notes).filter((n) => n.private).map((n) => n.id));
  const privateEntryIds = new Set(Object.values(state.entries).filter((e) => e.private).map((e) => e.id));
  const privateBlobIds = new Set(
    Object.values(state.notes).filter((n) => n.private && n.blobId).map((n) => n.blobId as string),
  );
  const keepRef = (r: Ref) => !((r.kind === 'note' && privateNoteIds.has(r.id)) || (r.kind === 'entry' && privateEntryIds.has(r.id)));
  const filterMap = <T extends { id: ID }>(m: Record<ID, T>, keep: (x: T) => boolean, map: (x: T) => T = (x) => x) => {
    const out: Record<ID, T> = {};
    Object.values(m).forEach((x) => {
      if (keep(x)) out[x.id] = map(x);
    });
    return out;
  };
  const drafts: PersistedState['drafts'] = {};
  Object.values(state.drafts).forEach((d) => {
    // Drafts are keyed by thing; drop drafts that belong to private notes/entries.
    const hit = [...privateNoteIds, ...privateEntryIds].some((id) => d.key.includes(id));
    if (!hit) drafts[d.key] = d;
  });
  return {
    privateBlobIds,
    state: {
      ...state,
      notes: filterMap(state.notes, (n) => !n.private, (n) => ({ ...n, links: n.links.filter(keepRef) })),
      entries: filterMap(state.entries, (e) => !e.private, (e) => ({ ...e, links: e.links.filter(keepRef) })),
      capsules: filterMap(state.capsules, () => true, (c) => ({ ...c, links: c.links.filter(keepRef) })),
      collections: filterMap(state.collections, () => true, (c) => ({ ...c, items: c.items.filter(keepRef) })),
      completions: filterMap(state.completions, (c) => keepRef(c.ref)),
      drafts,
    },
  };
}

/** Build the export as a JSON string. */
export async function exportData({ includeMedia, excludePrivate }: ExportOptions): Promise<string> {
  let state = structuredClone(snapshot());
  let skipBlobs = new Set<string>();
  if (excludePrivate) {
    const r = stripPrivate(state);
    state = r.state;
    skipBlobs = r.privateBlobIds;
  }
  // Timers are transient; device-specific notification ids are meaningless elsewhere.
  state.timers = {};
  let media: Record<string, string> | undefined;
  if (includeMedia) {
    media = {};
    let keys: IDBValidKey[] = [];
    try {
      keys = await blobs.keys();
    } catch {
      keys = [];
    }
    for (const k of keys) {
      const id = String(k);
      if (skipBlobs.has(id)) continue;
      const b = await blobs.get(id);
      if (b) media[id] = await blobToDataURL(b);
    }
  }
  const file: ExportFile = {
    app: APP_ID,
    schema: EXPORT_SCHEMA,
    exportedAt: new Date().toISOString(),
    options: { includeMedia, excludePrivate },
    counts: countsOf(state, media),
    state,
    ...(media ? { media } : {}),
  };
  return JSON.stringify(file);
}

export const exportFileName = (d = new Date()) =>
  `elsewhere-export-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;

export type SaveResult =
  | { method: 'download'; name: string }
  | { method: 'documents'; name: string; path: string; uri: string }
  | { method: 'shared'; name: string };

/**
 * Save an export. Web: a normal file download. Android: written to the public Documents folder;
 * if that is not permitted, it is written to the app cache and handed to the system share sheet instead.
 */
export async function saveExportFile(json: string, name = exportFileName()): Promise<SaveResult> {
  if (!isNative()) {
    downloadFile(name, json, 'application/json');
    return { method: 'download', name };
  }
  try {
    const path = `Elsewhere/${name}`;
    const r = await Filesystem.writeFile({ path, data: json, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true });
    return { method: 'documents', name, path: `Documents/${path}`, uri: r.uri };
  } catch {
    await shareExportFile(json, name);
    return { method: 'shared', name };
  }
}

/**
 * False when an embedding frame's permissions policy blocks a feature (e.g. a sandboxed preview without
 * allow="clipboard-write"). Checking first avoids a refused call and the browser's console error for it.
 * Browsers without the (Chromium-only) featurePolicy API just try the call.
 */
function policyAllows(feature: string): boolean {
  const fp = (document as Document & { featurePolicy?: { allowsFeature: (f: string) => boolean } }).featurePolicy;
  try {
    return fp ? fp.allowsFeature(feature) : true;
  } catch {
    return true;
  }
}

/**
 * Copy export text to the clipboard. Call it straight from a click handler: browsers only allow clipboard
 * writes in response to the user. Tries the async Clipboard API, then the older execCommand('copy').
 * Resolves false (never throws) when both are refused — e.g. sandboxed previews — so the caller can show the text instead.
 */
export async function copyExportText(json: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText && policyAllows('clipboard-write')) {
      await navigator.clipboard.writeText(json);
      return true;
    }
  } catch {
    /* refused: try the older route */
  }
  return copyWithSelection(json);
}

/** Copy via a temporary selection + execCommand('copy'). Works in some places the Clipboard API is blocked. */
export function copyWithSelection(text: string): boolean {
  const prev = document.activeElement as HTMLElement | null;
  const ta = document.createElement('textarea');
  try {
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.setAttribute('aria-hidden', 'true');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    ta.remove();
    prev?.focus?.({ preventScroll: true });
  }
}

/**
 * Read text from the clipboard for "Paste to import". Resolves null when the browser has no clipboard API
 * or refuses (permission denied, sandboxed preview); the caller then offers a box to paste into by hand.
 */
export async function readClipboardText(): Promise<string | null> {
  try {
    if (!navigator.clipboard?.readText || !policyAllows('clipboard-read')) return null;
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

/** Android: write to the app cache and open the share sheet (save to Drive, Files, email…). Web: download. */
export async function shareExportFile(json: string, name = exportFileName()) {
  if (!isNative()) {
    downloadFile(name, json, 'application/json');
    return;
  }
  const r = await Filesystem.writeFile({ path: name, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
  try {
    await Share.share({ title: 'Elsewhere export', files: [r.uri], dialogTitle: 'Save or send your Elsewhere export' });
  } catch (e) {
    // User closing the share sheet is not an error.
    if (!/cancel/i.test(String((e as Error)?.message ?? e))) throw e;
  }
}

// ---------------- Import ----------------

export interface ImportPreview {
  /** 'export' = made by this app's Export; 'legacy' = elsewhere-backup.json from the earlier browser prototype. */
  source: 'export' | 'legacy';
  exportedAt: string;
  schema: number;
  counts: Record<string, number>;
  hasMedia: boolean;
  excludedPrivate: boolean;
  warnings: string[];
  /** Only for prototype backups: what can't be carried over, and the look/name it could apply. */
  legacy?: {
    skipped: LegacyConversion['skipped'];
    settings: LegacyConversion['settings'];
    prefs: LegacyConversion['prefs'];
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function parseJSON(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    throw new Error('This isn’t valid JSON, so it can’t be an Elsewhere export. If you pasted it, check that nothing was cut off.');
  }
}

/** Parse + validate an export file. Throws an Error with a readable message. */
function parseExport(json: string, parsed?: unknown): { file: ExportFile; warnings: string[] } {
  const raw: unknown = parsed === undefined ? parseJSON(json) : parsed;
  if (!isObj(raw)) throw new Error('This file doesn’t look like an Elsewhere export.');
  if (raw.app !== APP_ID) throw new Error('This file wasn’t made by Elsewhere’s “Export your data”.');
  if (typeof raw.schema !== 'number') throw new Error('This export is missing its format version.');
  if (raw.schema > EXPORT_SCHEMA) throw new Error('This export was made by a newer version of Elsewhere. Update the app, then import it again.');
  if (!isObj(raw.state)) throw new Error('This export has no data section.');
  const state = raw.state as Record<string, unknown>;
  const warnings: string[] = [];
  for (const k of ENTITY_KEYS) {
    const v = state[k];
    if (v === undefined) continue;
    if (!isObj(v)) throw new Error(`The “${k}” section of this export is damaged.`);
    let bad = 0;
    for (const [id, item] of Object.entries(v)) {
      const itemId = k === 'drafts' ? (item as { key?: unknown })?.key : (item as { id?: unknown })?.id;
      if (!isObj(item) || itemId !== id) {
        bad++;
        delete v[id];
      }
    }
    if (bad) warnings.push(`${bad} damaged item${bad === 1 ? '' : 's'} in “${k}” will be skipped.`);
  }
  if (state.prefs !== undefined && !isObj(state.prefs)) throw new Error('The preferences section of this export is damaged.');
  if (state.settings !== undefined && !isObj(state.settings)) throw new Error('The settings section of this export is damaged.');
  if (state.saved !== undefined && !Array.isArray(state.saved)) delete state.saved;
  if (raw.media !== undefined && !isObj(raw.media)) {
    warnings.push('The media section is damaged and will be skipped.');
    delete raw.media;
  }
  return { file: raw as unknown as ExportFile, warnings };
}

// ---- prototype backups (elsewhere-backup.json) ----
type LegacyFile = Parameters<typeof convertLegacyBackup>[0] & { version?: unknown };

/** The prototype backup, if this is one. Tolerates a lower-case `app` name, which would otherwise be mistaken for a damaged export. */
function asLegacy(parsed: unknown): LegacyFile | null {
  if (isLegacyBackup(parsed)) return parsed;
  if (isObj(parsed) && typeof parsed.app === 'string' && parsed.app.toLowerCase() === 'elsewhere' && parsed.state === undefined) {
    const fixed = { ...parsed, app: 'Elsewhere' };
    if (isLegacyBackup(fixed)) return fixed;
  }
  return null;
}

interface LegacyPlan {
  conv: LegacyConversion;
  /** Converted experience ids the prototype had saved / completed (they point at the user's own custom experiences). */
  saved: string[];
  completed: { id: string; at?: string }[];
}

/**
 * Convert a prototype backup and work out which of its saves and completions point at its custom experiences.
 * convertLegacyBackup counts only the others as skipped; these ones are carried over here so nothing is silently dropped.
 * The legacy-id → new-id pairing mirrors convertLegacyBackup: custom items with a non-empty string title, in order.
 */
function planLegacy(file: LegacyFile): LegacyPlan {
  const conv = convertLegacyBackup(file);
  const data = (isObj(file.data) ? file.data : {}) as { custom?: unknown; saved?: unknown; completed?: unknown };
  const newIds = Object.keys(conv.experiences);
  const map = new Map<string, string>();
  let i = 0;
  for (const c of Array.isArray(data.custom) ? data.custom : []) {
    const o = c as { id?: unknown; title?: unknown } | null;
    if (!o || typeof o.title !== 'string' || !o.title) continue;
    const id = newIds[i++];
    if (id && o.id) map.set(String(o.id), id);
  }
  const keyOf = (v: unknown) => String((v as { id?: unknown } | null)?.id ?? v);
  const saved = [...new Set((Array.isArray(data.saved) ? data.saved : []).map(keyOf).filter((k) => map.has(k)).map((k) => map.get(k)!))];
  const completed: LegacyPlan['completed'] = [];
  for (const v of Array.isArray(data.completed) ? data.completed : []) {
    const id = map.get(keyOf(v));
    if (!id || completed.some((c) => c.id === id)) continue;
    const o = isObj(v) ? v : {};
    const when = [o.date, o.at, o.doneAt].find((x) => typeof x === 'string' || typeof x === 'number');
    const d = when !== undefined ? new Date(when as string | number) : null;
    completed.push({ id, at: d && !isNaN(d.getTime()) ? d.toISOString() : undefined });
  }
  return { conv, saved, completed };
}

/** Validate a file and describe what it contains, without changing anything. */
export function previewImport(json: string): ImportPreview {
  const parsed = parseJSON(json);
  const legacyFile = asLegacy(parsed);
  if (legacyFile) {
    const { conv, saved, completed } = planLegacy(legacyFile);
    const counts: Record<string, number> = { ...conv.counts };
    if (saved.length) counts.saved = saved.length;
    if (completed.length) counts.completions = completed.length;
    return {
      source: 'legacy',
      exportedAt: '',
      schema: typeof legacyFile.version === 'number' ? legacyFile.version : 0,
      counts,
      hasMedia: false,
      excludedPrivate: false,
      warnings: [],
      legacy: { skipped: conv.skipped, settings: conv.settings, prefs: conv.prefs },
    };
  }
  const { file, warnings } = parseExport(json, parsed);
  const state = file.state as Partial<PersistedState>;
  const counts: Record<string, number> = {};
  ENTITY_KEYS.forEach((k) => {
    if (k === 'drafts' || k === 'timers') return;
    counts[k] = Object.keys(state[k] ?? {}).length;
  });
  if (file.media) counts.media = Object.keys(file.media).length;
  return {
    source: 'export',
    exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : '',
    schema: file.schema,
    counts,
    hasMedia: !!file.media && Object.keys(file.media).length > 0,
    excludedPrivate: !!file.options?.excludePrivate,
    warnings,
  };
}

const stamp = (x: unknown) => {
  const o = x as { updatedAt?: string; at?: string; createdAt?: string; openedAt?: string; completedAt?: string; doneAt?: string };
  return o.updatedAt ?? o.openedAt ?? o.completedAt ?? o.doneAt ?? o.at ?? o.createdAt ?? '';
};

/** Make device-specific fields safe on this device (scheduled notification ids, running timers). */
function sanitize(state: Partial<PersistedState>) {
  Object.values(state.capsules ?? {}).forEach((c) => {
    delete c.nativeId;
  });
  Object.values(state.tickets ?? {}).forEach((t) => {
    delete t.nativeId;
  });
  // The web reminder check (background.ts) fires a reminder when the clock is at or past its time and lastFiredOn isn't
  // today. An imported reminder whose time has already passed today would therefore fire the moment it arrives; mark it
  // as fired today (same "HH:MM" comparison and todayKey as background.ts) so it first fires at its next scheduled time.
  const now = new Date();
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const today = todayKey(now);
  Object.values(state.reminders ?? {}).forEach((r) => {
    r.nativeIds = [];
    if (typeof r.time === 'string' && hm >= r.time) r.lastFiredOn = today;
  });
  state.timers = {};
}

export interface ImportResult {
  mode: 'merge' | 'replace';
  added: number;
  updated: number;
  media: number;
  warnings: string[];
  source: 'export' | 'legacy';
  /** Prototype backups only: items already on this device (from an earlier import), so not added twice. */
  duplicates?: number;
  /** Prototype backups only: what was added, by COUNT_LABELS key. */
  addedBy?: Record<string, number>;
}

const THEME_NAMES = ['vermilion', 'cobalt', 'plum', 'graphite'];
const APPEARANCES = ['auto', 'light', 'dark'];
/** Drop setting values this version can't use, so a damaged or older file can't leave the app without a theme. */
function cleanSettings(s: Partial<PersistedState['settings']> | undefined) {
  if (!isObj(s)) return {};
  const out = { ...s } as Record<string, unknown>;
  if (!THEME_NAMES.includes(out.theme as string)) delete out.theme;
  if (!APPEARANCES.includes(out.appearance as string)) delete out.appearance;
  if (out.reduceTransparency !== undefined && typeof out.reduceTransparency !== 'boolean') delete out.reduceTransparency;
  if (typeof out.textScale !== 'number' || !(out.textScale >= 0.9 && out.textScale <= 1.3)) delete out.textScale;
  return out as Partial<PersistedState['settings']>;
}

/**
 * Add a backup from the earlier browser prototype. Always additive: nothing on this device is replaced or removed.
 * Theme, appearance, name and Surprise Dial are applied only when `useLook` is set.
 */
function importLegacy({ conv, saved: savedIds, completed }: LegacyPlan, useLook: boolean): ImportResult {
  const s = useStore.getState();
  let duplicates = 0;
  const addedBy: Record<string, number> = {};
  const bump = (k: string) => (addedBy[k] = (addedBy[k] ?? 0) + 1);
  const sameText = (a: string, b: string) => a.trim() === b.trim();

  const entries = { ...s.entries };
  Object.values(conv.entries).forEach((e) => {
    const dup = Object.values(s.entries).some((x) => x.createdAt === e.createdAt && sameText(x.title, e.title) && sameText(x.text, e.text));
    if (dup) return void duplicates++;
    entries[e.id] = e;
    bump('entries');
  });

  // Experiences: a repeat import maps onto the copy already here, so collections, saves and completions still point at it.
  const remap = new Map<string, string>();
  const experiences = { ...s.experiences };
  Object.values(conv.experiences).forEach((x) => {
    const dup = Object.values(s.experiences).find((y) => y.origin === 'user' && sameText(y.title, x.title) && sameText(y.summary, x.summary));
    if (dup) {
      remap.set(x.id, dup.id);
      duplicates++;
      return;
    }
    experiences[x.id] = x;
    bump('experiences');
  });
  const mapped = (id: string) => remap.get(id) ?? id;

  const capsules = { ...s.capsules };
  const now = Date.now();
  Object.values(conv.capsules).forEach((c) => {
    const dup = Object.values(s.capsules).some((y) => y.opensAt === c.opensAt && sameText(y.text, c.text));
    if (dup) return void duplicates++;
    // Capsules whose date has already passed are simply ready to open; don't fire a burst of notifications for old ones.
    capsules[c.id] = new Date(c.opensAt).getTime() <= now ? { ...c, notified: true } : c;
    bump('capsules');
  });

  const collections = { ...s.collections };
  Object.values(conv.collections).forEach((c) => {
    const items = c.items.map((r) => (r.kind === 'experience' ? { ...r, id: mapped(r.id) } : r));
    const dup = Object.values(s.collections).find((y) => sameText(y.name, c.name) && y.description === c.description);
    if (dup) {
      duplicates++;
      const merged = [...dup.items];
      items.forEach((r) => !merged.some((x) => x.kind === r.kind && x.id === r.id) && merged.push(r));
      collections[dup.id] = { ...dup, items: merged };
      return;
    }
    collections[c.id] = { ...c, items };
    bump('collections');
  });

  // Saves and completions of the prototype's custom experiences (now experiences you made here).
  const saved = [...s.saved];
  savedIds.map(mapped).forEach((id) => {
    if (saved.includes(id)) return void duplicates++;
    saved.push(id);
    bump('saved');
  });
  const completions = { ...s.completions };
  completed.forEach(({ id, at }) => {
    const eid = mapped(id);
    if (Object.values(s.completions).some((c) => c.ref.kind === 'experience' && c.ref.id === eid)) return void duplicates++;
    const cid = uid('c-');
    completions[cid] = { id: cid, ref: { kind: 'experience', id: eid }, at: at ?? nowISO() };
    bump('completions');
  });

  useStore.setState({ entries, experiences, capsules, collections, saved, completions });
  if (useLook) {
    if (conv.settings.theme || conv.settings.appearance) s.setSettings({ ...conv.settings });
    if (conv.prefs.name || conv.prefs.comfort) s.setPrefs({ ...conv.prefs });
  }
  const added = Object.values(addedBy).reduce((a, b) => a + b, 0);
  return { mode: 'merge', added, updated: 0, media: 0, warnings: [], source: 'legacy', duplicates, addedBy };
}

/**
 * Import an export file (or a backup from the earlier prototype, which is always added, never replacing anything).
 *  • replace — this device's data is replaced by the file (settings and preferences included).
 *  • merge — items from the file are added; when the same item exists in both, the more recently
 *    updated copy is kept. Your current preferences and settings are kept.
 */
export async function importData(json: string, opts: { mode: 'merge' | 'replace'; useLook?: boolean }): Promise<ImportResult> {
  const parsed = parseJSON(json);
  // A prototype backup is always added (merge), whatever mode was asked for.
  const legacyFile = asLegacy(parsed);
  if (legacyFile) return importLegacy(planLegacy(legacyFile), !!opts.useLook);
  const { file, warnings } = parseExport(json, parsed);
  const incoming = structuredClone(file.state) as Partial<PersistedState>;
  sanitize(incoming);
  const store = useStore.getState();
  let added = 0;
  let updated = 0;

  if (opts.mode === 'replace') {
    // Cancel this device's scheduled notifications before replacing what they belong to.
    await cancelAllScheduled();
    const base = initialState();
    const next: PersistedState = {
      ...base,
      ...incoming,
      prefs: { ...base.prefs, ...(incoming.prefs ?? {}) },
      settings: {
        ...base.settings,
        ...cleanSettings(incoming.settings),
        notifications: { ...base.settings.notifications, ...(incoming.settings?.notifications ?? {}) },
        privacy: { ...base.settings.privacy, ...(incoming.settings?.privacy ?? {}) },
      },
      feedback: { ...base.feedback, ...(incoming.feedback ?? {}) },
      version: base.version,
      timers: {},
    } as PersistedState;
    ENTITY_KEYS.forEach((k) => {
      if (!isObj(next[k])) (next as unknown as Record<string, unknown>)[k] = {};
      added += Object.keys(next[k]).length;
    });
    store.replaceAll(next);
    try {
      await blobs.clear();
    } catch {
      warnings.push('Old media files on this device could not be cleared.');
    }
  } else {
    const patch: Partial<PersistedState> = {};
    ENTITY_KEYS.forEach((k) => {
      if (k === 'timers') return;
      const cur = store[k] as Record<string, unknown>;
      const inc = (incoming[k] ?? {}) as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...cur };
      Object.entries(inc).forEach(([id, item]) => {
        const existing = cur[id];
        if (!existing) {
          merged[id] = item;
          added++;
        } else if (k === 'collections') {
          // Union of items so nothing filed on either device is lost.
          const a = existing as { items: Ref[] };
          const b = item as { items: Ref[] };
          const items = [...a.items];
          (b.items ?? []).forEach((r) => {
            if (!items.some((x) => x.kind === r.kind && x.id === r.id)) items.push(r);
          });
          if (items.length !== a.items.length) updated++;
          merged[id] = { ...a, items };
        } else if (stamp(item) > stamp(existing)) {
          merged[id] = item;
          updated++;
        }
      });
      (patch as Record<string, unknown>)[k] = merged;
    });
    patch.saved = [...new Set([...store.saved, ...(Array.isArray(incoming.saved) ? incoming.saved : [])])];
    const visited = { ...store.visited };
    Object.entries(incoming.visited ?? {}).forEach(([key, at]) => {
      if (typeof at === 'string' && (!visited[key] || at > visited[key])) visited[key] = at;
    });
    patch.visited = visited;
    const rp = { ...store.rabbitProgress };
    Object.entries(incoming.rabbitProgress ?? {}).forEach(([rid, p]) => {
      if (!p || !Array.isArray(p.path)) return;
      const prev = rp[rid];
      rp[rid] = prev ? { node: prev.node, path: [...new Set([...prev.path, ...p.path])] } : p;
    });
    patch.rabbitProgress = rp;
    patch.feedback = { ...store.feedback, hidden: [...new Set([...store.feedback.hidden, ...(incoming.feedback?.hidden ?? [])])] };
    if (incoming.onboarded) patch.onboarded = true;
    useStore.setState(patch);
  }

  // Media
  let media = 0;
  for (const [id, url] of Object.entries(file.media ?? {})) {
    if (typeof url !== 'string') continue;
    try {
      await blobs.put(id, await dataURLToBlob(url));
      media++;
    } catch {
      warnings.push(`A media file (${id}) could not be restored.`);
    }
  }

  // Re-schedule reminders natively on Android (no-op on web).
  for (const r of Object.values(useStore.getState().reminders)) {
    try {
      await syncReminderNative(r);
    } catch {
      /* best effort */
    }
  }
  return { mode: opts.mode, added, updated, media, warnings, source: 'export' };
}

async function cancelAllScheduled() {
  const s = useStore.getState();
  const ids: (number | undefined)[] = [];
  Object.values(s.reminders).forEach((r) => ids.push(...(r.nativeIds ?? [])));
  Object.values(s.capsules).forEach((c) => ids.push(c.nativeId));
  Object.values(s.tickets).forEach((t) => ids.push(t.nativeId));
  Object.values(s.timers).forEach((t) => ids.push(t.nativeNotificationId));
  await cancelScheduled(ids);
}

/** Permanently remove everything Elsewhere stores on this device. */
export async function deleteAllData() {
  await cancelAllScheduled();
  useStore.getState().wipe();
  const errors: string[] = [];
  try {
    await blobs.clear();
  } catch {
    errors.push('media');
  }
  try {
    await kv.set('state', snapshot());
  } catch {
    errors.push('state');
  }
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('elsewhere'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage blocked */
  }
  if (errors.length) throw new Error('Some data could not be removed from this device’s storage. Try again, or clear the app’s storage in system settings.');
}

/** Browser/WebView estimate of storage used by this app. */
export async function storageEstimate(): Promise<{ usage?: number; quota?: number; persisted?: boolean } | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const e = await navigator.storage.estimate();
    const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : undefined;
    return { usage: e.usage, quota: e.quota, persisted };
  } catch {
    return null;
  }
}

export function fmtBytes(n: number) {
  if (n < 1024) return `${n} bytes`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}
