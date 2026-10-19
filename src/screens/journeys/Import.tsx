// Import a share code: experiences, two-person quest invitations and quest replies.
// Codes are decoded entirely on this device. Works before onboarding too.
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ClipboardPaste, Download, Info, Users } from 'lucide-react';
import type { Experience, QuestAnswerSet, QuestPrompt, Step, TwoPersonQuest } from '../../data/types';
import { useStore } from '../../store/store';
import { CATALOG_EXPERIENCES } from '../../data/catalog';
import { navigate, useRoute } from '../../lib/router';
import { Button, Screen, Section, toast } from '../../components/ui';
import { MetaLine } from '../../components/common';
import { decodePacket, type SharePacket } from '../../lib/share';
import { notifyNow } from '../../lib/notify';
import { fmtDate, nowISO, uid } from '../../lib/id';
import { formatMeta } from '../../formats/meta';
import '../../styles/journeys.css';

type Plan =
  | { t: 'experience'; experience: Experience; replaces: boolean; renamed: boolean; from?: string }
  | { t: 'quest'; quest: TwoPersonQuest; existing: boolean; from?: string; withAnswers: boolean }
  | { t: 'quest-reply'; questId: string; questTitle: string; answers: QuestAnswerSet; replacesAt?: string };

type State =
  | { s: 'idle' }
  | { s: 'decoding' }
  | { s: 'error'; message: string }
  | { s: 'preview'; plan: Plan }
  | { s: 'done'; title: string; url: string; label: string };

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const clampInt = (v: unknown, lo: number, hi: number, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);
const hasAnswers = (a?: QuestAnswerSet) => !!a && Object.values(a.answers ?? {}).some((v) => typeof v === 'string' && v.trim());

function cleanAnswers(a: unknown): QuestAnswerSet | undefined {
  if (!a || typeof a !== 'object') return undefined;
  const r = a as Record<string, unknown>;
  const answers: Record<string, string> = {};
  if (r.answers && typeof r.answers === 'object') {
    Object.entries(r.answers as Record<string, unknown>).forEach(([k, v]) => {
      if (typeof v === 'string') answers[k] = v.slice(0, 20000);
    });
  }
  return { name: str(r.name).slice(0, 80), answers, at: str(r.at) || nowISO() };
}

const STEP_INPUTS: NonNullable<Step['input']>[] = ['none', 'text', 'choice', 'sketch', 'photo', 'audio'];
const strList = (v: unknown): string[] | undefined => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined);

/** Shared codes come from other devices: keep only well-formed steps so a damaged code can't break the player. */
function cleanSteps(v: unknown): Step[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: Step[] = [];
  v.forEach((x, i) => {
    if (!x || typeof x !== 'object') return;
    const r = x as Record<string, unknown>;
    const title = str(r.title).trim();
    const body = str(r.body);
    if (!title && !body.trim()) return;
    const input = STEP_INPUTS.includes(r.input as never) ? (r.input as Step['input']) : undefined;
    const choices = strList(r.choices)?.filter((c) => c.trim());
    out.push({
      id: str(r.id) || `step-${i + 1}`,
      title: title || `Step ${out.length + 1}`,
      body,
      timerMinutes: typeof r.timerMinutes === 'number' && Number.isFinite(r.timerMinutes) && r.timerMinutes > 0 ? Math.min(600, r.timerMinutes) : undefined,
      input: input === 'choice' && !choices?.length ? 'text' : input,
      choices: input === 'choice' ? choices : undefined,
    });
  });
  return out.length ? out : undefined;
}

/** Light normalisation of the fields players read as plain text or step lists (codes may be hand-edited or damaged). */
function cleanPayload(v: unknown): unknown {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, unknown> = { ...(v as Record<string, unknown>) };
  for (const k of ['prompt', 'starter', 'question', 'text', 'kind']) {
    if (k in out && typeof out[k] !== 'string') out[k] = out[k] == null ? '' : String(out[k]);
  }
  if ('steps' in out) out.steps = cleanSteps(out.steps) ?? [];
  return out;
}

