// Personal Capsules — seal a prediction, opinion, message, voice note or creation and reopen it on a chosen date.
// Sealed capsules never show their contents (only title + opening date) until they open.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Bell, Lightbulb, Lock, LockOpen, Mail, MessageSquare, Mic, Package, Plus, Trash2, type LucideIcon } from 'lucide-react';
import type { Capsule, CapsuleKind, EntryKind, HistoryEntry, Ref } from '../../data/types';
import { useStore } from '../../store/store';
import { blobs } from '../../lib/db';
import { fmtDate, nowISO, relTime, uid } from '../../lib/id';
import { navigate, back, useRoute } from '../../lib/router';
import { parseLinkParam } from '../../lib/links';
import { isNative } from '../../lib/platform';
import { cancelScheduled, getPermission, requestPermission, scheduleAt } from '../../lib/notify';
import { useNow } from '../../lib/timers';
import { remixSource } from '../../lib/remix';
import { Button, Chip, EmptyState, Field, Screen, Section, Toggle, confirmDialog, toast } from '../../components/ui';
import { LinkedRefs } from '../../components/common';
import { RecordingAudio, SaveStatus, VoiceRecorder, useBlobUrl, useFlushOnHide } from './FieldNotes';
import '../../styles/create.css';

export const CAPSULE_KINDS: { kind: CapsuleKind; label: string; icon: LucideIcon; prompt: string; placeholder: string }[] = [
  { kind: 'prediction', label: 'Prediction', icon: Lightbulb, prompt: 'What do you think will happen? Make it specific enough to check when it opens.', placeholder: 'By the time this opens, I think…' },
  { kind: 'opinion', label: 'Opinion', icon: MessageSquare, prompt: 'What do you believe right now? Future you can see whether it held.', placeholder: 'Right now I believe…' },
  { kind: 'message', label: 'Message', icon: Mail, prompt: 'A letter to the person you’ll be when this opens.', placeholder: 'Dear future me,' },
  { kind: 'voice', label: 'Voice note', icon: Mic, prompt: 'Record a message to hear later. Add a line of text if you like.', placeholder: 'Optional words to go with the recording' },
  { kind: 'creation', label: 'Creation', icon: Package, prompt: 'Seal something you made — connect a note or an experience you built.', placeholder: 'Why this, and why now?' },
];
export const capsuleKindMeta = (k: CapsuleKind) => CAPSULE_KINDS.find((x) => x.kind === k) ?? CAPSULE_KINDS[2];
const isCapsuleKind = (v: string | null): v is CapsuleKind => !!v && CAPSULE_KINDS.some((k) => k.kind === v);

