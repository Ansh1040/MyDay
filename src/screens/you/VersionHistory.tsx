// Version History: a personal timeline of entries, finished activities, opened capsules and perspective sessions,
// plus the entry editor with revisions ("Save as new version" vs "Fix typo").
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Feather, MessageSquareQuote, Telescope, Target, Milestone, Repeat2, Package, CircleCheck, Plus, Search, Lock, Eye,
  Pencil, Trash2, FolderPlus, Hourglass, ArrowRight, ArrowDown, RefreshCcw, ChevronRight, type LucideIcon,
} from 'lucide-react';
import type { EntryKind, HistoryEntry, Ref } from '../../data/types';
import { useStore } from '../../store/store';
import { navigate, back, useRoute } from '../../lib/router';
import { uid, nowISO, fmtDate, relTime } from '../../lib/id';
import { parseLinkParam } from '../../lib/links';
import { resolveRef, KIND_LABEL } from '../../lib/refs';
import { TOPICS, topicLabel, getExperience, getRabbitHole, getSkill, getPerspective } from '../../data/catalog';
import {
  Screen, Button, IconButton, Chip, Field, Toggle, Segmented, Section, EmptyState, Sheet, toast, confirmDialog, useAutosave,
} from '../../components/ui';
import { LinkedRefs, AddToCollectionSheet } from '../../components/common';
import { useFlushOnHide } from '../create/FieldNotes';
import '../../styles/you.css';

// ---------------------------------------------------------------- shared metadata
export const ENTRY_KINDS: EntryKind[] = ['reflection', 'opinion', 'interest', 'goal', 'milestone', 'mindchange'];
export const ENTRY_META: Record<EntryKind, { label: string; plural: string; icon: LucideIcon; hint: string; placeholder: string }> = {
  reflection: { label: 'Reflection', plural: 'reflections', icon: Feather, hint: 'Something you noticed, felt or learned.', placeholder: 'What happened, and what did you notice?' },
  opinion: { label: 'Opinion', plural: 'opinions', icon: MessageSquareQuote, hint: 'What you think about something, right now.', placeholder: 'I think…' },
  interest: { label: 'Interest', plural: 'interests', icon: Telescope, hint: 'Something you’re drawn to at the moment.', placeholder: 'Lately I’m curious about…' },
  goal: { label: 'Goal', plural: 'goals', icon: Target, hint: 'Something you want to do, make or become.', placeholder: 'I want to…' },
  milestone: { label: 'Milestone', plural: 'milestones', icon: Milestone, hint: 'A moment worth marking.', placeholder: 'What happened?' },
  mindchange: { label: 'Mind change', plural: 'mind changes', icon: Repeat2, hint: 'Where your thinking moved: what you used to think, and what you think now.', placeholder: 'Now I think…' },
};
/** Kinds whose text can be revised with "Save as new version". */
export const REVISABLE: EntryKind[] = ['opinion', 'goal', 'interest', 'mindchange'];
export const MOOD_LABEL = ['', 'Very low', 'Low', 'Okay', 'Good', 'Great'] as const;

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export function listJoin(items: string[]) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
const isEntryKind = (v: string | null): v is EntryKind => !!v && (ENTRY_KINDS as string[]).includes(v);
export const entryTitle = (e: Pick<HistoryEntry, 'title' | 'text'>) => e.title.trim() || e.text.trim().slice(0, 70) || 'Untitled entry';

// ---------------------------------------------------------------- timeline model
type TLKind = EntryKind | 'capsule' | 'activity';
interface TLItem {
  key: string;
  kind: TLKind;
  at: string;
  label: string;
  title: string;
  excerpt?: string;
  text?: string;
  before?: string;
  url: string;
  private?: boolean;
  topics: string[];
  icon: LucideIcon;
  revisions?: number;
  mood?: number;
}

const FILTERS: { id: 'all' | TLKind; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'reflection', label: 'Reflections' },
  { id: 'opinion', label: 'Opinions' },
  { id: 'interest', label: 'Interests' },
  { id: 'goal', label: 'Goals' },
  { id: 'milestone', label: 'Milestones' },
  { id: 'mindchange', label: 'Mind changes' },
  { id: 'capsule', label: 'Capsules' },
  { id: 'activity', label: 'Activities' },
];

