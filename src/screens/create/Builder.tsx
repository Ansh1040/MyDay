// Experience Builder — create quests/challenges, quizzes, experiments, learning journeys, writing prompts and
// reflections. Drafts autosave (store.drafts "builder:<id>"); Save publishes to "my library" (store.experiences).
// Sharing packs the experience into a text code (no server) that a friend imports via You → Import.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, Copy, Ellipsis, Eye, Hammer, Pencil, Play, Plus, Share2, Shuffle, Trash2, TriangleAlert, X,
} from 'lucide-react';
import type {
  Area, Comfort, Cost, DebatePayload, Energy, Experience, FormatKey, Origin, QuizPayload, QuizQuestion, Ref, Social,
  Step, StepsPayload, WritingPayload,
} from '../../data/types';
import { useStore } from '../../store/store';
import { nowISO, relTime, uid } from '../../lib/id';
import { navigate, back, useRoute, replaceUrlSilently } from '../../lib/router';
import { encodePacket, composeShareMessage, shareText } from '../../lib/share';
import { formatMeta } from '../../formats/meta';
import { getExperience } from '../../data/catalog';
import { Button, EmptyState, Field, IconButton, Screen, Section, Segmented, Sheet, Tag, confirmDialog, toast } from '../../components/ui';
import { COMFORT_LABEL, OriginTag } from '../../components/common';
import { TopicPicker, useFlushOnHide } from './FieldNotes';
import '../../styles/create.css';

// ---------------------------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------------------------

type EditorKind = 'steps' | 'quiz' | 'prompt' | 'debate' | 'other';
const STEP_FORMATS = ['challenge', 'experiment', 'journey', 'project', 'outdoor', 'collab', 'steps'];
export function editorFor(f: FormatKey): EditorKind {
  if (STEP_FORMATS.includes(f)) return 'steps';
  if (f === 'quiz') return 'quiz';
  if (f === 'writing' || f === 'reflection') return 'prompt';
  if (f === 'debate') return 'debate';
  return 'other';
}

const TYPES: { format: FormatKey; label: string; hint: string }[] = [
  { format: 'challenge', label: 'Quest / challenge', hint: 'Real-world steps to do in order. Any step can have a timer or ask for a photo, note or choice.' },
  { format: 'quiz', label: 'Quiz or poll', hint: 'Questions with options. Mark a correct answer, or leave it as a poll with no right answer.' },
  { format: 'experiment', label: 'Experiment', hint: 'Guess, try, observe. Steps can have timers and inputs for recording what happened.' },
  { format: 'journey', label: 'Learning journey', hint: 'A multi-step path that can be spread over several sessions.' },
  { format: 'writing', label: 'Writing prompt', hint: 'One prompt, an optional word goal and a few hints.' },
  { format: 'reflection', label: 'Reflection', hint: 'A prompt for looking inward, with optional hints.' },
];
const MORE_TYPES: { format: FormatKey; label: string; hint: string }[] = [
  { format: 'project', label: 'Project', hint: 'A hands-on thing to make, step by step.' },
  { format: 'outdoor', label: 'Outdoors', hint: 'A walk or exploration outside, step by step.' },
  { format: 'collab', label: 'Together', hint: 'Steps for two or more people.' },
  { format: 'debate', label: 'Conversation', hint: 'A question and sides to argue from.' },
];

const INPUTS: { value: NonNullable<Step['input']>; label: string }[] = [
  { value: 'none', label: 'No input' },
  { value: 'text', label: 'Text answer' },
  { value: 'choice', label: 'Multiple choice' },
  { value: 'sketch', label: 'Sketch' },
  { value: 'photo', label: 'Photo' },
  { value: 'audio', label: 'Voice recording' },
];

interface BForm {
  format: FormatKey;
  title: string;
  summary: string;
  topics: string[];
  minutes: string;
  energy: Energy;
  comfort: Comfort;
  cost: Cost;
  social: Social;
  timerOn: boolean;
  timerMinutes: string;
  followUps: string[];
  steps: Step[];
  questions: QuizQuestion[];
  prompt: string;
  minWords: string;
  hints: string[];
  question: string;
  sides: { label: string; argument: string }[];
  visibility: 'private' | 'friends';
  // carried through unchanged
  origin: Origin;
  area: Area;
  createdAt: string;
  remixOf?: Ref;
  skillId?: string;
  related?: string[];
  extraSteps?: Step[];
  rawPayload?: unknown;
}
interface BuilderDraftData { v: 1; form: BForm }

const newStep = (): Step => ({ id: uid('st-'), title: '', body: '', input: 'none' });
const newQuestion = (): QuizQuestion => ({ id: uid('qq-'), prompt: '', options: ['', ''], answer: 0 });

function blankForm(): BForm {
  return {
    format: 'challenge', title: '', summary: '', topics: [], minutes: '15', energy: 2, comfort: 2, cost: 0, social: 'solo',
    timerOn: false, timerMinutes: '10', followUps: [], steps: [newStep()], questions: [newQuestion()], prompt: '', minWords: '', hints: [],
    question: '', sides: [{ label: 'For', argument: '' }, { label: 'Against', argument: '' }], visibility: 'private',
    origin: 'user', area: 'general', createdAt: nowISO(),
  };
}

function fromExperience(e: Experience): BForm {
  const b = blankForm();
  const p = (e.payload && typeof e.payload === 'object' ? e.payload : {}) as Partial<StepsPayload & QuizPayload & WritingPayload & DebatePayload>;
  const kind = editorFor(e.format);
  const withIds = (steps: Step[]) => steps.map((s) => ({ ...s, id: s.id || uid('st-'), title: s.title ?? '', body: s.body ?? '' }));
  return {
    ...b,
    format: e.format,
    title: e.title ?? '',
    summary: e.summary ?? '',
    topics: e.topics ?? [],
    minutes: String(e.minutes ?? 15),
    energy: e.energy ?? 2,
    comfort: e.comfort ?? 2,
    cost: e.cost ?? 0,
    social: e.social ?? 'solo',
    timerOn: !!e.timerMinutes,
    timerMinutes: e.timerMinutes ? String(e.timerMinutes) : '10',
    followUps: e.followUps ?? [],
    steps: kind === 'steps' ? withIds(Array.isArray(p.steps) ? p.steps : e.steps ?? []) : b.steps,
    extraSteps: kind === 'steps' ? undefined : e.steps,
    questions: Array.isArray(p.questions) && p.questions.length ? p.questions.map((q) => ({ ...q, id: q.id || uid('qq-'), options: q.options ?? ['', ''] })) : b.questions,
    prompt: typeof p.prompt === 'string' ? p.prompt : '',
    minWords: p.minWords ? String(p.minWords) : '',
    hints: Array.isArray(p.hints) ? p.hints : [],
    question: typeof p.question === 'string' ? p.question : '',
    sides: Array.isArray(p.sides) && p.sides.length ? p.sides : b.sides,
    visibility: e.visibility ?? 'private',
    origin: e.origin ?? 'user',
    area: e.area ?? 'general',
    createdAt: e.createdAt ?? nowISO(),
    remixOf: e.remixOf,
    skillId: e.skillId,
    related: e.related,
    rawPayload: kind === 'other' ? e.payload : undefined,
  };
}