function cleanPrompts(p: unknown): QuestPrompt[] | null {
  if (!Array.isArray(p)) return null;
  const out: QuestPrompt[] = [];
  const ids = new Set<string>();
  p.forEach((x, i) => {
    if (!x || typeof x !== 'object') return;
    const r = x as Record<string, unknown>;
    const text = str(r.text).trim();
    if (!text) return;
    const kind = r.kind === 'choice' || r.kind === 'task' ? r.kind : 'text';
    // Unique, de-duplicated choices (answers are matched by their text).
    const choices = Array.isArray(r.choices) ? [...new Set(r.choices.filter((c): c is string => typeof c === 'string' && !!c.trim()))] : undefined;
    // Answers are keyed by prompt id, so ids must be unique.
    let id = str(r.id) || `p${i + 1}`;
    if (ids.has(id)) id = `${id}-${i + 1}`;
    ids.add(id);
    out.push({ id, text, kind: kind === 'choice' && !choices?.length ? 'text' : kind, choices: kind === 'choice' && choices?.length ? choices : undefined });
  });
  return out;
}

/** Validate a decoded packet against what's on this device and describe what importing will do. */
function plan(p: SharePacket): Plan {
  const st = useStore.getState();
  if (p.t === 'experience') {
    const e = p.experience as Partial<Experience> | undefined;
    if (!e || typeof e !== 'object' || !str(e.title).trim() || !str(e.format)) throw new Error('This code doesn’t contain a complete experience.');
    const eid = str(e.id).slice(0, 120);
    const inCatalog = CATALOG_EXPERIENCES.some((x) => x.id === eid);
    const mine = eid ? st.experiences[eid] : undefined;
    const replaces = !!mine && mine.origin === 'shared';
    const renamed = !eid || inCatalog || (!!mine && !replaces);
    const area = (['rabbit', 'twist', 'skill', 'history', 'general'] as const).includes(e.area as never) ? (e.area as Experience['area']) : 'general';
    const social = e.social === 'solo' || e.social === 'shared' ? e.social : 'either';
    const experience: Experience = {
      ...(e as Experience),
      id: renamed ? uid('u-') : eid,
      title: str(e.title).trim().slice(0, 200),
      summary: str(e.summary),
      area,
      format: str(e.format),
      topics: Array.isArray(e.topics) ? e.topics.filter((t): t is string => typeof t === 'string') : [],
      minutes: clampInt(e.minutes, 1, 600, 10),
      energy: clampInt(e.energy, 1, 3, 2) as Experience['energy'],
      comfort: clampInt(e.comfort, 1, 5, 2) as Experience['comfort'],
      cost: clampInt(e.cost, 0, 2, 0) as Experience['cost'],
      social,
      origin: 'shared',
      payload: cleanPayload(e.payload),
      steps: cleanSteps(e.steps),
      timerMinutes: typeof e.timerMinutes === 'number' && Number.isFinite(e.timerMinutes) && e.timerMinutes > 0 ? Math.min(600, e.timerMinutes) : undefined,
      skillId: typeof e.skillId === 'string' ? e.skillId : undefined,
      remixOf: undefined, // local links mean nothing on this device
      related: strList(e.related),
      followUps: strList(e.followUps),
      createdAt: nowISO(),
      visibility: 'private',
    };
    return { t: 'experience', experience, replaces, renamed, from: str(p.from) || undefined };
  }

  if (p.t === 'quest') {
    const q = p.quest as Partial<TwoPersonQuest> | undefined;
    const prompts = cleanPrompts(q?.prompts);
    if (!q || !str(q.id) || !str(q.title).trim() || !prompts?.length) throw new Error('This code doesn’t contain a complete quest.');
    const existing = st.quests[q.id as string];
    if (existing?.role === 'owner') {
      throw new Error('This is an invitation you created on this device. Send it to the other person — they import it in their own Elsewhere.');
    }
    const from = str(p.from).slice(0, 80) || undefined;
    const answers = cleanAnswers(p.answers);
    const withAnswers = hasAnswers(answers);
    const at = nowISO();
    const kind = q.kind === 'challenge' || q.kind === 'project' ? q.kind : 'interpretation';
    // Without answers we still keep the inviter's name, with an empty answer set.
    const theirs = withAnswers ? { ...answers!, name: answers!.name || from || '' } : from ? { name: from, answers: {}, at } : existing?.theirs;
    const quest: TwoPersonQuest = {
      id: q.id as string,
      title: str(q.title).trim().slice(0, 200),
      intro: str(q.intro),
      kind,
      prompts,
      role: 'guest',
      mine: existing?.mine,
      theirs: withAnswers ? theirs : hasAnswers(existing?.theirs) ? existing!.theirs : theirs,
      createdAt: existing?.createdAt ?? at,
      updatedAt: at,
    };
    return { t: 'quest', quest, existing: !!existing, from, withAnswers };
  }

  if (p.t === 'quest-reply') {
    const q = st.quests[str(p.questId)];
    if (!q) {
      throw new Error('There’s no matching quest on this device. A reply code only works in the Elsewhere that has the quest it answers — the one where the invitation was created or imported.');
    }
    const answers = cleanAnswers(p.answers);
    if (!answers || !hasAnswers(answers)) throw new Error('This reply code doesn’t contain any answers.');
    if (q.mine && answers.at === q.mine.at && JSON.stringify(answers.answers) === JSON.stringify(q.mine.answers)) {
      throw new Error('This reply contains your own answers. Send it to the other person instead.');
    }
    return { t: 'quest-reply', questId: q.id, questTitle: q.title, answers, replacesAt: hasAnswers(q.theirs) ? q.theirs!.at : undefined };
  }

  throw new Error('This code is for something this version of Elsewhere doesn’t know how to import.');
}

