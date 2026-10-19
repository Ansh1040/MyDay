// Quiz: one question at a time. Factual questions give immediate feedback + explanation;
// opinion questions (no `answer`) are personal polls — compared only with your own earlier answers.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, X, RotateCcw, CircleHelp } from 'lucide-react';
import type { QuizPayload, QuizQuestion } from '../../data/types';
import type { PlayerProps } from '../registry';
import { Button, Progress, useAutosave } from '../../components/ui';
import { useStore } from '../../store/store';
import { draftOf } from './kit';

interface QuizDraft { index: number; answers: Record<string, number> }
export interface QuizResult { score: number; total: number; answers: Record<string, number> }

const isFactual = (q: QuizQuestion) => typeof q.answer === 'number' && q.answer >= 0 && q.answer < q.options.length;

export function QuizPlayer({ experience, draft, saveDraft, onComplete }: PlayerProps) {
  const questions = useMemo(() => {
    const p = (experience.payload ?? {}) as Partial<QuizPayload>;
    return (Array.isArray(p.questions) ? p.questions : []).filter((q) => q && Array.isArray(q.options) && q.options.length > 0);
  }, [experience.payload]);
  const d = draftOf<QuizDraft>(draft);
  const [answers, setAnswers] = useState<Record<string, number>>(() => (d.answers && typeof d.answers === 'object' ? d.answers : {}));
  const [index, setIndex] = useState(() => Math.min(Math.max(0, d.index ?? 0), Math.max(0, questions.length - 1)));
  const [phase, setPhase] = useState<'play' | 'done'>('play');
  const [attempt, setAttempt] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shown = useRef(`${index}:${phase}:${attempt}`);

  // Your own previous result (for opinion questions: "last time you picked…").
  const previous = useStore((s) => {
    const list = Object.values(s.completions).filter((c) => c.ref.kind === 'experience' && c.ref.id === experience.id && c.result && typeof c.result === 'object' && 'answers' in (c.result as object));
    list.sort((a, b) => b.at.localeCompare(a.at));
    return list[0] as { at: string; result: QuizResult } | undefined;
  });
  const [prevSnapshot, setPrevSnapshot] = useState(previous);

  const value = useMemo<QuizDraft>(() => ({ index, answers }), [index, answers]);
  useAutosave(value, (v) => phase === 'play' && saveDraft(v), [phase]);

  useEffect(() => {
    const key = `${index}:${phase}:${attempt}`;
    if (shown.current === key) return;
    shown.current = key;
    headingRef.current?.focus();
  }, [index, phase, attempt]);

  if (!questions.length) return <div className="fx-player"><p className="muted glass fx-panel">This quiz has no questions yet.</p></div>;

  const q = questions[index];
  const picked = answers[q.id];
  const answered = picked !== undefined;
  const factual = isFactual(q);
  const factualQs = questions.filter(isFactual);
  const score = factualQs.filter((x) => answers[x.id] === x.answer).length;

  const pick = (i: number) => {
    if (answered) return;
    setAnswers((a) => ({ ...a, [q.id]: i }));
  };

  const next = () => {
    if (index < questions.length - 1) {
      setIndex(index + 1);
      return;
    }
    setPhase('done');
    const result: QuizResult = { score, total: factualQs.length, answers };
    onComplete(result, factualQs.length ? `${score} of ${factualQs.length} correct` : 'Answers saved');
  };

  const retry = () => {
    setPrevSnapshot(previous);
    setAnswers({});
    setIndex(0);
    setPhase('play');
    setAttempt((n) => n + 1);
  };

  if (phase === 'done') {
    return (
      <div className="fx-player fx-quiz">
        <div className="fx-result glass fx-panel">
          <span className="label accent">Your result</span>
          <h2 className="display t-xl" ref={headingRef} tabIndex={-1}>
            {factualQs.length ? `${score} of ${factualQs.length}` : 'All answered'}
          </h2>
          <p className="muted">
            {factualQs.length
              ? score === factualQs.length
                ? 'Every factual answer right.'
                : `${factualQs.length - score} to revisit — the explanations are below.`
              : 'These were opinion questions — there are no right answers. Your picks are saved so you can compare next time.'}
            {prevSnapshot && prevSnapshot.result.total > 0 && factualQs.length > 0 && ` Last time: ${prevSnapshot.result.score} of ${prevSnapshot.result.total}.`}
          </p>
        </div>
        <ol className="fx-review glass fx-panel">
          {questions.map((x) => {
            const a = answers[x.id];
            const ok = isFactual(x) ? a === x.answer : null;
            return (
              <li key={x.id} className="fx-review-item">
                <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
                  <span className={'fx-mark ' + (ok === null ? 'poll' : ok ? 'ok' : 'no')} aria-hidden>
                    {ok === null ? <CircleHelp size={16} /> : ok ? <Check size={16} /> : <X size={16} />}
                  </span>
                  <div className="grow">
                    <p className="fx-review-q">{x.prompt}</p>
                    <p className="small muted">
                      {ok === null ? 'Your pick: ' : ok ? 'Correct: ' : 'You picked: '}
                      <strong>{a !== undefined ? x.options[a] : '—'}</strong>
                      {ok === false && <> · Answer: <strong>{x.options[x.answer!]}</strong></>}
                    </p>
                    {x.explain && <p className="small faint">{x.explain}</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="fx-nav end">
          <Button variant="secondary" icon={<RotateCcw size={18} aria-hidden />} onClick={retry}>Try again</Button>
        </div>
      </div>
    );
  }

  const prevPick = prevSnapshot?.result.answers?.[q.id];

  return (
    <div className="fx-player fx-quiz">
      <div className="fx-quiz-panel glass fx-panel">
        <div className="fx-steps-head">
          <div className="row between">
            <span className="label">Question {index + 1} of {questions.length}</span>
            <span className="tag">{factual ? 'Fact check' : 'Opinion poll'}</span>
          </div>
          <Progress value={(index + (answered ? 1 : 0)) / questions.length} label={`Question ${index + 1} of ${questions.length}`} />
        </div>
        <h2 className="display t-lg fx-quiz-q" ref={headingRef} tabIndex={-1}>{q.prompt}</h2>
        <div className="fx-quiz-options" role="group" aria-label="Answer options">
          {q.options.map((o, i) => {
            const isPicked = picked === i;
            const isRight = factual && answered && i === q.answer;
            const isWrong = factual && answered && isPicked && i !== q.answer;
            return (
              <button
                key={i}
                type="button"
                className={'fx-answer' + (isPicked ? ' picked' : '') + (isRight ? ' right' : '') + (isWrong ? ' wrong' : '')}
                onClick={() => pick(i)}
                aria-disabled={answered || undefined}
                aria-pressed={isPicked}
              >
                <span className="fx-answer-key" aria-hidden>{String.fromCharCode(65 + i)}</span>
                <span className="grow">{o}</span>
                {isRight && <Check size={18} aria-label="Correct answer" />}
                {isWrong && <X size={18} aria-label="Your answer, incorrect" />}
              </button>
            );
          })}
        </div>

        <div aria-live="polite" className="fx-feedback-wrap">
          {answered && (
            <div className={'fx-feedback ' + (factual ? (picked === q.answer ? 'ok' : 'no') : 'poll')}>
              <strong className="fx-feedback-title">
                {factual ? (picked === q.answer ? 'Right.' : `Not quite — it’s “${q.options[q.answer!]}”.`) : 'Noted — this one is a matter of opinion.'}
              </strong>
              {q.explain && <p>{q.explain}</p>}
              {!factual && prevPick !== undefined && (
                <p className="small">
                  {prevPick === picked ? 'Same as your answer last time.' : `Last time you picked “${q.options[prevPick] ?? '—'}”.`}
                </p>
              )}
              {!factual && prevPick === undefined && <p className="small faint">Only your own answers are stored — there’s no crowd to compare with.</p>}
            </div>
          )}
        </div>
      </div>

      <div className="fx-nav end">
        <Button variant="primary" onClick={next} disabled={!answered}>
          {index < questions.length - 1 ? <>Next question <ArrowRight size={18} aria-hidden /></> : 'See result'}
        </Button>
      </div>
    </div>
  );
}

export default QuizPlayer;
