// Shared domain components used across tabs.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bookmark, BookmarkCheck, Clock, FolderPlus, Pause, Play, Plus, RotateCcw, Search, Timer, X, Zap, Check, Link2 } from 'lucide-react';
import type { Experience, Ref, RefKind } from '../data/types';
import { useStore } from '../store/store';
import { navigate } from '../lib/router';
import { formatMeta } from '../formats/meta';
import { topicLabel, allExperiences, RABBIT_HOLES, SKILLS } from '../data/catalog';
import { Button, Chip, Field, IconButton, Sheet, toast } from './ui';
import { addTime, ensureTimer, pauseTimer, refUrl, remaining, resetTimer, startTimer, useNow } from '../lib/timers';
import { fmtDuration, uid, nowISO } from '../lib/id';
import { resolveRef, KIND_LABEL } from '../lib/refs';
import { GlassArt } from './GlassArt';

export const ENERGY_LABEL = ['', 'Low energy', 'Medium energy', 'High energy'];
export const COMFORT_LABEL = ['', 'Familiar', 'Gentle stretch', 'Curious', 'Bold', 'Adventurous'];
export const COST_LABEL = ['Free', 'Low cost', 'Some cost'];

/** "15 min · Low energy · Experiment" */
export function MetaLine({ e, showFormat = true }: { e: Pick<Experience, 'minutes' | 'energy' | 'format'>; showFormat?: boolean }) {
  const F = formatMeta(e.format);
  return (
    <span className="row small muted" style={{ gap: 8, flexWrap: 'wrap' }}>
      {showFormat && (
        <span className="row" style={{ gap: 5 }}>
          <F.icon size={14} aria-hidden /> {F.label}
        </span>
      )}
      <span className="row" style={{ gap: 4 }}>
        <Clock size={14} aria-hidden /> {e.minutes} min
      </span>
      <span className="row" style={{ gap: 4 }}>
        <Zap size={14} aria-hidden /> {ENERGY_LABEL[e.energy]}
      </span>
    </span>
  );
}

export function TopicTags({ topics, max = 3 }: { topics: string[]; max?: number }) {
  return (
    <span className="row wrap" style={{ gap: 6 }}>
      {topics.slice(0, max).map((t) => (
        <span key={t} className="tag">{topicLabel(t)}</span>
      ))}
    </span>
  );
}

/** Origin label so users know where a suggestion came from. */
export function OriginTag({ origin }: { origin: Experience['origin'] }) {
  const map = { curated: 'Curated', user: 'Made by you', remix: 'Remix · template-generated', shared: 'Shared with you' } as const;
  return <span className="tag">{map[origin]}</span>;
}

