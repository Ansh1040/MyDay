// Immersive experience screen: header, optional guide steps, the format Player, and "What next" after completion.
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Bookmark, BookmarkCheck, Ellipsis, ThumbsUp, ThumbsDown, EyeOff, FolderPlus, Ticket, Share2, PenLine, NotebookPen, Shuffle,
  Archive, ArrowRight, ArrowLeft, Check, GraduationCap, CircleAlert, Wand,
} from 'lucide-react';
import '../../styles/formats.css';
import type { Experience } from '../../data/types';
import { useStore } from '../../store/store';
import { useExperience, getExperience, getSkill } from '../../data/catalog';
import { getFormat, describeDraft } from '../../formats';
import { StepBlock, answersForResult, hasAnswer, type StepAnswer } from '../../formats/players/StepsPlayer';
import { Screen, Button, IconButton, EmptyState, Sheet, ListRow, Section, Progress, toast, useAutosave } from '../../components/ui';
import { MetaLine, TopicTags, OriginTag, TimerControl, ExperienceCard, AddToCollectionSheet } from '../../components/common';
import { ReturnTicketSheet } from '../../components/ReturnTicketSheet';
import { GlassArt } from '../../components/GlassArt';
import { navigate } from '../../lib/router';
import { linkParam } from '../../lib/links';
import { resolveRef } from '../../lib/refs';
import { fmtDate } from '../../lib/id';
import { prefersReducedMotion } from '../../lib/theme';

type SheetName = 'more' | 'collection' | 'ticket' | null;

