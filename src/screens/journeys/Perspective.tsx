// Perspective Switch: say where you stand, walk through other lenses, then record whether anything moved.
// In-progress sessions autosave to the store, so leaving and returning resumes the flow.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, FolderPlus, History, RotateCcw, Scale } from 'lucide-react';
import type { HistoryEntry, PerspectiveQuestion, PerspectiveSession } from '../../data/types';
import { useStore } from '../../store/store';
import { PERSPECTIVES, getPerspective } from '../../data/catalog';
import { navigate, useRoute } from '../../lib/router';
import { Button, EmptyState, Progress, Screen, Section, Segmented, Tag, toast } from '../../components/ui';
import { TopicTags } from '../../components/common';
import { fmtDate, nowISO, relTime, uid } from '../../lib/id';
import '../../styles/journeys.css';

const STANCES = ['Strongly no', 'Leaning no', 'Unsure', 'Leaning yes', 'Strongly yes'];
export const stanceLabel = (v: number) => STANCES[Math.max(-2, Math.min(2, Math.round(v))) + 2];
const CHANGED_COL = 'col-changed';

function sessionsFor(all: Record<string, PerspectiveSession>, qid: string) {
  return Object.values(all).filter((p) => p.questionId === qid).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---------------------------------------------------------------- list
export function PerspectivesScreen() {
  const all = useStore((s) => s.perspectives);
  const { inProgress, done } = useMemo(() => {
    const list = Object.values(all);
    return {
      inProgress: list.filter((p) => !p.completedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      done: list.filter((p) => p.completedAt).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    };
  }, [all]);

  return (
    <Screen title="Perspective Switch" eyebrow="Journeys" backTo="/journeys" subtitle="Pick a question, say where you stand, look through other lenses — then see whether anything moved.">
      {!!inProgress.length && (
        <Section title="Continue">
          <div className="list">
            {inProgress.map((p) => {
              const q = getPerspective(p.questionId);
              if (!q) return null;
              const answered = q.lenses.filter((l) => p.responses[l.id]?.trim()).length;
              return (
                <button key={p.id} type="button" className="list-row" onClick={() => navigate(`/perspective/${q.id}`)}>
                  <span className="lr-icon"><Scale size={18} aria-hidden /></span>
                  <span className="grow">
                    <span className="lr-title" style={{ display: 'block' }}>{q.question}</span>
                    <span className="lr-sub">{answered} of {q.lenses.length} lenses · started {relTime(p.createdAt)}</span>
                  </span>
                  <ChevronRight size={18} aria-hidden className="faint" />
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Questions" action={<span className="on-art tiny muted">Curated</span>}>
        {PERSPECTIVES.length ? (
          <div className="stack">
            {PERSPECTIVES.map((q: PerspectiveQuestion, i: number) => {
              const finished = done.filter((p) => p.questionId === q.id);
              return (
                <button key={q.id} type="button" className={'card card-tap j-pq' + (i === 0 ? ' tinted' : '')} onClick={() => navigate(`/perspective/${q.id}`)}>
                  <div className="label accent">{q.lenses.length} lenses</div>
                  <h2 className={'display ' + (i === 0 ? 't-lg' : 't-md')} style={{ margin: '6px 0 10px' }}>{q.question}</h2>
                  <div className="row between wrap">
                    <TopicTags topics={q.topics} />
                    {!!finished.length && <span className="tiny muted">Done {finished.length}× · last {fmtDate(finished[0].completedAt!)}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<Scale size={24} />} title="No questions available" body="The question catalog couldn’t be loaded." />
        )}
      </Section>

      <Section title="Past sessions">
        {done.length ? (
          <div className="list">
            {done.map((p) => {
              const q = getPerspective(p.questionId);
              const moved = p.after && p.after.stance !== p.before.stance;
              return (
                <button key={p.id} type="button" className="list-row" onClick={() => navigate(`/perspective/${p.questionId}?session=${p.id}`)}>
                  <span className="grow">
                    <span className="lr-title" style={{ display: 'block' }}>{q?.question ?? 'A question no longer in the catalog'}</span>
                    <span className="lr-sub">
                      {fmtDate(p.completedAt!)} · {p.after ? (moved ? `${stanceLabel(p.before.stance)} → ${stanceLabel(p.after.stance)}` : `Held at ${stanceLabel(p.before.stance)}`) : 'Finished'}
                      {p.changed ? ' · thinking changed' : ''}
                    </span>
                  </span>
                  <ChevronRight size={18} aria-hidden className="faint" />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="glass glass-strong j-note small">Finished sessions appear here with your before and after stance.</p>
        )}
      </Section>
    </Screen>
  );
}

// ---------------------------------------------------------------- one question
export function PerspectiveScreen({ id }: { id: string }) {
  const q = getPerspective(id);
  if (!q) {
    return (
      <Screen title="Perspective Switch" backTo="/perspectives">
        <EmptyState icon={<Scale size={24} />} title="Question not found" body="It may have been removed from the catalog." action={<Button variant="primary" onClick={() => navigate('/perspectives', { replace: true })}>All questions</Button>} />
      </Screen>
    );
  }
  return <Flow q={q} />;
}

function resumeStep(s: PerspectiveSession | undefined, q: PerspectiveQuestion): number {
  const n = q.lenses.length;
  if (!s) return 0;
  if (s.completedAt) return n + 2;
  if (s.after) return n + 1;
  const answered = q.lenses.map((l) => !!s.responses[l.id]?.trim());
  if (!answered.some(Boolean)) return s.before.text.trim() ? 1 : 0;
  const first = answered.indexOf(false);
  return first === -1 ? n + 1 : first + 1;
}

function Flow({ q }: { q: PerspectiveQuestion }) {
  const route = useRoute();
  const all = useStore((s) => s.perspectives);
  const entries = useStore((s) => s.entries);
  const collections = useStore((s) => s.collections);
  const upsert = useStore((s) => s.upsert);
  const sessions = useMemo(() => sessionsFor(all, q.id), [all, q.id]);
  const requested = route.query.get('session');
  const [currentId, setCurrentId] = useState<string | undefined>(() => {
    if (requested && all[requested]?.questionId === q.id) return requested;
    return (sessions.find((p) => !p.completedAt) ?? sessions[0])?.id;
  });
  const session = currentId ? all[currentId] : undefined;
  const n = q.lenses.length;
  const [step, setStep] = useState(() => resumeStep(session, q));
  const [pending, setPending] = useState({ stance: 0, text: '' });
  const [thinking, setThinking] = useState<'yes' | 'no' | null>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  // Bumped when I open another session from the list, so focus moves even if the step number stays the same.
  const [opened, setOpened] = useState(0);
  const viewKey = `${step}|${opened}`;
  const lastView = useRef(viewKey);

  // Move to the top and focus the new card's heading when the step changes — not when the session is first
  // created by typing or moving the slider (that would steal focus mid-keystroke).
  useEffect(() => {
    if (lastView.current === viewKey) return;
    lastView.current = viewKey;
    window.scrollTo({ top: 0 });
    headRef.current?.focus({ preventScroll: true });
  }, [viewKey]);

  const editable = session && !session.completedAt ? session : undefined;
  const before = editable?.before ?? pending;
  const after = editable?.after ?? { stance: before.stance, text: '' };
  const stanceMoved = after.stance !== before.stance;
  const changed = thinking ? thinking === 'yes' : stanceMoved;

  /** Get the in-progress session, creating it on first change (autosave). */
  const ensure = (): PerspectiveSession => {
    if (editable) return editable;
    const s: PerspectiveSession = { id: uid('ps-'), questionId: q.id, before: { ...pending }, responses: {}, createdAt: nowISO() };
    upsert('perspectives', s);
    setCurrentId(s.id);
    return s;
  };
  const update = (fields: Partial<PerspectiveSession>) => {
    const s = ensure();
    upsert('perspectives', { ...s, ...fields });
  };
  // The session is created on the first change, so even a half-finished stance is kept.
  const setBefore = (b: { stance: number; text: string }) => {
    if (!editable) setPending(b);
    update({ before: b });
  };

  const finish = () => {
    const s = ensure();
    const at = nowISO();
    upsert('perspectives', { ...s, after, changed, completedAt: at });
    setStep(n + 2);
    toast('Session saved');
  };

  const startAgain = () => {
    setCurrentId(undefined);
    setPending({ stance: 0, text: '' });
    setThinking(null);
    setStep(0);
    navigate(`/perspective/${q.id}`, { replace: true });
  };

  // Swipe between lens cards (visible buttons too).
  const sw = useRef({ x: 0, y: 0, ok: false });
  const swipe = {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      sw.current = { x: t.clientX, y: t.clientY, ok: t.clientX > 28 && !(e.target as HTMLElement).closest('textarea,input') };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!sw.current.ok) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - sw.current.x;
      const dy = t.clientY - sw.current.y;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0 && step <= n) setStep(step + 1);
      if (dx > 0 && step > 0) setStep(step - 1);
    },
  };

  const total = n + 2; // before + lenses + after
  const showFlow = step <= n + 1;

  return (
    <Screen title="Perspective Switch" eyebrow="Perspective Switch" backTo="/perspectives" hideLargeTitle>
      <header className="glass glass-strong j-panel j-ps-head">
        <div className="label accent">Perspective Switch · curated question</div>
        <h1 className="display t-xl" style={{ margin: '8px 0 12px' }}>{q.question}</h1>
        <TopicTags topics={q.topics} />

        {showFlow && (
          <div className="j-flow-progress">
            <Progress value={(step + 1) / total} label={`Step ${step + 1} of ${total}`} />
            <span className="tiny muted" aria-live="polite">Step {step + 1} of {total}{editable ? ' · autosaved' : ''}</span>
          </div>
        )}
      </header>

      {step === 0 && (
        <section className="card j-step-card rise" aria-labelledby="ps-head">
          <div className="label">Before</div>
          <h2 id="ps-head" ref={headRef} tabIndex={-1} className="display t-md" style={{ margin: '6px 0 14px' }}>Where do you stand right now?</h2>
          <Stance id="before" value={before.stance} onChange={(v) => setBefore({ ...before, stance: v })} />
          <label className="field" style={{ marginTop: 16 }}>
            <span>Why? (optional)</span>
            <textarea className="textarea" value={before.text} onChange={(e) => setBefore({ ...before, text: e.target.value })} placeholder="A sentence or two about your first instinct" />
          </label>
          <div className="row" style={{ marginTop: 16 }}>
            <span className="grow" />
            <Button variant="primary" onClick={() => { ensure(); setStep(1); }}>
              {n ? 'See the first lens' : 'Continue'} <ArrowRight size={18} aria-hidden />
            </Button>
          </div>
        </section>
      )}

      {step >= 1 && step <= n && (() => {
        const lens = q.lenses[step - 1];
        return (
          <section key={lens.id} className="card j-step-card j-swipe rise" aria-labelledby="ps-head" {...swipe}>
            <div className="label">Lens {step} of {n}</div>
            <h2 id="ps-head" ref={headRef} tabIndex={-1} className="display t-lg" style={{ margin: '6px 0 10px' }}>{lens.name}</h2>
            <p className="prose" style={{ margin: '0 0 16px' }}>{lens.take}</p>
            <label className="field">
              <span className="j-lens-prompt">{lens.prompt}</span>
              <textarea className="textarea" value={editable?.responses[lens.id] ?? ''} onChange={(e) => update({ responses: { ...(editable?.responses ?? {}), [lens.id]: e.target.value } })} placeholder="Your response (optional)" />
            </label>
            <div className="row between" style={{ marginTop: 16 }}>
              <Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => setStep(step - 1)}>Back</Button>
              <Button variant="primary" onClick={() => setStep(step + 1)}>
                {step === n ? 'Where do you stand now?' : 'Next lens'} <ArrowRight size={18} aria-hidden />
              </Button>
            </div>
            <p className="tiny faint" style={{ margin: '10px 0 0', textAlign: 'center' }}>Swipe sideways to move between lenses.</p>
          </section>
        );
      })()}

      {step === n + 1 && (
        <section className="card j-step-card rise" aria-labelledby="ps-head">
          <div className="label">After</div>
          <h2 id="ps-head" ref={headRef} tabIndex={-1} className="display t-md" style={{ margin: '6px 0 6px' }}>Where do you stand now?</h2>
          <p className="small muted" style={{ margin: '0 0 14px' }}>Before, you said: <strong>{stanceLabel(before.stance)}</strong>{before.text ? ` — “${before.text}”` : ''}</p>
          <Stance id="after" value={after.stance} onChange={(v) => update({ after: { ...after, stance: v } })} />
          <label className="field" style={{ marginTop: 16 }}>
            <span>Why, now? (optional)</span>
            <textarea className="textarea" value={after.text} onChange={(e) => update({ after: { ...after, text: e.target.value } })} placeholder="What you think after looking through the lenses" />
          </label>
          <div className="field" style={{ marginTop: 16 }}>
            <span id="ps-changed">Did your thinking change?</span>
            <Segmented
              label="Did your thinking change?"
              value={thinking ?? (stanceMoved ? 'yes' : 'no')}
              options={[{ value: 'no', label: 'Not really' }, { value: 'yes', label: 'Yes, it moved' }]}
              onChange={(v) => setThinking(v)}
            />
            <small className="faint">{stanceMoved ? 'Your stance number moved.' : 'Your stance number is the same — thinking can still shift in the details.'}</small>
          </div>
          <div className="row between" style={{ marginTop: 16 }}>
            <Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => setStep(step - 1)}>Back</Button>
            <Button variant="primary" icon={<Check size={18} />} onClick={finish}>Finish</Button>
          </div>
        </section>
      )}

      {step === n + 2 && session?.completedAt && (
        <Summary q={q} s={session} entries={entries} nextDoneAt={sessions.map((p) => p.completedAt).filter((at): at is string => !!at && at > session.completedAt!).sort()[0]} hasChangedCol={!!collections[CHANGED_COL]} inChangedCol={!!collections[CHANGED_COL]?.items.some((r) => r.kind === 'perspective' && r.id === q.id)} headRef={headRef} onAgain={startAgain} />
      )}

      {sessions.filter((p) => p.completedAt && p.id !== session?.id).length > 0 && (
        <Section title="Earlier sessions">
          <div className="list">
            {sessions.filter((p) => p.completedAt && p.id !== session?.id).map((p) => (
              <button key={p.id} type="button" className="list-row" onClick={() => { setCurrentId(p.id); setStep(n + 2); setOpened((x) => x + 1); }}>
                <span className="grow">
                  <span className="lr-title" style={{ display: 'block' }}>{fmtDate(p.completedAt!)}</span>
                  <span className="lr-sub">{stanceLabel(p.before.stance)} → {p.after ? stanceLabel(p.after.stance) : '—'}{p.changed ? ' · thinking changed' : ''}</span>
                </span>
                <ChevronRight size={18} aria-hidden className="faint" />
              </button>
            ))}
          </div>
        </Section>
      )}
    </Screen>
  );
}

function Stance({ id, value, onChange }: { id: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="j-stance">
      <div className="row between">
        <label htmlFor={`stance-${id}`} className="small" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Your stance</label>
        <output htmlFor={`stance-${id}`} className="display t-sm j-stance-value">{stanceLabel(value)}</output>
      </div>
      <input
        id={`stance-${id}`}
        type="range"
        className="range"
        min={-2}
        max={2}
        step={1}
        value={value}
        aria-valuetext={stanceLabel(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="j-stance-ticks" aria-hidden>
        {STANCES.map((s, i) => (
          <button key={s} type="button" tabIndex={-1} className={i - 2 === value ? 'on' : ''} onClick={() => onChange(i - 2)}>{s}</button>
        ))}
      </div>
    </div>
  );
}

/** Version History entry recorded from a session; derived from the session id so each session links to its own entry. */
const entryIdFor = (s: PerspectiveSession) => `e-${s.id}`;

function Summary({ q, s, entries, nextDoneAt, hasChangedCol, inChangedCol, headRef, onAgain }: {
  q: PerspectiveQuestion; s: PerspectiveSession; entries: Record<string, HistoryEntry>; nextDoneAt?: string; hasChangedCol: boolean; inChangedCol: boolean;
  headRef: React.RefObject<HTMLHeadingElement | null>; onAgain: () => void;
}) {
  const upsert = useStore((st) => st.upsert);
  const addToCollection = useStore((st) => st.addToCollection);
  const after = s.after ?? { stance: s.before.stance, text: '' };
  const moved = after.stance !== s.before.stance;
  // Entries recorded before session-linked ids: only count one made between this session and the next finished one.
  const recorded =
    entries[entryIdFor(s)] ??
    Object.values(entries).find(
      (e) =>
        !e.id.startsWith('e-ps-') &&
        e.links.some((l) => l.kind === 'perspective' && l.id === q.id) &&
        !!s.completedAt && e.createdAt >= s.completedAt && (!nextDoneAt || e.createdAt < nextDoneAt),
    );

  const record = () => {
    const at = nowISO();
    const beforeText = s.before.text.trim() ? `${stanceLabel(s.before.stance)} — ${s.before.text.trim()}` : stanceLabel(s.before.stance);
    const afterText = after.text.trim() ? `${stanceLabel(after.stance)} — ${after.text.trim()}` : stanceLabel(after.stance);
    const entry: HistoryEntry = {
      id: entryIdFor(s),
      kind: s.changed ? 'mindchange' : 'opinion',
      title: q.question,
      text: afterText,
      before: s.changed ? beforeText : undefined,
      revisions: [],
      topics: q.topics,
      links: [{ kind: 'perspective', id: q.id }],
      private: false,
      createdAt: at,
      updatedAt: at,
    };
    upsert('entries', entry);
    toast(s.changed ? 'Recorded as a mind change' : 'Recorded as an opinion', { action: { label: 'Open', run: () => navigate(`/entry/${entry.id}`) } });
  };

  return (
    <section className="j-summary j-rise" aria-labelledby="ps-head">
      <div className="card j-step-card">
        <div className="label accent">Finished {fmtDate(s.completedAt!)}</div>
        <h2 id="ps-head" ref={headRef} tabIndex={-1} className="display t-lg" style={{ margin: '6px 0 6px' }}>
          {moved ? `Your stance moved: ${stanceLabel(s.before.stance)} → ${stanceLabel(after.stance)}` : `Your stance held at ${stanceLabel(after.stance)}`}
        </h2>
        <p className="muted" style={{ margin: '0 0 16px' }}>
          {s.changed ? 'You said your thinking changed.' : 'You said your thinking didn’t really change.'}
        </p>

        <div className="j-compare">
          <div className="j-answer">
            <div className="label">Before</div>
            <p className="display t-sm" style={{ margin: '4px 0' }}>{stanceLabel(s.before.stance)}</p>
            <p>{s.before.text || <span className="faint">No reason written</span>}</p>
          </div>
          <div className="j-answer mine">
            <div className="label accent">After</div>
            <p className="display t-sm" style={{ margin: '4px 0' }}>{stanceLabel(after.stance)}</p>
            <p>{after.text || <span className="faint">No reason written</span>}</p>
          </div>
        </div>

        <div className="stack sm" style={{ marginTop: 16 }}>
          {recorded ? (
            <Button icon={<History size={18} />} onClick={() => navigate(`/entry/${recorded.id}`)}>Recorded in Version History — open</Button>
          ) : (
            <Button variant="primary" icon={<History size={18} />} onClick={record}>Record in Version History</Button>
          )}
          {s.changed && hasChangedCol && (
            <Button
              icon={inChangedCol ? <Check size={18} /> : <FolderPlus size={18} />}
              disabled={inChangedCol}
              onClick={() => {
                addToCollection(CHANGED_COL, { kind: 'perspective', id: q.id });
                toast('Added to “Ideas I changed my mind about”');
              }}
            >
              {inChangedCol ? 'In “Ideas I changed my mind about”' : 'Add to “Ideas I changed my mind about”'}
            </Button>
          )}
          <Button variant="ghost" icon={<RotateCcw size={18} />} onClick={onAgain}>Start again</Button>
        </div>
      </div>

      {q.lenses.some((l) => s.responses[l.id]?.trim()) && (
        <Section title="Your responses to each lens">
          <div className="stack sm">
            {q.lenses.map((l) =>
              s.responses[l.id]?.trim() ? (
                <div key={l.id} className="card">
                  <Tag>{l.name}</Tag>
                  <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{s.responses[l.id]}</p>
                </div>
              ) : null,
            )}
          </div>
        </Section>
      )}
    </section>
  );
}