/** Standard experience card. `variant` gives the feed its varied editorial layouts. */
export function ExperienceCard({ e, variant = 'standard', reason, footer }: { e: Experience; variant?: 'standard' | 'feature' | 'compact' | 'inverse'; reason?: string; footer?: ReactNode }) {
  const saved = useStore((s) => s.saved.includes(e.id));
  const done = useStore((s) => Object.values(s.completions).some((c) => c.ref.kind === 'experience' && c.ref.id === e.id));
  const toggleSave = useStore((s) => s.toggleSave);
  const F = formatMeta(e.format);
  const open = () => navigate(`/x/${e.id}`);
  const cls = variant === 'inverse' ? 'card inverse' : variant === 'feature' ? 'card tinted' : 'card';
  return (
    <article className={cls + ' exp-card exp-card-' + variant} style={variant === 'compact' ? { padding: 14 } : undefined}>
      {variant !== 'compact' && <GlassArt seed={e.id} format={e.format} size={variant === 'feature' ? 132 : 76} className="card-art" />}
      <button className="card-tap" onClick={open} aria-label={`${e.title}. ${F.label}, ${e.minutes} minutes`} style={{ background: 'none', border: 0, padding: 0 }}>
        <div className="row between" style={{ marginBottom: variant === 'compact' ? 6 : 10 }}>
          <span className="label accent row" style={{ gap: 6 }}>
            <F.icon size={14} aria-hidden /> {F.label}
          </span>
          {done && <span className="tag"><Check size={12} aria-hidden /> Done</span>}
        </div>
        <h3 className={'display ' + (variant === 'feature' ? 't-lg' : variant === 'compact' ? 't-sm' : 't-md')} style={{ marginBottom: 6 }}>{e.title}</h3>
        {variant !== 'compact' && <p className="muted" style={{ margin: '0 0 12px' }}>{e.summary}</p>}
        <MetaLine e={e} showFormat={false} />
      </button>
      {(reason || variant !== 'compact') && (
        <div className="row between" style={{ marginTop: 10, gap: 8 }}>
          <span className="tiny faint grow" style={{ minWidth: 0 }}>{reason}</span>
          <IconButton label={saved ? 'Remove from saved' : 'Save'} className={saved ? 'accent' : ''} onClick={() => { toggleSave(e.id); toast(saved ? 'Removed from saved' : 'Saved'); }}>
            {saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
          </IconButton>
        </div>
      )}
      {footer}
    </article>
  );
}

/** Sheet to add any Ref to a collection, or create a new collection. */
export function AddToCollectionSheet({ open, onClose, target }: { open: boolean; onClose: () => void; target: Ref | null }) {
  const collections = useStore((s) => s.collections);
  const add = useStore((s) => s.addToCollection);
  const remove = useStore((s) => s.removeFromCollection);
  const upsert = useStore((s) => s.upsert);
  const [name, setName] = useState('');
  if (!target) return null;
  const list = Object.values(collections).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const has = (cid: string) => collections[cid].items.some((r) => r.kind === target.kind && r.id === target.id);
  return (
    <Sheet open={open} onClose={onClose} title="Add to collection">
      <div className="list" style={{ marginBottom: 16 }}>
        {list.map((c) => (
          <button key={c.id} className="list-row" onClick={() => { if (has(c.id)) { remove(c.id, target); toast(`Removed from “${c.name}”`); } else { add(c.id, target); toast(`Added to “${c.name}”`); } }}>
            <span className="lr-icon"><FolderPlus size={18} /></span>
            <span className="grow">
              <span className="lr-title" style={{ display: 'block' }}>{c.name}</span>
              <span className="lr-sub">{c.items.length} item{c.items.length === 1 ? '' : 's'}</span>
            </span>
            {has(c.id) && <Check size={20} aria-label="In collection" />}
          </button>
        ))}
      </div>
      <form className="row" onSubmit={(ev) => { ev.preventDefault(); if (!name.trim()) return; const id = uid('col-'); upsert('collections', { id, name: name.trim(), description: '', items: [target], createdAt: nowISO() }); setName(''); toast(`Created “${name.trim()}”`); }}>
        <input className="input grow" placeholder="New collection name" value={name} onChange={(e) => setName(e.target.value)} aria-label="New collection name" />
        <Button variant="primary" type="submit" disabled={!name.trim()} icon={<Plus size={18} />}>Create</Button>
      </form>
    </Sheet>
  );
}

/** Pick links to other things (experiences, skills, rabbit holes, notes, entries, quests…). */
export function LinkPicker({ open, onClose, value, onChange, kinds, exclude }: { open: boolean; onClose: () => void; value: Ref[]; onChange: (refs: Ref[]) => void; kinds?: RefKind[]; exclude?: Ref }) {
  const s = useStore();
  const [q, setQ] = useState('');
  const options = useMemo(() => {
    const out: Ref[] = [];
    allExperiences().forEach((e) => out.push({ kind: 'experience', id: e.id }));
    RABBIT_HOLES.forEach((r) => out.push({ kind: 'rabbit', id: r.id }));
    SKILLS.forEach((k) => out.push({ kind: 'skill', id: k.id }));
    Object.keys(s.notes).forEach((id) => out.push({ kind: 'note', id }));
    Object.keys(s.entries).forEach((id) => out.push({ kind: 'entry', id }));
    Object.keys(s.quests).forEach((id) => out.push({ kind: 'quest', id }));
    Object.keys(s.twists).filter((id) => s.twists[id].status !== 'offered').forEach((id) => out.push({ kind: 'twist', id }));
    Object.keys(s.capsules).forEach((id) => out.push({ kind: 'capsule', id }));
    return out.filter((r) => (!kinds || kinds.includes(r.kind)) && !(exclude && r.kind === exclude.kind && r.id === exclude.id)).map(resolveRef);
  }, [s.notes, s.entries, s.quests, s.twists, s.capsules, kinds, s.experiences, exclude?.kind, exclude?.id]);
  const ql = q.trim().toLowerCase();
  const shown = (ql ? options.filter((o) => o.title.toLowerCase().includes(ql) || o.kindLabel.toLowerCase().includes(ql)) : options).slice(0, 60);
  const isOn = (r: Ref) => value.some((v) => v.kind === r.kind && v.id === r.id);
  const toggle = (r: Ref) => onChange(isOn(r) ? value.filter((v) => !(v.kind === r.kind && v.id === r.id)) : [...value, r]);
  return (
    <Sheet open={open} onClose={onClose} title="Connect to…">
      <label className="search" style={{ marginBottom: 12 }}>
        <Search size={18} aria-hidden />
        <input placeholder="Search experiences, skills, notes…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search things to connect" />
      </label>
      <div className="list" style={{ maxHeight: '55dvh', overflow: 'auto' }}>
        {shown.map((o) => (
          <button key={o.ref.kind + o.ref.id} className="list-row" onClick={() => toggle(o.ref)} aria-pressed={isOn(o.ref)}>
            <span className="grow">
              <span className="lr-title" style={{ display: 'block' }}>{o.title}</span>
              <span className="lr-sub">{o.kindLabel}</span>
            </span>
            {isOn(o.ref) && <Check size={20} aria-hidden />}
          </button>
        ))}
        {!shown.length && <div className="list-row muted">Nothing matches “{q}”.</div>}
      </div>
      <Button variant="primary" block style={{ marginTop: 16 }} onClick={onClose}>Done</Button>
    </Sheet>
  );
}

/** Shows connected refs as removable tags + an "Connect" button that opens LinkPicker. */
export function LinkedRefs({ value, onChange, kinds, readOnly, exclude }: { value: Ref[]; onChange?: (r: Ref[]) => void; kinds?: RefKind[]; readOnly?: boolean; exclude?: Ref }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="stack sm">
      <div className="row wrap" style={{ gap: 8 }}>
        {value.map((r) => {
          const x = resolveRef(r);
          return (
            <span key={r.kind + r.id} className="chip" style={{ paddingRight: readOnly ? 14 : 4 }}>
              <button type="button" onClick={() => navigate(x.url)} style={{ background: 'none', border: 0, padding: 0, color: 'inherit', fontWeight: 600 }} title={KIND_LABEL[r.kind]}>
                {x.title.length > 36 ? x.title.slice(0, 34) + '…' : x.title}
              </button>
              {!readOnly && (
                <button type="button" className="icon-btn" style={{ width: 40, height: 40 }} aria-label={`Remove link to ${x.title}`} onClick={() => onChange?.(value.filter((v) => v !== r))}>
                  <X size={14} />
                </button>
              )}
            </span>
          );
        })}
        {!readOnly && (
          <Chip onClick={() => setOpen(true)} icon={<Link2 size={14} />}>Connect</Chip>
        )}
      </div>
      {!readOnly && <LinkPicker open={open} onClose={() => setOpen(false)} value={value} onChange={(r) => onChange?.(r)} kinds={kinds} exclude={exclude} />}
    </div>
  );
}

