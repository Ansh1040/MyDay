// Plot Twist — template-generated, real-world routine breakers sized to time, energy, budget, people, place
// and the Surprise Dial. Accept → optional timer → capture → reflect (saved on the twist + optionally Version History).
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  Camera, Check, ChevronDown, ChevronRight, Clock, Gauge, PenLine, Shuffle, Star, Timer, Trash2, User, Users, Wallet, X, Zap, BookOpen,
} from 'lucide-react';
import type { Comfort, Cost, Energy, Preferences, Social, Twist } from '../../data/types';
import { useStore } from '../../store/store';
import { navigate, useRoute } from '../../lib/router';
import {
  Button, EmptyState, Screen, Section, Segmented, Sheet, Swipeable, Toggle, confirmDialog, toast, useAutosave,
} from '../../components/ui';
import { COMFORT_LABEL, COST_LABEL, ENERGY_LABEL, TimerControl } from '../../components/common';
import {
  TWIST_KIND_LABEL, TWIST_METHOD_NOTE, composeReflection, generateTwist, recentTemplateIds, rerollTwist, splitReflection,
  type RoutineAnswer, type TwistOptions, type TwistSetting,
} from '../../lib/twists';
import { TWIST_TEMPLATES } from '../../data/catalog';
import { removeTimer } from '../../lib/timers';
import { linkParam } from '../../lib/links';
import { fmtDate, nowISO, relTime, uid } from '../../lib/id';
import '../../styles/discover.css';

// ---------------------------------------------------------------------------
// Surprise Dial — shared with Onboarding and Discover.
// ---------------------------------------------------------------------------
export const DIAL_COPY: Record<Comfort, string> = {
  1: 'Comfortable, low-risk ideas close to what you already enjoy.',
  2: 'Mostly familiar, with one small twist.',
  3: 'New angles on things you care about.',
  4: 'Unfamiliar activities that ask a little more of you.',
  5: 'Well outside your usual — surprising and stretching.',
};

