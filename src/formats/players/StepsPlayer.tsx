// Generic step-by-step player (experiment, project, challenge, outdoor, reflection, collab, journey and any unknown format).
// Each step can have its own timer and an input: text, choice, sketch, photo, audio or none. Answers autosave as a draft.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { Experience, Step, StepsPayload } from '../../data/types';
import type { PlayerProps } from '../registry';
import { Button, Progress, useAutosave } from '../../components/ui';
import { TimerControl } from '../../components/common';
import { draftOf, Paragraphs } from './kit';
import { PhotoInput, VoiceRecorder } from './media';
import { SketchCanvas, type SketchHandle, type SketchStroke } from './SketchCanvas';
import { useReducedMotion } from './kit';

export type StepAnswer =
  | string
  | { kind: 'sketch'; blobId?: string; strokes?: SketchStroke[] }
  | { kind: 'photo' | 'audio'; blobId: string };

/** Steps for any experience: payload.steps if present, otherwise a sensible single step built from the content. */
export function normalizeSteps(e: Experience): Step[] {
  const p = e.payload as Partial<StepsPayload> & { prompt?: unknown; text?: unknown } | null | undefined;
  if (p && Array.isArray(p.steps) && p.steps.length) {
    return p.steps
      .filter((s): s is Step => !!s && typeof s === 'object')
      .map((s, i) => ({ ...s, id: s.id || `step-${i + 1}`, title: s.title || `Step ${i + 1}`, body: s.body ?? '' }));
  }
  const body = typeof p?.prompt === 'string' ? p.prompt : typeof p?.text === 'string' ? p.text : e.summary;
  return [{ id: 'main', title: e.title, body, input: 'text' }];
}

/** Strip heavy editing data (vector strokes) from answers before they become a saved result. */
export function answersForResult(answers: Record<string, StepAnswer>) {
  const out: Record<string, StepAnswer> = {};
  for (const [k, v] of Object.entries(answers)) {
    if (v && typeof v === 'object' && v.kind === 'sketch') {
      if (v.blobId) out[k] = { kind: 'sketch', blobId: v.blobId };
    } else if (v !== '' && v != null) out[k] = v;
  }
  return out;
}

export function hasAnswer(v: StepAnswer | undefined) {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (v.kind === 'sketch') return !!v.blobId || !!v.strokes?.length;
  return !!v.blobId;
}

/** Renders one step: heading, body, optional timer and input. Used by StepsPlayer and ExperienceView (pre-steps). */
export function StepBlock({
  step, expId, expTitle, value, onChange, sketchRef, headingRef, headingLevel = 2,
}: {
  step: Step;
  expId: string;
  expTitle: string;
  value: StepAnswer | undefined;
  onChange: (v: StepAnswer | undefined) => void;
  sketchRef?: React.Ref<SketchHandle>;
  headingRef?: React.Ref<HTMLHeadingElement>;
  headingLevel?: 2 | 3;
}) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className="fx-step">
      <H className={'display ' + (headingLevel === 2 ? 't-lg' : 't-md')} ref={headingRef} tabIndex={-1}>{step.title}</H>
      {step.body && <Paragraphs text={step.body} className="prose fx-step-body" preformat />}
      {step.timerMinutes ? (
        <TimerControl id={`exp:${expId}:${step.id}`} label={`${expTitle} · ${step.title}`} minutes={step.timerMinutes} refTo={{ kind: 'experience', id: expId }} />
      ) : null}
      <StepInput step={step} value={value} onChange={onChange} sketchRef={sketchRef} />
    </div>
  );
}

function StepInput({ step, value, onChange, sketchRef }: { step: Step; value: StepAnswer | undefined; onChange: (v: StepAnswer | undefined) => void; sketchRef?: React.Ref<SketchHandle> }) {
  const id = useId();
  const kind = step.input ?? 'none';
  if (kind === 'text') {
    return (
      <div className="field">
        <label htmlFor={id} className="fx-field-label">Your notes</label>
        <textarea id={id} className="textarea" rows={5} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} placeholder="What did you notice, make or decide?" />
      </div>
    );
  }
  if (kind === 'choice') {
    const choices = Array.isArray(step.choices) && step.choices.length ? step.choices.map(String) : ['Yes', 'Not yet'];
    return (
      <fieldset className="fx-choices">
        <legend className="fx-field-label">Choose one</legend>
        {choices.map((c, i) => (
          <label key={i} className={'fx-option' + (value === c ? ' on' : '')}>
            <input type="radio" name={id} value={c} checked={value === c} onChange={() => onChange(c)} />
            <span className="grow">{c}</span>
            {value === c && <Check size={18} aria-hidden />}
          </label>
        ))}
      </fieldset>
    );
  }
  if (kind === 'sketch') {
    const sk = value && typeof value === 'object' && value.kind === 'sketch' ? value : undefined;
    return (
      <SketchCanvas
        ref={sketchRef}
        label={`Sketch for: ${step.title}`}
        initialStrokes={sk?.strokes}
        savedBlobId={sk?.blobId}
        onChange={(strokes) => onChange({ kind: 'sketch', blobId: sk?.blobId, strokes })}
        onSaved={(blobId) => onChange({ kind: 'sketch', blobId, strokes: sk?.strokes })}
      />
    );
  }
  if (kind === 'photo') {
    const bid = value && typeof value === 'object' && value.kind === 'photo' ? value.blobId : undefined;
    return <PhotoInput label={step.title} value={bid} onChange={(b) => onChange(b ? { kind: 'photo', blobId: b } : undefined)} />;
  }
  if (kind === 'audio') {
    const bid = value && typeof value === 'object' && value.kind === 'audio' ? value.blobId : undefined;
    return <VoiceRecorder label={step.title} value={bid} onChange={(b) => onChange(b ? { kind: 'audio', blobId: b } : undefined)} />;
  }
  return null;
}