/** Catches a crashing player (e.g. malformed imported content) so the rest of the screen keeps working. */
class PlayerBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error('Player crashed', err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Visible-time tracker: counts only time the screen is actually in the foreground. */
function useActiveMinutes() {
  const total = useRef(0);
  const since = useRef<number | null>(typeof document !== 'undefined' && document.visibilityState === 'visible' ? Date.now() : null);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') since.current = Date.now();
      else if (since.current != null) {
        total.current += Date.now() - since.current;
        since.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const take = useCallback(() => {
    const ms = total.current + (since.current != null ? Date.now() - since.current : 0);
    total.current = 0;
    if (since.current != null) since.current = Date.now();
    return Math.max(1, Math.round(ms / 60000));
  }, []);
  return useMemo(() => ({ take }), [take]);
}

export function ExperienceView({ id }: { id: string }) {
  const exp = useExperience(id);
  if (!exp) {
    return (
      <Screen immersive title="Not found" backTo="/discover">
        <EmptyState
          icon={<CircleAlert size={24} />}
          title="This experience isn’t here"
          body="It may have been deleted, or the link is incomplete."
          action={<Button variant="primary" onClick={() => navigate('/discover', { replace: true })}>Back to Discover</Button>}
        />
      </Screen>
    );
  }
  return <ExperienceScreen key={exp.id} exp={exp} />;
}

function ExperienceScreen({ exp }: { exp: Experience }) {
  const id = exp.id;
  const ref = useMemo(() => ({ kind: 'experience' as const, id }), [id]);
  const draftKey = `exp:${id}`;
  const guideKey = `exp:${id}:steps`;
  const draft = useStore((s) => s.drafts[draftKey]);
  const saved = useStore((s) => s.saved.includes(id));
  const hidden = useStore((s) => s.feedback.hidden.includes(id));
  const doneCount = useStore((s) => Object.values(s.completions).filter((c) => c.ref.kind === 'experience' && c.ref.id === id).length);
  const lastDone = useStore((s) => {
    let last = '';
    for (const c of Object.values(s.completions)) if (c.ref.kind === 'experience' && c.ref.id === id && c.at > last) last = c.at;
    return last;
  });
  const [sheet, setSheet] = useState<SheetName>(null);
  const [justDone, setJustDone] = useState(false);
  const completedAt = useRef(0);
  const whatNextRef = useRef<HTMLHeadingElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const active = useActiveMinutes();
  const F = getFormat(exp.format);
  const Player = F.Player;

  useEffect(() => {
    useStore.getState().markVisited(`exp:${id}`);
  }, [id]);

  const saveDraft = useCallback(
    (data: unknown) => {
      // Ignore autosaves that were already in flight when the experience was completed.
      if (Date.now() - completedAt.current < 1500) return;
      useStore.getState().saveDraft(draftKey, data);
    },
    [draftKey],
  );

  const onComplete = useCallback(
    (result?: unknown, summary?: string) => {
      const s = useStore.getState();
      let res = result;
      const guide = s.drafts[guideKey]?.data as Record<string, StepAnswer> | undefined;
      if (exp.steps?.length && guide && Object.values(guide).some((v) => hasAnswer(v))) {
        const stepAnswers = answersForResult(guide);
        res = res && typeof res === 'object' && !Array.isArray(res) ? { ...(res as object), stepAnswers } : { result: res, stepAnswers };
      }
      s.complete(ref, { result: res, minutes: active.take() });
      completedAt.current = Date.now();
      s.clearDraft(draftKey);
      s.clearDraft(guideKey);
      toast(summary ? `Saved to your progress · ${summary}` : 'Saved to your progress');
      setJustDone(true);
      setTimeout(() => {
        const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
        // A player that shows its own result (quiz score, debate outcome, rhythm stats) keeps it in view and keeps
        // focus on it; "What next" follows right below. Scrolling past it used to hide the score off-screen.
        const own = stageRef.current?.querySelector<HTMLElement>('.fx-result');
        if (own) {
          own.scrollIntoView({ behavior, block: 'nearest' });
          return;
        }
        const h = whatNextRef.current;
        if (!h) return;
        // 'nearest' + the heading's scroll margins (formats.css) reveal "What next" while the end of the activity stays in view.
        h.scrollIntoView({ behavior, block: 'nearest' });
        h.focus({ preventScroll: true });
      }, 120);
    },
    [draftKey, guideKey, exp.steps, ref, active],
  );

  const feedback = (dir: 1 | -1) => {
    const s = useStore.getState();
    s.giveFeedback(exp, dir);
    setSheet(null);
    toast(dir === 1 ? 'You’ll see more like this' : 'You’ll see less like this', { action: { label: 'Undo', run: () => useStore.getState().giveFeedback(exp, dir === 1 ? -1 : 1) } });
  };
  const hideIt = () => {
    useStore.getState().hide(id);
    setSheet(null);
    toast('Hidden from your suggestions', { action: { label: 'Undo', run: () => useStore.getState().unhide(id) } });
  };
  const toggleSave = () => {
    useStore.getState().toggleSave(id);
    toast(saved ? 'Removed from saved' : 'Saved for later', { action: { label: 'Undo', run: () => useStore.getState().toggleSave(id) } });
  };
  /** Close the options sheet before opening another so focus restores correctly. */
  const openFromMore = (next: SheetName) => {
    setSheet(null);
    setTimeout(() => setSheet(next), 60);
  };

  const userOwned = exp.origin === 'user' || exp.origin === 'remix';
  const showNext = justDone || doneCount > 0;
  const remixedFrom = exp.remixOf ? resolveRef(exp.remixOf) : null;

  return (
    <Screen
      immersive
      title={exp.title}
      backTo="/discover"
      actions={
        <>
          <IconButton label={saved ? 'Remove from saved' : 'Save for later'} className={saved ? 'accent' : ''} onClick={toggleSave} aria-pressed={saved}>
            {saved ? <BookmarkCheck size={22} /> : <Bookmark size={22} />}
          </IconButton>
          <IconButton label="More options" onClick={() => setSheet('more')}>
            <Ellipsis size={22} />
          </IconButton>
        </>
      }
    >
      <article className="fx-view">
        <header className="fx-hero glass fx-panel">
          <div className="fx-hero-head">
            <GlassArt seed={exp.id} format={exp.format} size={104} className="fx-hero-art" />
            <span className="label accent row fx-kicker">
              <F.icon size={14} aria-hidden /> {F.label}
            </span>
            <h1 className="display t-xl fx-title">{exp.title}</h1>
          </div>
          <p className="fx-summary">{exp.summary}</p>
          <div className="fx-hero-meta">
            <MetaLine e={exp} showFormat={false} />
            <div className="row wrap" style={{ gap: 6 }}>
              <TopicTags topics={exp.topics} max={5} />
              <OriginTag origin={exp.origin} />
            </div>
          </div>
          {exp.origin === 'remix' && (
            <button type="button" className="fx-remix-note" onClick={() => navigate(`/builder/${encodeURIComponent(id)}`)}>
              <Wand size={16} aria-hidden />
              <span className="grow">Template-generated remix — edit in Builder</span>
              <ArrowRight size={16} aria-hidden />
            </button>
          )}
          {remixedFrom && !remixedFrom.missing && (
            <p className="small muted">
              Remixed from <a href={'#' + remixedFrom.url}>{remixedFrom.title}</a>
            </p>
          )}
          {doneCount > 0 && (
            <p className="small muted row fx-done-line" style={{ gap: 6 }}>
              <Check size={16} aria-hidden /> Done {doneCount === 1 ? 'once' : `${doneCount} times`}{lastDone ? ` · last on ${fmtDate(lastDone)}` : ''}
            </p>
          )}
          {hidden && (
            <div className="banner" role="status">
              <EyeOff size={16} aria-hidden />
              <span className="grow">Hidden from your suggestions. You can still use it here.</span>
              <Button size="sm" variant="ghost" onClick={() => { useStore.getState().unhide(id); toast('Back in your suggestions'); }}>Unhide</Button>
            </div>
          )}
        </header>

        {exp.timerMinutes ? (
          <section className="fx-timer" aria-label="Activity timer">
            <TimerControl id={`exp:${id}`} label={exp.title} minutes={exp.timerMinutes} refTo={ref} />
          </section>
        ) : null}

        {exp.steps && exp.steps.length > 0 && <Guide exp={exp} guideKey={guideKey} completedAt={completedAt} />}

        <section className="fx-stage" ref={stageRef} aria-label={`${F.label}: ${exp.title}`}>
          <PlayerBoundary
            fallback={
              <div className="banner error" role="alert">
                <CircleAlert size={18} aria-hidden />
                <span className="grow">This activity couldn’t load — its content may be incomplete. You can still reflect on it or mark it done.</span>
                <Button size="sm" variant="secondary" onClick={() => onComplete(undefined, 'Marked as done')}>Mark done</Button>
              </div>
            }
          >
            <Player experience={exp} draft={draft?.data} saveDraft={saveDraft} onComplete={onComplete} completed={doneCount > 0} />
          </PlayerBoundary>
        </section>

        {showNext && (
          <section className="fx-next" aria-labelledby={`next-${id}`}>
            <div className="fx-next-panel glass fx-panel">
              <span className="label accent">{justDone ? 'Nice — that’s saved' : 'You’ve done this before'}</span>
              <h2 id={`next-${id}`} className="display t-lg" ref={whatNextRef} tabIndex={-1}>What next</h2>
              <div className="fx-next-grid">
                <NextTile
                  icon={<PenLine size={20} aria-hidden />}
                  title="Reflect"
                  sub="Write what it changed, in Version History"
                  onClick={() => navigate(`/entry/new?kind=reflection&link=${linkParam(ref)}&title=${encodeURIComponent(`After “${exp.title}”`)}`)}
                />
                <NextTile icon={<NotebookPen size={20} aria-hidden />} title="Capture a field note" sub="A quick note, linked here" onClick={() => navigate(`/note/new?kind=text&link=${linkParam(ref)}`)} />
                <NextTile icon={<Shuffle size={20} aria-hidden />} title="Remix" sub="Turn it into a new experience" onClick={() => navigate(`/remix?from=${linkParam(ref)}`)} />
                <NextTile
                  icon={<Archive size={20} aria-hidden />}
                  title="Seal as capsule"
                  sub="Reopen it later and compare"
                  onClick={() => navigate(`/capsule/new?kind=${['sketch', 'writing', 'coding', 'project'].includes(exp.format) ? 'creation' : 'message'}&link=${linkParam(ref)}`)}
                />
                <NextTile icon={<FolderPlus size={20} aria-hidden />} title="Add to collection" sub="Keep it on a shelf" onClick={() => setSheet('collection')} />
              </div>
            </div>

            {exp.followUps && exp.followUps.length > 0 && (
              <Section title="Try next, in the real world">
                <ul className="fx-followups glass">
                  {exp.followUps.map((f, i) => (
                    <li key={i}><ArrowRight size={16} aria-hidden /> <span>{f}</span></li>
                  ))}
                </ul>
              </Section>
            )}

            {exp.skillId && <SkillLink skillId={exp.skillId} />}

            <Related ids={exp.related ?? []} self={id} />
          </section>
        )}
      </article>

      <Sheet open={sheet === 'more'} onClose={() => setSheet(null)} title="Options">
        <div className="list">
          <ListRow icon={<ThumbsUp size={18} />} title="More like this" sub="Nudges suggestions toward these topics and this format" onClick={() => feedback(1)} />
          <ListRow icon={<ThumbsDown size={18} />} title="Less like this" sub="Nudges suggestions away from them" onClick={() => feedback(-1)} />
          <ListRow icon={<EyeOff size={18} />} title={hidden ? 'Already hidden' : 'Hide this'} sub="Stop suggesting this experience" onClick={hidden ? () => setSheet(null) : hideIt} />
          <ListRow icon={<FolderPlus size={18} />} title="Add to collection" onClick={() => openFromMore('collection')} />
          <ListRow icon={<Ticket size={18} />} title="Save a return ticket" sub="Note where you stopped and what to try next" onClick={() => openFromMore('ticket')} />
          {userOwned && <ListRow icon={<Share2 size={18} />} title="Share or edit" sub="Opens it in the Experience Builder" onClick={() => { setSheet(null); navigate(`/builder/${encodeURIComponent(id)}`); }} />}
        </div>
        <p className="tiny faint" style={{ marginTop: 12 }}>Suggestions are rule-based: feedback adjusts the weight of this experience’s topics and format. Nothing leaves your device.</p>
      </Sheet>
      <AddToCollectionSheet open={sheet === 'collection'} onClose={() => setSheet(null)} target={sheet === 'collection' ? ref : null} />
      <ReturnTicketSheet open={sheet === 'ticket'} onClose={() => setSheet(null)} target={ref} title={exp.title} defaultStoppedAt={describeDraft(exp, draft?.data)} />
    </Screen>
  );
}

function NextTile({ icon, title, sub, onClick }: { icon: ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" className="fx-next-tile" onClick={onClick}>
      <span className="fx-next-icon">{icon}</span>
      <span className="fx-next-title">{title}</span>
      <span className="fx-next-sub">{sub}</span>
    </button>
  );
}

function SkillLink({ skillId }: { skillId: string }) {
  const skill = getSkill(skillId);
  if (!skill) return null;
  return (
    <Section title="Part of a skill">
      <div className="list">
        <ListRow icon={<GraduationCap size={18} />} title={skill.name} sub={skill.tagline} onClick={() => navigate(`/skill/${encodeURIComponent(skill.id)}`)} right={<ArrowRight size={18} aria-hidden className="faint" />} />
      </div>
    </Section>
  );
}

function Related({ ids, self }: { ids: string[]; self: string }) {
  const hidden = useStore((s) => s.feedback.hidden);
  const userExps = useStore((s) => s.experiences);
  const list = useMemo(
    () => ids.filter((x) => x !== self && !hidden.includes(x)).map((x) => getExperience(x)).filter((e): e is Experience => !!e),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, self, hidden, userExps],
  );
  if (!list.length) return null;
  return (
    <Section title="Related">
      <div className="stack sm">
        {list.map((e) => <ExperienceCard key={e.id} e={e} variant="compact" />)}
      </div>
    </Section>
  );
}

/** experience.steps — a guide shown above the player, one step at a time, with timers and inputs (autosaved). */
function Guide({ exp, guideKey, completedAt }: { exp: Experience; guideKey: string; completedAt: React.RefObject<number> }) {
  const steps = exp.steps ?? [];
  const initial = useStore.getState().drafts[guideKey]?.data;
  const [answers, setAnswers] = useState<Record<string, StepAnswer>>(() => (initial && typeof initial === 'object' ? (initial as Record<string, StepAnswer>) : {}));
  const [index, setIndex] = useState(0);
  const status = useAutosave(answers, (a) => {
    if (Date.now() - (completedAt.current ?? 0) < 1500) return;
    useStore.getState().saveDraft(guideKey, a);
  });
  const step = steps[Math.min(index, steps.length - 1)];
  const setAnswer = (v: StepAnswer | undefined) =>
    setAnswers((a) => {
      const next = { ...a };
      if (v === undefined) delete next[step.id];
      else next[step.id] = v;
      return next;
    });
  const answered = steps.filter((s) => hasAnswer(answers[s.id])).length;
  const withInput = steps.filter((s) => s.input && s.input !== 'none').length;
  return (
    <section className="fx-guide card" aria-label="Guide">
      <div className="row between">
        <span className="label">{steps.length > 1 ? `Guide · step ${index + 1} of ${steps.length}` : 'Guide'}</span>
        <span className="tiny faint" aria-live="polite">
          {status === 'saving' ? 'Saving…' : withInput ? `${answered} of ${withInput} answered` : ''}
        </span>
      </div>
      {steps.length > 1 && <Progress value={(index + 1) / steps.length} label={`Guide step ${index + 1} of ${steps.length}`} />}
      <StepBlock key={step.id} step={step} expId={exp.id} expTitle={exp.title} value={answers[step.id]} onChange={setAnswer} headingLevel={3} />
      {steps.length > 1 && (
        <div className="row between fx-guide-nav">
          <IconButton label="Previous guide step" className="filled" disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft size={18} /></IconButton>
          <ol className="fx-stepper compact" aria-label="Guide steps">
            {steps.map((s, i) => (
              <li key={s.id}>
                <button type="button" className={'fx-stepdot' + (i === index ? ' on' : '') + (hasAnswer(answers[s.id]) ? ' done' : '')} aria-current={i === index ? 'step' : undefined} aria-label={`Guide step ${i + 1}: ${s.title}`} onClick={() => setIndex(i)}>
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>
          <IconButton label="Next guide step" className="filled" disabled={index === steps.length - 1} onClick={() => setIndex(index + 1)}><ArrowRight size={18} /></IconButton>
        </div>
      )}
    </section>
  );
}