const DAY = 864e5;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
/** Plain, calendar-day countdown: "later today", "tomorrow", "in 23 days". */
export function opensIn(opensAt: string, now = Date.now()): string {
  const days = Math.round((startOfDay(new Date(opensAt)) - startOfDay(new Date(now))) / DAY);
  if (days <= 0) return 'later today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}
const fmtLong = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
const fmtWhen = (iso: string) => `${fmtLong(iso)}, ${new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

function notifyExplanation(c?: Pick<Capsule, 'nativeId'>): string {
  if (isNative()) {
    return c?.nativeId != null
      ? 'A notification is scheduled for that morning. It arrives even if the app is closed.'
      : 'No notification is scheduled (capsule notifications are off or not allowed). It will be waiting here.';
  }
  return 'In the browser, Elsewhere can only tell you while the app is open on or after that date — there’s no server to send reminders. It will be waiting here.';
}

// ---------------------------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------------------------

export function CapsulesScreen() {
  const capsules = useStore((s) => s.capsules);
  const draft = useStore((s) => s.drafts[DRAFT_KEY]);
  const now = useNow(true, 60000);
  const { ready, sealed, opened } = useMemo(() => {
    const all = Object.values(capsules);
    return {
      ready: all.filter((c) => !c.openedAt && new Date(c.opensAt).getTime() <= now).sort((a, b) => a.opensAt.localeCompare(b.opensAt)),
      sealed: all.filter((c) => !c.openedAt && new Date(c.opensAt).getTime() > now).sort((a, b) => a.opensAt.localeCompare(b.opensAt)),
      opened: all.filter((c) => !!c.openedAt).sort((a, b) => (b.openedAt ?? '').localeCompare(a.openedAt ?? '')),
    };
  }, [capsules, now]);
  const draftForm = (draft?.data as CDraft | undefined)?.form;
  const hasDraft = !!draftForm && hasContent(draftForm);

  return (
    <Screen
      title="Capsules"
      eyebrow="Create"
      backTo="/create"
      subtitle="Seal a prediction, opinion, message, voice note or creation — and reopen it later."
      actions={<button type="button" className="icon-btn" aria-label="New capsule" onClick={() => navigate('/capsule/new')}><Plus size={22} /></button>}
    >
      <Section title="Seal something new" style={{ marginTop: 8 }}>
        <div className="cr-kind-grid glass" role="group" aria-label="Seal something new">
          {CAPSULE_KINDS.map((k) => (
            <button key={k.kind} type="button" className="cr-kind cr-tile" onClick={() => navigate(`/capsule/new?kind=${k.kind}`)}>
              <k.icon size={20} aria-hidden />
              <span>{k.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {hasDraft && (
        <Section title="Unsealed draft">
          <div className="list">
            <button type="button" className="list-row" onClick={() => navigate('/capsule/new')}>
              <span className="lr-icon"><Archive size={18} aria-hidden /></span>
              <span className="grow">
                <span className="lr-title" style={{ display: 'block' }}>{draftForm!.title.trim() || capsuleKindMeta(draftForm!.kind).label}</span>
                <span className="lr-sub">Not sealed yet · edited {relTime(draft!.updatedAt)}</span>
              </span>
            </button>
          </div>
        </Section>
      )}

      {ready.length > 0 && (
        <Section title="Ready to open">
          <div className="stack sm">
            {ready.map((c) => {
              const K = capsuleKindMeta(c.kind);
              return (
                <button key={c.id} type="button" className="card tinted card-tap cr-ready" onClick={() => navigate(`/capsule/${c.id}`)}>
                  <span className="label accent row" style={{ gap: 6 }}><LockOpen size={14} aria-hidden /> Ready to open · {K.label}</span>
                  <span className="display t-md" style={{ display: 'block', margin: '8px 0 4px' }}>{c.title}</span>
                  <span className="small muted">Sealed {fmtDate(c.sealedAt)}</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {sealed.length > 0 && (
        <Section title={`Sealed · ${sealed.length}`}>
          <div className="list">
            {sealed.map((c) => (
              <button key={c.id} type="button" className="list-row" onClick={() => navigate(`/capsule/${c.id}`)}>
                <span className="lr-icon"><Lock size={18} aria-hidden /></span>
                <span className="grow">
                  <span className="lr-title" style={{ display: 'block' }}>{c.title}</span>
                  <span className="lr-sub">Opens {fmtDate(c.opensAt)} · {opensIn(c.opensAt, now)}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="tiny on-art cr-caption" style={{ margin: '8px 0 0' }}>Contents stay hidden until each capsule opens.</p>
        </Section>
      )}

      {opened.length > 0 && (
        <Section title="Opened">
          <div className="list">
            {opened.map((c) => (
              <button key={c.id} type="button" className="list-row" onClick={() => navigate(`/capsule/${c.id}`)}>
                <span className="lr-icon"><LockOpen size={18} aria-hidden /></span>
                <span className="grow">
                  <span className="lr-title" style={{ display: 'block' }}>{c.title}</span>
                  <span className="lr-sub">Opened {fmtDate(c.openedAt!)} · sealed {fmtDate(c.sealedAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {!ready.length && !sealed.length && !opened.length && !hasDraft && (
        <EmptyState
          icon={<Archive size={24} />}
          title="No capsules yet"
          body="Write a prediction or a message, choose when it opens, and seal it. You won’t be able to read it until then."
          action={<Button variant="primary" onClick={() => navigate('/capsule/new?kind=prediction')}>Make a prediction</Button>}
        />
      )}

      <p className="banner" style={{ margin: '28px 0 0' }}>
        <Bell size={16} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          {isNative()
            ? 'On Android, Elsewhere schedules a notification for each capsule’s opening day — it works even when the app is closed, if you allow notifications.'
            : 'In the browser, you’ll only be told a capsule is ready while Elsewhere is open on or after its date. No server sends reminders.'}
        </span>
      </p>
    </Screen>
  );
}

// ---------------------------------------------------------------------------------------------
// Compose (new)
// ---------------------------------------------------------------------------------------------

const DRAFT_KEY = 'capsule:new';
type OpenPick = '1w' | '1m' | '3m' | '1y' | 'custom';
const PICKS: { value: OpenPick; label: string }[] = [
  { value: '1w', label: '1 week' },
  { value: '1m', label: '1 month' },
  { value: '3m', label: '3 months' },
  { value: '1y', label: '1 year' },
  { value: 'custom', label: 'Pick a date' },
];
interface CForm { kind: CapsuleKind; title: string; text: string; blobId?: string; links: Ref[]; pick: OpenPick; custom: string }
interface CDraft { v: 1; form: CForm }

const hasContent = (f: CForm) => !!(f.title.trim() || f.text.trim() || f.blobId || f.links.length);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Opening moment: 9:00 local time on the chosen day. Returns null if not a valid future date. */
function opensAtFor(pick: OpenPick, custom: string): Date | null {
  const d = new Date();
  // Calendar months, clamped to the month's last day (31 Jan + 1 month = 28/29 Feb, not early March).
  const addMonths = (n: number) => {
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  };
  switch (pick) {
    case '1w': d.setDate(d.getDate() + 7); break;
    case '1m': addMonths(1); break;
    case '3m': addMonths(3); break;
    case '1y': addMonths(12); break;
    case 'custom': {
      const m = custom.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return null;
      const c = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 9, 0, 0, 0);
      if (isNaN(c.getTime()) || startOfDay(c) <= startOfDay(new Date())) return null;
      return c;
    }
  }
  d.setHours(9, 0, 0, 0);
  return d;
}

export function CapsuleScreen({ id }: { id: string }) {
  const capsule = useStore((s) => (id !== 'new' ? s.capsules[id] : undefined));
  const seen = useRef(false);
  if (capsule) seen.current = true;
  if (id === 'new') return <CapsuleCompose />;
  if (!capsule) {
    if (seen.current) return null; // just deleted
    return (
      <Screen title="Capsule" backTo="/capsules">
        <EmptyState title="Capsule not found" body="It may have been deleted." action={<Button variant="primary" onClick={() => navigate('/capsules', { replace: true })}>All capsules</Button>} />
      </Screen>
    );
  }
  return <CapsuleView key={capsule.id} c={capsule} />;
}

function CapsuleCompose() {
  const route = useRoute();
  const qKind = route.query.get('kind');
  const qLink = parseLinkParam(route.query.get('link'));
  const [state] = useState(() => {
    const d = useStore.getState().drafts[DRAFT_KEY];
    const f = (d?.data as CDraft | undefined)?.form;
    const usable = f && hasContent(f) && (!isCapsuleKind(qKind) || f.kind === qKind) && !qLink;
    return { draft: usable ? f : undefined, otherDraft: f && hasContent(f) && !usable ? f : undefined, at: d?.updatedAt };
  });
  const [form, setForm] = useState<CForm>(() => state.draft ?? {
    kind: isCapsuleKind(qKind) ? qKind : qLink ? 'creation' : 'message',
    title: '', text: '', links: qLink ? [qLink] : [], pick: '1m', custom: '',
  });
  const [showOther, setShowOther] = useState(!!state.otherDraft);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>(state.draft ? 'saved' : 'idle');
  const formRef = useRef(form);
  formRef.current = form;
  const pending = useRef(false);
  const sealed = useRef(false);

  const edit = (p: Partial<CForm>) => {
    pending.current = true;
    setForm((f) => ({ ...f, ...p }));
  };
  const writeDraft = () => {
    if (sealed.current) return;
    pending.current = false;
    if (!hasContent(formRef.current)) return;
    const st = useStore.getState();
    // Replacing an older draft (or an earlier take): drop its recording so it doesn't linger in storage.
    const prevBlob = (st.drafts[DRAFT_KEY]?.data as CDraft | undefined)?.form?.blobId;
    if (prevBlob && prevBlob !== formRef.current.blobId) blobs.del(prevBlob).catch(() => {});
    st.saveDraft(DRAFT_KEY, { v: 1, form: formRef.current } satisfies CDraft);
  };
  useEffect(() => {
    if (!pending.current) return;
    setStatus('saving');
    const t = setTimeout(() => { writeDraft(); setStatus(hasContent(formRef.current) ? 'saved' : 'idle'); }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);
  useEffect(() => () => { if (pending.current) writeDraft(); }, // eslint-disable-line react-hooks/exhaustive-deps
  []);
  useFlushOnHide(() => { if (pending.current) writeDraft(); });

  const K = capsuleKindMeta(form.kind);
  const opensAt = opensAtFor(form.pick, form.custom);
  const tomorrow = ymd(new Date(Date.now() + DAY));
  const maxDate = ymd(new Date(new Date().setFullYear(new Date().getFullYear() + 50)));

  const contentError =
    form.kind === 'voice' ? (!form.blobId ? 'Record your message first.' : undefined)
    : form.kind === 'creation' ? (!form.links.length && !form.text.trim() ? 'Connect something you made, or describe it.' : undefined)
    : !form.text.trim() ? 'Write something to seal.' : undefined;
  const dateError = !opensAt ? (form.pick === 'custom' && !form.custom ? 'Choose an opening date.' : 'The opening date must be after today.') : undefined;

  const setVoice = (bid: string) => {
    const old = formRef.current.blobId;
    edit({ blobId: bid });
    if (old && old !== bid) blobs.del(old).catch(() => {});
  };

  const discard = async () => {
    const ok = await confirmDialog({ title: 'Discard this capsule?', body: 'Nothing has been sealed yet. This removes the draft.', confirmLabel: 'Discard', danger: true });
    if (!ok) return;
    sealed.current = true; // stop autosave
    const bid = formRef.current.blobId;
    useStore.getState().clearDraft(DRAFT_KEY);
    if (bid) blobs.del(bid).catch(() => {});
    back('/capsules');
  };

  const openOtherDraft = () => {
    if (!state.otherDraft) return;
    pending.current = false;
    setForm(state.otherDraft);
    setShowOther(false);
    setStatus('saved');
  };

  const seal = async () => {
    setAttempted(true);
    if (contentError || dateError || !opensAt) {
      toast(contentError ?? dateError ?? 'Check the opening date.', { kind: 'error' });
      return;
    }
    const f = formRef.current;
    const ok = await confirmDialog({
      title: 'Seal this capsule?',
      body: `You won’t be able to read or edit it until ${fmtLong(opensAt.toISOString())}. You can still delete it.`,
      confirmLabel: 'Seal it',
    });
    if (!ok) return;
    setBusy(true);
    sealed.current = true;
    const at = nowISO();
    const capId = uid('cap-');
    const title = f.title.trim() || `${K.label} · sealed ${fmtDate(at)}`;
    const cap: Capsule = { id: capId, kind: f.kind, title, text: f.text.trim(), links: f.links, sealedAt: at, opensAt: opensAt.toISOString(), ...(f.blobId ? { blobId: f.blobId } : {}) };
    const st = useStore.getState();
    st.upsert('capsules', cap);
    st.clearDraft(DRAFT_KEY);

    const dateText = fmtLong(cap.opensAt);
    if (isNative()) {
      if (!st.settings.notifications.capsules) {
        toast(`Sealed. Capsule notifications are off in Settings — it will be waiting here on ${dateText}.`);
      } else {
        let perm = await getPermission();
        if (perm === 'prompt') {
          const want = await confirmDialog({
            title: 'Get a notification when it opens?',
            body: `Elsewhere can remind you on ${dateText}, even if the app is closed. Your phone will ask for permission next.`,
            confirmLabel: 'Allow notifications',
          });
          if (want) perm = await requestPermission();
        }
        if (perm === 'granted') {
          const nid = await scheduleAt('capsules', 'A capsule is ready to open', `“${title}” — sealed ${fmtDate(at)}.`, opensAt, `/capsule/${capId}`);
          if (nid != null) {
            useStore.getState().patch('capsules', capId, { nativeId: nid });
            toast(`Sealed. You’ll get a notification on ${dateText}.`);
          } else toast(`Sealed. The notification couldn’t be scheduled — check Capsules on ${dateText}.`);
        } else {
          toast(`Sealed. Notifications aren’t allowed, so check Capsules on ${dateText}.`);
        }
      }
    } else {
      toast(`Sealed until ${dateText}. You’ll see it here when you open Elsewhere on or after that date.`, { ms: 5000 });
    }
    setBusy(false);
    navigate(`/capsule/${capId}`, { replace: true });
  };

  return (
    <Screen
      title="New capsule"
      eyebrow="Capsules"
      backTo="/capsules"
      subtitle={
        <span className="row between wrap" style={{ gap: '4px 12px' }}>
          <span className="small">Draft — not sealed</span>
          <SaveStatus status={status} idleText="Saves as a draft while you write" />
        </span>
      }
    >
      {showOther && state.otherDraft && (
        <div className="banner" style={{ marginTop: 12 }}>
          <span className="grow">You have an unsealed {capsuleKindMeta(state.otherDraft.kind).label.toLowerCase()} draft{state.at ? ` from ${relTime(state.at)}` : ''}. Writing here replaces it.</span>
          <button type="button" className="btn ghost sm" onClick={openOtherDraft}>Open it</button>
        </div>
      )}

      <Section title="Kind" style={{ marginTop: 20 }}>
        <div className="card cr-form">
          <div className="chips scroll cr-chips" role="group" aria-label="Capsule kind">
            {CAPSULE_KINDS.map((k) => (
              <Chip key={k.kind} active={form.kind === k.kind} onClick={() => edit({ kind: k.kind })} icon={<k.icon size={14} aria-hidden />}>
                {k.label}
              </Chip>
            ))}
          </div>
          <p className="muted" style={{ margin: '12px 0 0' }}>{K.prompt}</p>
        </div>
      </Section>

      <div className="stack lg" style={{ marginTop: 20 }}>
        <div className="card cr-form stack lg">
          <Field label="Title (shown while sealed)" hint="Only the title and opening date are visible until it opens.">
            <input className="input" value={form.title} maxLength={100} onChange={(e) => edit({ title: e.target.value })} placeholder={`e.g. ${form.kind === 'prediction' ? 'Where I’ll be living' : form.kind === 'opinion' ? 'On working from home' : 'For the first cold morning'}`} />
          </Field>

          {form.kind === 'voice' && <VoiceRecorder blobId={form.blobId} onSaved={setVoice} label="Capsule recording" maxSeconds={300} />}

          {form.kind === 'creation' && (
            <div className="field">
              <span>What you made</span>
              <LinkedRefs value={form.links} onChange={(r) => edit({ links: r })} kinds={['note', 'experience', 'entry']} />
              <small className="faint">Connect a field note, an experience you built, or a Version History entry.</small>
            </div>
          )}

          <label className="field">
            <span>{form.kind === 'voice' || form.kind === 'creation' ? 'Words to go with it' : 'Your capsule'}</span>
            <textarea className="textarea" rows={form.kind === 'voice' || form.kind === 'creation' ? 3 : 7} value={form.text} onChange={(e) => edit({ text: e.target.value })} placeholder={K.placeholder} aria-invalid={attempted && !!contentError} />
          </label>
          {attempted && contentError && <p className="small cr-err" role="alert" style={{ margin: '-12px 0 0' }}>{contentError}</p>}

          {form.kind !== 'creation' && (
            <div className="field">
              <span>Connected to (optional)</span>
              <LinkedRefs value={form.links} onChange={(r) => edit({ links: r })} />
            </div>
          )}
        </div>

        <div className="card cr-form field">
          <span id="cap-open-label">Opens</span>
          <div className="chips cr-chips" role="group" aria-labelledby="cap-open-label">
            {PICKS.map((p) => (
              <Chip key={p.value} active={form.pick === p.value} onClick={() => edit({ pick: p.value, custom: p.value === 'custom' && !form.custom ? tomorrow : form.custom })}>
                {p.label}
              </Chip>
            ))}
          </div>
          {form.pick === 'custom' && (
            <input className="input" type="date" min={tomorrow} max={maxDate} value={form.custom} onChange={(e) => edit({ custom: e.target.value })} aria-label="Opening date" aria-invalid={!!dateError} style={{ maxWidth: 220, marginTop: 8 }} />
          )}
          {opensAt ? (
            <small className="muted">Opens {fmtWhen(opensAt.toISOString())} — {opensIn(opensAt.toISOString())}.</small>
          ) : (
            <small className="cr-err" role="alert">{dateError}</small>
          )}
        </div>

        <div className="banner">
          <Bell size={16} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{notifyExplanation()}{isNative() ? ' You’ll be asked about notifications when you seal it.' : ''}</span>
        </div>

        <div className="stack sm">
          <Button variant="primary" block icon={<Lock size={18} aria-hidden />} onClick={seal} disabled={busy}>
            {busy ? 'Sealing…' : 'Seal capsule'}
          </Button>
          {hasContent(form) && <Button variant="ghost" className="cr-solo" block onClick={discard}>Discard draft</Button>}
        </div>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------------------------------------
// View (locked / ready / opened)
// ---------------------------------------------------------------------------------------------

function VoicePlayback({ blobId }: { blobId: string }) {
  const media = useBlobUrl(blobId);
  if (media.error) return <p className="small cr-err">{media.error}</p>;
  if (!media.url) return <p className="small muted">Loading recording…</p>;
  return <RecordingAudio src={media.url} label="Capsule recording" />;
}

function CapsuleView({ c }: { c: Capsule }) {
  const now = useNow(!c.openedAt, 30000);
  const K = capsuleKindMeta(c.kind);
  const ready = new Date(c.opensAt).getTime() <= now;
  const entries = useStore((s) => s.entries);
  const linkedEntry = useMemo(() => Object.values(entries).find((e) => e.links.some((l) => l.kind === 'capsule' && l.id === c.id)), [entries, c.id]);
  const [response, setResponse] = useState(c.response ?? '');
  const [changed, setChanged] = useState(linkedEntry?.kind === 'mindchange');
  const [respStatus, setRespStatus] = useState<'idle' | 'saving' | 'saved'>(c.response ? 'saved' : 'idle');
  const [respErr, setRespErr] = useState<string | null>(null);
  const pending = useRef(false);
  const respRef = useRef(response);
  respRef.current = response;

  // Autosave the response onto the capsule.
  useEffect(() => {
    if (!pending.current) return;
    setRespStatus('saving');
    const t = setTimeout(() => {
      useStore.getState().patch('capsules', c.id, { response: respRef.current });
      pending.current = false;
      setRespStatus('saved');
    }, 600);
    return () => clearTimeout(t);
  }, [response, c.id]);
  useEffect(() => () => { if (pending.current) useStore.getState().patch('capsules', c.id, { response: respRef.current }); }, [c.id]);
  useFlushOnHide(() => {
    if (!pending.current) return;
    useStore.getState().patch('capsules', c.id, { response: respRef.current });
    pending.current = false;
  });

  const open = () => {
    useStore.getState().patch('capsules', c.id, { openedAt: nowISO(), notified: true });
  };

  const del = async () => {
    const ok = await confirmDialog({
      title: c.openedAt || ready ? 'Delete this capsule?' : 'Delete without opening?',
      body: c.openedAt || ready ? 'It will be removed from this device. Version History entries you made from it are kept.' : 'Its contents will be gone without ever being read. This can’t be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await cancelScheduled([c.nativeId]);
    if (c.blobId) blobs.del(c.blobId).catch(() => {});
    useStore.getState().remove('capsules', c.id);
    toast('Capsule deleted');
    back('/capsules');
  };

  const addToHistory = () => {
    const text = respRef.current.trim();
    if (!text) {
      setRespErr('Write what you think now first.');
      return;
    }
    setRespErr(null);
    useStore.getState().patch('capsules', c.id, { response: respRef.current });
    pending.current = false;
    const st = useStore.getState();
    const kind: EntryKind = changed ? 'mindchange' : 'reflection';
    const before = c.text.trim() || (c.blobId ? `(A voice recording sealed on ${fmtDate(c.sealedAt)})` : `(Sealed on ${fmtDate(c.sealedAt)})`);
    const existing = Object.values(st.entries).find((e) => e.links.some((l) => l.kind === 'capsule' && l.id === c.id));
    const at = nowISO();
    if (existing) {
      const revisions = existing.text !== text ? [...existing.revisions, { text: existing.text, at: existing.updatedAt, note: 'Before re-reading the capsule again' }] : existing.revisions;
      st.patch('entries', existing.id, { kind, text, before, revisions, updatedAt: at });
      toast('Version History entry updated', { action: { label: 'View', run: () => navigate(`/entry/${existing.id}`) } });
    } else {
      const topics = [...new Set(c.links.flatMap((r) => remixSource(r)?.topics ?? []))].slice(0, 4);
      const entry: HistoryEntry = {
        id: uid('e-'),
        kind,
        title: `${c.title} — reopened`,
        text,
        before,
        revisions: [],
        topics,
        links: [{ kind: 'capsule', id: c.id }, ...c.links.filter((r) => !(r.kind === 'capsule' && r.id === c.id))],
        private: false,
        createdAt: at,
        updatedAt: at,
      };
      st.upsert('entries', entry);
      toast('Added to Version History', { action: { label: 'View', run: () => navigate(`/entry/${entry.id}`) } });
    }
  };

  // ---- locked ----
  if (!ready) {
    return (
      <Screen title="Sealed capsule" eyebrow="Capsules" backTo="/capsules" hideLargeTitle>
        <div className="cr-sealed glass glass-strong" aria-label="Sealed capsule">
          <div className="cr-sealed-icon" aria-hidden><Lock size={28} /></div>
          <div className="label">Sealed {K.label.toLowerCase()}</div>
          <h1 className="display t-lg" style={{ margin: '8px 0 10px' }}>{c.title}</h1>
          <p className="cr-countdown display">Opens {opensIn(c.opensAt, now)}</p>
          <p className="muted" style={{ margin: '4px 0 0' }}>{fmtWhen(c.opensAt)}</p>
          <p className="small faint" style={{ margin: '14px 0 0' }}>Sealed {fmtDate(c.sealedAt)}. The contents stay hidden until then.</p>
        </div>
        <div className="banner" style={{ marginTop: 20 }}>
          <Bell size={16} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{notifyExplanation(c)}</span>
        </div>
        <Button variant="danger" className="cr-solo" block style={{ marginTop: 28 }} icon={<Trash2 size={18} aria-hidden />} onClick={del}>Delete without opening</Button>
      </Screen>
    );
  }

  // ---- ready, not opened yet ----
  if (!c.openedAt) {
    return (
      <Screen title="Capsule" eyebrow="Capsules" backTo="/capsules" hideLargeTitle>
        <div className="cr-sealed glass glass-strong ready">
          <div className="cr-sealed-icon" aria-hidden><LockOpen size={28} /></div>
          <div className="label accent">Ready to open · {K.label}</div>
          <h1 className="display t-lg" style={{ margin: '8px 0 10px' }}>{c.title}</h1>
          <p className="muted" style={{ margin: 0 }}>You sealed this on {fmtLong(c.sealedAt)}.</p>
          <Button variant="primary" style={{ marginTop: 20 }} icon={<LockOpen size={18} aria-hidden />} onClick={open}>Open capsule</Button>
        </div>
        <Button variant="danger" className="cr-solo" block style={{ marginTop: 28 }} icon={<Trash2 size={18} aria-hidden />} onClick={del}>Delete</Button>
      </Screen>
    );
  }

  // ---- opened ----
  return (
    <Screen title={c.title} eyebrow={`Capsule · ${K.label}`} backTo="/capsules" subtitle={<span className="small">Sealed {fmtLong(c.sealedAt)} · opened {fmtLong(c.openedAt)}</span>}>

      <Section title="Then">
        <div className="card glass-strong cr-reveal rise">
          {c.blobId && <div style={{ marginBottom: c.text ? 14 : 0 }}><VoicePlayback blobId={c.blobId} /></div>}
          {c.text ? <p className="prose cr-capsule-text" style={{ margin: 0 }}>{c.text}</p> : !c.blobId && <p className="muted" style={{ margin: 0 }}>No words were sealed with this one.</p>}
          {c.links.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="label" style={{ marginBottom: 8 }}>Sealed with</div>
              <LinkedRefs value={c.links} readOnly />
            </div>
          )}
        </div>
      </Section>

      <Section title="Now">
        <div className="card cr-form">
          <div className="row between wrap" style={{ gap: '4px 12px', marginBottom: 6 }}>
            <label className="cr-field-label" htmlFor={`cap-resp-${c.id}`}>What do I think now?</label>
            <SaveStatus status={respStatus} idleText="" />
          </div>
          <textarea
            id={`cap-resp-${c.id}`}
            className="textarea"
            rows={5}
            value={response}
            onChange={(e) => { pending.current = true; setResponse(e.target.value); setRespErr(null); }}
            placeholder={c.kind === 'prediction' ? 'Did it happen? What did you get right or wrong?' : 'Reading this now, I…'}
            aria-invalid={!!respErr}
          />
          {respErr && <p className="small cr-err" role="alert" style={{ margin: '6px 0 0' }}>{respErr}</p>}
          <div className="card flat row between" style={{ marginTop: 14 }}>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>My view has changed</div>
              <div className="small muted">Saves to Version History as a change of mind, with the capsule as “before”.</div>
            </div>
            <Toggle checked={changed} onChange={setChanged} label="My view has changed" />
          </div>
          <Button variant="primary" block style={{ marginTop: 14 }} onClick={addToHistory}>
            {linkedEntry ? 'Update Version History entry' : 'Add to Version History'}
          </Button>
          {linkedEntry && (
            <Button variant="ghost" block style={{ marginTop: 6 }} onClick={() => navigate(`/entry/${linkedEntry.id}`)}>View the entry</Button>
          )}
        </div>
      </Section>

      <Button variant="danger" className="cr-solo" block style={{ marginTop: 32 }} icon={<Trash2 size={18} aria-hidden />} onClick={del}>Delete capsule</Button>
    </Screen>
  );
}