interface StepsDraft { index: number; answers: Record<string, StepAnswer>; finished?: boolean }

export function StepsPlayer({ experience, draft, saveDraft, onComplete, completed }: PlayerProps) {
  const steps = useMemo(() => normalizeSteps(experience), [experience]);
  const d = draftOf<StepsDraft>(draft);
  const [index, setIndex] = useState(() => Math.min(Math.max(0, d.index ?? 0), steps.length - 1));
  const [answers, setAnswers] = useState<Record<string, StepAnswer>>(() => (d.answers && typeof d.answers === 'object' ? d.answers : {}));
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const sketchRef = useRef<SketchHandle>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const shownIndex = useRef(index);

  const value = useMemo<StepsDraft>(() => ({ index, answers }), [index, answers]);
  const status = useAutosave(value, saveDraft);

  useEffect(() => {
    if (shownIndex.current === index) return;
    shownIndex.current = index;
    headingRef.current?.focus({ preventScroll: true });
    topRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, [index, reduced]);

  const step = steps[index];
  const setAnswer = (sid: string, v: StepAnswer | undefined) =>
    setAnswers((a) => {
      const next = { ...a };
      if (v === undefined) delete next[sid];
      else next[sid] = v;
      return next;
    });

  /** Save an unsaved sketch on the current step before leaving it. */
  const flushSketch = async () => {
    const h = sketchRef.current;
    if (step.input === 'sketch' && h && h.isDirty() && !h.isEmpty()) {
      const blobId = await h.save();
      if (blobId) {
        const cur = answers[step.id];
        const strokes = cur && typeof cur === 'object' && cur.kind === 'sketch' ? cur.strokes : undefined;
        const next = { ...answers, [step.id]: { kind: 'sketch' as const, blobId, strokes } };
        setAnswers(next);
        return next;
      }
    }
    return answers;
  };

  const go = async (i: number) => {
    if (busy || i === index) return;
    setBusy(true);
    await flushSketch();
    setBusy(false);
    setIndex(Math.max(0, Math.min(steps.length - 1, i)));
  };

  const finish = async () => {
    setBusy(true);
    const all = await flushSketch();
    setBusy(false);
    setFinished(true);
    const answered = steps.filter((s) => hasAnswer(all[s.id])).length;
    const withInputs = steps.filter((s) => s.input && s.input !== 'none').length;
    onComplete({ answers: answersForResult(all) }, withInputs ? `${answered} of ${withInputs} responses saved` : `${steps.length} step${steps.length === 1 ? '' : 's'} done`);
  };

  const last = index === steps.length - 1;

  return (
    <div className="fx-player fx-steps" ref={topRef}>
      <div className="fx-steps-panel glass fx-panel">
        {steps.length > 1 && (
          <div className="fx-steps-head">
            <div className="row between">
              <span className="label">Step {index + 1} of {steps.length}</span>
              <span className="tiny faint" aria-live="polite">{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Draft saved' : ''}</span>
            </div>
            <Progress value={(index + 1) / steps.length} label={`Step ${index + 1} of ${steps.length}`} />
            <ol className="fx-stepper" aria-label="Steps">
              {steps.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={'fx-stepdot' + (i === index ? ' on' : '') + (hasAnswer(answers[s.id]) || i < index ? ' done' : '')}
                    aria-current={i === index ? 'step' : undefined}
                    aria-label={`Step ${i + 1}: ${s.title}${hasAnswer(answers[s.id]) ? ' (answered)' : ''}`}
                    onClick={() => go(i)}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        <StepBlock
          key={step.id}
          step={step}
          expId={experience.id}
          expTitle={experience.title}
          value={answers[step.id]}
          onChange={(v) => setAnswer(step.id, v)}
          sketchRef={sketchRef}
          headingRef={headingRef}
        />
      </div>

      <div className="fx-nav">
        {index > 0 ? (
          <Button variant="secondary" icon={<ArrowLeft size={18} aria-hidden />} onClick={() => go(index - 1)} disabled={busy}>Back</Button>
        ) : <span />}
        {last ? (
          <Button variant="primary" icon={<Check size={18} aria-hidden />} onClick={finish} disabled={busy}>
            {busy ? 'Saving…' : finished || completed ? 'Finish again' : 'Finish'}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => go(index + 1)} disabled={busy}>
            Next <ArrowRight size={18} aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}

export default StepsPlayer;
