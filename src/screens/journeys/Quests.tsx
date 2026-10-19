// Two-Person Quests. There is no account or server: the quest and each person's answers travel as share codes
// that people send through any messaging app. Nothing syncs automatically.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Download, Eye, Info, NotebookPen, Pencil, Plus, Send, Share2, Trash, Users, X } from 'lucide-react';
import type { QuestPrompt, QuestTemplate, TwoPersonQuest } from '../../data/types';
import { useStore } from '../../store/store';
import { QUEST_TEMPLATES, getQuestTemplate } from '../../data/catalog';
import { navigate, useRoute } from '../../lib/router';
import { Button, EmptyState, Field, IconButton, Screen, Section, Segmented, Sheet, Tag, Toggle, confirmDialog, toast, useAutosave } from '../../components/ui';
import { composeShareMessage, encodePacket, shareText, type SharePacket } from '../../lib/share';
import { nowISO, relTime, uid } from '../../lib/id';
import '../../styles/journeys.css';

export const QUEST_KIND_LABEL: Record<TwoPersonQuest['kind'], string> = {
  interpretation: 'Compare interpretations',
  challenge: 'Shared challenge',
  project: 'Small project together',
};

const NO_SERVER = 'No account or server — you exchange codes via any messaging app. Nothing syncs automatically.';

/** True when the set answers at least one of the quest's current prompts (prompts can be edited after answering). */
const hasAnswers = (set: TwoPersonQuest['mine'], prompts: QuestPrompt[]) => !!set && prompts.some((p) => set.answers[p.id]?.trim());

/** Short status used in lists and the Journeys hub. */
export function questStatus(q: TwoPersonQuest): { text: string; waiting: boolean } {
  const mine = hasAnswers(q.mine, q.prompts);
  const theirs = hasAnswers(q.theirs, q.prompts);
  if (mine && theirs) return { text: 'Both answered — compare', waiting: false };
  if (q.role === 'guest') return mine ? { text: 'Send your answers back', waiting: true } : { text: 'Your turn to answer', waiting: true };
  if (!mine) return { text: 'Answer your prompts, then invite someone', waiting: false };
  return { text: 'Awaiting their reply', waiting: true };
}

function newQuest(base: { title: string; intro: string; kind: TwoPersonQuest['kind']; prompts: QuestPrompt[] }): TwoPersonQuest {
  const at = nowISO();
  return {
    id: uid('qst-'),
    title: base.title.trim() || 'Untitled quest',
    intro: base.intro.trim(),
    kind: base.kind,
    prompts: base.prompts.filter((p) => p.text.trim()).map((p) => ({ ...p, text: p.text.trim(), choices: p.kind === 'choice' ? [...new Set((p.choices ?? []).map((c) => c.trim()).filter(Boolean))] : undefined })),
    role: 'owner',
    createdAt: at,
    updatedAt: at,
  };
}

function startFromTemplate(t: QuestTemplate) {
  const q = newQuest({ title: t.title, intro: t.intro, kind: t.kind, prompts: t.prompts.map((p) => ({ ...p, choices: p.choices ? [...p.choices] : undefined })) });
  useStore.getState().upsert('quests', q);
  return q.id;
}

// ---------------------------------------------------------------- list
interface EditorValue { title: string; intro: string; kind: TwoPersonQuest['kind']; prompts: QuestPrompt[] }
const blankEditor = (): EditorValue => ({ title: '', intro: '', kind: 'interpretation', prompts: [{ id: uid('qp-'), text: '', kind: 'text' }] });
const DRAFT_KEY = 'quest:new';