function useTimeline(): TLItem[] {
  const entries = useStore((s) => s.entries);
  const completions = useStore((s) => s.completions);
  const twists = useStore((s) => s.twists);
  const capsules = useStore((s) => s.capsules);
  const perspectives = useStore((s) => s.perspectives);
  const experiences = useStore((s) => s.experiences);
  return useMemo(() => {
    const out: TLItem[] = [];
    Object.values(entries).forEach((e) => {
      out.push({
        key: 'entry:' + e.id,
        kind: e.kind,
        at: e.createdAt,
        label: ENTRY_META[e.kind]?.label ?? 'Entry',
        title: entryTitle(e),
        excerpt: e.title.trim() ? e.text : undefined,
        text: e.text,
        before: e.kind === 'mindchange' ? e.before : undefined,
        url: `/entry/${e.id}`,
        private: e.private,
        topics: e.topics,
        icon: ENTRY_META[e.kind]?.icon ?? Feather,
        revisions: e.revisions.length,
        mood: e.mood,
      });
    });
    Object.values(completions).forEach((c) => {
      // Twists and perspective sessions have their own, richer timeline items.
      if (c.ref.kind === 'twist' && twists[c.ref.id]?.status === 'done') return;
      if (c.ref.kind === 'perspective' && Object.values(perspectives).some((p) => p.questionId === c.ref.id && p.completedAt)) return;
      const r = resolveRef(c.ref);
      const exp = c.ref.kind === 'experience' ? getExperience(c.ref.id) : undefined;
      out.push({
        key: 'completion:' + c.id,
        kind: 'activity',
        at: c.at,
        label: `Completed · ${r.kindLabel}`,
        title: r.title,
        excerpt: c.rating ? `You rated it ${c.rating} of 5.` : undefined,
        url: r.url,
        topics: exp?.topics ?? [],
        icon: CircleCheck,
      });
    });
    Object.values(twists).forEach((t) => {
      if (t.status !== 'done') return;
      out.push({
        key: 'twist:' + t.id,
        kind: 'activity',
        at: t.doneAt ?? t.createdAt,
        label: 'Plot twist · done',
        title: t.text,
        excerpt: t.reflection,
        url: `/twist?id=${t.id}`,
        topics: t.topics,
        icon: CircleCheck,
      });
    });
    Object.values(perspectives).forEach((p) => {
      if (!p.completedAt) return;
      const q = getPerspective(p.questionId);
      out.push({
        key: 'perspective:' + p.id,
        kind: 'activity',
        at: p.completedAt,
        label: 'Perspective switch · finished',
        title: q?.question ?? 'A perspective question',
        excerpt: p.changed === true ? 'You noted that your thinking changed.' : p.changed === false ? 'You noted that your view stayed the same.' : undefined,
        url: `/perspective/${p.questionId}`,
        topics: q?.topics ?? [],
        icon: CircleCheck,
      });
    });
    Object.values(capsules).forEach((c) => {
      if (!c.openedAt) return;
      out.push({
        key: 'capsule:' + c.id,
        kind: 'capsule',
        at: c.openedAt,
        label: 'Capsule opened',
        title: c.title,
        excerpt: c.response ? `On reopening: ${c.response}` : `Sealed ${fmtDate(c.sealedAt)}.`,
        url: `/capsule/${c.id}`,
        topics: [],
        icon: Package,
      });
    });
    return out.sort((a, b) => b.at.localeCompare(a.at));
    // experiences: user-made experience titles feed resolveRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, completions, twists, capsules, perspectives, experiences]);
}

const monthKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

// ---------------------------------------------------------------- patterns (literal counts only)
type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';
const DAYPART_PHRASE: Record<DayPart, string> = { morning: 'in the morning', afternoon: 'in the afternoon', evening: 'in the evening', night: 'at night' };
const dayPart = (iso: string): DayPart => {
  const h = new Date(iso).getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
};
function topCount<T extends string>(items: T[]): { value: T; count: number } | null {
  const m = new Map<T, number>();
  items.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
  let best: { value: T; count: number } | null = null;
  m.forEach((count, value) => {
    if (!best || count > best.count) best = { value, count };
  });
  return best;
}

export function computePatterns(entries: HistoryEntry[], items: TLItem[]): string[] {
  const out: string[] = [];
  if (entries.length < 3) return out;

  // 1. What you've written
  const byKind = ENTRY_KINDS.map((k) => ({ k, n: entries.filter((e) => e.kind === k).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  out.push(`You’ve written ${plural(entries.length, 'entry', 'entries')}: ${listJoin(byKind.map((x) => plural(x.n, ENTRY_META[x.k].label.toLowerCase(), ENTRY_META[x.k].plural)))}.`);

  // 2. Mind changes and their most common topic
  const mc = entries.filter((e) => e.kind === 'mindchange');
  if (mc.length) {
    const top = topCount(mc.flatMap((e) => e.topics));
    out.push(
      `You’ve recorded ${plural(mc.length, 'mind change', 'mind changes')}` +
        (top && top.count >= 2 ? `; ${top.count} ${top.count === 1 ? 'was' : 'were'} about ${topicLabel(top.value)}.` : '.'),
    );
  }

  // 3. When reflections were written
  const refl = entries.filter((e) => e.kind === 'reflection');
  if (refl.length >= 3) {
    const parts = refl.map((e) => dayPart(e.createdAt));
    const top = topCount(parts);
    if (top && top.count > refl.length / 2) {
      out.push(`Most of your reflections were written ${DAYPART_PHRASE[top.value]} (${top.count} of ${refl.length}).`);
    } else {
      const counts = (['morning', 'afternoon', 'evening', 'night'] as DayPart[])
        .map((p) => ({ p, n: parts.filter((x) => x === p).length }))
        .filter((x) => x.n > 0)
        .map((x) => `${x.n} ${DAYPART_PHRASE[x.p]}`);
      out.push(`Your reflections were written at different times of day: ${listJoin(counts)}.`);
    }
  }

  // 4. Topics explored this month (entries + activities)
  const thisMonth = monthKey(nowISO());
  const monthTopics = items.filter((i) => monthKey(i.at) === thisMonth).flatMap((i) => i.topics);
  if (monthTopics.length) {
    const m = new Map<string, number>();
    monthTopics.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1));
    const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    out.push(`Topics you explored this month: ${listJoin(sorted.map(([t, n]) => `${topicLabel(t)} (${n})`))}. Numbers are how many entries and activities had that topic.`);
  }

  // 5. Revised entries
  const revised = entries.filter((e) => e.revisions.length > 0);
  if (revised.length) {
    const most = [...revised].sort((a, b) => b.revisions.length - a.revisions.length)[0];
    out.push(
      `${plural(revised.length, 'entry has', 'entries have')} earlier versions` +
        (revised.length > 1 || most.revisions.length > 1 ? `; “${entryTitle(most)}” has the most (${plural(most.revisions.length, 'earlier version', 'earlier versions')}).` : '.'),
    );
  }

  // 6. Moods (only what was recorded)
  const moods = entries.filter((e) => e.mood);
  if (moods.length >= 3) {
    const parts = [5, 4, 3, 2, 1]
      .map((m) => ({ m, n: moods.filter((e) => e.mood === m).length }))
      .filter((x) => x.n > 0)
      .map((x) => `${x.n} “${MOOD_LABEL[x.m]}”`);
    out.push(`You added a mood to ${moods.length} of ${entries.length} entries: ${listJoin(parts)}.`);
  }

  // 7. Busiest month
  const monthKeys = entries.map((e) => monthKey(e.createdAt));
  const months = topCount(monthKeys);
  const distinctMonths = new Set(monthKeys).size;
  // Only name a busiest month when it is the single one with the most entries (no ties).
  const tied = months ? [...new Set(monthKeys)].filter((k) => monthKeys.filter((x) => x === k).length === months.count).length > 1 : false;
  if (months && distinctMonths > 1 && !tied) out.push(`The month with the most entries was ${monthLabel(months.value)} (${months.count}).`);
  return out;
}

// ---------------------------------------------------------------- revisit
const REVISIT_WINDOWS = [
  { days: 365, tol: 45, label: 'From about a year ago' },
  { days: 91, tol: 21, label: 'From about three months ago' },
  { days: 30, tol: 9, label: 'From about a month ago' },
];
function revisitCandidates(entries: HistoryEntry[], skipPrivate: boolean): { entry: HistoryEntry; label: string }[] {
  const now = Date.now();
  const pool = entries.filter((e) => !(skipPrivate && e.private));
  const out: { entry: HistoryEntry; label: string }[] = [];
  const used = new Set<string>();
  for (const w of REVISIT_WINDOWS) {
    const target = now - w.days * 864e5;
    pool
      .filter((e) => Math.abs(new Date(e.createdAt).getTime() - target) <= w.tol * 864e5)
      .sort((a, b) => Math.abs(new Date(a.createdAt).getTime() - target) - Math.abs(new Date(b.createdAt).getTime() - target))
      .forEach((e) => {
        if (!used.has(e.id)) {
          used.add(e.id);
          out.push({ entry: e, label: w.label });
        }
      });
  }
  const oldest = [...pool].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (oldest && !used.has(oldest.id) && now - new Date(oldest.createdAt).getTime() > 864e5) {
    out.push({ entry: oldest, label: `Your oldest entry · ${fmtDate(oldest.createdAt)}` });
  }
  return out;
}

function RevisitCard({ entries }: { entries: HistoryEntry[] }) {
  const blur = useStore((s) => s.settings.privacy.blurPrivate);
  const cands = useMemo(() => revisitCandidates(entries, blur), [entries, blur]);
  const [i, setI] = useState(0);
  if (!cands.length) return null;
  const { entry, label } = cands[i % cands.length];
  const revisable = REVISABLE.includes(entry.kind);
  const changed = () =>
    revisable
      ? navigate(`/entry/${entry.id}?revise=1`)
      : navigate(`/entry/new?kind=mindchange&link=entry:${encodeURIComponent(entry.id)}&title=${encodeURIComponent('Rethinking: ' + entryTitle(entry))}`);
  return (
    <section className="card tinted y-panel vh-revisit" aria-labelledby="vh-revisit-title">
      <div className="row between">
        <span className="label accent">Revisit · {label}</span>
        {cands.length > 1 && (
          <IconButton label="Show another past entry" onClick={() => setI((x) => x + 1)}>
            <RefreshCcw size={18} />
          </IconButton>
        )}
      </div>
      <div className="tiny faint" style={{ marginBottom: 4 }}>{ENTRY_META[entry.kind].label} · {fmtDate(entry.createdAt)} ({relTime(entry.createdAt)})</div>
      <h2 id="vh-revisit-title" className="display t-lg" style={{ marginBottom: 8 }}>
        <button type="button" className="vh-plain" onClick={() => navigate(`/entry/${entry.id}`)}>{entryTitle(entry)}</button>
      </h2>
      {entry.text && entry.title.trim() && <p className="vh-quote">{clip(entry.text, 220)}</p>}
      <div className="row wrap" style={{ marginTop: 14 }}>
        <Button variant="primary" size="sm" onClick={changed} icon={<Repeat2 size={16} />}>Has this changed?</Button>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/entry/${entry.id}`)}>Read it again</Button>
      </div>
      <p className="tiny muted" style={{ margin: '10px 0 0' }}>
        {revisable ? 'If it has, save a new version — your earlier wording is kept.' : 'If it has, write a mind change linked to this entry.'}
      </p>
    </section>
  );
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

// ---------------------------------------------------------------- capsules row
function CapsulesRow() {
  const capsules = useStore((s) => s.capsules);
  const { sealed, ready, next } = useMemo(() => {
    const now = Date.now();
    const sealedList = Object.values(capsules).filter((c) => !c.openedAt);
    const readyList = sealedList.filter((c) => new Date(c.opensAt).getTime() <= now);
    const upcoming = sealedList.filter((c) => new Date(c.opensAt).getTime() > now).sort((a, b) => a.opensAt.localeCompare(b.opensAt))[0];
    return { sealed: sealedList.length, ready: readyList, next: upcoming };
  }, [capsules]);
  return (
    <section className="vh-capsules" aria-label="Capsules">
      {ready.length > 0 && (
        <button type="button" className="card tinted vh-capsule-ready" onClick={() => navigate(ready.length === 1 ? `/capsule/${ready[0].id}` : '/capsules')}>
          <Package size={22} aria-hidden />
          <span className="grow">
            <span className="label accent" style={{ display: 'block' }}>Ready to open</span>
            <span className="display t-sm" style={{ display: 'block' }}>
              {ready.length === 1 ? `“${ready[0].title}”` : `${ready.length} capsules are ready`}
            </span>
          </span>
          <ChevronRight size={20} aria-hidden />
        </button>
      )}
      <div className="card y-panel row between vh-capsule-line">
        <div className="grow">
          <div className="lr-title" style={{ fontWeight: 650 }}>
            <Hourglass size={16} aria-hidden style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
            {sealed ? plural(sealed, 'sealed capsule', 'sealed capsules') : 'No sealed capsules'}
          </div>
          <div className="small muted">
            {next ? `Next opens ${fmtDate(next.opensAt)}` : sealed ? 'All sealed capsules can be opened now.' : 'Seal a prediction or message to reopen later.'}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => navigate('/capsules')}>All</Button>
        <Button size="sm" variant="soft" icon={<Plus size={16} />} onClick={() => navigate('/capsule/new')}>Seal</Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- add sheet
export function AddEntrySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Add to Version History">
      <div className="list">
        {ENTRY_KINDS.map((k) => {
          const M = ENTRY_META[k];
          return (
            <button key={k} type="button" className="list-row" onClick={() => { onClose(); navigate(`/entry/new?kind=${k}`); }}>
              <span className="lr-icon"><M.icon size={18} aria-hidden /></span>
              <span className="grow">
                <span className="lr-title" style={{ display: 'block' }}>{M.label}</span>
                <span className="lr-sub" style={{ display: 'block' }}>{M.hint}</span>
              </span>
            </button>
          );
        })}
        <button type="button" className="list-row" onClick={() => { onClose(); navigate('/capsule/new'); }}>
          <span className="lr-icon"><Package size={18} aria-hidden /></span>
          <span className="grow">
            <span className="lr-title" style={{ display: 'block' }}>Capsule</span>
            <span className="lr-sub" style={{ display: 'block' }}>Seal a prediction, opinion or message to reopen later.</span>
          </span>
        </button>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- History screen
export function HistoryScreen() {
  const entriesMap = useStore((s) => s.entries);
  const blur = useStore((s) => s.settings.privacy.blurPrivate);
  const items = useTimeline();
  const entries = useMemo(() => Object.values(entriesMap), [entriesMap]);
  const [filter, setFilter] = useState<'all' | TLKind>('all');
  const [q, setQ] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());

  const shown = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== 'all' && i.kind !== filter) return false;
      if (!ql) return true;
      if (i.private && blur && !revealed.has(i.key)) return false; // don't search hidden text
      const hay = [i.title, i.text ?? i.excerpt ?? '', i.before ?? '', i.label, ...i.topics.map(topicLabel)].join(' ').toLowerCase();
      return hay.includes(ql);
    });
  }, [items, filter, q, blur, revealed]);

  const groups = useMemo(() => {
    const m = new Map<string, TLItem[]>();
    shown.forEach((i) => {
      const k = monthKey(i.at);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(i);
    });
    return [...m.entries()];
  }, [shown]);

  const patterns = useMemo(() => computePatterns(entries, items), [entries, items]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((i) => (c[i.kind] = (c[i.kind] ?? 0) + 1));
    return c;
  }, [items]);

  return (
    <Screen
      title="Version History"
      eyebrow="You"
      backTo="/you"
      subtitle="How your thinking, interests and plans change over time."
      actions={<IconButton label="Add an entry" onClick={() => setAddOpen(true)}><Plus size={22} /></IconButton>}
    >
      {items.length === 0 ? (
        <>
          <EmptyState
            icon={<Feather size={24} />}
            title="Your timeline starts here"
            body="Write a reflection, note an opinion, or mark a goal. Finished experiences, plot twists and opened capsules will appear here too."
            action={<Button variant="primary" icon={<Plus size={18} />} onClick={() => setAddOpen(true)}>Add the first entry</Button>}
          />
          <CapsulesRow />
        </>
      ) : (
        <>
          <RevisitCard entries={entries} />
          <CapsulesRow />

          <Section title="Timeline" action={<Button size="sm" variant="secondary" icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>Add</Button>}>
            <label className="search" style={{ marginBottom: 12 }}>
              <Search size={18} aria-hidden />
              <input type="search" placeholder="Search your timeline" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search your timeline" />
            </label>
            <div className="chips scroll y-chips" role="group" aria-label="Filter by kind" style={{ marginBottom: 18 }}>
              {FILTERS.filter((f) => f.id === 'all' || counts[f.id]).map((f) => (
                <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
                  {f.label}
                  {f.id !== 'all' && <span className="vh-count">{counts[f.id]}</span>}
                </Chip>
              ))}
            </div>
            {groups.length === 0 ? (
              <EmptyState
                icon={<Search size={24} />}
                title="Nothing matches"
                body={q ? `No ${filter === 'all' ? 'items' : FILTERS.find((f) => f.id === filter)?.label.toLowerCase()} mention “${q}”.` : 'Nothing of this kind yet.'}
                action={<Button onClick={() => { setQ(''); setFilter('all'); }}>Show everything</Button>}
              />
            ) : (
              groups.map(([month, list]) => (
                <div key={month} className="vh-month">
                  <h3 className="vh-month-head on-art display t-sm">{monthLabel(month)}</h3>
                  <ol className="vh-timeline">
                    {list.map((i) => (
                      <TimelineItem
                        key={i.key}
                        item={i}
                        hidden={!!i.private && blur && !revealed.has(i.key)}
                        onReveal={() => setRevealed((s) => new Set(s).add(i.key))}
                      />
                    ))}
                  </ol>
                </div>
              ))
            )}
          </Section>

          <Section title="Patterns">
            {entries.length < 3 ? (
              <div className="card y-panel">
                <p className="muted small" style={{ margin: 0 }}>
                  Patterns appear after you’ve written at least 3 entries ({plural(entries.length, 'entry', 'entries')} so far). They’re simple counts, never guesses.
                </p>
              </div>
            ) : (
              <div className="card glass-strong vh-patterns">
                <ul>
                  {patterns.map((p) => <li key={p}>{p}</li>)}
                </ul>
                <p className="tiny faint" style={{ margin: '12px 0 0' }}>These are counts from your entries, not interpretations.</p>
              </div>
            )}
          </Section>
        </>
      )}
      <AddEntrySheet open={addOpen} onClose={() => setAddOpen(false)} />
    </Screen>
  );
}

function TimelineItem({ item: i, hidden, onReveal }: { item: TLItem; hidden: boolean; onReveal: () => void }) {
  const d = new Date(i.at);
  // The date sits inside the glass card (never directly on the artwork).
  const date = (
    <span className="vh-date">
      <span className="mono">{d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
      <span>{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
    </span>
  );
  if (hidden) {
    return (
      <li className="vh-item" data-kind={i.kind}>
        <span className="vh-dot" aria-hidden />
        <button type="button" className="card vh-card vh-blurred" onClick={onReveal} aria-label={`Private ${i.label.toLowerCase()}, ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}. Tap to reveal.`}>
          <span className="vh-card-top">
            <span className="label">{i.label} · Private</span>
            {date}
          </span>
          <span className="vh-blur-lines" aria-hidden><i /><i /><i /></span>
          <span className="row small muted" style={{ gap: 6 }}><Eye size={16} aria-hidden /> Tap to reveal</span>
        </button>
      </li>
    );
  }
  return (
    <li className="vh-item" data-kind={i.kind}>
      <span className="vh-dot" aria-hidden />
      <button type="button" className="card vh-card" onClick={() => navigate(i.url)}>
        <span className="vh-card-top">
          <span className="label row" style={{ gap: 6 }}>
            <i.icon size={13} aria-hidden /> {i.label}
            {i.private && <Lock size={12} aria-label="Private" />}
          </span>
          {date}
        </span>
        <span className="vh-title display t-sm">{i.title}</span>
        {i.kind === 'mindchange' && i.before ? (
          <span className="vh-mini-compare small">
            <span><b>Before:</b> {clip(i.before, 90)}</span>
            <span><b>Now:</b> {clip(i.text ?? '', 90) || '—'}</span>
          </span>
        ) : (
          i.excerpt && <span className="vh-excerpt small muted">{clip(i.excerpt, 160)}</span>
        )}
        {(i.revisions || i.mood || i.topics.length > 0) && (
          <span className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            {!!i.revisions && <span className="tag">{plural(i.revisions + 1, 'version', 'versions')}</span>}
            {!!i.mood && <span className="tag">Mood: {MOOD_LABEL[i.mood]}</span>}
            {i.topics.slice(0, 2).map((t) => <span key={t} className="tag">{topicLabel(t)}</span>)}
          </span>
        )}
      </button>
    </li>
  );
}

// ---------------------------------------------------------------- Entry editor
interface Form {
  kind: EntryKind;
  title: string;
  text: string;
  before: string;
  mood?: 1 | 2 | 3 | 4 | 5;
  topics: string[];
  links: Ref[];
  private: boolean;
}

const fromEntry = (e: HistoryEntry): Form => ({
  kind: e.kind, title: e.title, text: e.text, before: e.before ?? '', mood: e.mood, topics: e.topics, links: e.links, private: e.private,
});

function topicsOfRef(r: Ref | null): string[] {
  if (!r) return [];
  const s = useStore.getState();
  switch (r.kind) {
    case 'experience': return getExperience(r.id)?.topics ?? [];
    case 'rabbit': return getRabbitHole(r.id)?.topics ?? [];
    case 'rabbitNode': return getRabbitHole(r.id.split('/')[0])?.topics ?? [];
    case 'skill': return getSkill(r.id)?.topics ?? [];
    case 'entry': return s.entries[r.id]?.topics ?? [];
    case 'note': return s.notes[r.id]?.topics ?? [];
    case 'twist': return s.twists[r.id]?.topics ?? [];
    case 'perspective': return getPerspective(r.id)?.topics ?? [];
    case 'topic': return [r.id];
    default: return [];
  }
}

function newForm(query: URLSearchParams): Form {
  const kindQ = query.get('kind');
  const kind: EntryKind = isEntryKind(kindQ) ? kindQ : 'reflection';
  const link = parseLinkParam(query.get('link'));
  const linkedEntry = link?.kind === 'entry' ? useStore.getState().entries[link.id] : undefined;
  return {
    kind,
    title: query.get('title') ?? '',
    text: '',
    before: kind === 'mindchange' && linkedEntry ? linkedEntry.text : '',
    topics: [...new Set(topicsOfRef(link))].slice(0, 4),
    links: link && link.kind !== 'topic' ? [link] : [],
    private: false,
  };
}

const isEmptyForm = (f: Form) => !f.title.trim() && !f.text.trim() && !f.before.trim();
/** A mind change is only saved once “Now I think” is filled in (an empty current view isn't a change of mind). */
const missingNow = (f: Pick<Form, 'kind' | 'text'>) => f.kind === 'mindchange' && !f.text.trim();

export function EntryScreen({ id }: { id?: string }) {
  const route = useRoute();
  const isNew = !id || id === 'new';
  const [entryId] = useState(() => (isNew ? uid('e-') : (id as string)));
  const exists = useStore((s) => !!s.entries[entryId]);
  if (!isNew && !exists) {
    return (
      <Screen title="Entry" backTo="/history">
        <EmptyState
          title="This entry doesn’t exist"
          body="It may have been deleted, or it was never saved on this device."
          action={<Button variant="primary" onClick={() => navigate('/history', { replace: true })}>Open Version History</Button>}
        />
      </Screen>
    );
  }
  return <EntryEditor id={entryId} isNew={isNew} query={route.query} />;
}

function EntryEditor({ id, isNew, query }: { id: string; isNew: boolean; query: URLSearchParams }) {
  const stored = useStore((s) => s.entries[id]);
  const entries = useStore((s) => s.entries);
  const notes = useStore((s) => s.notes);
  const capsules = useStore((s) => s.capsules);
  const collections = useStore((s) => s.collections);
  const interests = useStore((s) => s.prefs.interests);
  const drafts = useStore((s) => s.drafts);
  const blurPrivate = useStore((s) => s.settings.privacy.blurPrivate);

  const [form, setForm] = useState<Form>(() => (stored ? fromEntry(stored) : newForm(query)));
  const createdAt = useRef(stored?.createdAt ?? nowISO());
  const deleted = useRef(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  // ---- autosave (direct fields) ----
  const persist = useCallback(
    (f: Form) => {
      if (deleted.current) return false;
      if (missingNow(f)) return false;
      const s = useStore.getState();
      const cur = s.entries[id];
      if (!cur && (!isNew || isEmptyForm(f))) return false;
      const next: HistoryEntry = {
        id,
        kind: f.kind,
        title: f.title.trim(),
        text: f.text,
        before: f.before.trim() ? f.before : undefined,
        revisions: cur?.revisions ?? [],
        topics: f.topics,
        links: f.links,
        mood: f.mood,
        private: f.private,
        createdAt: cur?.createdAt ?? createdAt.current,
        updatedAt: nowISO(),
      };
      s.upsert('entries', next);
      return true;
    },
    [id, isNew],
  );
  const latest = useRef(form);
  latest.current = form;
  const lastSaved = useRef(JSON.stringify(form));
  const dirty = useRef(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'blocked'>('idle');
  const [nowError, setNowError] = useState(false);
  const nowRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const json = JSON.stringify(form);
    if (json === lastSaved.current) return;
    if (missingNow(form)) {
      // Nothing is saved until “Now I think” has text; the last saved version (if any) stays as it was.
      dirty.current = false;
      setStatus('blocked');
      return;
    }
    setNowError(false);
    dirty.current = true;
    setStatus('saving');
    const t = setTimeout(() => {
      persist(latest.current);
      lastSaved.current = JSON.stringify(latest.current);
      dirty.current = false;
      setStatus('saved');
    }, 500);
    return () => clearTimeout(t);
  }, [form, persist]);
  useEffect(
    () => () => {
      if (dirty.current) persist(latest.current);
    },
    [persist],
  );
  // A reload or app close doesn't unmount, so save a pending edit when the page is hidden too.
  useFlushOnHide(() => {
    if (!dirty.current) return;
    persist(latest.current);
    lastSaved.current = JSON.stringify(latest.current);
    dirty.current = false;
  });
  /** Save now. Returns false (and shows the inline message) when a mind change has no “Now I think” yet. */
  const flush = () => {
    if (missingNow(latest.current) && !(isEmptyForm(latest.current) && !stored)) {
      setNowError(true);
      nowRef.current?.focus();
      return false;
    }
    persist(latest.current);
    lastSaved.current = JSON.stringify(latest.current);
    dirty.current = false;
    return true;
  };

  // ---- revising (Save as new version / Fix typo) ----
  const [startedNew] = useState(isNew);
  const revisable = REVISABLE.includes(form.kind) && !startedNew && !!stored;
  const reviseKey = `entry-revise:${id}`;
  const [revising, setRevising] = useState(() => revisable && query.get('revise') === '1');
  const [rev, setRev] = useState<{ text: string; note: string; mode: 'version' | 'typo' }>(() => {
    const d = drafts[reviseKey]?.data as { text?: string; note?: string; mode?: 'version' | 'typo' } | undefined;
    return { text: d?.text ?? stored?.text ?? '', note: d?.note ?? '', mode: d?.mode ?? 'version' };
  });
  const restoredDraft = useRef(!!drafts[reviseKey]);
  const reviseStatus = useAutosave(revising ? rev : null, (v) => {
    if (!v) return;
    const st = useStore.getState();
    // Only keep a draft when something actually differs from the saved text.
    if (v.text !== st.entries[id]?.text || v.note.trim()) st.saveDraft(reviseKey, v);
    else if (st.drafts[reviseKey]) st.clearDraft(reviseKey);
  });
  const startRevise = () => {
    const d = useStore.getState().drafts[reviseKey]?.data as typeof rev | undefined;
    restoredDraft.current = !!d;
    setRev(d ?? { text: form.text, note: '', mode: 'version' });
    setRevising(true);
  };
  const cancelRevise = async () => {
    if (rev.text !== form.text && !(await confirmDialog({ title: 'Discard this edit?', body: 'Your unsaved wording will be lost.', confirmLabel: 'Discard', danger: true }))) return;
    useStore.getState().clearDraft(reviseKey);
    setRevising(false);
  };
  const saveRevision = () => {
    const s = useStore.getState();
    const cur = s.entries[id];
    if (!cur || missingNow({ kind: form.kind, text: rev.text })) return;
    if (rev.text === cur.text) {
      s.clearDraft(reviseKey);
      setRevising(false);
      return;
    }
    if (rev.mode === 'version') {
      s.patch('entries', id, {
        text: rev.text,
        revisions: [...cur.revisions, { text: cur.text, at: nowISO(), ...(rev.note.trim() ? { note: rev.note.trim() } : {}) }],
        updatedAt: nowISO(),
      });
      toast('Saved as a new version. The earlier wording is in this entry’s history.');
    } else {
      s.patch('entries', id, { text: rev.text, updatedAt: nowISO() });
      toast('Text updated');
    }
    // Keep the form in sync without triggering another autosave.
    const nextForm = { ...latest.current, text: rev.text };
    lastSaved.current = JSON.stringify(nextForm);
    setForm(nextForm);
    s.clearDraft(reviseKey);
    setRevising(false);
  };

  // ---- connections ----
  const incoming = useMemo(() => {
    const out: { ref: Ref; how: string }[] = [];
    const isMe = (r: Ref) => r.kind === 'entry' && r.id === id;
    Object.values(entries).forEach((e) => e.id !== id && e.links.some(isMe) && out.push({ ref: { kind: 'entry', id: e.id }, how: 'links here' }));
    Object.values(notes).forEach((n) => n.links.some(isMe) && out.push({ ref: { kind: 'note', id: n.id }, how: 'links here' }));
    Object.values(capsules).forEach((c) => c.links.some(isMe) && out.push({ ref: { kind: 'capsule', id: c.id }, how: 'follow-up capsule' }));
    Object.values(collections).forEach((c) => c.items.some(isMe) && out.push({ ref: { kind: 'collection', id: c.id }, how: 'contains this entry' }));
    return out;
  }, [entries, notes, capsules, collections, id]);
  const [colOpen, setColOpen] = useState(false);
  const [moreTopics, setMoreTopics] = useState(false);

  const del = async () => {
    const ok = await confirmDialog({
      title: 'Delete this entry?',
      body: 'It will be removed from Version History, your collections and any links on this device. Earlier versions are deleted too. This can’t be undone.',
      confirmLabel: 'Delete entry',
      danger: true,
    });
    if (!ok) return;
    deleted.current = true;
    const s = useStore.getState();
    const me: Ref = { kind: 'entry', id };
    const drop = (r: Ref) => !(r.kind === 'entry' && r.id === id);
    Object.values(s.collections).forEach((c) => c.items.some((r) => !drop(r)) && s.removeFromCollection(c.id, me));
    Object.values(s.entries).forEach((e) => e.links.some((r) => !drop(r)) && s.patch('entries', e.id, { links: e.links.filter(drop) }));
    Object.values(s.notes).forEach((n) => n.links.some((r) => !drop(r)) && s.patch('notes', n.id, { links: n.links.filter(drop) }));
    Object.values(s.capsules).forEach((c) => c.links.some((r) => !drop(r)) && s.patch('capsules', c.id, { links: c.links.filter(drop) }));
    s.remove('entries', id);
    s.clearDraft(reviseKey);
    toast('Entry deleted');
    back('/history');
  };

  const M = ENTRY_META[form.kind];
  const exists = !!stored;
  const revMissingNow = revising && missingNow({ kind: form.kind, text: rev.text });
  const showNowMsg = missingNow(form) && (nowError || (status === 'blocked' && (!!stored || !isEmptyForm(form))));
  const statusText = status === 'blocked' && missingNow(form)
    ? stored ? 'Changes not saved yet — write what you think now.' : 'Not saved yet — write what you think now.'
    : !stored
    ? 'Starts saving as soon as you write something.'
    : status === 'saving'
      ? 'Saving…'
      : `Saved on this device · ${relTime(stored.updatedAt)}`;
  const topicChoices = moreTopics ? TOPICS.map((t) => t.id) : [...new Set([...form.topics, ...interests])];

  // ---- text blocks ----
  const nowMsgId = `now-msg-${id}`;
  const nowMsg = (
    <p id={nowMsgId} className="small vh-invalid" role="alert">
      Write what you think now. A mind change is saved once “Now I think” is filled in.
    </p>
  );
  const textEditor = (label: string) => (
    <div className="stack sm">
      <Field label={label}>
        <textarea
          ref={form.kind === 'mindchange' ? nowRef : undefined}
          className="textarea"
          value={form.text}
          onChange={(e) => set('text', e.target.value)}
          placeholder={M.placeholder}
          rows={6}
          aria-invalid={form.kind === 'mindchange' && showNowMsg ? true : undefined}
          aria-describedby={form.kind === 'mindchange' && showNowMsg ? nowMsgId : undefined}
          aria-required={form.kind === 'mindchange' ? true : undefined}
        />
      </Field>
      {form.kind === 'mindchange' && showNowMsg && nowMsg}
    </div>
  );
  const reviseBlock = (label: string) =>
    revising ? (
      <div className="card vh-revise stack" role="group" aria-label={`Edit: ${label}`}>
        {restoredDraft.current && <div className="banner">Restored your unsaved edit from earlier.</div>}
        <Field label={label}>
          <textarea
            className="textarea"
            value={rev.text}
            onChange={(e) => setRev((r) => ({ ...r, text: e.target.value }))}
            rows={6}
            autoFocus
            aria-invalid={revMissingNow ? true : undefined}
            aria-describedby={revMissingNow ? nowMsgId : undefined}
          />
        </Field>
        {revMissingNow && nowMsg}
        <Segmented
          label="How to save this change"
          value={rev.mode}
          onChange={(mode) => setRev((r) => ({ ...r, mode }))}
          options={[{ value: 'version', label: 'Save as new version' }, { value: 'typo', label: 'Fix typo' }]}
        />
        <p className="small muted" style={{ margin: 0 }}>
          {rev.mode === 'version'
            ? 'Your thinking moved: the current wording is kept in this entry’s history with today’s date.'
            : 'Just a correction: the text is overwritten and no earlier version is kept.'}
        </p>
        {rev.mode === 'version' && (
          <Field label="Why did it change? (optional)">
            <input className="input" value={rev.note} onChange={(e) => setRev((r) => ({ ...r, note: e.target.value }))} placeholder="e.g. After the sound-hunting walk…" />
          </Field>
        )}
        <div className="row">
          <Button className="grow" onClick={cancelRevise}>Cancel</Button>
          <Button className="grow" variant="primary" onClick={saveRevision} disabled={rev.text === form.text || revMissingNow}>Save</Button>
        </div>
        <span className="tiny faint" aria-live="polite">{reviseStatus === 'saved' ? 'Edit draft kept on this device' : ' '}</span>
      </div>
    ) : (
      <div className="vh-current">
        <div className="label" style={{ marginBottom: 6 }}>{label}</div>
        <p className="prose" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{form.text || <span className="faint">Nothing written yet.</span>}</p>
        <Button size="sm" variant="soft" icon={<Pencil size={15} />} onClick={startRevise} style={{ marginTop: 12 }}>
          {form.text ? 'Revise' : 'Write'}
        </Button>
      </div>
    );

  return (
    <Screen
      title={isNew && !exists ? `New ${M.label.toLowerCase()}` : M.label}
      eyebrow="Version History"
      backTo="/history"
      subtitle={<span className="small">{statusText}</span>}
    >
      <div className="stack lg">
        <div role="radiogroup" aria-label="Kind of entry" className="chips scroll y-chips">
          {ENTRY_KINDS.map((k) => {
            const KM = ENTRY_META[k];
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={form.kind === k}
                className="chip"
                onClick={() => set('kind', k)}
              >
                <KM.icon size={14} aria-hidden /> {KM.label}
              </button>
            );
          })}
        </div>

        <div className="card y-panel stack vh-editor">
          <p className="small muted" style={{ margin: 0 }}>{M.hint}</p>

          <Field label="Title">
            <input className="input vh-title-input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="A few words to find it later" />
          </Field>

          {form.kind === 'mindchange' ? (
            <div className="vh-compare" role="group" aria-label="Earlier and current thinking">
              <div className="vh-compare-col">
                <Field label="I used to think">
                  <textarea className="textarea" value={form.before} onChange={(e) => set('before', e.target.value)} placeholder="What you thought before" rows={5} />
                </Field>
              </div>
              <div className="vh-compare-arrow" aria-hidden><ArrowRight size={20} className="h" /><ArrowDown size={20} className="v" /></div>
              <div className="vh-compare-col">{revisable ? reviseBlock('Now I think') : textEditor('Now I think')}</div>
            </div>
          ) : revisable ? (
            reviseBlock('What you wrote')
          ) : (
            textEditor(form.kind === 'milestone' ? 'What happened' : 'Your words')
          )}
        </div>

        <div className="card y-panel stack vh-meta">
          <div>
            <div className="field-label" id="mood-label">Mood <span className="faint">(optional)</span></div>
            <div className="chips y-chips" role="radiogroup" aria-labelledby="mood-label">
              <button type="button" role="radio" aria-checked={!form.mood} className="chip" onClick={() => set('mood', undefined)}>None</button>
              {([1, 2, 3, 4, 5] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={form.mood === m} className="chip" onClick={() => set('mood', form.mood === m ? undefined : m)}>
                  {MOOD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="field-label" id="topics-label">Topics</div>
            <div className="chips y-chips" role="group" aria-labelledby="topics-label">
              {topicChoices.map((t) => (
                <Chip key={t} active={form.topics.includes(t)} onClick={() => set('topics', form.topics.includes(t) ? form.topics.filter((x) => x !== t) : [...form.topics, t])}>
                  {topicLabel(t)}
                </Chip>
              ))}
              <Chip onClick={() => setMoreTopics((v) => !v)}>{moreTopics ? 'Fewer topics' : 'All topics…'}</Chip>
            </div>
          </div>

          <div>
            <div className="field-label">Connected to</div>
            <LinkedRefs value={form.links} onChange={(links) => set('links', links)} />
          </div>
        </div>

        <div className="card y-panel row between vh-toggle-row">
          <div className="grow">
            <div style={{ fontWeight: 600 }}><Lock size={15} aria-hidden style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />Private</div>
            <div className="small muted">Blurred in lists when “Blur private entries” is on, and left out of exports when you choose.</div>
          </div>
          <Toggle label="Private entry" checked={form.private} onChange={(v) => set('private', v)} />
        </div>

        {stored && stored.revisions.length > 0 && <RevisionHistory entry={stored} />}

        {exists && (
          <Section title="Connections" style={{ marginTop: 8 }}>
            <div className="card y-panel stack">
              {incoming.length > 0 ? (
                <div className="list">
                  {incoming.map(({ ref, how }) => {
                    const r = resolveRef(ref);
                    return (
                      <button key={ref.kind + ref.id} type="button" className="list-row" onClick={() => navigate(r.url)}>
                        <span className="grow">
                          <span className="lr-title" style={{ display: 'block' }}>{r.private && blurPrivate ? `Private ${KIND_LABEL[ref.kind].toLowerCase()}` : r.title}</span>
                          <span className="lr-sub">{r.kindLabel} · {how}</span>
                        </span>
                        <ChevronRight size={18} aria-hidden />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="small muted" style={{ margin: 0 }}>Nothing else links to this entry yet. Use “Connect” above to link experiences, notes or skills.</p>
              )}
              <div className="row wrap">
                <Button size="sm" variant="soft" icon={<Hourglass size={15} />} onClick={() => { if (flush()) navigate(`/capsule/new?kind=prediction&link=entry:${encodeURIComponent(id)}`); }}>
                  Seal a follow-up capsule
                </Button>
                <Button size="sm" icon={<FolderPlus size={15} />} onClick={() => setColOpen(true)}>Add to collection</Button>
              </div>
            </div>
          </Section>
        )}

        <div className="card y-panel stack sm vh-footer" style={{ marginTop: 8 }}>
          <div className="row">
            {exists && <Button variant="danger" icon={<Trash2 size={16} />} onClick={del}>Delete</Button>}
            <span className="grow" />
            <Button variant="primary" onClick={() => { if (flush()) back('/history'); }}>Done</Button>
          </div>
          <p className="tiny faint" style={{ margin: 0 }}>Created {fmtDate(createdAt.current)}. Everything here stays on this device.</p>
        </div>
      </div>
      <AddToCollectionSheet open={colOpen} onClose={() => setColOpen(false)} target={exists ? { kind: 'entry', id } : null} />
    </Screen>
  );
}

function RevisionHistory({ entry }: { entry: HistoryEntry }) {
  const revs = entry.revisions;
  const first = revs[0];
  // Version n was current from (previous change or creation) until revs[n].at.
  const versions = revs.map((r, i) => ({ ...r, from: i === 0 ? entry.createdAt : revs[i - 1].at, n: i + 1 }));
  return (
    <Section title="Earlier versions" style={{ marginTop: 8 }}>
      <div className="card y-panel vh-history">
        <div className="vh-compare static" role="group" aria-label="Earliest and current version">
          <div className="vh-compare-col glass-inner vh-col-before">
            <div className="label">Earliest · {fmtDate(entry.createdAt)}</div>
            <p className="vh-quote" style={{ whiteSpace: 'pre-wrap' }}>{first.text || '—'}</p>
          </div>
          <div className="vh-compare-arrow" aria-hidden><ArrowRight size={20} className="h" /><ArrowDown size={20} className="v" /></div>
          <div className="vh-compare-col glass-inner vh-col-now">
            <div className="label accent">Current · since {fmtDate(revs[revs.length - 1].at)}</div>
            <p className="vh-quote" style={{ whiteSpace: 'pre-wrap' }}>{entry.text || '—'}</p>
          </div>
        </div>
        <ol className="vh-revs">
          {versions.map((v) => (
            <li key={v.at + v.n}>
              <div className="small" style={{ fontWeight: 650 }}>Version {v.n} <span className="faint">· {fmtDate(v.from)} – {fmtDate(v.at)}</span></div>
              <p className="small muted" style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>{v.text || '—'}</p>
              {v.note && <p className="tiny" style={{ margin: 0 }}><span className="faint">Why it changed:</span> {v.note}</p>}
            </li>
          ))}
          <li className="current">
            <div className="small" style={{ fontWeight: 650 }}>Version {revs.length + 1} · current <span className="faint">· since {fmtDate(revs[revs.length - 1].at)}</span></div>
            <p className="small" style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>{entry.text || '—'}</p>
          </li>
        </ol>
      </div>
    </Section>
  );
}