export function ImportScreen() {
  const route = useRoute();
  const onboarded = useStore((s) => s.onboarded);
  const initial = route.query.get('d') ?? '';
  const [text, setText] = useState(initial);
  const [state, setState] = useState<State>({ s: 'idle' });
  const autoRan = useRef(false);

  const decode = async (input = text) => {
    if (!input.trim()) {
      setState({ s: 'error', message: 'Paste a share code first. Codes start with “ELSW1:”.' });
      return;
    }
    setState({ s: 'decoding' });
    try {
      const packet = await decodePacket(input);
      setState({ s: 'preview', plan: plan(packet) });
    } catch (e) {
      setState({ s: 'error', message: e instanceof Error ? e.message : 'This code couldn’t be read.' });
    }
  };

  // A link with ?d=<code> decodes straight away (nothing is saved until you confirm).
  useEffect(() => {
    if (initial && !autoRan.current) {
      autoRan.current = true;
      decode(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (!t) {
        toast('The clipboard is empty.');
        return;
      }
      setText(t);
      decode(t);
    } catch {
      toast('Couldn’t read the clipboard here — paste into the box instead.', { kind: 'error' });
    }
  };

  const confirm = () => {
    if (state.s !== 'preview') return;
    const p = state.plan;
    const st = useStore.getState();
    try {
      if (p.t === 'experience') {
        st.upsert('experiences', p.experience);
        setState({ s: 'done', title: p.experience.title, url: `/x/${p.experience.id}`, label: 'Open experience' });
      } else if (p.t === 'quest') {
        st.upsert('quests', p.quest);
        setState({ s: 'done', title: p.quest.title, url: `/quest/${p.quest.id}`, label: 'Open quest' });
      } else {
        const q = st.quests[p.questId];
        if (!q) throw new Error('The matching quest is no longer on this device.');
        st.patch('quests', p.questId, { theirs: p.answers, updatedAt: nowISO() });
        notifyNow('shared', 'Quest reply imported', `${p.answers.name || 'Someone'} answered “${q.title}”.`, { url: `/quest/${q.id}` });
        setState({ s: 'done', title: q.title, url: `/quest/${q.id}`, label: 'Compare answers' });
      }
      setText('');
    } catch (e) {
      setState({ s: 'error', message: e instanceof Error ? e.message : 'Import failed. Nothing was changed.' });
    }
  };

  return (
    <Screen title="Import a share code" eyebrow="Sharing" backTo="/journeys" subtitle="Bring in an experience, a quest invitation or a quest reply that someone sent you.">
      {!onboarded && (
        <div className="banner" role="note" style={{ marginBottom: 16 }}>
          <Info size={16} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
          <span>You can import before setting up Elsewhere. A few quick setup questions come afterwards.</span>
        </div>
      )}

      {state.s !== 'done' && (
        <form
          className="card stack j-form"
          onSubmit={(e) => {
            e.preventDefault();
            decode();
          }}
        >
          <label className="field">
            <span>Share code or message</span>
            <textarea
              className="textarea mono j-import-box"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (state.s !== 'idle' && state.s !== 'decoding') setState({ s: 'idle' });
              }}
              placeholder="ELSW1:…"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <small className="faint">Paste the whole message if you like — the code inside is found automatically. Decoding happens on this device.</small>
          </label>
          <div className="row wrap">
            <Button type="button" icon={<ClipboardPaste size={18} />} onClick={paste}>Paste</Button>
            <Button type="submit" variant="primary" className="grow" disabled={state.s === 'decoding'} aria-busy={state.s === 'decoding'}>
              {state.s === 'decoding' ? 'Reading code…' : 'Read code'}
            </Button>
          </div>
        </form>
      )}

      <div aria-live="polite">
        {state.s === 'error' && (
          <div className="banner error" role="alert" style={{ marginTop: 16 }}>
            <span>
              <strong>Couldn’t import.</strong> {state.message}
            </span>
          </div>
        )}

        {state.s === 'preview' && (
          <Section title="What will be imported">
            <Preview plan={state.plan} />
            <div className="row" style={{ marginTop: 16 }}>
              <Button className="grow" onClick={() => setState({ s: 'idle' })}>Cancel</Button>
              <Button className="grow" variant="primary" icon={<Download size={18} />} onClick={confirm}>
                {state.plan.t === 'quest' && state.plan.existing ? 'Update quest' : state.plan.t === 'quest-reply' ? 'Import answers' : 'Import'}
              </Button>
            </div>
          </Section>
        )}

        {state.s === 'done' && (
          <div className="card tinted" style={{ marginTop: 8 }}>
            <div className="label accent row" style={{ gap: 6 }}><Check size={14} aria-hidden /> Imported</div>
            <h2 className="display t-lg" style={{ margin: '8px 0 14px' }}>{state.title}</h2>
            <div className="row wrap">
              {onboarded ? (
                <Button variant="primary" icon={<ArrowRight size={18} />} onClick={() => navigate(state.url, { replace: true })}>{state.label}</Button>
              ) : (
                <Button variant="primary" icon={<ArrowRight size={18} />} onClick={() => navigate('/discover', { replace: true })}>Set up Elsewhere</Button>
              )}
              <Button onClick={() => setState({ s: 'idle' })}>Import another</Button>
            </div>
            {!onboarded && <p className="small muted" style={{ margin: '12px 0 0' }}>It’s saved on this device. You’ll find it after setup.</p>}
          </div>
        )}
      </div>
    </Screen>
  );
}