export function QuestsScreen() {
  const route = useRoute();
  const quests = useStore((s) => s.quests);
  const draft = useStore((s) => s.drafts[DRAFT_KEY]);
  const saveDraft = useStore((s) => s.saveDraft);
  const clearDraft = useStore((s) => s.clearDraft);
  const [creating, setCreating] = useState(false);
  const [tplError, setTplError] = useState<string | null>(null);
  const started = useRef(false);
  const closeCreate = useCallback(() => setCreating(false), []);

  // `?template=<id>` starts a quest from a template.
  const tpl = route.query.get('template');
  useEffect(() => {
    if (!tpl || started.current) return;
    const t = getQuestTemplate(tpl);
    if (!t) {
      setTplError(`There’s no quest template called “${tpl}”.`);
      return;
    }
    started.current = true;
    const id = startFromTemplate(t);
    navigate(`/quest/${id}`, { replace: true });
  }, [tpl]);

  const list = useMemo(() => Object.values(quests).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [quests]);

  return (
    <Screen title="Two-Person Quests" eyebrow="Journeys" backTo="/journeys" subtitle="Small shared challenges: answer the same prompts, swap codes, and compare how differently you see things.">
      <div className="banner" role="note">
        <Info size={16} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
        <span>{NO_SERVER}</span>
      </div>
      {tplError && <div className="banner error" role="alert" style={{ marginTop: 12 }}>{tplError}</div>}

      <Section title="Your quests">
        {list.length ? (
          <div className="list j-wrap">
            {list.map((q) => {
              const st = questStatus(q);
              return (
                <button key={q.id} type="button" className="list-row" onClick={() => navigate(`/quest/${q.id}`)}>
                  <span className="lr-icon"><Users size={18} aria-hidden /></span>
                  <span className="grow">
                    <span className="lr-title" style={{ display: 'block' }}>{q.title}</span>
                    <span className="lr-sub">{q.role === 'guest' ? `From ${q.theirs?.name || 'someone'} · ` : ''}{st.text} · {relTime(q.updatedAt)}</span>
                  </span>
                  {st.waiting && <Tag accent>Waiting</Tag>}
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<Users size={24} />} title="No quests yet" body="Start one from a template below or write your own, answer it, then send the code to one person." />
        )}
      </Section>

      <Section title="Start from a template" action={<span className="on-art tiny muted">Curated</span>}>
        {QUEST_TEMPLATES.length ? (
          <div className="stack">
            {QUEST_TEMPLATES.map((t: QuestTemplate) => (
              <article key={t.id} className="card">
                <div className="label accent">{QUEST_KIND_LABEL[t.kind]}</div>
                <h3 className="display t-md" style={{ margin: '6px 0' }}>{t.title}</h3>
                <p className="muted" style={{ margin: '0 0 12px' }}>{t.intro}</p>
                <div className="row between">
                  <span className="tiny faint">{t.prompts.length} prompt{t.prompts.length === 1 ? '' : 's'}</span>
                  <Button size="sm" variant="soft" icon={<Plus size={16} />} onClick={() => navigate(`/quest/${startFromTemplate(t)}`)}>Start this quest</Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="glass glass-strong j-note small">No templates available.</p>
        )}
      </Section>

      <Section title="Or write your own">
        <div className="row wrap">
          <Button variant="primary" icon={<Pencil size={18} />} onClick={() => setCreating(true)}>{draft ? 'Continue your draft quest' : 'Write a quest'}</Button>
          <Button icon={<Download size={18} />} onClick={() => navigate('/import')}>Import a code</Button>
        </div>
      </Section>

      <Sheet open={creating} onClose={closeCreate} title="New quest">
        <NewQuestForm
          initial={(draft?.data as EditorValue | undefined) ?? blankEditor()}
          onDraft={(v) => saveDraft(DRAFT_KEY, v)}
          onCreate={(v) => {
            const q = newQuest(v);
            useStore.getState().upsert('quests', q);
            clearDraft(DRAFT_KEY);
            setCreating(false);
            navigate(`/quest/${q.id}`);
          }}
          onDiscard={async () => {
            if (await confirmDialog({ title: 'Discard this draft?', confirmLabel: 'Discard', danger: true })) {
              clearDraft(DRAFT_KEY);
              setCreating(false);
            }
          }}
        />
      </Sheet>
    </Screen>
  );
}

function NewQuestForm({ initial, onDraft, onCreate, onDiscard }: { initial: EditorValue; onDraft: (v: EditorValue) => void; onCreate: (v: EditorValue) => void; onDiscard: () => void }) {
  const [v, setV] = useState<EditorValue>(initial);
  const status = useAutosave(v, onDraft);
  const valid = v.title.trim() && v.prompts.some((p) => p.text.trim());
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onCreate(v);
      }}
    >
      <QuestEditor value={v} onChange={setV} />
      <small className="faint" aria-live="polite">{status === 'saving' ? 'Saving draft…' : status === 'saved' ? 'Draft saved on this device' : ' '}</small>
      <div className="row">
        <Button type="button" className="grow" variant="danger" onClick={onDiscard}>Discard</Button>
        <Button type="submit" className="grow" variant="primary" disabled={!valid}>Create quest</Button>
      </div>
      {!valid && <small className="faint" style={{ textAlign: 'center' }}>Add a title and at least one prompt.</small>}
    </form>
  );
}

function QuestEditor({ value, onChange }: { value: EditorValue; onChange: (v: EditorValue) => void }) {
  const set = (p: Partial<EditorValue>) => onChange({ ...value, ...p });
  const setPrompt = (i: number, p: Partial<QuestPrompt>) => set({ prompts: value.prompts.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const move = (i: number, d: -1 | 1) => {
    const arr = [...value.prompts];
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set({ prompts: arr });
  };
  return (
    <div className="stack">
      <Field label="Title">
        <input className="input" value={value.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. The same street, two ways" />
      </Field>
      <Field label="Intro" hint="What you’re both doing, in a sentence or two.">
        <textarea className="textarea" style={{ minHeight: 80 }} value={value.intro} onChange={(e) => set({ intro: e.target.value })} />
      </Field>
      <div className="field">
        <span>Kind</span>
        <Segmented
          label="Quest kind"
          value={value.kind}
          options={[
            { value: 'interpretation', label: 'Interpret' },
            { value: 'challenge', label: 'Challenge' },
            { value: 'project', label: 'Project' },
          ]}
          onChange={(k) => set({ kind: k })}
        />
      </div>
      <h3 className="label" style={{ margin: '8px 0 0' }}>Prompts</h3>
      {value.prompts.map((p, i) => (
        <fieldset key={p.id} className="j-prompt-edit">
          <legend className="sr-only">Prompt {i + 1}</legend>
          <div className="row between">
            <span className="label">Prompt {i + 1}</span>
            <span className="row" style={{ gap: 0 }}>
              <IconButton label={`Move prompt ${i + 1} up`} type="button" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={18} /></IconButton>
              <IconButton label={`Move prompt ${i + 1} down`} type="button" disabled={i === value.prompts.length - 1} onClick={() => move(i, 1)}><ArrowDown size={18} /></IconButton>
              <IconButton label={`Remove prompt ${i + 1}`} type="button" disabled={value.prompts.length === 1} onClick={() => set({ prompts: value.prompts.filter((_, j) => j !== i) })}><X size={18} /></IconButton>
            </span>
          </div>
          <textarea className="textarea" style={{ minHeight: 64 }} aria-label={`Prompt ${i + 1} text`} value={p.text} onChange={(e) => setPrompt(i, { text: e.target.value })} placeholder="What should both of you answer or do?" />
          <Segmented
            label={`Prompt ${i + 1} answer type`}
            value={p.kind}
            options={[
              { value: 'text', label: 'Written' },
              { value: 'choice', label: 'Choice' },
              { value: 'task', label: 'Task' },
            ]}
            onChange={(k) => setPrompt(i, { kind: k, choices: k === 'choice' ? p.choices ?? ['', ''] : p.choices })}
          />
          {p.kind === 'choice' && (
            <Field label="Choices" hint="One per line.">
              <textarea className="textarea" style={{ minHeight: 72 }} value={(p.choices ?? []).join('\n')} onChange={(e) => setPrompt(i, { choices: e.target.value.split('\n') })} />
            </Field>
          )}
        </fieldset>
      ))}
      <Button type="button" icon={<Plus size={18} />} onClick={() => set({ prompts: [...value.prompts, { id: uid('qp-'), text: '', kind: 'text' }] })}>Add a prompt</Button>
    </div>
  );
}

// ---------------------------------------------------------------- one quest
export function QuestScreen({ id }: { id: string }) {
  const quest = useStore((s) => s.quests[id]);
  if (!quest) {
    return (
      <Screen title="Quest" backTo="/quests">
        <EmptyState
          icon={<Users size={24} />}
          title="Quest not found"
          body="It may have been deleted, or it lives on another device. If someone sent you a code, import it first."
          action={
            <div className="row wrap" style={{ justifyContent: 'center' }}>
              <Button variant="primary" onClick={() => navigate('/import')}>Import a code</Button>
              <Button onClick={() => navigate('/quests', { replace: true })}>All quests</Button>
            </div>
          }
        />
      </Screen>
    );
  }
  return <QuestDetail key={quest.id} quest={quest} />;
}

function QuestDetail({ quest }: { quest: TwoPersonQuest }) {
  const prefsName = useStore((s) => s.prefs.name);
  const patch = useStore((s) => s.patch);
  const [name, setName] = useState(quest.mine?.name ?? prefsName ?? '');
  const [answers, setAnswers] = useState<Record<string, string>>(quest.mine?.answers ?? {});
  const [editing, setEditing] = useState(false);
  const [reveal, setReveal] = useState(false);
  const closeEdit = useCallback(() => setEditing(false), []);

  const value = useMemo(() => ({ name, answers }), [name, answers]);
  const status = useAutosave(value, (v) => {
    const at = nowISO();
    useStore.getState().patch('quests', quest.id, { mine: { name: v.name.trim(), answers: v.answers, at }, updatedAt: at });
  });

  const answeredCount = quest.prompts.filter((p) => answers[p.id]?.trim()).length;
  const mineDone = answeredCount > 0;
  const theirsDone = hasAnswers(quest.theirs, quest.prompts);
  const canCompare = mineDone && theirsDone;
  const theirName = quest.theirs?.name || 'They';

  const del = async () => {
    if (!(await confirmDialog({ title: 'Delete this quest?', body: 'Your answers and any answers you imported will be removed from this device.', confirmLabel: 'Delete', danger: true }))) return;
    navigate('/quests', { replace: true });
    useStore.getState().remove('quests', quest.id);
    toast('Quest deleted');
  };

  return (
    <Screen
      title={quest.title}
      eyebrow={`Two-person quest · ${QUEST_KIND_LABEL[quest.kind] ?? quest.kind}`}
      backTo="/quests"
      actions={
        <>
          {quest.role === 'owner' && !theirsDone && (
            <IconButton label="Edit quest prompts" onClick={() => setEditing(true)}><Pencil size={20} /></IconButton>
          )}
          <IconButton label="Delete quest" onClick={del}><Trash size={20} /></IconButton>
        </>
      }
    >
      <div className="glass glass-strong j-panel j-quest-intro">
        {quest.intro && <p className="prose">{quest.intro}</p>}
        <p className="small muted" style={{ margin: 0 }}>
          {quest.role === 'owner' ? 'You started this quest.' : `${quest.theirs?.name || 'Someone'} invited you to this quest.`}
        </p>
      </div>
      <div className="banner" role="note" style={{ marginTop: 12 }}>
        <Info size={16} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
        <span>{NO_SERVER}</span>
      </div>

      <Section title="Your answers" action={<span className="on-art tiny muted" aria-live="polite">{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved on this device' : `${answeredCount} of ${quest.prompts.length} answered`}</span>}>
        <div className="stack">
          <div className="card j-form">
            <Field label="Your name" hint="Shown to the other person with your answers.">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="given-name" />
            </Field>
          </div>
          {quest.prompts.map((p, i) => (
            <div key={p.id} className="card">
              <PromptAnswer n={i + 1} prompt={p} value={answers[p.id] ?? ''} onChange={(v) => setAnswers((a) => ({ ...a, [p.id]: v }))} />
            </div>
          ))}
          {!quest.prompts.length && <p className="glass glass-strong j-note">This quest has no prompts.</p>}
        </div>
      </Section>

      {/* Share */}
      {quest.role === 'owner' ? (
        <Section title="Invite one person">
          <div className="card j-form">
            <InviteBlock quest={quest} mineDone={mineDone} />
            {theirsDone && (
              <div className="j-dev-row" style={{ marginTop: 20, paddingTop: 16 }}>
                <h3 className="display t-sm" style={{ marginBottom: 6 }}>Send them your answers too</h3>
                <p className="muted small" style={{ marginTop: 0 }}>If your invitation didn’t include your answers, send this reply code so {theirName} can compare as well.</p>
                <ReplyBlock quest={quest} mineDone={mineDone} />
              </div>
            )}
          </div>
        </Section>
      ) : (
        <Section title="Send your answers back">
          <div className="card j-form">
            <p className="muted small" style={{ marginTop: 0 }}>Answer the prompts above, then send {quest.theirs?.name || 'them'} this reply code. They import it on their device to see your answers.</p>
            <ReplyBlock quest={quest} mineDone={mineDone} />
          </div>
        </Section>
      )}

      {/* Compare */}
      <Section title="Compare">
        {canCompare || (theirsDone && reveal) ? (
          <div className="stack">
            {quest.prompts.map((p, i) => {
              const a = answers[p.id]?.trim() ?? '';
              const b = quest.theirs?.answers[p.id]?.trim() ?? '';
              return (
                <div key={p.id} className="card j-compare-item">
                  <div className="label">Prompt {i + 1}</div>
                  <h3 className="display t-sm" style={{ margin: '4px 0 10px' }}>{p.text}</h3>
                  <div className="j-compare">
                    <div className="j-answer mine">
                      <div className="label accent">You{name.trim() ? ` · ${name.trim()}` : ''}</div>
                      <p>{a || <span className="faint">No answer yet</span>}</p>
                    </div>
                    <div className="j-answer">
                      <div className="label">{theirName}</div>
                      <p>{b || <span className="faint">No answer</span>}</p>
                    </div>
                  </div>
                  {p.kind === 'choice' && a && b && <p className="tiny muted" style={{ margin: '8px 0 0' }}>{a === b ? 'You both chose the same option.' : 'You chose different options.'}</p>}
                </div>
              );
            })}
            <p className="glass glass-strong j-note tiny">Their answers were imported {quest.theirs ? relTime(quest.theirs.at) : ''} from a code they sent you.</p>
            <Button icon={<NotebookPen size={18} />} onClick={() => navigate(`/note/new?kind=text&link=${encodeURIComponent(`quest:${quest.id}`)}`)}>Capture what you noticed</Button>
          </div>
        ) : theirsDone ? (
          <div className="card tinted">
            <p style={{ margin: '0 0 12px' }}>{theirName} included their answers. Answer yours first so you aren’t influenced — then compare side by side.</p>
            <Button size="sm" icon={<Eye size={16} />} onClick={() => setReveal(true)}>Show their answers now</Button>
          </div>
        ) : (
          <p className="glass glass-strong j-note small">
            {quest.role === 'owner'
              ? 'When they send their reply code, import it here and both answer sets appear side by side.'
              : 'If they send you their answers as a reply code, import it and you’ll see both side by side.'}
          </p>
        )}
        {!theirsDone && (
          <Button style={{ marginTop: 12 }} icon={<Download size={18} />} onClick={() => navigate('/import')}>Import a reply code</Button>
        )}
      </Section>

      {quest.role === 'owner' && (
        <Sheet open={editing} onClose={closeEdit} title="Edit quest">
          <EditQuestForm quest={quest} onDone={closeEdit} onSave={(v) => patch('quests', quest.id, { ...v, prompts: newQuest(v).prompts, updatedAt: nowISO() })} />
        </Sheet>
      )}
    </Screen>
  );
}

function EditQuestForm({ quest, onSave, onDone }: { quest: TwoPersonQuest; onSave: (v: EditorValue) => void; onDone: () => void }) {
  const [v, setV] = useState<EditorValue>({ title: quest.title, intro: quest.intro, kind: quest.kind, prompts: quest.prompts.map((p) => ({ ...p })) });
  const valid = v.title.trim() && v.prompts.some((p) => p.text.trim());
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSave(v);
        toast('Quest updated');
        onDone();
      }}
    >
      <div className="banner warn" role="note">If you already sent an invitation, they still have the old version. Send a new invitation code after editing.</div>
      <QuestEditor value={v} onChange={setV} />
      <div className="row">
        <Button type="button" className="grow" onClick={onDone}>Cancel</Button>
        <Button type="submit" className="grow" variant="primary" disabled={!valid}>Save</Button>
      </div>
    </form>
  );
}

function PromptAnswer({ n, prompt, value, onChange }: { n: number; prompt: QuestPrompt; value: string; onChange: (v: string) => void }) {
  const fid = `qa-${prompt.id}`;
  if (prompt.kind === 'choice' && prompt.choices?.length) {
    return (
      <fieldset className="j-fieldset">
        <legend className="j-prompt-legend">
          <span className="label">Prompt {n}</span>
          <span className="display t-sm" style={{ display: 'block', marginTop: 4 }}>{prompt.text}</span>
        </legend>
        <div className="chips" style={{ marginTop: 10 }}>
          {prompt.choices.map((c) => (
            <label key={c} className={'chip j-choice' + (value === c ? ' on' : '')}>
              <input type="radio" className="sr-only" name={fid} value={c} checked={value === c} onChange={() => onChange(c)} />
              {c}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  return (
    <div className="field">
      <label htmlFor={fid} className="j-prompt-legend">
        <span className="label">{prompt.kind === 'task' ? `Task ${n}` : `Prompt ${n}`}</span>
        <span className="display t-sm" style={{ display: 'block', marginTop: 4 }}>{prompt.text}</span>
      </label>
      <textarea
        id={fid}
        className="textarea"
        style={{ minHeight: 96 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={prompt.kind === 'task' ? 'When you’ve done it: how did it go? What did you make or notice?' : 'Your answer'}
      />
    </div>
  );
}

/** Generates a code on demand and shows it in a copyable box with a Share button. */
function CodePanel({ make, shareTitle, intro, disabled, buttonLabel, stamp }: { make: () => Promise<string>; shareTitle: string; intro: string; disabled?: boolean; buttonLabel: string; stamp: string }) {
  const [code, setCode] = useState<{ code: string; stamp: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeId = useId();
  const stale = !!code && code.stamp !== stamp;

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      setCode({ code: await make(), stamp });
    } catch (e) {
      console.error(e);
      setError('The code couldn’t be created on this device. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.code);
      toast('Code copied');
    } catch {
      toast('Couldn’t copy automatically — select the code and copy it.', { kind: 'error' });
    }
  };
  const share = async () => {
    if (!code) return;
    const r = await shareText(shareTitle, composeShareMessage(intro, code.code));
    if (r === 'copied') toast('Message copied — paste it into any messaging app.');
    else if (r === 'failed') toast('Sharing didn’t work here. Copy the code instead.', { kind: 'error' });
  };

  return (
    <div className="stack sm">
      {(!code || stale) && (
        <Button variant="primary" icon={<Send size={18} />} disabled={disabled || busy} aria-busy={busy} onClick={generate}>
          {busy ? 'Creating code…' : stale ? 'Update the code' : buttonLabel}
        </Button>
      )}
      {stale && <small className="faint">Something changed since this code was made — update it before sending.</small>}
      {error && <div className="banner error" role="alert">{error}</div>}
      {code && (
        <div className="j-codebox">
          <label className="label" htmlFor={codeId}>Share code</label>
          <textarea id={codeId} className="textarea mono" readOnly value={code.code} onFocus={(e) => e.currentTarget.select()} rows={3} />
          <div className="row">
            <Button className="grow" icon={<Copy size={18} />} onClick={copy}>Copy code</Button>
            <Button className="grow" variant="primary" icon={<Share2 size={18} />} onClick={share}>Share…</Button>
          </div>
          <small className="faint">Send it through any messaging app. Anyone with this code can read what’s in it.</small>
        </div>
      )}
    </div>
  );
}

function InviteBlock({ quest, mineDone }: { quest: TwoPersonQuest; mineDone: boolean }) {
  const [includeMine, setIncludeMine] = useState(false);
  const from = quest.mine?.name || undefined;
  return (
    <div className="stack">
      <ol className="j-steps small muted">
        <li>Answer the prompts above (autosaved).</li>
        <li>Create the invitation code and send it to one person.</li>
        <li>They answer in their own Elsewhere and send a reply code back.</li>
        <li>Import their reply to compare side by side.</li>
      </ol>
      <div className="row between j-dev-row">
        <span className="small grow">Include my answers so they can compare right away</span>
        <Toggle checked={includeMine} onChange={setIncludeMine} label="Include my answers so they can compare right away" />
      </div>
      <p className="tiny faint" style={{ margin: 0 }}>{includeMine ? 'Your answers will be inside the code.' : 'Off by default: only the quest is shared, not your answers.'}</p>
      <CodePanel
        buttonLabel="Create invitation code"
        shareTitle={quest.title}
        intro={from ? `${from} invited you to a two-person quest in Elsewhere: “${quest.title}”.` : `You’re invited to a two-person quest in Elsewhere: “${quest.title}”.`}
        stamp={`${quest.title}|${quest.intro}|${quest.kind}|${JSON.stringify(quest.prompts)}|${includeMine ? quest.mine?.at ?? '' : 'no-answers'}|${from ?? ''}`}
        disabled={includeMine && !mineDone}
        make={() => {
          const q = useStore.getState().quests[quest.id] ?? quest;
          const packet: SharePacket = {
            t: 'quest',
            v: 1,
            quest: { id: q.id, title: q.title, intro: q.intro, kind: q.kind, prompts: q.prompts },
            from: q.mine?.name || undefined,
            ...(includeMine && q.mine ? { answers: q.mine } : {}),
          };
          return encodePacket(packet);
        }}
      />
      {includeMine && !mineDone && <small className="faint">Answer at least one prompt to include your answers.</small>}
    </div>
  );
}

function ReplyBlock({ quest, mineDone }: { quest: TwoPersonQuest; mineDone: boolean }) {
  return (
    <>
      <CodePanel
        buttonLabel="Create reply code"
        shareTitle={`Re: ${quest.title}`}
        intro={`My answers to “${quest.title}” in Elsewhere.`}
        stamp={quest.mine?.at ?? ''}
        disabled={!mineDone}
        make={() => {
          const q = useStore.getState().quests[quest.id] ?? quest;
          if (!q.mine) throw new Error('No answers yet');
          return encodePacket({ t: 'quest-reply', v: 1, questId: q.id, answers: q.mine });
        }}
      />
      {!mineDone && <small className="faint">Answer at least one prompt first.</small>}
    </>
  );
}