const cleanList = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);

function toExperience(f: BForm, id: string): Experience {
  let payload: unknown;
  switch (editorFor(f.format)) {
    case 'steps':
      payload = {
        steps: f.steps.map((s) => ({
          id: s.id,
          title: s.title.trim(),
          body: s.body.trim(),
          input: s.input ?? 'none',
          ...(s.input === 'choice' ? { choices: cleanList(s.choices ?? []) } : {}),
          ...(s.timerMinutes && s.timerMinutes > 0 ? { timerMinutes: s.timerMinutes } : {}),
        })),
      } satisfies StepsPayload;
      break;
    case 'quiz':
      payload = {
        questions: f.questions.map((q) => {
          const kept = q.options.map((o, i) => ({ o: o.trim(), i })).filter((x) => x.o);
          const answer = q.answer === undefined ? undefined : kept.findIndex((x) => x.i === q.answer);
          return { id: q.id, prompt: q.prompt.trim(), options: kept.map((x) => x.o), ...(answer !== undefined && answer >= 0 ? { answer } : {}), ...(q.explain?.trim() ? { explain: q.explain.trim() } : {}) };
        }),
      } satisfies QuizPayload;
      break;
    case 'prompt': {
      const w: WritingPayload = { prompt: f.prompt.trim(), ...(Number(f.minWords) > 0 ? { minWords: Math.round(Number(f.minWords)) } : {}), hints: cleanList(f.hints) };
      // Reflections are played by the step player, so include an equivalent single step alongside the prompt.
      payload = f.format === 'reflection'
        ? ({ ...w, steps: [{ id: 'reflect', title: f.title.trim() || 'Reflect', body: w.prompt + (w.hints?.length ? `\n\n${w.hints.map((h) => `• ${h}`).join('\n')}` : ''), input: 'text' }] } satisfies WritingPayload & StepsPayload)
        : w;
      break;
    }
    case 'debate':
      payload = { question: f.question.trim(), sides: f.sides.filter((s) => s.label.trim()).map((s) => ({ label: s.label.trim(), argument: s.argument.trim() })) } satisfies DebatePayload;
      break;
    default:
      payload = f.rawPayload;
  }
  return {
    id,
    title: f.title.trim(),
    summary: f.summary.trim(),
    area: f.area,
    format: f.format,
    topics: f.topics,
    minutes: Math.round(Number(f.minutes)),
    energy: f.energy,
    comfort: f.comfort,
    cost: f.cost,
    social: f.social,
    origin: f.origin,
    payload,
    ...(f.extraSteps?.length ? { steps: f.extraSteps } : {}),
    ...(f.timerOn ? { timerMinutes: Number(f.timerMinutes) } : {}),
    ...(f.skillId ? { skillId: f.skillId } : {}),
    ...(f.related ? { related: f.related } : {}),
    ...(f.remixOf ? { remixOf: f.remixOf } : {}),
    followUps: cleanList(f.followUps),
    createdAt: f.createdAt,
    visibility: f.visibility,
  };
}

type Errors = Record<string, string>;
function validate(f: BForm): Errors {
  const e: Errors = {};
  if (f.title.trim().length < 3) e.title = 'Give it a title of at least 3 characters.';
  const m = Number(f.minutes);
  if (!f.minutes.trim() || !Number.isFinite(m) || m < 1 || m > 600) e.minutes = 'Enter a time from 1 to 600 minutes.';
  if (f.timerOn) {
    const t = Number(f.timerMinutes);
    if (!f.timerMinutes.trim() || !Number.isFinite(t) || t < 0.5 || t > 600) e.timer = 'The timer can be 0.5 to 600 minutes.';
  }
  switch (editorFor(f.format)) {
    case 'steps':
      if (!f.steps.length) e.steps = 'Add at least one step.';
      f.steps.forEach((s) => {
        if (!s.title.trim()) e[`step.${s.id}.title`] = 'Each step needs a short title.';
        if (s.timerMinutes !== undefined && (!Number.isFinite(s.timerMinutes) || s.timerMinutes < 0.5 || s.timerMinutes > 180)) e[`step.${s.id}.timer`] = 'Step timers can be 0.5 to 180 minutes.';
        if (s.input === 'choice' && cleanList(s.choices ?? []).length < 2) e[`step.${s.id}.choices`] = 'Add at least two choices.';
      });
      break;
    case 'quiz':
      if (!f.questions.length) e.questions = 'Add at least one question.';
      f.questions.forEach((q) => {
        if (!q.prompt.trim()) e[`q.${q.id}.prompt`] = 'Write the question.';
        if (cleanList(q.options).length < 2) e[`q.${q.id}.options`] = 'Add at least two options.';
        else if (q.answer !== undefined && !q.options[q.answer]?.trim()) e[`q.${q.id}.answer`] = 'Pick which option is correct (or make it a poll).';
      });
      break;
    case 'prompt': {
      if (!f.prompt.trim()) e.prompt = 'Write the prompt.';
      const w = Number(f.minWords);
      if (f.minWords.trim() && (!Number.isFinite(w) || w < 1 || w > 5000)) e.minWords = 'Word goal can be 1 to 5000, or empty.';
      break;
    }
    case 'debate':
      if (!f.question.trim()) e.question = 'Write the question to discuss.';
      if (f.sides.filter((s) => s.label.trim()).length < 2) e.sides = 'Add at least two sides with a label.';
      break;
  }
  return e;
}

const move = <T,>(arr: T[], i: number, d: -1 | 1): T[] => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = arr.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

// ---------------------------------------------------------------------------------------------
// Sharing (no server — a text code)
// ---------------------------------------------------------------------------------------------

