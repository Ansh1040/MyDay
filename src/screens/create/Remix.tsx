// Remix Studio — pick a source, pick a transformation, preview a template-generated draft, then edit or start it.
import { useEffect, useMemo, useState } from 'react';
import { Check, Clock, Hourglass, Pencil, Play, RefreshCw, Search, Shuffle, Zap } from 'lucide-react';
import type { DebatePayload, Experience, QuizPayload, RabbitHole, Ref, Skill, StepsPayload, WritingPayload } from '../../data/types';
import { useStore } from '../../store/store';
import { navigate, useRoute } from '../../lib/router';
import { parseLinkParam, linkParam } from '../../lib/links';
import { REMIX_DISCLAIMER, remix, remixOptions, remixSource, type RemixTransform } from '../../lib/remix';
import { formatMeta } from '../../formats/meta';
import { RABBIT_HOLES, SKILLS, topicLabel } from '../../data/catalog';
import { Button, Chip, EmptyState, Section, Screen, toast } from '../../components/ui';
import { ENERGY_LABEL } from '../../components/common';
import '../../styles/create.css';

interface Candidate { ref: Ref; title: string; sub: string }
type Group = 'recent' | 'notes' | 'entries' | 'rabbit' | 'skills' | 'twists';
const GROUP_LABEL: Record<Group, string> = {
  recent: 'Recently completed', notes: 'Field notes', entries: 'Version History', rabbit: 'Rabbit holes', skills: 'Skills', twists: 'Plot twists',
};

function useCandidates(): Record<Group, Candidate[]> {
  const completions = useStore((s) => s.completions);
  const notes = useStore((s) => s.notes);
  const entries = useStore((s) => s.entries);
  const visited = useStore((s) => s.visited);
  const twists = useStore((s) => s.twists);
  const experiences = useStore((s) => s.experiences);
  const blurPrivate = useStore((s) => s.settings.privacy.blurPrivate);
  return useMemo(() => {
    const toCand = (ref: Ref, fallbackSub?: string): Candidate | null => {
      const src = remixSource(ref);
      if (!src) return null;
      return { ref, title: src.title, sub: fallbackSub ?? src.kindLabel };
    };
    const compact = (xs: (Candidate | null)[]) => xs.filter((x): x is Candidate => !!x);

    const seen = new Set<string>();
    const recent = compact(
      Object.values(completions)
        .sort((a, b) => b.at.localeCompare(a.at))
        .filter((c) => {
          const k = c.ref.kind + ':' + c.ref.id;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .slice(0, 12)
        .map((c) => toCand(c.ref, c.ref.kind === 'experience' ? `${formatMeta(remixSource(c.ref)?.format ?? 'steps').label} · completed` : undefined)),
    ).slice(0, 8);

    const noteC = Object.values(notes)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 8)
      .map((n) => (n.private && blurPrivate ? { ref: { kind: 'note' as const, id: n.id }, title: 'Private note', sub: 'Field note · private' } : toCand({ kind: 'note', id: n.id })));

    const entryC = Object.values(entries)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 8)
      .map((e) => (e.private && blurPrivate ? { ref: { kind: 'entry' as const, id: e.id }, title: 'Private entry', sub: 'Version History · private' } : toCand({ kind: 'entry', id: e.id })));

    const nodeVisits = Object.entries(visited)
      .filter(([k]) => k.startsWith('rabbit:') && k.split(':').length >= 3)
      .sort((a, b) => b[1].localeCompare(a[1]))
      .slice(0, 8)
      .map(([k]) => {
        const [, rid, nid] = k.split(':');
        return toCand({ kind: 'rabbitNode', id: `${rid}/${nid}` }, 'Rabbit-hole idea you visited');
      });
    const rabbit = compact(nodeVisits).length ? nodeVisits : RABBIT_HOLES.map((r: RabbitHole) => toCand({ kind: 'rabbit', id: r.id }));

    const skills = SKILLS.map((k: Skill) => toCand({ kind: 'skill', id: k.id }));
    const tw = Object.values(twists)
      .filter((t) => t.status === 'accepted' || t.status === 'done')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
      .map((t) => toCand({ kind: 'twist', id: t.id }, t.status === 'done' ? 'Plot twist · done' : 'Plot twist · accepted'));

    return { recent, notes: compact(noteC), entries: compact(entryC), rabbit: compact(rabbit), skills: compact(skills), twists: compact(tw) };
    // experiences: user-made experiences can be completion sources, so recompute when they change.
  }, [completions, notes, entries, visited, twists, experiences, blurPrivate]);
}

