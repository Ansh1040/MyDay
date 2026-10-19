// Conversation / debate: state your position, read each side (swipe or use the buttons), then state it again.
// Records whether your position changed — literally, by comparing your two answers.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, ArrowRight, PenLine } from 'lucide-react';
import type { DebatePayload } from '../../data/types';
import type { PlayerProps } from '../registry';
import { Button, IconButton, useAutosave } from '../../components/ui';
import { navigate } from '../../lib/router';
import { linkParam } from '../../lib/links';
import { draftOf, useReducedMotion } from './kit';

interface Position { side: number; text: string } // side = index in sides, -1 = not sure
interface DebateDraft { stage: 'before' | 'sides' | 'after' | 'done'; before?: Position; after?: Position; seen?: number[] }

function PositionPicker({ sides, value, onChange, legend }: { sides: DebatePayload['sides']; value: Position | undefined; onChange: (p: Position) => void; legend: string }) {
  const name = useId();
  const textId = useId();
  const cur = value ?? { side: -2, text: '' };
  const opts = [...sides.map((s, i) => ({ i, label: s.label })), { i: -1, label: 'Not sure yet' }];
  return (
    <div className="stack">
      <fieldset className="fx-choices">
        <legend className="fx-field-label">{legend}</legend>
        {opts.map((o) => (
          <label key={o.i} className={'fx-option' + (cur.side === o.i ? ' on' : '')}>
            <input type="radio" name={name} checked={cur.side === o.i} onChange={() => onChange({ ...cur, side: o.i })} />
            <span className="grow">{o.label}</span>
            {cur.side === o.i && <Check size={18} aria-hidden />}
          </label>
        ))}
      </fieldset>
      <div className="field">
        <label htmlFor={textId} className="fx-field-label">In a sentence or two, why?</label>
        <textarea id={textId} className="textarea" rows={3} value={cur.text} onChange={(e) => onChange({ ...cur, text: e.target.value })} placeholder="Optional, but useful later." />
      </div>
    </div>
  );
}