/** Copy text to the clipboard with a fallback for older WebViews. */
export async function copyText(text: string, fallbackEl?: HTMLTextAreaElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (fallbackEl) {
      fallbackEl.focus();
      fallbackEl.select();
      try {
        return document.execCommand('copy');
      } catch {
        return false;
      }
    }
    return false;
  }
}

export function ShareSheet({ exp, onClose }: { exp: Experience | null; onClose: () => void }) {
  const name = useStore((s) => s.prefs.name);
  const [code, setCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setCode(null);
    setErr(null);
    if (!exp) return;
    let alive = true;
    // Local links (remixOf) mean nothing on a friend's device, so they're left out.
    const { remixOf: _omit, ...rest } = exp;
    encodePacket({ t: 'experience', v: 1, experience: { ...rest, origin: 'shared', visibility: 'friends' }, from: name.trim() || undefined })
      .then((c) => alive && setCode(c))
      .catch(() => alive && setErr('The share code couldn’t be created on this device.'));
    return () => {
      alive = false;
    };
  }, [exp, name]);

  const message = code && exp ? composeShareMessage(`I made an Elsewhere experience for you: “${exp.title}”.`, code) : '';
  const doShare = async () => {
    if (!exp || !message) return;
    setBusy(true);
    const r = await shareText(`Elsewhere: ${exp.title}`, message);
    setBusy(false);
    if (r === 'copied') toast('Message copied — paste it into any app.');
    else if (r === 'failed') toast('Sharing was cancelled or isn’t available. Copy the code instead.', { kind: 'error' });
  };
  const doCopy = async () => {
    if (!code) return;
    const ok = await copyText(code, area.current);
    toast(ok ? 'Share code copied' : 'Couldn’t copy automatically — select the code and copy it.', ok ? {} : { kind: 'error' });
  };

  return (
    <Sheet open={!!exp} onClose={onClose} title="Share for friends">
      <p className="muted" style={{ marginTop: 0 }}>
        No server is involved. The whole experience is packed into the code below — send it any way you like. Your friend opens Elsewhere, goes to <strong>You → Import</strong> (also under Journeys) and pastes it.
      </p>
      {err ? (
        <div className="banner error" role="alert"><TriangleAlert size={16} aria-hidden /> <span>{err}</span></div>
      ) : !code ? (
        <div className="skeleton" style={{ height: 96 }} aria-label="Creating share code" />
      ) : (
        <>
          <label className="field">
            <span>Share code</span>
            <textarea ref={area} className="textarea cr-code" readOnly value={code} rows={4} onFocus={(e) => e.currentTarget.select()} />
          </label>
          <p className="tiny faint" style={{ margin: '6px 0 0' }}>{code.length.toLocaleString()} characters. Anyone with the code can import a copy; they can’t see anything else of yours.</p>
          <div className="row" style={{ marginTop: 16 }}>
            <Button className="grow" icon={<Copy size={18} aria-hidden />} onClick={doCopy}>Copy code</Button>
            <Button className="grow" variant="primary" icon={<Share2 size={18} aria-hidden />} onClick={doShare} disabled={busy}>Share…</Button>
          </div>
        </>
      )}
    </Sheet>
  );
}

/** Ensure an experience is marked "For friends" (asking first), then return the up-to-date copy. */
async function prepareShare(exp: Experience): Promise<Experience | null> {
  if (exp.visibility === 'friends') return exp;
  const ok = await confirmDialog({
    title: 'Share with friends?',
    body: 'This marks it “For friends” and creates a share code. Nothing is uploaded — you send the code yourself.',
    confirmLabel: 'Mark for friends',
  });
  if (!ok) return null;
  useStore.getState().patch('experiences', exp.id, { visibility: 'friends' });
  return useStore.getState().experiences[exp.id] ?? null;
}

// ---------------------------------------------------------------------------------------------
// Library list
// ---------------------------------------------------------------------------------------------

function duplicate(e: Experience): Experience {
  const copy: Experience = { ...structuredClone(e), id: uid('u-'), title: `${e.title} (copy)`, origin: 'user', createdAt: nowISO(), visibility: 'private' };
  delete copy.remixOf;
  useStore.getState().upsert('experiences', copy);
  return copy;
}

export async function deleteExperience(e: Experience): Promise<boolean> {
  const ok = await confirmDialog({ title: `Delete “${e.title}”?`, body: 'It will be removed from your library on this device. Copies you already shared with friends are not affected.', confirmLabel: 'Delete', danger: true });
  if (!ok) return false;
  const st = useStore.getState();
  st.remove('experiences', e.id);
  st.clearDraft(`builder:${e.id}`);
  if (st.saved.includes(e.id)) st.toggleSave(e.id);
  toast('Deleted');
  return true;
}