/** Accessible 1–5 radio group, Familiar → Adventurous. Arrow keys / Home / End move the selection. */
export function SurpriseDial({ value, onChange, hideTitle }: { value: Comfort; onChange: (c: Comfort) => void; hideTitle?: boolean }) {
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent) => {
    let next: number = value;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(5, value + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(1, value - 1);
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = 5;
    else return;
    e.preventDefault();
    if (next !== value) onChange(next as Comfort);
    refs.current[next - 1]?.focus();
  };
  return (
    <div className="pt-dial">
      <div className="row between">
        <span className={hideTitle ? 'sr-only' : 'label'} id={labelId}>Surprise Dial</span>
        <span className="tiny faint mono" aria-hidden>{value} / 5</span>
      </div>
      <div role="radiogroup" aria-labelledby={labelId} className="pt-dial-track" onKeyDown={onKey}>
        {([1, 2, 3, 4, 5] as Comfort[]).map((n) => (
          <button
            key={n}
            ref={(el) => { refs.current[n - 1] = el; }}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} of 5: ${COMFORT_LABEL[n]}`}
            tabIndex={n === value ? 0 : -1}
            className={'pt-dial-step' + (n <= value ? ' on' : '')}
            onClick={() => onChange(n)}
          >
            <i style={{ height: 12 + n * 8 }} aria-hidden />
            <span aria-hidden>{n}</span>
          </button>
        ))}
      </div>
      <div className="pt-dial-ends tiny faint" aria-hidden>
        <span>Familiar</span>
        <span>Adventurous</span>
      </div>
      <div className="pt-dial-now" aria-live="polite">
        <strong className="display t-sm">{COMFORT_LABEL[value]}</strong>
        <span className="small muted">{DIAL_COPY[value]}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Situation controls (persisted as a small draft so they survive navigation and restarts).
// ---------------------------------------------------------------------------
interface TwistSituation { minutes: number; energy: Energy; budget: Cost; social: Social; setting: TwistSetting; skipped: string[] }
export const TWIST_SETTINGS_KEY = 'twist:settings';
const TIME_OPTS = [5, 15, 30, 60, 120];
const fmtMin = (m: number) => (m >= 120 ? '2 h+' : m >= 60 ? '1 h' : `${m} min`);
export const SOCIAL_LABEL: Record<Social, string> = { solo: 'Solo', either: 'Solo or together', shared: 'With someone' };
export const SETTING_LABEL: Record<TwistSetting, string> = { home: 'At home', anywhere: 'Anywhere', outside: 'Outside' };

function defaultsFrom(p: Preferences): TwistSituation {
  // Round the usual time DOWN to an option so default twists never need more time than the user said they have.
  const minutes = [...TIME_OPTS].reverse().find((m) => m <= p.minutes) ?? TIME_OPTS[0];
  return { minutes, energy: p.energy, budget: p.budget, social: p.social, setting: 'anywhere', skipped: [] };
}

function useSituation(): [TwistSituation, (p: Partial<TwistSituation>) => TwistSituation, () => TwistSituation] {
  const prefs = useStore((s) => s.prefs);
  const stored = useStore((s) => s.drafts[TWIST_SETTINGS_KEY]?.data) as Partial<TwistSituation> | undefined;
  const value = useMemo(() => ({ ...defaultsFrom(prefs), ...stored }), [prefs, stored]);
  const set = (p: Partial<TwistSituation>) => {
    const next = { ...value, ...p };
    useStore.getState().saveDraft(TWIST_SETTINGS_KEY, next);
    return next;
  };
  const reset = () => {
    const next = { ...defaultsFrom(prefs), skipped: value.skipped };
    useStore.getState().saveDraft(TWIST_SETTINGS_KEY, next);
    return next;
  };
  return [value, set, reset];
}

function toOptions(t: TwistSituation, comfort: Comfort, interests: string[]): TwistOptions {
  return {
    minutes: t.minutes, energy: t.energy, budget: t.budget, comfort, social: t.social, setting: t.setting,
    topics: interests, avoid: [...t.skipped, ...recentTemplateIds()],
  };
}

/** Exactly one offered twist lives in the store at a time; rerolling replaces it. */
function replaceOffer(next: Twist | null) {
  const s = useStore.getState();
  Object.values(s.twists).filter((t) => t.status === 'offered').forEach((t) => s.remove('twists', t.id));
  if (next) s.upsert('twists', next);
}

const byNewest = (a: Twist, b: Twist) => (b.doneAt ?? b.createdAt).localeCompare(a.doneAt ?? a.createdAt);
const shortText = (t: string, n = 48) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t);

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export function PlotTwistScreen() {
  const route = useRoute();
  const id = route.query.get('id');
  return id ? <TwistDetail key={id} id={id} /> : <TwistHome />;
}

function TwistHome() {
  const comfort = useStore((s) => s.prefs.comfort);
  const interests = useStore((s) => s.prefs.interests);
  const setPrefs = useStore((s) => s.setPrefs);
  const twists = useStore((s) => s.twists);
  const [sit, setSit, resetSit] = useSituation();
  const noTemplates = TWIST_TEMPLATES.length === 0;

  const all = useMemo(() => Object.values(twists), [twists]);
  const offer = useMemo(() => all.filter((t) => t.status === 'offered').sort(byNewest)[0], [all]);
  const inProgress = useMemo(() => all.filter((t) => t.status === 'accepted').sort(byNewest), [all]);
  const past = useMemo(() => all.filter((t) => t.status === 'accepted' || t.status === 'done').sort((a, b) => {
    if (a.status !== b.status) return a.status === 'accepted' ? -1 : 1;
    return byNewest(a, b);
  }), [all]);

  // Make sure there is something on the table when the screen opens.
  useEffect(() => {
    if (noTemplates) return;
    const hasOffer = Object.values(useStore.getState().twists).some((t) => t.status === 'offered');
    if (!hasOffer) replaceOffer(generateTwist(toOptions(sit, comfort, interests)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regenerate = (next: TwistSituation, c: Comfort = comfort) => replaceOffer(generateTwist(toOptions(next, c, interests)));

  const reroll = () => {
    const next = rerollTwist(offer, toOptions(sit, comfort, interests));
    replaceOffer(next);
  };
  const notForMe = () => {
    if (!offer) return;
    const skipped = [offer.templateId, ...sit.skipped.filter((x) => x !== offer.templateId)].slice(0, 30);
    const next = setSit({ skipped });
    replaceOffer(rerollTwist(offer, toOptions(next, comfort, interests)));
    toast('Skipped — that one will come up less often.');
  };
  const accept = () => {
    if (!offer) return;
    useStore.getState().patch('twists', offer.id, { status: 'accepted' });
    toast('Accepted. Go for it.');
    navigate(`/twist?id=${offer.id}`);
  };
  const changeDial = (c: Comfort) => {
    setPrefs({ comfort: c });
    regenerate(sit, c);
  };
  const changeSit = (p: Partial<TwistSituation>) => regenerate(setSit(p));

  return (
    <Screen title="Plot Twist" eyebrow="Break the routine" backTo="/discover" subtitle="Small real-world surprises sized to your time, energy and budget.">
      <div className="dc-area">
        <div className="card">
          <SurpriseDial value={comfort} onChange={changeDial} />
        </div>
        <div style={{ marginTop: 12 }}>
          <SituationPanel sit={sit} onChange={changeSit} />
        </div>

        {inProgress.length > 0 && (
          <button type="button" className="pt-pending glass" onClick={() => navigate(`/twist?id=${inProgress[0].id}`)}>
            <Timer size={20} aria-hidden />
            <span className="grow">
              <span className="small" style={{ fontWeight: 650, display: 'block' }}>
                {inProgress.length === 1 ? 'You have a twist in progress' : `You have ${inProgress.length} twists in progress`}
              </span>
              <span className="small muted">“{shortText(inProgress[0].text, 70)}”</span>
            </span>
            <ChevronRight size={20} aria-hidden />
          </button>
        )}

        <Section title="Suggested twist">
          {noTemplates ? (
            <EmptyState title="No twists available" body="The twist templates aren’t available in this build, so there’s nothing to suggest yet." />
          ) : offer ? (
            <div className="stack">
              <Swipeable onLeft={reroll} onRight={accept} leftLabel="Reroll" rightLabel="Accept" leftIcon={<Shuffle size={18} />} rightIcon={<Check size={18} />}>
                <TwistCard key={offer.id} t={offer} />
              </Swipeable>
              {Math.abs(offer.comfort - comfort) > 1 && (
                <p className="tiny dc-caption" style={{ margin: 0 }}>Nothing matched your exact Surprise Dial level with these settings, so this is the closest fit.</p>
              )}
              <div className="pt-actions">
                <Button onClick={notForMe} icon={<X size={18} />}>Not for me</Button>
                <Button onClick={reroll} icon={<Shuffle size={18} />}>Reroll</Button>
                <Button variant="primary" onClick={accept} icon={<Check size={18} />}>Accept</Button>
              </div>
              <p className="pt-hint"><span className="tiny on-art">Swipe the card left to reroll or right to accept.</span></p>
            </div>
          ) : (
            <EmptyState
              icon={<Shuffle size={24} />}
              title="Nothing fits these settings"
              body="No twist fits this time, energy, budget, company and place. Try more time, a higher budget, or “Anywhere”."
              action={<Button onClick={() => regenerate(resetSit())}>Reset to my usual settings</Button>}
            />
          )}
        </Section>

        <Section title="Your twists">
          {past.length ? (
            <div className="list">
              {past.map((t) => <TwistRow key={t.id} t={t} />)}
            </div>
          ) : (
            <EmptyState title="No twists yet" body="Accept a twist above. It will show up here with your timer, captures and reflection." />
          )}
        </Section>
      </div>
    </Screen>
  );
}

function SituationPanel({ sit, onChange }: { sit: TwistSituation; onChange: (p: Partial<TwistSituation>) => void }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const summary = [fmtMin(sit.minutes), ENERGY_LABEL[sit.energy], COST_LABEL[sit.budget], SOCIAL_LABEL[sit.social], SETTING_LABEL[sit.setting]].join(' · ');
  return (
    <div className="pt-controls glass">
      <button type="button" className="pt-controls-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        <span className="grow">
          <span className="label" style={{ display: 'block' }}>Right now</span>
          <span className="small">{summary}</span>
        </span>
        <span className="small muted">{open ? 'Done' : 'Adjust'}</span>
        <ChevronDown size={20} aria-hidden />
      </button>
      {open && (
        <div className="pt-controls-body" id={panelId}>
          <Ctl label="Time I have">
            <Segmented label="Time I have" value={sit.minutes} options={TIME_OPTS.map((m) => ({ value: m, label: fmtMin(m) }))} onChange={(v) => onChange({ minutes: v })} />
          </Ctl>
          <Ctl label="Energy">
            <Segmented<Energy> label="Energy" value={sit.energy} options={[{ value: 1, label: 'Low' }, { value: 2, label: 'Medium' }, { value: 3, label: 'High' }]} onChange={(v) => onChange({ energy: v })} />
          </Ctl>
          <Ctl label="Budget">
            <Segmented<Cost> label="Budget" value={sit.budget} options={[{ value: 0, label: 'Free' }, { value: 1, label: 'A little' }, { value: 2, label: 'Some' }]} onChange={(v) => onChange({ budget: v })} />
          </Ctl>
          <Ctl label="Who">
            <Segmented<Social> label="Who" value={sit.social} options={[{ value: 'solo', label: 'Solo' }, { value: 'either', label: 'Either' }, { value: 'shared', label: 'With someone' }]} onChange={(v) => onChange({ social: v })} />
          </Ctl>
          <Ctl label="Where">
            <Segmented<TwistSetting> label="Where" value={sit.setting} options={[{ value: 'home', label: 'Home' }, { value: 'anywhere', label: 'Anywhere' }, { value: 'outside', label: 'Outside' }]} onChange={(v) => onChange({ setting: v })} />
          </Ctl>
        </div>
      )}
    </div>
  );
}

const Ctl = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="pt-ctl">
    <span aria-hidden>{label}</span>
    {children}
  </div>
);

/** The big editorial twist card. */
export function TwistCard({ t }: { t: Twist }) {
  const status = t.status === 'accepted' ? 'Accepted' : t.status === 'done' ? 'Done' : t.status === 'skipped' ? 'Dropped' : COMFORT_LABEL[t.comfort];
  const SocialIcon = t.social === 'solo' ? User : Users;
  return (
    <article className={'pt-card glass rise' + (t.status === 'done' ? ' done' : '')} aria-label={`Plot twist: ${t.text}`}>
      <div className="row between">
        <span className="label accent">{TWIST_KIND_LABEL[t.kind] ?? 'Plot twist'}</span>
        <span className="tag">{status === 'Done' && <Check size={12} aria-hidden />}{status}</span>
      </div>
      <p className="display pt-text">{t.text}</p>
      <div className="pt-meta small muted">
        <span><Clock size={14} aria-hidden /> {t.minutes} min</span>
        <span><Zap size={14} aria-hidden /> {ENERGY_LABEL[t.energy]}</span>
        <span><Wallet size={14} aria-hidden /> {COST_LABEL[t.cost]}</span>
        <span><SocialIcon size={14} aria-hidden /> {SOCIAL_LABEL[t.social]}</span>
        <span><Gauge size={14} aria-hidden /> {COMFORT_LABEL[t.comfort]}</span>
      </div>
      {t.social === 'shared' && (
        <p className="small pt-invite"><Users size={16} aria-hidden /> Best with someone — invite a friend, housemate or family member to join you.</p>
      )}
      <p className="tiny faint pt-origin">{TWIST_METHOD_NOTE}</p>
    </article>
  );
}

function TwistRow({ t }: { t: Twist }) {
  const { text } = splitReflection(t.reflection);
  return (
    <button type="button" className="list-row" onClick={() => navigate(`/twist?id=${t.id}`)}>
      <span className="lr-icon">{t.status === 'done' ? <Check size={18} aria-hidden /> : <Timer size={18} aria-hidden />}</span>
      <span className="grow">
        <span className="lr-title" style={{ display: 'block' }}>{t.text}</span>
        <span className="lr-sub" style={{ display: 'block' }}>
          {t.status === 'done' ? `Done ${relTime(t.doneAt ?? t.createdAt)}` : `In progress · accepted ${relTime(t.createdAt)}`}
          {t.rating ? ` · rated ${t.rating}/5` : ''}
        </span>
        {text && <span className="small muted pt-excerpt">“{shortText(text, 140)}”</span>}
      </span>
      <ChevronRight size={18} aria-hidden />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Detail (?id=)
// ---------------------------------------------------------------------------
function TwistDetail({ id }: { id: string }) {
  const t = useStore((s) => s.twists[id]);
  const notes = useStore((s) => s.notes);
  const entries = useStore((s) => s.entries);
  const blur = useStore((s) => s.settings.privacy.blurPrivate);
  const [reflectOpen, setReflectOpen] = useState(false);
  const closeReflect = useCallback(() => setReflectOpen(false), []);

  const linkedNotes = useMemo(
    () => Object.values(notes).filter((n) => n.links.some((l) => l.kind === 'twist' && l.id === id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notes, id],
  );
  const linkedEntries = useMemo(
    () => Object.values(entries).filter((e) => e.links.some((l) => l.kind === 'twist' && l.id === id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries, id],
  );

  if (!t) {
    return (
      <Screen title="Plot Twist" backTo="/twist">
        <div className="dc-area">
          <EmptyState
            title="This twist isn’t here"
            body="It may have been rerolled or deleted, or it was created on another device."
            action={<Button variant="primary" onClick={() => navigate('/twist', { replace: true })}>Get a twist</Button>}
          />
        </div>
      </Screen>
    );
  }

  const ref = { kind: 'twist' as const, id: t.id };
  const s = useStore.getState;
  const accept = () => { s().patch('twists', t.id, { status: 'accepted' }); toast('Accepted. Go for it.'); };
  const drop = async () => {
    const ok = await confirmDialog({
      title: 'Drop this twist?',
      body: linkedNotes.length ? 'It will be removed from your twists. Notes you captured stay in Field Notes.' : 'It will be removed from your twists.',
      confirmLabel: 'Drop it',
      danger: true,
    });
    if (!ok) return;
    rememberSkip(t.templateId);
    removeTimer(`twist:${t.id}`);
    s().remove('twists', t.id);
    toast('Twist dropped');
    navigate('/twist', { replace: true });
  };
  const del = async () => {
    const ok = await confirmDialog({
      title: 'Delete this twist?',
      body: 'Its reflection is deleted with it. Version History entries and notes you made stay, but lose the link.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    removeTimer(`twist:${t.id}`);
    s().remove('twists', t.id);
    toast('Twist deleted');
    navigate('/twist', { replace: true });
  };
  const { text: reflection, routine } = splitReflection(t.reflection);

  return (
    <Screen title={t.status === 'done' ? 'Twist — done' : t.status === 'accepted' ? 'Twist in progress' : 'Plot Twist'} backTo="/twist" hideLargeTitle>
      <div className="dc-area">
        <div style={{ marginTop: 8 }}>
          <TwistCard t={t} />
        </div>

        {(t.status === 'offered' || t.status === 'skipped') && (
          <div className="row" style={{ marginTop: 14 }}>
            <Button className="grow" onClick={() => navigate('/twist', { replace: true })}>Not now</Button>
            <Button className="grow" variant="primary" icon={<Check size={18} />} onClick={accept}>Accept</Button>
          </div>
        )}

        {t.status === 'accepted' && (
          <>
            <Section title="Timer">
              <TimerControl id={`twist:${t.id}`} label={`Plot twist: ${shortText(t.text, 40)}`} minutes={t.minutes} refTo={ref} />
              <p className="tiny dc-caption" style={{ margin: '8px 0 0' }}>Optional. The timer keeps running if you leave this screen.</p>
            </Section>
            <CaptureSection id={t.id} notes={linkedNotes} blur={blur} />
            {t.social === 'shared' && <QuestOffer />}
            <div className="stack" style={{ marginTop: 28 }}>
              <Button variant="primary" block icon={<Check size={18} />} onClick={() => setReflectOpen(true)}>Done — reflect on it</Button>
              <Button block onClick={drop}>Drop this twist</Button>
            </div>
          </>
        )}

        {t.status === 'done' && (
          <>
            <Section title="Your reflection" action={<Button size="sm" icon={<PenLine size={16} />} onClick={() => setReflectOpen(true)}>Edit</Button>}>
              <div className="card">
                <div className="row wrap small muted" style={{ gap: 12 }}>
                  <span>Done {t.doneAt ? fmtDate(t.doneAt) : ''}</span>
                  {t.rating && (
                    <span className="row" style={{ gap: 2 }} aria-label={`Rated ${t.rating} of 5`}>
                      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} aria-hidden fill={n <= t.rating! ? 'currentColor' : 'none'} />)}
                    </span>
                  )}
                  {routine && <span>Broke the routine: {routine}</span>}
                </div>
                {reflection ? <p className="pt-reflection">{reflection}</p> : <p className="muted small" style={{ margin: '8px 0 0' }}>No written reflection.</p>}
              </div>
            </Section>
            {linkedEntries.length > 0 && (
              <Section title="In Version History">
                <div className="list">
                  {linkedEntries.map((e) => (
                    <button key={e.id} type="button" className="list-row" onClick={() => navigate(`/entry/${e.id}`)}>
                      <span className="lr-icon"><BookOpen size={18} aria-hidden /></span>
                      <span className="grow">
                        <span className="lr-title" style={{ display: 'block' }}>{e.private && blur ? 'Private entry' : e.title || 'Untitled entry'}</span>
                        <span className="lr-sub">{relTime(e.createdAt)}</span>
                      </span>
                      <ChevronRight size={18} aria-hidden />
                    </button>
                  ))}
                </div>
              </Section>
            )}
            <CaptureSection id={t.id} notes={linkedNotes} blur={blur} />
            {t.social === 'shared' && <QuestOffer />}
            <div style={{ marginTop: 28 }}>
              <Button variant="danger" block className="pt-danger" icon={<Trash2 size={18} />} onClick={del}>Delete this twist</Button>
            </div>
          </>
        )}

        {reflectOpen && <ReflectSheet t={t} hasEntry={linkedEntries[0]?.id} onClose={closeReflect} />}
      </div>
    </Screen>
  );
}

function rememberSkip(templateId: string) {
  const s = useStore.getState();
  const cur = (s.drafts[TWIST_SETTINGS_KEY]?.data ?? {}) as Partial<TwistSituation>;
  const skipped = [templateId, ...(cur.skipped ?? []).filter((x) => x !== templateId)].slice(0, 30);
  if (s.drafts[TWIST_SETTINGS_KEY]) s.saveDraft(TWIST_SETTINGS_KEY, { ...cur, skipped });
  else s.saveDraft(TWIST_SETTINGS_KEY, { ...defaultsFrom(s.prefs), skipped });
}

function CaptureSection({ id, notes, blur }: { id: string; notes: { id: string; title: string; text: string; kind: string; private: boolean; createdAt: string }[]; blur: boolean }) {
  const link = linkParam({ kind: 'twist', id });
  return (
    <Section title="Capture">
      <div className="pt-capture">
        <Button icon={<Camera size={18} />} onClick={() => navigate(`/note/new?kind=photo&link=${link}`)}>Photo</Button>
        <Button icon={<PenLine size={18} />} onClick={() => navigate(`/note/new?kind=text&link=${link}`)}>Note</Button>
      </div>
      {notes.length > 0 ? (
        <div className="list" style={{ marginTop: 12 }}>
          {notes.map((n) => (
            <button key={n.id} type="button" className="list-row" onClick={() => navigate(`/note/${n.id}`)}>
              <span className="lr-icon">{n.kind === 'photo' ? <Camera size={18} aria-hidden /> : <PenLine size={18} aria-hidden />}</span>
              <span className="grow">
                <span className="lr-title" style={{ display: 'block' }}>{n.private && blur ? 'Private note' : n.title || shortText(n.text, 60) || 'Untitled note'}</span>
                <span className="lr-sub">{relTime(n.createdAt)}</span>
              </span>
              <ChevronRight size={18} aria-hidden />
            </button>
          ))}
        </div>
      ) : (
        <p className="tiny dc-caption" style={{ margin: '10px 0 0' }}>Photos and notes you capture here are saved to Field Notes and linked to this twist.</p>
      )}
    </Section>
  );
}

function QuestOffer() {
  return (
    <Section>
      <div className="card tinted">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <Users size={22} aria-hidden style={{ color: 'var(--accent-text)', flexShrink: 0, marginTop: 2 }} />
          <div className="grow">
            <h3 className="display t-sm" style={{ marginBottom: 4 }}>Make it a Two-Person Quest</h3>
            <p className="small muted" style={{ margin: '0 0 12px' }}>Turn it into a shared challenge you send as a link or code. You each answer, then compare — nothing goes through a server.</p>
            <Button size="sm" variant="primary" onClick={() => navigate('/quests')}>Open Two-Person Quests</Button>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Reflection sheet (autosaved as a draft until saved)
// ---------------------------------------------------------------------------
interface ReflectDraft { text: string; rating: number; routine: RoutineAnswer | '' }

function ReflectSheet({ t, hasEntry, onClose }: { t: Twist; hasEntry?: string; onClose: () => void }) {
  const draftKey = `twist:${t.id}:reflection`;
  const initial = useMemo<ReflectDraft>(() => {
    const d = useStore.getState().drafts[draftKey]?.data as ReflectDraft | undefined;
    if (d) return d;
    const sp = splitReflection(t.reflection);
    return { text: sp.text, rating: t.rating ?? 0, routine: sp.routine ?? '' };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [text, setText] = useState(initial.text);
  const [rating, setRating] = useState(initial.rating);
  const [routine, setRoutine] = useState<RoutineAnswer | ''>(initial.routine);
  const [toHistory, setToHistory] = useState(true);
  const draft = useMemo(() => ({ text, rating, routine }), [text, rating, routine]);
  const status = useAutosave(draft, (v) => useStore.getState().saveDraft(draftKey, v));

  const save = () => {
    const s = useStore.getState();
    const firstTime = t.status !== 'done';
    const reflection = composeReflection(text, routine);
    const at = nowISO();
    s.patch('twists', t.id, {
      status: 'done',
      doneAt: t.doneAt ?? at,
      reflection,
      rating: rating ? (rating as 1 | 2 | 3 | 4 | 5) : undefined,
    });
    if (firstTime) {
      s.complete({ kind: 'twist', id: t.id }, { minutes: t.minutes, rating: rating ? (rating as 1 | 2 | 3 | 4 | 5) : undefined });
      removeTimer(`twist:${t.id}`); // the twist is over; don't leave its timer in the dock
    }
    let savedEntry = false;
    if (toHistory && (text.trim() || routine)) {
      const body = `Twist: “${t.text}”\n\n${reflection}`;
      const existing = hasEntry ? s.entries[hasEntry] : undefined;
      if (existing) {
        if (existing.text !== body) {
          s.patch('entries', existing.id, {
            text: body,
            revisions: [...existing.revisions, { text: existing.text, at: existing.updatedAt, note: 'Before editing the twist reflection' }],
            updatedAt: at,
          });
        }
      } else {
        s.upsert('entries', {
          id: uid('e-'),
          kind: 'reflection',
          title: `Plot twist: ${shortText(t.text, 60)}`,
          text: body,
          revisions: [],
          topics: t.topics,
          links: [{ kind: 'twist', id: t.id }],
          private: false,
          createdAt: at,
          updatedAt: at,
        });
      }
      savedEntry = true;
    }
    s.clearDraft(draftKey);
    onClose();
    toast(firstTime ? (savedEntry ? 'Done — reflection saved to Version History' : 'Done — reflection saved') : 'Reflection updated');
  };

  const onStarKey = (e: KeyboardEvent) => {
    let next = rating || 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(5, next + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(1, next - 1);
    else return;
    e.preventDefault();
    setRating(next);
    (e.currentTarget.querySelectorAll('button')[next - 1] as HTMLButtonElement | undefined)?.focus();
  };

  return (
    <Sheet open onClose={onClose} title={t.status === 'done' ? 'Edit reflection' : 'How did it go?'}>
      <div className="dc-area">
        <p className="small muted" style={{ marginTop: 0 }}>“{shortText(t.text, 120)}”</p>
        <div className="pt-sheet-section">
          <label className="field">
            <span>What happened?</span>
            <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="What did you notice? What surprised you?" />
          </label>
        </div>
        <div className="pt-sheet-section">
          <span className="label" id={`rate-${t.id}`}>Rating</span>
          <div className="pt-stars" role="radiogroup" aria-labelledby={`rate-${t.id}`} onKeyDown={onStarKey}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} of 5`}
                tabIndex={(rating || 1) === n ? 0 : -1}
                className={'pt-star' + (n <= rating ? ' on' : '')}
                onClick={() => setRating(rating === n ? 0 : n)}
              >
                <Star size={26} aria-hidden fill={n <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
        </div>
        <div className="pt-sheet-section">
          <span className="label">Did it break the routine?</span>
          <Segmented<RoutineAnswer | ''>
            label="Did it break the routine?"
            value={routine}
            options={[{ value: 'Yes', label: 'Yes' }, { value: 'A little', label: 'A little' }, { value: 'Not really', label: 'Not really' }]}
            onChange={(v) => setRoutine(routine === v ? '' : v)}
          />
        </div>
        <div className="row between pt-sheet-section">
          <span className="small" style={{ fontWeight: 600 }}>{hasEntry ? 'Update my Version History entry' : 'Also save to Version History'}</span>
          <Toggle checked={toHistory} onChange={setToHistory} label={hasEntry ? 'Update my Version History entry' : 'Also save to Version History'} />
        </div>
        <Button variant="primary" block onClick={save} icon={<Check size={18} />}>{t.status === 'done' ? 'Save changes' : 'Mark done'}</Button>
        <p className="tiny faint" style={{ textAlign: 'center', margin: '10px 0 0' }} aria-live="polite">
          {status === 'saving' ? 'Saving draft…' : status === 'saved' ? 'Draft saved on this device' : 'Drafts save automatically'}
        </p>
      </div>
    </Sheet>
  );
}