function SourcePicker({ onPick }: { onPick: (r: Ref) => void }) {
  const groups = useCandidates();
  const [group, setGroup] = useState<Group | 'all'>('all');
  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  const keys = (Object.keys(groups) as Group[]).filter((g) => groups[g].length);
  const shownKeys = group === 'all' ? keys : keys.filter((k) => k === group);
  const filter = (xs: Candidate[]) => (ql ? xs.filter((c) => c.title.toLowerCase().includes(ql) || c.sub.toLowerCase().includes(ql)) : xs);
  const total = shownKeys.reduce((n, k) => n + filter(groups[k]).length, 0);
  return (
    <div className="stack">
      <label className="search">
        <Search size={18} aria-hidden />
        <input type="search" placeholder="Find something to remix" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search sources" />
      </label>
      <div className="chips scroll cr-chips" role="group" aria-label="Source type">
        <Chip active={group === 'all'} onClick={() => setGroup('all')}>All</Chip>
        {keys.map((k) => (
          <Chip key={k} active={group === k} onClick={() => setGroup(group === k ? 'all' : k)}>{GROUP_LABEL[k]}</Chip>
        ))}
      </div>
      {total === 0 && <p className="small on-art cr-caption" style={{ margin: 0, alignSelf: 'flex-start' }}>Nothing matches “{q}”.</p>}
      {shownKeys.map((k) => {
        const items = filter(groups[k]).slice(0, group === 'all' && !ql ? 4 : 12);
        if (!items.length) return null;
        return (
          <div key={k}>
            <h3 className="label on-art cr-art-label" style={{ margin: '8px 0 8px' }}>{GROUP_LABEL[k]}</h3>
            <div className="list">
              {items.map((c) => (
                <button key={c.ref.kind + c.ref.id} type="button" className="list-row" onClick={() => onPick(c.ref)}>
                  <span className="grow">
                    <span className="lr-title" style={{ display: 'block' }}>{c.title}</span>
                    <span className="lr-sub">{c.sub}</span>
                  </span>
                  <Shuffle size={18} aria-hidden className="faint" />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Read-only rendering of a draft experience's content. */
function DraftPreview({ e }: { e: Experience }) {
  const F = formatMeta(e.format);
  const p = e.payload as Partial<StepsPayload & QuizPayload & WritingPayload & DebatePayload>;
  return (
    <article className="card glass-strong cr-preview">
      <div className="row between cr-preview-head" style={{ gap: 8 }}>
        <span className="label accent row" style={{ gap: 6 }}><F.icon size={14} aria-hidden /> {F.label}</span>
        <span className="tag">Template-generated</span>
      </div>
      <h3 className="display t-lg" style={{ margin: '10px 0 8px' }}>{e.title}</h3>
      <p className="muted" style={{ margin: '0 0 10px' }}>{e.summary}</p>
      <span className="row small muted wrap" style={{ gap: 10 }}>
        <span className="row" style={{ gap: 4 }}><Clock size={14} aria-hidden /> {e.minutes} min</span>
        <span className="row" style={{ gap: 4 }}><Zap size={14} aria-hidden /> {ENERGY_LABEL[e.energy]}</span>
        {e.social === 'shared' && <span>For two or more</span>}
        {e.topics.slice(0, 3).map((t) => <span key={t} className="tag">{topicLabel(t)}</span>)}
      </span>

      <hr className="divider" />
      {Array.isArray(p.steps) && (
        <ol className="cr-preview-steps">
          {p.steps.map((s) => (
            <li key={s.id}>
              <strong>{s.title}</strong>
              {s.timerMinutes ? <span className="tag" style={{ marginLeft: 8 }}><Hourglass size={12} aria-hidden /> {s.timerMinutes} min</span> : null}
              <p className="small muted" style={{ margin: '4px 0 0', whiteSpace: 'pre-line' }}>{s.body}</p>
              {s.input === 'choice' && s.choices?.length ? <p className="tiny faint" style={{ margin: '4px 0 0' }}>Choices: {s.choices.join(' · ')}</p> : null}
            </li>
          ))}
        </ol>
      )}
      {Array.isArray(p.questions) && (
        <>
          <ol className="cr-preview-steps">
            {p.questions.map((q) => (
              <li key={q.id}>
                <strong>{q.prompt}</strong>
                <p className="small muted" style={{ margin: '4px 0 0' }}>{q.options.join(' · ')}</p>
              </li>
            ))}
          </ol>
          <p className="tiny faint" style={{ margin: 0 }}>Poll questions — there are no right answers.</p>
        </>
      )}
      {typeof p.prompt === 'string' && (
        <div>
          <p className="cr-quote">{p.prompt}</p>
          {p.minWords ? <p className="small muted">Aim for about {p.minWords} words.</p> : null}
          {p.hints?.length ? (
            <ul className="small muted" style={{ paddingLeft: 18, margin: '8px 0 0' }}>
              {p.hints.map((h) => <li key={h}>{h}</li>)}
            </ul>
          ) : null}
        </div>
      )}
      {typeof p.question === 'string' && Array.isArray(p.sides) && (
        <div>
          <p className="cr-quote">{p.question}</p>
          <div className="stack sm">
            {p.sides.map((s) => (
              <div key={s.label}>
                <strong className="small">{s.label}</strong>
                <p className="small muted" style={{ margin: '2px 0 0' }}>{s.argument}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {e.followUps?.length ? (
        <>
          <hr className="divider" />
          <h4 className="label" style={{ margin: '0 0 6px' }}>Afterwards</h4>
          <ul className="small muted" style={{ paddingLeft: 18, margin: 0 }}>
            {e.followUps.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </>
      ) : null}
    </article>
  );
}

export function RemixScreen() {
  const route = useRoute();
  const fromParam = route.query.get('from');
  const [source, setSource] = useState<Ref | null>(() => parseLinkParam(fromParam));
  const [transform, setTransform] = useState<RemixTransform | null>(null);
  const [variant, setVariant] = useState(0);

  // Follow ?from= if it changes while this screen is open (an unusable one falls back to the picker).
  useEffect(() => {
    setSource(parseLinkParam(fromParam));
  }, [fromParam]);

  const info = useMemo(() => (source ? remixSource(source) : null), [source]);
  const options = useMemo(() => (source && info ? remixOptions(source) : []), [source, info]);
  // Warn about an unusable ?from= only until something else has been picked.
  const fromRef = parseLinkParam(fromParam);
  const invalidFrom = !!fromParam && !info && (fromRef ? source?.kind === fromRef.kind && source.id === fromRef.id : !source);

  useEffect(() => {
    setVariant(0);
    setTransform(options.length === 1 ? options[0].id : null);
  }, [options]);

  const draft = useMemo(() => {
    if (!source || !transform || !info) return null;
    try {
      return remix(source, transform, variant);
    } catch {
      return null;
    }
  }, [source, transform, variant, info]);

  const keep = (then: 'edit' | 'start') => {
    if (!draft) return;
    useStore.getState().upsert('experiences', { ...draft, createdAt: new Date().toISOString() });
    toast(then === 'edit' ? 'Remix saved to your creations' : 'Remix saved — starting it now');
    navigate(then === 'edit' ? `/builder/${draft.id}` : `/x/${draft.id}`);
  };

  return (
    <Screen title="Remix Studio" eyebrow="Create" backTo="/create" subtitle={REMIX_DISCLAIMER}>
      {invalidFrom && (
        <div className="banner warn" role="status" style={{ marginBottom: 12 }}>
          That item can’t be remixed — it may have been deleted, or it’s a kind of thing remixes don’t support. Pick something else below.
        </div>
      )}

      <Section title="1 · Start from">
        {source && info ? (
          <div className="card cr-source">
            <div className="label accent">{info.kindLabel}</div>
            <h2 className="display t-md" style={{ margin: '6px 0 4px' }}>{info.title}</h2>
            {info.text && info.text !== info.title && <p className="small muted cr-clamp" style={{ margin: 0 }}>{info.text}</p>}
            <Button size="sm" variant="ghost" style={{ marginTop: 8, marginLeft: -14 }} onClick={() => { setSource(null); setTransform(null); }}>
              Choose something else
            </Button>
          </div>
        ) : (
          <SourcePicker onPick={(r) => setSource(r)} />
        )}
      </Section>

      {source && info && (
        <Section title="2 · Turn it into">
          {options.length === 0 ? (
            <EmptyState title="No remixes for this yet" body="Try a field note, an experience, a skill or a rabbit-hole idea." />
          ) : (
            <div className="stack sm" role="radiogroup" aria-label="Transformation">
              {options.map((o) => {
                const F = formatMeta(o.format);
                const on = transform === o.id;
                return (
                  <button key={o.id} type="button" role="radio" aria-checked={on} className="cr-option glass" onClick={() => { setTransform(o.id); setVariant(0); }}>
                    <span className="cr-option-icon" aria-hidden><F.icon size={20} /></span>
                    <span className="grow">
                      <span className="cr-option-title">{o.label}</span>
                      <span className="cr-option-desc">{o.description}</span>
                    </span>
                    {on && <Check size={20} aria-hidden className="cr-accent" />}
                  </button>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {draft && source && (
        <Section
          title="3 · Preview"
          action={
            <Button size="sm" variant="secondary" icon={<RefreshCw size={16} aria-hidden />} onClick={() => setVariant((v) => v + 1)}>
              Another phrasing
            </Button>
          }
        >
          <DraftPreview e={draft} />
          <div className="card cr-actions">
            <p className="tiny faint" style={{ margin: 0 }}>
              Template-generated from “{info?.title}”. Nothing is saved until you choose below.
            </p>
            <div className="row wrap" style={{ marginTop: 12 }}>
              <Button className="grow" variant="primary" icon={<Pencil size={18} aria-hidden />} onClick={() => keep('edit')}>Edit in Builder</Button>
              <Button className="grow" icon={<Play size={18} aria-hidden />} onClick={() => keep('start')}>Start now</Button>
            </div>
            {transform === 'letter' && (
              <Button block variant="ghost" style={{ marginTop: 8 }} onClick={() => navigate(`/capsule/new?kind=message&link=${linkParam(source)}`)}>
                Or write it straight into a sealed capsule
              </Button>
            )}
          </div>
        </Section>
      )}
    </Screen>
  );
}