export function BuilderListScreen() {
  const experiences = useStore((s) => s.experiences);
  const drafts = useStore((s) => s.drafts);
  const [menu, setMenu] = useState<Experience | null>(null);
  const [sharing, setSharing] = useState<Experience | null>(null);

  const list = useMemo(() => Object.values(experiences).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')), [experiences]);
  const draftOnly = useMemo(
    () => Object.values(drafts).filter((d) => d.key.startsWith('builder:') && !experiences[d.key.slice(8)]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [drafts, experiences],
  );
  const groups: { origin: Origin; title: string }[] = [
    { origin: 'user', title: 'Made by you' },
    { origin: 'remix', title: 'Remixes' },
    { origin: 'shared', title: 'Shared with you' },
  ];
  const menuExp = menu ? experiences[menu.id] ?? null : null;

  const startShare = async (e: Experience) => {
    const ready = await prepareShare(e);
    if (ready) setSharing(ready);
  };

  return (
    <Screen
      title="Experience Builder"
      eyebrow="Create"
      backTo="/create"
      subtitle="Quests, quizzes, experiments, journeys and prompts — private, or for friends."
      actions={<IconButton label="New experience" onClick={() => navigate('/builder/new')}><Plus size={22} /></IconButton>}
    >
      <div className="row wrap" style={{ marginTop: 4 }}>
        <Button variant="primary" icon={<Plus size={18} aria-hidden />} onClick={() => navigate('/builder/new')}>New experience</Button>
        <Button icon={<Shuffle size={18} aria-hidden />} onClick={() => navigate('/remix')}>Remix something</Button>
      </div>

      {draftOnly.length > 0 && (
        <Section title="Unsaved drafts">
          <div className="list">
            {draftOnly.map((d) => {
              const id = d.key.slice(8);
              const f = (d.data as BuilderDraftData | undefined)?.form;
              return (
                <div key={d.key} className="list-row">
                  <button type="button" className="cr-row-btn grow" onClick={() => navigate(`/builder/${id}`)}>
                    <span className="lr-title" style={{ display: 'block' }}>{f?.title.trim() || 'Untitled draft'}</span>
                    <span className="lr-sub">{f ? formatMeta(f.format).label : 'Draft'} · edited {relTime(d.updatedAt)}</span>
                  </button>
                  <IconButton
                    label={`Discard draft ${f?.title.trim() || 'Untitled'}`}
                    onClick={async () => {
                      if (await confirmDialog({ title: 'Discard this draft?', body: 'It hasn’t been saved to your library.', confirmLabel: 'Discard', danger: true })) {
                        useStore.getState().clearDraft(d.key);
                        toast('Draft discarded');
                      }
                    }}
                  >
                    <X size={18} />
                  </IconButton>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {list.length === 0 && draftOnly.length === 0 && (
        <EmptyState
          icon={<Hammer size={24} />}
          title="Nothing built yet"
          body="Make a quest, quiz, experiment, journey or prompt from scratch — or remix something you’ve explored."
          action={<Button variant="primary" onClick={() => navigate('/builder/new')}>Build an experience</Button>}
        />
      )}

      {groups.map((g) => {
        const items = list.filter((e) => (e.origin === g.origin) || (g.origin === 'user' && e.origin === 'curated'));
        if (!items.length) return null;
        return (
          <Section key={g.origin} title={`${g.title} · ${items.length}`}>
            <div className="stack">
              {items.map((e) => {
                const F = formatMeta(e.format);
                const hasDraft = !!drafts[`builder:${e.id}`];
                return (
                  <article key={e.id} className="card cr-made">
                    <div className="row between" style={{ gap: 8, alignItems: 'flex-start' }}>
                      <span className="label accent row" style={{ gap: 6 }}><F.icon size={14} aria-hidden /> {F.label}</span>
                      <span className="row wrap" style={{ gap: 6, justifyContent: 'flex-end' }}>
                        <OriginTag origin={e.origin} />
                        <Tag>{e.visibility === 'friends' ? 'For friends' : 'Private'}</Tag>
                      </span>
                    </div>
                    <h3 className="display t-md" style={{ margin: '10px 0 6px' }}>{e.title}</h3>
                    {e.summary && <p className="muted small" style={{ margin: 0 }}>{e.summary}</p>}
                    {hasDraft && <p className="small" style={{ margin: '8px 0 0' }}><span className="tag accent">Unpublished changes</span></p>}
                    <div className="row" style={{ marginTop: 14, gap: 8 }}>
                      <Button size="sm" variant="primary" icon={<Play size={16} aria-hidden />} onClick={() => navigate(`/x/${e.id}`)}>Start</Button>
                      <Button size="sm" icon={<Pencil size={16} aria-hidden />} onClick={() => navigate(`/builder/${e.id}`)}>Edit</Button>
                      <span className="grow" />
                      <IconButton label={`More actions for ${e.title}`} onClick={() => setMenu(e)}><Ellipsis size={20} /></IconButton>
                    </div>
                  </article>
                );
              })}
            </div>
          </Section>
        );
      })}

      <Sheet open={!!menuExp} onClose={() => setMenu(null)} title={menuExp?.title ?? 'Experience'}>
        {menuExp && (
          <div className="list">
            <button type="button" className="list-row" onClick={() => { setMenu(null); navigate(`/builder/${menuExp.id}`); }}>
              <span className="lr-icon"><Pencil size={18} aria-hidden /></span><span className="grow lr-title">Edit</span>
            </button>
            <button type="button" className="list-row" onClick={() => { const c = duplicate(menuExp); setMenu(null); toast(`Duplicated as “${c.title}”`, { action: { label: 'Edit', run: () => navigate(`/builder/${c.id}`) } }); }}>
              <span className="lr-icon"><Copy size={18} aria-hidden /></span><span className="grow lr-title">Duplicate</span>
            </button>
            <button type="button" className="list-row" onClick={() => { const e = menuExp; setMenu(null); startShare(e); }}>
              <span className="lr-icon"><Share2 size={18} aria-hidden /></span>
              <span className="grow"><span className="lr-title" style={{ display: 'block' }}>Share for friends</span><span className="lr-sub">Creates a code — no server involved</span></span>
            </button>
            <button type="button" className="list-row" onClick={() => { const e = menuExp; setMenu(null); deleteExperience(e); }}>
              <span className="lr-icon cr-danger-icon"><Trash2 size={18} aria-hidden /></span><span className="grow lr-title cr-danger-text">Delete</span>
            </button>
          </div>
        )}
      </Sheet>
      <ShareSheet exp={sharing} onClose={() => setSharing(null)} />
    </Screen>
  );
}

// ---------------------------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------------------------

export function BuilderScreen({ id }: { id: string }) {
  const route = useRoute();
  // A new id for every navigation to /builder/new — the screen isn't remounted when the path is unchanged,
  // and reusing the id would reopen (and overwrite) the experience made just before.
  const [fresh, setFresh] = useState(() => ({ route, id: uid('u-') }));
  if (fresh.route !== route) setFresh({ route, id: uid('u-') });
  const newId = fresh.id;
  const exists = useStore((s) => (id !== 'new' ? !!s.experiences[id] || !!s.drafts[`builder:${id}`] : true));
  const seen = useRef(false);
  if (exists) seen.current = true;
  if (id !== 'new' && !exists) {
    if (seen.current) return null; // just deleted from inside the editor
    const curated = getExperience(id);
    return (
      <Screen title="Experience Builder" backTo="/builder">
        <EmptyState
          title={curated ? 'Curated experiences can’t be edited' : 'Not found'}
          body={curated ? 'You can remix it into your own version instead.' : 'This experience may have been deleted.'}
          action={
            curated ? (
              <Button variant="primary" icon={<Shuffle size={18} aria-hidden />} onClick={() => navigate(`/remix?from=experience:${encodeURIComponent(id)}`, { replace: true })}>Remix it</Button>
            ) : (
              <Button variant="primary" onClick={() => navigate('/builder', { replace: true })}>Your creations</Button>
            )
          }
        />
      </Screen>
    );
  }
  return <BuilderEditor key={id === 'new' ? newId : id} id={id === 'new' ? newId : id} fromNewRoute={id === 'new'} />;
}

function BuilderEditor({ id, fromNewRoute }: { id: string; fromNewRoute: boolean }) {
  const draftKey = `builder:${id}`;
  const inLibrary = useStore((s) => !!s.experiences[id]);
  const draftAt = useStore((s) => s.drafts[draftKey]?.updatedAt);
  const [restored] = useState(() => {
    const d = useStore.getState().drafts[draftKey];
    return d && (d.data as BuilderDraftData | undefined)?.form ? d.updatedAt : null;
  });
  const [form, setForm] = useState<BForm>(() => {
    const st = useStore.getState();
    const d = st.drafts[draftKey]?.data as BuilderDraftData | undefined;
    if (d?.form) return { ...blankForm(), ...d.form };
    const e = st.experiences[id];
    return e ? fromExperience(e) : blankForm();
  });
  const [showRestored, setShowRestored] = useState(!!restored && inLibrary);
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(() => MORE_TYPES.some((t) => t.format === form.format));
  const [sharing, setSharing] = useState<Experience | null>(null);
  const formRef = useRef(form);
  formRef.current = form;
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);

  const errors = useMemo(() => validate(form), [form]);
  const err = (key: string) => (attempted || touched.has(key) ? errors[key] : undefined);
  const touch = (key: string) => setTouched((t) => (t.has(key) ? t : new Set(t).add(key)));
  const errCount = Object.keys(errors).length;

  const writeDraft = () => {
    useStore.getState().saveDraft(draftKey, { v: 1, form: formRef.current } satisfies BuilderDraftData);
    pending.current = false;
    if (mounted.current && fromNewRoute && location.hash.startsWith('#/builder/new')) replaceUrlSilently(`/builder/${id}`);
  };

  const edit = (fn: (f: BForm) => BForm) => {
    pending.current = true;
    setForm((f) => fn(f));
  };
  const set = <K extends keyof BForm>(k: K, v: BForm[K]) => edit((f) => ({ ...f, [k]: v }));

  // Autosave the draft 600ms after the last change.
  useEffect(() => {
    if (!pending.current) return;
    setSaving(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      writeDraft();
      setSaving(false);
    }, 600);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (pending.current) writeDraft();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Reload / app hidden mid-debounce: no unmount happens, so save the draft now.
  useFlushOnHide(() => { if (pending.current) { clearTimeout(timer.current); writeDraft(); setSaving(false); } });

  const save = (quiet = false): Experience | null => {
    const errs = validate(formRef.current);
    if (Object.keys(errs).length) {
      setAttempted(true);
      toast(`Fix ${Object.keys(errs).length} thing${Object.keys(errs).length === 1 ? '' : 's'} before saving.`, { kind: 'error' });
      setTimeout(() => document.querySelector<HTMLElement>('.cr-builder [aria-invalid="true"]')?.focus(), 60);
      return null;
    }
    clearTimeout(timer.current);
    pending.current = false;
    setSaving(false);
    const exp = toExperience(formRef.current, id);
    const st = useStore.getState();
    st.upsert('experiences', exp);
    st.clearDraft(draftKey);
    setShowRestored(false);
    if (fromNewRoute && location.hash.startsWith('#/builder/new')) replaceUrlSilently(`/builder/${id}`);
    if (!quiet) toast(inLibrary ? 'Changes saved to your library' : 'Saved to your library');
    return exp;
  };

  const preview = () => {
    const current = useStore.getState().experiences[id];
    const exp = current && !draftAt && !pending.current ? current : save(true);
    if (exp) navigate(`/x/${id}`);
  };

  const share = async () => {
    let exp: Experience | null = useStore.getState().experiences[id] ?? null;
    if (!exp || draftAt || pending.current) {
      exp = save(true);
      if (!exp) return;
    }
    if (formRef.current.visibility !== 'friends') {
      exp = await prepareShare(exp);
      if (!exp) return;
      setForm((f) => ({ ...f, visibility: 'friends' }));
    }
    setSharing(exp);
  };

  const discardChanges = async () => {
    const e = useStore.getState().experiences[id];
    if (!e) return;
    const ok = await confirmDialog({ title: 'Discard unpublished changes?', body: 'Your library version stays as it was.', confirmLabel: 'Discard', danger: true });
    if (!ok) return;
    clearTimeout(timer.current);
    pending.current = false;
    useStore.getState().clearDraft(draftKey);
    setForm(fromExperience(e));
    setShowRestored(false);
    setAttempted(false);
  };

  const remove = async () => {
    const e = useStore.getState().experiences[id];
    if (e) {
      if (!(await deleteExperience(e))) return;
    } else {
      const ok = await confirmDialog({ title: 'Discard this draft?', body: 'It hasn’t been saved to your library.', confirmLabel: 'Discard', danger: true });
      if (!ok) return;
      useStore.getState().clearDraft(draftKey);
      toast('Draft discarded');
    }
    clearTimeout(timer.current);
    pending.current = false;
    back('/builder');
  };

  const kind = editorFor(form.format);
  const typeInfo = [...TYPES, ...MORE_TYPES].find((t) => t.format === form.format);
  const statusText = saving ? 'Saving draft…' : draftAt ? (inLibrary ? 'Unpublished changes · draft autosaved' : 'Draft autosaved · not in your library yet') : inLibrary ? 'Saved to your library' : 'New — autosaves as a draft';

  return (
    <Screen
      title={inLibrary ? 'Edit experience' : 'New experience'}
      eyebrow="Experience Builder"
      backTo="/builder"
      subtitle={<span className="cr-status" role="status" aria-live="polite">{statusText}</span>}
    >
      <div className="cr-builder">
        {showRestored && restored && (
          <div className="banner" style={{ marginTop: 10 }}>
            <span className="grow">Restored unpublished changes from {relTime(restored)}.</span>
            <button type="button" className="btn ghost sm" onClick={discardChanges}>Discard</button>
          </div>
        )}
        {form.origin === 'remix' && <p className="small on-art cr-caption" style={{ margin: '10px 0 0' }}>Started from a template-generated remix — edit anything you like.</p>}

        {/* ---- type ---- */}
        <Section title="Type">
          <div className="card cr-form">
            <div className="cr-type-grid" role="radiogroup" aria-label="Experience type">
              {(showMore ? [...TYPES, ...MORE_TYPES] : TYPES).map((t) => {
                const F = formatMeta(t.format);
                const on = form.format === t.format;
                return (
                  <button key={t.format} type="button" role="radio" aria-checked={on} className="cr-type" onClick={() => set('format', t.format)}>
                    <F.icon size={18} aria-hidden />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
            {!showMore && <button type="button" className="btn ghost sm" style={{ marginTop: 6 }} onClick={() => setShowMore(true)}>More formats</button>}
            {typeInfo ? <p className="small muted" style={{ margin: '10px 0 0' }}>{typeInfo.hint}</p> : <p className="small muted" style={{ margin: '10px 0 0' }}>Format: {formatMeta(form.format).label}.</p>}
          </div>
        </Section>

        {/* ---- basics ---- */}
        <Section title="Basics">
          <div className="card cr-form stack">
            <Field label="Title">
              <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} onBlur={() => touch('title')} aria-invalid={!!err('title')} placeholder="e.g. The ten-minute sound walk" maxLength={120} />
            </Field>
            <FieldError msg={err('title')} />
            <Field label="Summary" hint="One or two sentences shown on the card.">
              <textarea className="textarea" rows={2} style={{ minHeight: 72 }} value={form.summary} onChange={(e) => set('summary', e.target.value)} maxLength={400} />
            </Field>
            <div className="field">
              <span>Topics</span>
              <TopicPicker value={form.topics} onChange={(t) => set('topics', t)} label="Experience topics" />
            </div>
          </div>
        </Section>

        {/* ---- content ---- */}
        <Section title={kind === 'quiz' ? 'Questions' : kind === 'steps' ? 'Steps' : kind === 'debate' ? 'Conversation' : 'Content'}>
          {kind === 'steps' && <StepsEditor steps={form.steps} onChange={(s) => set('steps', s)} err={err} touch={touch} listError={err('steps') ?? (attempted ? errors.steps : undefined)} />}
          {kind === 'quiz' && <QuizEditor questions={form.questions} onChange={(q) => set('questions', q)} err={err} touch={touch} listError={attempted ? errors.questions : undefined} />}
          {kind === 'prompt' && (
            <div className="card cr-form stack">
              <Field label={form.format === 'reflection' ? 'Reflection prompt' : 'Writing prompt'}>
                <textarea className="textarea" rows={4} value={form.prompt} onChange={(e) => set('prompt', e.target.value)} onBlur={() => touch('prompt')} aria-invalid={!!err('prompt')} placeholder={form.format === 'reflection' ? 'e.g. What did you notice about your attention today?' : 'e.g. Write the first page of a story set on your street, fifty years from now.'} />
              </Field>
              <FieldError msg={err('prompt')} />
              <Field label="Word goal (optional)">
                <input className="input" type="number" inputMode="numeric" min={1} max={5000} value={form.minWords} onChange={(e) => set('minWords', e.target.value)} onBlur={() => touch('minWords')} aria-invalid={!!err('minWords')} style={{ maxWidth: 160 }} />
              </Field>
              <FieldError msg={err('minWords')} />
              <StringList label="Hints" values={form.hints} onChange={(h) => set('hints', h)} placeholder="A hint to help get started" addLabel="Add hint" />
            </div>
          )}
          {kind === 'debate' && (
            <div className="stack">
              <div className="card cr-form stack sm">
                <Field label="Question">
                  <input className="input" value={form.question} onChange={(e) => set('question', e.target.value)} onBlur={() => touch('question')} aria-invalid={!!err('question')} placeholder="e.g. Is boredom useful?" />
                </Field>
                <FieldError msg={err('question')} />
              </div>
              {form.sides.map((s, i) => (
                <div key={i} className="card cr-step cr-form">
                  <div className="row between">
                    <span className="label">Side {i + 1}</span>
                    <IconButton label={`Remove side ${i + 1}`} disabled={form.sides.length <= 2} onClick={() => set('sides', form.sides.filter((_, j) => j !== i))}><X size={18} /></IconButton>
                  </div>
                  <div className="stack sm">
                    <input className="input" aria-label={`Side ${i + 1} label`} value={s.label} placeholder="Label, e.g. The skeptic" onChange={(e) => set('sides', form.sides.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <textarea className="textarea" rows={2} style={{ minHeight: 72 }} aria-label={`Side ${i + 1} argument or prompt`} value={s.argument} placeholder="The argument, or a prompt to argue from" onChange={(e) => set('sides', form.sides.map((x, j) => (j === i ? { ...x, argument: e.target.value } : x)))} />
                  </div>
                </div>
              ))}
              <FieldError onArt msg={attempted ? errors.sides : undefined} />
              <Button icon={<Plus size={18} aria-hidden />} onClick={() => set('sides', [...form.sides, { label: '', argument: '' }])}>Add side</Button>
            </div>
          )}
          {kind === 'other' && (
            <div className="banner">
              <span>The content of “{formatMeta(form.format).label}” experiences can’t be edited here. You can still change the details below — the content is kept as it is.</span>
            </div>
          )}
        </Section>

        {/* ---- details ---- */}
        <Section title="Details">
          <div className="card cr-form stack lg">
            <div className="grid-2">
              <Field label="Minutes">
                <input className="input" type="number" inputMode="numeric" min={1} max={600} value={form.minutes} onChange={(e) => set('minutes', e.target.value)} onBlur={() => touch('minutes')} aria-invalid={!!err('minutes')} />
              </Field>
              <div className="field">
                <span>Who</span>
                <Segmented<Social> label="Solo or shared" value={form.social} onChange={(v) => set('social', v)} options={[{ value: 'solo', label: 'Solo' }, { value: 'shared', label: 'Shared' }, { value: 'either', label: 'Either' }]} />
              </div>
            </div>
            <FieldError msg={err('minutes')} />
            <div className="field">
              <span>Energy</span>
              <Segmented<Energy> label="Energy" value={form.energy} onChange={(v) => set('energy', v)} options={[{ value: 1, label: 'Low' }, { value: 2, label: 'Medium' }, { value: 3, label: 'High' }]} />
            </div>
            <label className="field">
              <span>Comfort zone: {COMFORT_LABEL[form.comfort]}</span>
              <input type="range" className="range" min={1} max={5} step={1} value={form.comfort} onChange={(e) => set('comfort', Number(e.target.value) as Comfort)} aria-valuetext={COMFORT_LABEL[form.comfort]} />
              <small className="faint row between"><span>Familiar</span><span>Adventurous</span></small>
            </label>
            <div className="field">
              <span>Cost</span>
              <Segmented<Cost> label="Cost" value={form.cost} onChange={(v) => set('cost', v)} options={[{ value: 0, label: 'Free' }, { value: 1, label: 'Low cost' }, { value: 2, label: 'Some cost' }]} />
            </div>
            <div className="stack sm">
              <label className="row" style={{ minHeight: 44, cursor: 'pointer' }}>
                <input type="checkbox" className="cr-check" checked={form.timerOn} onChange={(e) => set('timerOn', e.target.checked)} />
                <span className="grow">Whole-experience timer</span>
              </label>
              {form.timerOn && (
                <>
                  <Field label="Timer minutes">
                    <input className="input" type="number" inputMode="decimal" min={0.5} max={600} step={0.5} value={form.timerMinutes} onChange={(e) => set('timerMinutes', e.target.value)} onBlur={() => touch('timer')} aria-invalid={!!err('timer')} style={{ maxWidth: 160 }} />
                  </Field>
                  <FieldError msg={err('timer')} />
                </>
              )}
            </div>
            <StringList label="Follow-ups" hint="Practical next actions, shown at the end." values={form.followUps} onChange={(v) => set('followUps', v)} placeholder="e.g. Try it again at night" addLabel="Add follow-up" />
          </div>
        </Section>

        {/* ---- visibility ---- */}
        <Section title="Visibility">
          <div className="card cr-form">
            <Segmented<'private' | 'friends'> label="Visibility" value={form.visibility} onChange={(v) => set('visibility', v)} options={[{ value: 'private', label: 'Private' }, { value: 'friends', label: 'For friends' }]} />
            <p className="small muted" style={{ margin: '10px 0 0' }}>
              {form.visibility === 'private'
                ? 'Only on this device. Nothing is shared.'
                : 'You can create a share code for friends. There’s no server: you send the code yourself, and they import it via You → Import.'}
            </p>
            {form.visibility === 'friends' && (
              <Button style={{ marginTop: 12 }} icon={<Share2 size={18} aria-hidden />} onClick={share}>Create share code</Button>
            )}
          </div>
        </Section>

        {/* ---- actions ---- */}
        <div className="card cr-builder-actions">
          {attempted && errCount > 0 && (
            <p className="small cr-err row" role="alert" style={{ margin: '0 0 10px', gap: 6 }}>
              <TriangleAlert size={14} aria-hidden /> {errCount} thing{errCount === 1 ? '' : 's'} to fix above.
            </p>
          )}
          <div className="row">
            <Button className="grow" variant="primary" onClick={() => save()}>{inLibrary ? 'Save changes' : 'Save to library'}</Button>
            <Button className="grow" icon={<Eye size={18} aria-hidden />} onClick={preview}>Preview</Button>
          </div>
          <p className="tiny faint" style={{ margin: '8px 0 0' }}>Preview saves your changes first so you can try it as a player would.</p>
          {(inLibrary || draftAt) && (
            <Button variant="danger" block style={{ marginTop: 20 }} icon={<Trash2 size={18} aria-hidden />} onClick={remove}>
              {inLibrary ? 'Delete experience' : 'Discard draft'}
            </Button>
          )}
        </div>
      </div>
      <ShareSheet exp={sharing} onClose={() => setSharing(null)} />
    </Screen>
  );
}

/** Inline validation message. `onArt` gives it a glass backing when it sits outside a panel. */
function FieldError({ msg, onArt }: { msg?: string; onArt?: boolean }) {
  if (!msg) return null;
  return <p className={'small cr-err' + (onArt ? ' on-art cr-caption' : '')} role="alert" style={onArt ? { margin: 0, alignSelf: 'flex-start' } : { margin: '-4px 0 0' }}>{msg}</p>;
}

function StringList({ label, hint, values, onChange, placeholder, addLabel }: { label: string; hint?: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; addLabel: string }) {
  return (
    <div className="field">
      <span>{label}</span>
      {hint && <small className="faint" style={{ marginTop: -4 }}>{hint}</small>}
      <div className="stack sm">
        {values.map((v, i) => (
          <div key={i} className="row" style={{ gap: 6 }}>
            <input className="input grow" value={v} placeholder={placeholder} aria-label={`${label} ${i + 1}`} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
            <IconButton label={`Remove ${label.toLowerCase()} ${i + 1}`} onClick={() => onChange(values.filter((_, j) => j !== i))}><X size={18} /></IconButton>
          </div>
        ))}
        <div>
          <Button size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => onChange([...values, ''])}>{addLabel}</Button>
        </div>
      </div>
    </div>
  );
}

function StepsEditor({ steps, onChange, err, touch, listError }: { steps: Step[]; onChange: (s: Step[]) => void; err: (k: string) => string | undefined; touch: (k: string) => void; listError?: string }) {
  const upd = (i: number, p: Partial<Step>) => onChange(steps.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const focusStep = (id: string) => setTimeout(() => document.getElementById(`step-title-${id}`)?.focus(), 30);
  return (
    <div className="stack">
      {steps.map((s, i) => {
        const tErr = err(`step.${s.id}.title`);
        const timerErr = err(`step.${s.id}.timer`);
        const cErr = err(`step.${s.id}.choices`);
        return (
          <div key={s.id} className="card cr-step cr-form">
            <div className="row between">
              <span className="label">Step {i + 1}</span>
              <span className="row" style={{ gap: 0 }}>
                <IconButton label={`Move step ${i + 1} up`} disabled={i === 0} onClick={() => onChange(move(steps, i, -1))}><ArrowUp size={18} /></IconButton>
                <IconButton label={`Move step ${i + 1} down`} disabled={i === steps.length - 1} onClick={() => onChange(move(steps, i, 1))}><ArrowDown size={18} /></IconButton>
                <IconButton label={`Remove step ${i + 1}`} disabled={steps.length <= 1} onClick={() => onChange(steps.filter((_, j) => j !== i))}><X size={18} /></IconButton>
              </span>
            </div>
            <div className="stack sm">
              <input id={`step-title-${s.id}`} className="input" aria-label={`Step ${i + 1} title`} placeholder="Step title" value={s.title} onChange={(e) => upd(i, { title: e.target.value })} onBlur={() => touch(`step.${s.id}.title`)} aria-invalid={!!tErr} />
              <FieldError msg={tErr} />
              <textarea className="textarea" rows={3} style={{ minHeight: 84 }} aria-label={`Step ${i + 1} instructions`} placeholder="What to do" value={s.body} onChange={(e) => upd(i, { body: e.target.value })} />
              <div className="grid-2">
                <label className="field">
                  <span>Timer (min)</span>
                  <input
                    className="input"
                    type="number"
                    inputMode="decimal"
                    min={0.5}
                    max={180}
                    step={0.5}
                    placeholder="None"
                    value={s.timerMinutes ?? ''}
                    onChange={(e) => upd(i, { timerMinutes: e.target.value === '' ? undefined : Number(e.target.value) })}
                    onBlur={() => touch(`step.${s.id}.timer`)}
                    aria-invalid={!!timerErr}
                  />
                </label>
                <label className="field">
                  <span>Asks for</span>
                  <select className="select" value={s.input ?? 'none'} onChange={(e) => upd(i, { input: e.target.value as Step['input'], choices: e.target.value === 'choice' ? (s.choices?.length ? s.choices : ['', '']) : s.choices })}>
                    {INPUTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
              <FieldError msg={timerErr} />
              {s.input === 'choice' && (
                <div className="stack sm" onBlur={() => touch(`step.${s.id}.choices`)}>
                  {(s.choices ?? []).map((c, ci) => (
                    <div key={ci} className="row" style={{ gap: 6 }}>
                      <input className="input grow" aria-label={`Step ${i + 1} choice ${ci + 1}`} placeholder={`Choice ${ci + 1}`} value={c} onChange={(e) => upd(i, { choices: (s.choices ?? []).map((x, k) => (k === ci ? e.target.value : x)) })} />
                      <IconButton label={`Remove choice ${ci + 1}`} onClick={() => upd(i, { choices: (s.choices ?? []).filter((_, k) => k !== ci) })}><X size={18} /></IconButton>
                    </div>
                  ))}
                  <div><Button size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => upd(i, { choices: [...(s.choices ?? []), ''] })}>Add choice</Button></div>
                  <FieldError msg={cErr} />
                </div>
              )}
            </div>
          </div>
        );
      })}
      <FieldError onArt msg={listError} />
      <Button icon={<Plus size={18} aria-hidden />} onClick={() => { const s = newStep(); onChange([...steps, s]); focusStep(s.id); }}>Add step</Button>
    </div>
  );
}

function QuizEditor({ questions, onChange, err, touch, listError }: { questions: QuizQuestion[]; onChange: (q: QuizQuestion[]) => void; err: (k: string) => string | undefined; touch: (k: string) => void; listError?: string }) {
  const upd = (i: number, p: Partial<QuizQuestion>) => onChange(questions.map((q, j) => (j === i ? { ...q, ...p } : q)));
  return (
    <div className="stack">
      {questions.map((q, i) => {
        const poll = q.answer === undefined;
        const pErr = err(`q.${q.id}.prompt`);
        const oErr = err(`q.${q.id}.options`) ?? err(`q.${q.id}.answer`);
        return (
          <div key={q.id} className="card cr-step cr-form">
            <div className="row between">
              <span className="label">Question {i + 1}</span>
              <span className="row" style={{ gap: 0 }}>
                <IconButton label={`Move question ${i + 1} up`} disabled={i === 0} onClick={() => onChange(move(questions, i, -1))}><ArrowUp size={18} /></IconButton>
                <IconButton label={`Move question ${i + 1} down`} disabled={i === questions.length - 1} onClick={() => onChange(move(questions, i, 1))}><ArrowDown size={18} /></IconButton>
                <IconButton label={`Remove question ${i + 1}`} disabled={questions.length <= 1} onClick={() => onChange(questions.filter((_, j) => j !== i))}><X size={18} /></IconButton>
              </span>
            </div>
            <div className="stack sm">
              <input className="input" aria-label={`Question ${i + 1}`} placeholder="Question" value={q.prompt} onChange={(e) => upd(i, { prompt: e.target.value })} onBlur={() => touch(`q.${q.id}.prompt`)} aria-invalid={!!pErr} />
              <FieldError msg={pErr} />
              <Segmented<'answer' | 'poll'>
                label={`Question ${i + 1} type`}
                value={poll ? 'poll' : 'answer'}
                onChange={(v) => upd(i, { answer: v === 'poll' ? undefined : 0 })}
                options={[{ value: 'answer', label: 'Has a right answer' }, { value: 'poll', label: 'Poll' }]}
              />
              <div className="stack sm" role={poll ? undefined : 'radiogroup'} aria-label={poll ? undefined : `Correct answer for question ${i + 1}`} onBlur={() => touch(`q.${q.id}.options`)}>
                {q.options.map((o, oi) => (
                  <div key={oi} className="row" style={{ gap: 6 }}>
                    {!poll && (
                      <label className="cr-hit">
                        <input type="radio" className="cr-check" name={`ans-${q.id}`} checked={q.answer === oi} onChange={() => upd(i, { answer: oi })} aria-label={`Option ${oi + 1} is correct`} />
                      </label>
                    )}
                    <input className="input grow" aria-label={`Question ${i + 1} option ${oi + 1}`} placeholder={`Option ${oi + 1}`} value={o} onChange={(e) => upd(i, { options: q.options.map((x, k) => (k === oi ? e.target.value : x)) })} />
                    <IconButton
                      label={`Remove option ${oi + 1}`}
                      disabled={q.options.length <= 2}
                      onClick={() => {
                        const options = q.options.filter((_, k) => k !== oi);
                        const answer = q.answer === undefined ? undefined : q.answer === oi ? 0 : q.answer > oi ? q.answer - 1 : q.answer;
                        upd(i, { options, answer });
                      }}
                    >
                      <X size={18} />
                    </IconButton>
                  </div>
                ))}
                <div><Button size="sm" icon={<Plus size={16} aria-hidden />} disabled={q.options.length >= 8} onClick={() => upd(i, { options: [...q.options, ''] })}>Add option</Button></div>
              </div>
              <FieldError msg={oErr} />
              <input className="input" aria-label={`Question ${i + 1} explanation (optional)`} placeholder="Explanation shown after answering (optional)" value={q.explain ?? ''} onChange={(e) => upd(i, { explain: e.target.value })} />
            </div>
          </div>
        );
      })}
      <FieldError onArt msg={listError} />
      <Button icon={<Plus size={18} aria-hidden />} onClick={() => onChange([...questions, newQuestion()])}>Add question</Button>
    </div>
  );
}