export function DebatePlayer({ experience, draft, saveDraft, onComplete }: PlayerProps) {
  const p = (experience.payload ?? {}) as Partial<DebatePayload>;
  const question = typeof p.question === 'string' ? p.question : experience.title;
  const sides = useMemo(() => (Array.isArray(p.sides) ? p.sides.filter((s) => s && s.label) : []), [p.sides]);
  const d = draftOf<DebateDraft>(draft);
  const [stage, setStage] = useState<DebateDraft['stage']>(d.stage && d.stage !== 'done' ? d.stage : 'before');
  const [before, setBefore] = useState<Position | undefined>(d.before);
  const [after, setAfter] = useState<Position | undefined>(d.after);
  const [seen, setSeen] = useState<number[]>(Array.isArray(d.seen) ? d.seen : [0]);
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageHead = useRef<HTMLHeadingElement>(null);
  const shownStage = useRef(stage);
  const reduced = useReducedMotion();

  const value = useMemo<DebateDraft>(() => ({ stage, before, after, seen }), [stage, before, after, seen]);
  useAutosave(value, (v) => v.stage !== 'done' && saveDraft(v));

  useEffect(() => {
    if (shownStage.current === stage) return;
    shownStage.current = stage;
    stageHead.current?.focus();
  }, [stage]);

  // Track which card is in view (works for swipes and button presses alike).
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const cards = Array.from(el.children) as HTMLElement[];
        const mid = el.scrollLeft + el.clientWidth / 2;
        let best = 0, bestD = Infinity;
        cards.forEach((c, i) => {
          const dd = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
          if (dd < bestD) { bestD = dd; best = i; }
        });
        setActive(best);
        setSeen((s) => (s.includes(best) ? s : [...s, best]));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [stage]);

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(sides.length - 1, i));
    const card = el.children[idx] as HTMLElement | undefined;
    if (!card) return;
    el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
    setActive(idx);
    setSeen((s) => (s.includes(idx) ? s : [...s, idx]));
  };

  const label = (pos?: Position) => (!pos || pos.side === -1 ? 'Not sure yet' : sides[pos.side]?.label ?? '—');

  const finish = () => {
    if (!before || !after) return;
    const changed = before.side !== after.side;
    setStage('done');
    onComplete({ before, after, changed, beforeLabel: label(before), afterLabel: label(after) }, changed ? 'Your position changed' : 'You kept your position');
  };

  if (!sides.length) return <div className="fx-player"><p className="muted glass fx-panel">This conversation has no sides yet.</p></div>;

  const changed = before && after ? before.side !== after.side : false;

  return (
    <div className="fx-player fx-debate">
      <div className="fx-prompt glass fx-panel">
        <span className="label accent">The question</span>
        <p className={'display fx-prompt-text ' + (question.length > 90 ? 't-md' : 't-lg')}>{question}</p>
      </div>

      {stage === 'before' && (
        <section className="stack glass fx-panel">
          <h2 className="display t-md" ref={stageHead} tabIndex={-1}>Before you read: where do you stand?</h2>
          <PositionPicker sides={sides} value={before} onChange={setBefore} legend="My position now" />
          <div className="fx-nav end">
            <Button variant="primary" disabled={!before || before.side < -1} onClick={() => setStage('sides')}>
              Lock it in & read the sides <ArrowRight size={18} aria-hidden />
            </Button>
          </div>
        </section>
      )}

      {stage !== 'before' && before && (
        <p className="small muted fx-before-note glass fx-panel">You started at: <strong>{label(before)}</strong>{before.text ? ` — “${before.text}”` : ''}</p>
      )}

      {(stage === 'sides' || stage === 'after') && (
        <section className="fx-sides glass fx-panel" aria-roledescription="carousel" aria-label="The sides">
          <div className="row between">
            <h2 className="display t-md" ref={stage === 'sides' ? stageHead : undefined} tabIndex={-1}>The sides</h2>
            <span className="small mono" aria-live="polite">{active + 1} / {sides.length}</span>
          </div>
          <div
            className="fx-cards"
            ref={trackRef}
            tabIndex={0}
            aria-label="Sides — swipe, or use the previous and next buttons"
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1); }
              if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(active - 1); }
            }}
          >
            {sides.map((s, i) => (
              <article key={i} className={'fx-side card' + (i === active ? ' on' : '')} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${sides.length}: ${s.label}`}>
                <span className="label accent">Side {i + 1}</span>
                <h3 className="display t-md">{s.label}</h3>
                <p className="fx-side-arg">{s.argument}</p>
              </article>
            ))}
          </div>
          <div className="row between">
            <IconButton label="Previous side" className="filled" onClick={() => goTo(active - 1)} disabled={active === 0}><ChevronLeft size={22} /></IconButton>
            <div className="fx-dots" aria-hidden>
              {sides.map((_, i) => <span key={i} className={'fx-dotnav' + (i === active ? ' on' : seen.includes(i) ? ' seen' : '')} />)}
            </div>
            <IconButton label="Next side" className="filled" onClick={() => goTo(active + 1)} disabled={active === sides.length - 1}><ChevronRight size={22} /></IconButton>
          </div>
          <p className="tiny faint">Read {seen.length} of {sides.length} sides.</p>
          {stage === 'sides' && (
            <div className="fx-nav end">
              <Button variant="primary" onClick={() => { setAfter(after ?? { side: -2, text: '' }); setStage('after'); }}>
                {seen.length < sides.length ? 'Skip to my position' : 'Where do I stand now?'} <ArrowRight size={18} aria-hidden />
              </Button>
            </div>
          )}
        </section>
      )}

      {stage === 'after' && (
        <section className="stack glass fx-panel">
          <h2 className="display t-md" ref={stageHead} tabIndex={-1}>After reading: where do you stand now?</h2>
          <PositionPicker sides={sides} value={after} onChange={setAfter} legend="My position after reading" />
          <div className="fx-nav end">
            <Button variant="primary" icon={<Check size={18} aria-hidden />} disabled={!after || after.side < -1} onClick={finish}>Save both positions</Button>
          </div>
        </section>
      )}

      {stage === 'done' && before && after && (
        <section className="fx-result glass fx-panel" aria-live="polite">
          <span className="label accent">What happened</span>
          <h2 className="display t-lg" ref={stageHead} tabIndex={-1}>{changed ? 'Your position changed.' : 'You held your position.'}</h2>
          <div className="fx-compare">
            <div><span className="label">Before</span><p className="fx-compare-v">{label(before)}</p>{before.text && <p className="small muted">“{before.text}”</p>}</div>
            <div><span className="label">After</span><p className="fx-compare-v">{label(after)}</p>{after.text && <p className="small muted">“{after.text}”</p>}</div>
          </div>
          <div className="row wrap">
            {changed && (
              <Button
                variant="secondary"
                icon={<PenLine size={18} aria-hidden />}
                onClick={() => navigate(`/entry/new?kind=mindchange&link=${linkParam({ kind: 'experience', id: experience.id })}&title=${encodeURIComponent(`Changed my mind: “${experience.title}”`)}`)}
              >
                Record this change of mind
              </Button>
            )}
            <Button variant="ghost" onClick={() => { setBefore(after); setAfter(undefined); setSeen([0]); setActive(0); setStage('sides'); }}>Revisit the sides</Button>
          </div>
        </section>
      )}
    </div>
  );
}

export default DebatePlayer;