/** Timer control for any activity. Accurate across navigation/backgrounding (timestamp-based). */
export function TimerControl({ id, label, minutes, refTo, compact }: { id: string; label: string; minutes: number; refTo?: Ref; compact?: boolean }) {
  const t = useStore((s) => s.timers[id]);
  const now = useNow(t?.status === 'running');
  useEffect(() => { ensureTimer(id, label, minutes, refTo); }, [id, label, minutes]);
  const rem = t ? remaining(t, now) : minutes * 60000;
  const total = t?.durationMs ?? minutes * 60000;
  const status = t?.status ?? 'idle';
  return (
    <div className={compact ? 'row' : 'card'} style={compact ? { gap: 8 } : { display: 'flex', alignItems: 'center', gap: 14 }} aria-label={`Timer: ${label}`}>
      {!compact && (
        <div className="lr-icon" style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
          <Timer size={22} aria-hidden />
        </div>
      )}
      <div className="grow">
        <div className="mono" style={{ fontSize: compact ? '1.1rem' : '1.6rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }} role="timer" aria-live={status === 'done' ? 'assertive' : 'off'}>
          {status === 'done' ? 'Done' : fmtDuration(rem)}
        </div>
        {!compact && (
          <div className="progress" style={{ marginTop: 6 }} aria-hidden>
            <i style={{ width: `${(1 - rem / total) * 100}%` }} />
          </div>
        )}
      </div>
      {status === 'running' ? (
        <IconButton label="Pause timer" className="filled" onClick={() => pauseTimer(id)}><Pause size={20} /></IconButton>
      ) : (
        <IconButton label={status === 'paused' ? 'Resume timer' : status === 'done' ? 'Restart timer' : 'Start timer'} className="filled" onClick={() => { if (!t) ensureTimer(id, label, minutes, refTo); startTimer(id); }}>
          <Play size={20} />
        </IconButton>
      )}
      {status !== 'idle' && (
        <>
          <IconButton label="Add one minute" onClick={() => addTime(id, 1)}><Plus size={18} /></IconButton>
          {/* Reset also drops any added minutes, back to this activity's own length. */}
          <IconButton label="Reset timer" onClick={() => { resetTimer(id); ensureTimer(id, label, minutes, refTo); }}><RotateCcw size={18} /></IconButton>
        </>
      )}
    </div>
  );
}

/** Floating pill showing running timers anywhere in the app. */
export function TimerDock() {
  const timers = useStore((s) => s.timers);
  const running = Object.values(timers).filter((t) => t.status !== 'idle').sort((a, b) => (a.status === 'running' ? -1 : 1) - (b.status === 'running' ? -1 : 1)).slice(0, 1);
  const now = useNow(running.some((t) => t.status === 'running'), 500);
  if (!running.length) return null;
  const t = running[0];
  return (
    <>
      {/* Extra scroll room so the end of the page can still be scrolled clear of the floating pill. */}
      <div aria-hidden style={{ height: 56, flexShrink: 0 }} />
      <div className="timer-dock">
        <div className="timer-pill">
          <Timer size={16} aria-hidden />
          <button onClick={() => t.ref && navigate(refUrl(t.ref))} style={{ background: 'none', border: 0, color: 'inherit', textAlign: 'left', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span className="small" style={{ fontWeight: 600 }}>{t.label}</span>
          </button>
          <span className="mono" style={{ fontWeight: 700 }}>{t.status === 'done' ? 'Done' : fmtDuration(remaining(t, now))}</span>
          {t.status === 'running' ? (
            <IconButton label="Pause timer" onClick={() => pauseTimer(t.id)}><Pause size={18} /></IconButton>
          ) : t.status === 'paused' ? (
            <IconButton label="Resume timer" onClick={() => startTimer(t.id)}><Play size={18} /></IconButton>
          ) : (
            <IconButton label="Dismiss timer" onClick={() => resetTimer(t.id)}><X size={18} /></IconButton>
          )}
        </div>
      </div>
    </>
  );
}