function Preview({ plan: p }: { plan: Plan }) {
  if (p.t === 'experience') {
    const e = p.experience;
    return (
      <article className="card j-wrap">
        <div className="label accent">{formatMeta(e.format).label} · Shared with you</div>
        <h3 className="display t-md" style={{ margin: '6px 0' }}>{e.title}</h3>
        {e.summary && <p className="muted" style={{ margin: '0 0 10px' }}>{e.summary}</p>}
        <MetaLine e={e} showFormat={false} />
        <ul className="j-preview-notes small muted">
          {p.from && <li>From {p.from}</li>}
          <li>Saved to your library, labelled “Shared with you”. Only on this device.</li>
          {p.replaces && <li>Replaces the copy you imported earlier.</li>}
          {p.renamed && <li>Saved as a separate copy so it doesn’t clash with something you already have.</li>}
        </ul>
      </article>
    );
  }
  if (p.t === 'quest') {
    const q = p.quest;
    return (
      <article className="card j-wrap">
        <div className="label accent row" style={{ gap: 6 }}><Users size={14} aria-hidden /> Two-person quest invitation</div>
        <h3 className="display t-md" style={{ margin: '6px 0' }}>{q.title}</h3>
        {q.intro && <p className="muted" style={{ margin: '0 0 10px' }}>{q.intro}</p>}
        <ol className="j-preview-prompts small">
          {q.prompts.map((pr) => (
            <li key={pr.id}>{pr.text}</li>
          ))}
        </ol>
        <ul className="j-preview-notes small muted">
          <li>{p.from ? `From ${p.from}.` : 'Sender didn’t add a name.'}</li>
          <li>{p.withAnswers ? 'Their answers are included — you can compare once you’ve answered.' : 'Their answers aren’t included. They can send them later as a reply code.'}</li>
          {p.existing && <li>You imported this quest before. Your own answers are kept.</li>}
          <li>Nothing syncs automatically: you’ll send your answers back as a code.</li>
        </ul>
      </article>
    );
  }
  const n = Object.values(p.answers.answers).filter((v) => v.trim()).length;
  return (
    <article className="card j-wrap">
      <div className="label accent row" style={{ gap: 6 }}><Users size={14} aria-hidden /> Quest reply</div>
      <h3 className="display t-md" style={{ margin: '6px 0' }}>{p.answers.name || 'Someone'}’s answers to “{p.questTitle}”</h3>
      <ul className="j-preview-notes small muted">
        <li>{n} answer{n === 1 ? '' : 's'}, written {fmtDate(p.answers.at)}.</li>
        {p.replacesAt && <li>Replaces the answers you imported from them on {fmtDate(p.replacesAt)}.</li>}
        <li>After importing, both answer sets appear side by side in the quest.</li>
      </ul>
    </article>
  );
}
