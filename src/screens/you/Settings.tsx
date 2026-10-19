// Settings: appearance, profile & preferences, notifications & reminders, privacy, data, about.
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Palette, SlidersHorizontal, Bell, Lock, Database, Info, Download, ChevronRight, Sun, Moon, SunMoon, Plus, X, Trash2,
  BellRing, ShieldCheck, Upload, HardDrive, Smartphone, Globe, Share2, Eye, EyeOff, Check, CircleAlert, ClipboardCopy, ClipboardPaste, TextSelect,
} from 'lucide-react';
import type { Comfort, Cost, Energy, Reminder, Social } from '../../data/types';
import { useStore } from '../../store/store';
import { navigate } from '../../lib/router';
import { THEMES } from '../../lib/theme';
import { uid, fmtDate, todayKey } from '../../lib/id';
import { isNative, isStandalonePWA } from '../../lib/platform';
import { getPermission, requestPermission, notifyNow, scheduleAt, cancelScheduled, type PermissionState, type NotifyCategory } from '../../lib/notify';
import { syncReminderNative } from '../../lib/background';
import {
  exportData, saveExportFile, shareExportFile, copyExportText, readClipboardText, previewImport, importData, deleteAllData, storageEstimate, fmtBytes, exportFileName,
  countLabel, type ImportPreview,
} from '../../lib/dataio';
import { blobs } from '../../lib/db';
import { TOPICS, SKILLS, getExperience, topicLabel } from '../../data/catalog';
import { FORMAT_KEYS, formatMeta } from '../../formats/meta';
import { ENERGY_LABEL, COMFORT_LABEL, COST_LABEL } from '../../components/common';
import {
  Screen, Button, IconButton, Chip, Field, Toggle, Segmented, Section, ListRow, Sheet, toast, confirmDialog,
} from '../../components/ui';
import { plural, listJoin } from './VersionHistory';
import '../../styles/you.css';

export const APP_VERSION = '1.0.0';

const SECTIONS = [
  { id: 'appearance', title: 'Appearance', sub: 'Theme artwork, day and night, transparency, motion, text size', icon: Palette },
  { id: 'profile', title: 'Profile & preferences', sub: 'Name, interests, Surprise Dial, feedback', icon: SlidersHorizontal },
  { id: 'notifications', title: 'Notifications & reminders', sub: 'Permission, categories, quiet hours, reminders', icon: Bell },
  { id: 'privacy', title: 'Privacy', sub: 'What stays on this device', icon: Lock },
  { id: 'data', title: 'Your data', sub: 'Export, import, storage, delete', icon: Database },
  { id: 'about', title: 'About Elsewhere', sub: 'Version, limits, design, credits', icon: Info },
] as const;

export function SettingsScreen({ section }: { section?: string }) {
  switch (section) {
    case 'appearance': return <AppearanceSettings />;
    case 'profile': return <ProfileSettings />;
    case 'notifications': return <NotificationSettings />;
    case 'privacy': return <PrivacySettings />;
    case 'data': return <DataSettings />;
    case 'about': return <AboutSettings />;
    default:
      return (
        <Screen title="Settings" eyebrow="You" backTo="/you">
          <div className="list y-panel">
            {SECTIONS.map((s) => (
              <ListRow key={s.id} icon={<s.icon size={18} aria-hidden />} title={s.title} sub={s.sub} onClick={() => navigate(`/settings/${s.id}`)} right={<ChevronRight size={18} aria-hidden />} />
            ))}
          </div>
          <div className="list y-panel" style={{ marginTop: 16 }}>
            <ListRow icon={<Download size={18} aria-hidden />} title="Install guide" sub="Add Elsewhere to your home screen or install the Android app" onClick={() => navigate('/install')} right={<ChevronRight size={18} aria-hidden />} />
          </div>
          <p className="tiny faint y-note" style={{ marginTop: 20 }}>Elsewhere {APP_VERSION}. Settings are saved on this device as you change them.</p>
        </Screen>
      );
  }
}

// ---------------------------------------------------------------- helpers
/** A glass panel for settings content (text never sits directly on the artwork). */
function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={'card y-panel ' + className}>{children}</div>;
}
/** Helper text inside a panel. */
const Hint = ({ children }: { children: ReactNode }) => <p className="tiny faint st-hint">{children}</p>;
function Row({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children: ReactNode }) {
  return (
    <div className="list-row st-row">
      <span className="grow">
        <span className="lr-title" style={{ display: 'block' }}>{title}</span>
        {sub && <span className="lr-sub" style={{ display: 'block' }}>{sub}</span>}
      </span>
      {children}
    </div>
  );
}
function ToggleRow({ title, sub, checked, onChange }: { title: string; sub?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row title={title} sub={sub}>
      <Toggle label={title} checked={checked} onChange={onChange} />
    </Row>
  );
}
function Block({ title, children, hint }: { title: string; children: ReactNode; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className="card y-panel st-block" role="group" aria-labelledby={id}>
      <div className="field-label" id={id}>{title}</div>
      {children}
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

// ---------------------------------------------------------------- appearance
function AppearanceSettings() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  return (
    <Screen title="Appearance" eyebrow="Settings" backTo="/settings" subtitle="Changes apply right away. Each theme has its own artwork behind the app; switching keeps all your data.">
      <Section title="Theme">
        <div className="st-themes" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => {
            const on = settings.theme === t.id;
            return (
              <button key={t.id} type="button" role="radio" aria-checked={on} className="card st-theme" onClick={() => setSettings({ theme: t.id })}>
                <span className="st-art">
                  {/* The theme's real background artwork; the caption below describes it. */}
                  <img src={t.art} alt="" loading="lazy" decoding="async" draggable={false} />
                  {on && <span className="st-check" aria-hidden><Check size={15} strokeWidth={2.6} /></span>}
                </span>
                <span className="st-theme-body">
                  <span className="st-theme-name">
                    <span className="display t-sm">{t.name}</span>
                    <span className="st-swatch" aria-hidden>
                      {/* Dots preview each theme's own palette (data from THEMES), not this screen's colours. */}
                      {t.swatch.slice(1).map((c, i) => <i key={i} style={{ background: c }} />)}
                    </span>
                  </span>
                  <span className="tiny muted st-art-note">{t.artNote}</span>
                  {on && <span className="tiny st-in-use">In use</span>}
                </span>
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="Day and night">
        <Panel>
          <Segmented
            label="Appearance"
            value={settings.appearance}
            onChange={(appearance) => setSettings({ appearance })}
            options={[
              { value: 'auto', label: <span className="row" style={{ gap: 6, justifyContent: 'center' }}><SunMoon size={15} aria-hidden /> Auto</span> },
              { value: 'light', label: <span className="row" style={{ gap: 6, justifyContent: 'center' }}><Sun size={15} aria-hidden /> Day</span> },
              { value: 'dark', label: <span className="row" style={{ gap: 6, justifyContent: 'center' }}><Moon size={15} aria-hidden /> Night</span> },
            ]}
          />
          <Hint>Auto follows your device’s light or dark setting. Night dims the artwork without hiding it.</Hint>
        </Panel>
      </Section>
      <Section title="Transparency">
        <div className="list y-panel">
          <ToggleRow
            title="Reduce transparency"
            sub="Uses solid panels instead of glass. Also follows your device’s reduce-transparency setting where supported."
            checked={!!settings.reduceTransparency}
            onChange={(reduceTransparency) => setSettings({ reduceTransparency })}
          />
        </div>
      </Section>
      <Section title="Reduced motion">
        <Panel>
          <Segmented
            label="Reduced motion"
            value={settings.reducedMotion}
            onChange={(reducedMotion) => setSettings({ reducedMotion })}
            options={[{ value: 'system', label: 'System' }, { value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
          />
          <Hint>On turns off animations, including the Curiosity Map settling into place. System follows your device’s setting.</Hint>
        </Panel>
      </Section>
      <Section title="Text size">
        <Panel>
          <label className="field">
            <span>Text size · {Math.round(settings.textScale * 100)}%</span>
            <input
              type="range"
              className="range"
              min={0.9}
              max={1.3}
              step={0.05}
              value={settings.textScale}
              onChange={(e) => setSettings({ textScale: Number(e.target.value) })}
              aria-valuetext={`${Math.round(settings.textScale * 100)} percent`}
            />
          </label>
          <p className="muted" style={{ margin: '6px 0 0' }}>The quick brown fox explores a rabbit hole.</p>
        </Panel>
      </Section>
      <Section title="Feedback">
        <div className="list y-panel">
          <ToggleRow title="Haptics" sub="Short vibrations on Android. Most other devices ignore this." checked={settings.haptics} onChange={(haptics) => setSettings({ haptics })} />
          <ToggleRow title="Sounds" sub="A soft chime when a timer finishes." checked={settings.sound} onChange={(sound) => setSettings({ sound })} />
        </div>
      </Section>
    </Screen>
  );
}

// ---------------------------------------------------------------- profile
function ProfileSettings() {
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  const feedback = useStore((s) => s.feedback);
  const unhide = useStore((s) => s.unhide);
  const resetFeedback = useStore((s) => s.resetFeedback);
  const [goal, setGoal] = useState('');
  const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const more = Object.entries(feedback.topic).filter(([, v]) => v > 0).map(([t]) => topicLabel(t));
  const less = Object.entries(feedback.topic).filter(([, v]) => v < 0).map(([t]) => topicLabel(t));
  const fMore = Object.entries(feedback.format).filter(([, v]) => v > 0).map(([f]) => formatMeta(f).label);
  const fLess = Object.entries(feedback.format).filter(([, v]) => v < 0).map(([f]) => formatMeta(f).label);
  const anyFeedback = more.length + less.length + fMore.length + fLess.length + feedback.hidden.length > 0;

  const addGoal = () => {
    const g = goal.trim();
    if (!g) return;
    setPrefs({ goals: [...prefs.goals, g] });
    setGoal('');
  };

  return (
    <Screen title="Profile & preferences" eyebrow="Settings" backTo="/settings" subtitle="These shape what Discover suggests. Change them any time.">
      <div className="stack lg">
        <Panel>
          <Field label="Your name" hint="Shown on the You tab, and offered as your name when you answer a two-person quest.">
            <input className="input" value={prefs.name} onChange={(e) => setPrefs({ name: e.target.value })} placeholder="What should we call you?" autoComplete="given-name" />
          </Field>
        </Panel>

        <Block title="Interests" hint={`${plural(prefs.interests.length, 'topic', 'topics')} selected.`}>
          <div className="chips">
            {TOPICS.map((t) => (
              <Chip key={t.id} active={prefs.interests.includes(t.id)} onClick={() => setPrefs({ interests: toggleIn(prefs.interests, t.id) })}>{t.label}</Chip>
            ))}
          </div>
        </Block>

        <Block title="Skills to develop">
          <div className="chips">
            {SKILLS.map((k) => (
              <Chip key={k.id} active={prefs.skills.includes(k.id)} onClick={() => setPrefs({ skills: toggleIn(prefs.skills, k.id) })}>{k.name}</Chip>
            ))}
            {!SKILLS.length && <span className="small muted">Skills aren’t available in this build.</span>}
          </div>
        </Block>

        <Block title="Goals">
          {prefs.goals.length > 0 && (
            <ul className="st-goals">
              {prefs.goals.map((g, i) => (
                <li key={g + i}>
                  <span className="grow">{g}</span>
                  <IconButton label={`Remove goal: ${g}`} onClick={() => setPrefs({ goals: prefs.goals.filter((_, j) => j !== i) })}><X size={18} /></IconButton>
                </li>
              ))}
            </ul>
          )}
          <form className="row" onSubmit={(e) => { e.preventDefault(); addGoal(); }}>
            <input className="input grow" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Notice more of my neighbourhood" aria-label="New goal" />
            <Button type="submit" disabled={!goal.trim()} icon={<Plus size={18} />}>Add</Button>
          </form>
        </Block>

        <Block title={`Usual time available · about ${prefs.minutes} minutes`}>
          <input type="range" className="range" min={5} max={120} step={5} value={prefs.minutes} onChange={(e) => setPrefs({ minutes: Number(e.target.value) })} aria-label="Usual time available in minutes" aria-valuetext={`${prefs.minutes} minutes`} />
        </Block>

        <Block title="Usual energy">
          <Segmented<Energy> label="Usual energy" value={prefs.energy} onChange={(energy) => setPrefs({ energy })} options={([1, 2, 3] as Energy[]).map((v) => ({ value: v, label: ENERGY_LABEL[v].replace(' energy', '') }))} />
        </Block>

        <Block title={`Surprise Dial · ${COMFORT_LABEL[prefs.comfort]}`} hint="How far outside your comfort zone suggestions may go: 1 is familiar, 5 is adventurous.">
          <input type="range" className="range" min={1} max={5} step={1} value={prefs.comfort} onChange={(e) => setPrefs({ comfort: Number(e.target.value) as Comfort })} aria-label="Surprise Dial" aria-valuetext={COMFORT_LABEL[prefs.comfort]} />
          <div className="row between tiny faint"><span>Familiar</span><span>Adventurous</span></div>
        </Block>

        <Block title="Budget">
          <Segmented<Cost> label="Budget" value={prefs.budget} onChange={(budget) => setPrefs({ budget })} options={([0, 1, 2] as Cost[]).map((v) => ({ value: v, label: COST_LABEL[v] }))} />
        </Block>

        <Block title="Solo or shared">
          <Segmented<Social> label="Solo or shared" value={prefs.social} onChange={(social) => setPrefs({ social })} options={[{ value: 'solo', label: 'Solo' }, { value: 'shared', label: 'With someone' }, { value: 'either', label: 'Either' }]} />
        </Block>

        <Block title="Formats you enjoy" hint={prefs.formats.length ? `${plural(prefs.formats.length, 'format', 'formats')} preferred. Others still appear, just less often.` : 'None selected: all formats are treated equally.'}>
          <div className="chips">
            {FORMAT_KEYS.map((f) => {
              const F = formatMeta(f);
              return (
                <Chip key={f} active={prefs.formats.includes(f)} onClick={() => setPrefs({ formats: toggleIn(prefs.formats, f) })} icon={<F.icon size={14} aria-hidden />}>{F.label}</Chip>
              );
            })}
          </div>
        </Block>

        <Section title="Your feedback" style={{ marginTop: 0 }}>
          {anyFeedback ? (
            <div className="card y-panel stack sm">
              {more.length > 0 && <p className="small" style={{ margin: 0 }}><b>More like this:</b> {listJoin(more)}</p>}
              {less.length > 0 && <p className="small" style={{ margin: 0 }}><b>Less like this:</b> {listJoin(less)}</p>}
              {fMore.length > 0 && <p className="small" style={{ margin: 0 }}><b>Formats you asked for more of:</b> {listJoin(fMore)}</p>}
              {fLess.length > 0 && <p className="small" style={{ margin: 0 }}><b>Formats you asked for less of:</b> {listJoin(fLess)}</p>}
              {feedback.hidden.length > 0 && (
                <>
                  <p className="small" style={{ margin: '6px 0 0' }}><b>Hidden ({feedback.hidden.length})</b></p>
                  <div className="list">
                    {feedback.hidden.map((id) => (
                      <Row key={id} title={getExperience(id)?.title ?? 'An experience that no longer exists'}>
                        <Button size="sm" variant="ghost" onClick={() => { unhide(id); toast('Unhidden'); }}>Unhide</Button>
                      </Row>
                    ))}
                  </div>
                </>
              )}
              <Button
                variant="danger"
                size="sm"
                style={{ alignSelf: 'flex-start', marginTop: 6 }}
                onClick={async () => {
                  if (await confirmDialog({ title: 'Reset feedback?', body: 'This clears every “more like this”, “less like this” and hidden item. Your interests and other preferences stay.', confirmLabel: 'Reset feedback', danger: true })) {
                    resetFeedback();
                    toast('Feedback reset');
                  }
                }}
              >
                Reset feedback
              </Button>
            </div>
          ) : (
            <Panel><p className="small muted" style={{ margin: 0 }}>No feedback yet. Use “More like this”, “Less like this” or “Hide” on any suggestion.</p></Panel>
          )}
        </Section>

        <div className="card tinted y-panel st-explain">
          <h2 className="display t-sm" style={{ marginBottom: 8 }}>How suggestions work</h2>
          <ul>
            <li><b>Curated content:</b> the experiences, rabbit holes and skills were written for Elsewhere and ship with the app.</li>
            <li><b>Rule-based ranking:</b> suggestions are ordered by simple rules using your preferences above and your feedback — matching topics, time, energy, budget, Surprise Dial and formats.</li>
            <li><b>Remixes are template-generated:</b> Remix Studio fills fixed templates; nothing is written by a model.</li>
            <li><b>No AI and no tracking:</b> nothing you do is sent anywhere or used to profile you.</li>
          </ul>
        </div>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- notifications
const CATS: { id: NotifyCategory; title: string; sub: string }[] = [
  { id: 'timers', title: 'Timers', sub: 'When a timer finishes.' },
  { id: 'reminders', title: 'Reminders', sub: 'The reminders you set below.' },
  { id: 'capsules', title: 'Capsules', sub: 'When a sealed capsule is ready to open.' },
  { id: 'shared', title: 'Shared updates', sub: 'When an imported reply code updates a two-person quest.' },
  { id: 'tickets', title: 'Return tickets', sub: 'Nudges to pick up an exploration you saved.' },
];
const dayShort = (d: number) => new Date(2024, 0, 7 + d).toLocaleDateString(undefined, { weekday: 'short' });
const dayLong = (d: number) => new Date(2024, 0, 7 + d).toLocaleDateString(undefined, { weekday: 'long' });
const WEEK = [1, 2, 3, 4, 5, 6, 0];
/** True when "HH:MM" is earlier than the current minute today. */
function passedToday(time: string, d = new Date()) {
  return time < `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function daysSummary(days: number[]) {
  const s = [...days].sort();
  if (s.length === 7) return 'Every day';
  if (s.length === 5 && [1, 2, 3, 4, 5].every((d) => s.includes(d))) return 'Weekdays';
  if (s.length === 2 && s.includes(0) && s.includes(6)) return 'Weekends';
  if (!s.length) return 'No days';
  return WEEK.filter((d) => s.includes(d)).map(dayShort).join(', ');
}
const PERM_TEXT: Record<PermissionState, string> = {
  granted: 'Allowed. Elsewhere can show notifications on this device.',
  prompt: 'Not asked yet. Elsewhere only asks when something needs it — or you can allow them now.',
  denied: 'Blocked. To turn them on, change the notification setting for Elsewhere in your browser or Android settings, then come back.',
  unsupported: 'This browser can’t show system notifications. You’ll still see in-app messages while Elsewhere is open.',
};

function usePermission() {
  const [perm, setPerm] = useState<PermissionState | null>(null);
  useEffect(() => {
    const check = () => getPermission().then(setPerm).catch(() => setPerm('unsupported'));
    check();
    const onVis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  return [perm, setPerm] as const;
}

async function resyncAllReminders() {
  for (const r of Object.values(useStore.getState().reminders)) {
    try {
      await syncReminderNative(r);
    } catch {
      /* best effort */
    }
  }
}

function NotificationSettings() {
  const n = useStore((s) => s.settings.notifications);
  const setN = useStore((s) => s.setNotificationSettings);
  const remindersMap = useStore((s) => s.reminders);
  const reminders = useMemo(() => Object.values(remindersMap).sort((a, b) => a.time.localeCompare(b.time)), [remindersMap]);
  const [perm, setPerm] = usePermission();
  const [asking, setAsking] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const native = isNative();
  const testCat = CATS.find((c) => n[c.id])?.id;

  const ask = async () => {
    setAsking(true);
    try {
      const p = await requestPermission();
      setPerm(p);
      if (p === 'granted') {
        await resyncAllReminders();
        toast('Notifications allowed');
      } else if (p === 'denied') toast('Notifications are blocked. You can change this in system settings.', { kind: 'error' });
    } finally {
      setAsking(false);
    }
  };

  const setCat = async (id: NotifyCategory, v: boolean) => {
    setN({ [id]: v } as Partial<typeof n>);
    if (id === 'reminders') await resyncAllReminders(); // cancels or re-creates Android schedules
  };

  const testNow = () => {
    if (!testCat) return;
    notifyNow(testCat, 'Test notification', 'Notifications from Elsewhere are working.');
  };
  const testLater = async () => {
    if (!testCat) return;
    if (native) {
      const id = await scheduleAt(testCat, 'Test notification', 'This was scheduled 10 seconds ago — it works even with the app closed.', new Date(Date.now() + 10000));
      if (id == null) toast('Couldn’t schedule a test. Allow notifications first.', { kind: 'error' });
      else toast('Scheduled for 10 seconds from now. You can close the app.');
    } else {
      toast('Sending in 10 seconds. Switch to another tab or app to see it as a system notification.');
      setTimeout(() => notifyNow(testCat, 'Test notification', 'Notifications from Elsewhere are working.'), 10000);
    }
  };

  const toggleReminder = async (r: Reminder, enabled: boolean) => {
    // Switching on after today's time has passed shouldn't fire it immediately; it starts with the next occurrence.
    useStore.getState().patch('reminders', r.id, enabled && passedToday(r.time) ? { enabled, lastFiredOn: todayKey() } : { enabled });
    const next = useStore.getState().reminders[r.id];
    if (next) await syncReminderNative(next);
  };

  return (
    <Screen title="Notifications & reminders" eyebrow="Settings" backTo="/settings">
      <Section title="Permission">
        <div className={'banner ' + (perm === 'granted' ? 'ok' : perm === 'denied' ? 'error' : '')} role="status">
          <BellRing size={18} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
          <div className="grow">
            <div>{perm ? PERM_TEXT[perm] : 'Checking…'}</div>
            {perm === 'prompt' && (
              <Button size="sm" variant="primary" style={{ marginTop: 10 }} onClick={ask} disabled={asking}>
                {asking ? 'Asking…' : 'Allow notifications'}
              </Button>
            )}
          </div>
        </div>
      </Section>

      <Section title="What to notify">
        <div className="list y-panel">
          {CATS.map((c) => (
            <ToggleRow key={c.id} title={c.title} sub={c.sub} checked={n[c.id]} onChange={(v) => setCat(c.id, v)} />
          ))}
        </div>
      </Section>

      <Section title="Quiet hours">
        <div className="list y-panel">
          <ToggleRow title="Quiet hours" sub="Hold back notifications during these hours." checked={n.quietEnabled} onChange={(quietEnabled) => setN({ quietEnabled })} />
          {n.quietEnabled && (
            <div className="list-row st-row">
              <label className="field grow">
                <span>From</span>
                <input type="time" className="input" value={n.quietStart} onChange={(e) => e.target.value && setN({ quietStart: e.target.value })} />
              </label>
              <label className="field grow">
                <span>Until</span>
                <input type="time" className="input" value={n.quietEnd} onChange={(e) => e.target.value && setN({ quietEnd: e.target.value })} />
              </label>
            </div>
          )}
          <div className="list-row st-hint-row tiny faint">
            <span>
              Quiet hours apply to notifications Elsewhere shows while it’s running — they become quiet in-app messages instead.
              {native ? ' Notifications already scheduled on Android (timers, reminders) aren’t held back; use your phone’s Do Not Disturb for those.' : ''}
            </span>
          </div>
        </div>
      </Section>

      <Section title="Reminders" action={<Button size="sm" variant="secondary" icon={<Plus size={16} />} onClick={() => setEditing({ id: uid('rem-'), label: '', time: '18:00', days: [1, 2, 3, 4, 5], enabled: true })}>New</Button>}>
        {reminders.length ? (
          <div className="list y-panel">
            {reminders.map((r) => (
              <div key={r.id} className="list-row st-row">
                <button type="button" className="grow st-rem" onClick={() => setEditing(r)} aria-label={`Edit reminder: ${r.label}, ${r.time}, ${daysSummary(r.days)}`}>
                  <span className="mono st-rem-time">{r.time}</span>
                  <span>
                    <span className="lr-title" style={{ display: 'block' }}>{r.label}</span>
                    <span className="lr-sub">{daysSummary(r.days)}{r.enabled ? '' : ' · off'}</span>
                  </span>
                </button>
                <Toggle label={`Reminder “${r.label}” on`} checked={r.enabled} onChange={(v) => toggleReminder(r, v)} />
              </div>
            ))}
          </div>
        ) : (
          <Panel><p className="small muted" style={{ margin: 0 }}>No reminders yet. A reminder is a gentle nudge at a time you choose — for example “Ten minutes of sketching” on weekday evenings.</p></Panel>
        )}
        {!n.reminders && reminders.length > 0 && <p className="banner warn small" style={{ margin: '8px 0 0' }}>Reminder notifications are switched off above, so these won’t notify you.</p>}
      </Section>

      <Section title="Test">
        <Panel>
          <div className="row wrap">
            <Button onClick={testNow} disabled={!testCat}>Send a test notification</Button>
            <Button variant="ghost" onClick={testLater} disabled={!testCat}>Test in 10 seconds</Button>
          </div>
          <Hint>
            {testCat
              ? 'While Elsewhere is on screen, notifications appear as an in-app message. Use “Test in 10 seconds” and switch away to see a system notification.'
              : 'Turn on at least one kind of notification above to send a test.'}
          </Hint>
        </Panel>
      </Section>

      <PlatformLimits />
      <ReminderSheet key={editing?.id ?? 'none'} reminder={editing} onClose={() => setEditing(null)} perm={perm} onAsk={ask} />
    </Screen>
  );
}

function PlatformLimits() {
  const native = isNative();
  const installed = isStandalonePWA();
  return (
    <Section title="Platform limits">
      <div className="card glass-strong y-panel st-limits">
        <div className={'st-limit' + (native ? ' here' : '')}>
          <div className="row" style={{ gap: 8 }}>
            <Smartphone size={18} aria-hidden />
            <b>Android app</b>
            {native && <span className="tag accent">This device</span>}
          </div>
          <p className="small muted">
            Timers, reminders, capsules and return tickets are scheduled on the phone, so they <b>fire while the app is closed</b> — subject to Android’s
            battery optimisation and “Alarms & reminders” (exact alarm) settings, which can delay them.
          </p>
        </div>
        <div className={'st-limit' + (!native ? ' here' : '')}>
          <div className="row" style={{ gap: 8 }}>
            <Globe size={18} aria-hidden />
            <b>Web app / browser</b>
            {!native && <span className="tag accent">{installed ? 'This device (installed)' : 'This device'}</span>}
          </div>
          <p className="small muted">
            Notifications work <b>only while Elsewhere is open</b> or in a background tab. If the tab or app is closed, nothing fires; missed reminders
            aren’t shown later.
          </p>
        </div>
        <ul className="small muted" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
          <li>There is no push server. Elsewhere never sends notifications from the internet.</li>
          <li>Shared updates arrive only when you import a reply code someone sends you.</li>
        </ul>
      </div>
    </Section>
  );
}

function ReminderSheet({ reminder, onClose, perm, onAsk }: { reminder: Reminder | null; onClose: () => void; perm: PermissionState | null; onAsk: () => Promise<void> }) {
  const [r, setR] = useState<Reminder | null>(reminder);
  const exists = useStore((s) => (reminder ? !!s.reminders[reminder.id] : false));
  useEffect(() => setR(reminder), [reminder]);
  if (!r) return null;
  const valid = r.label.trim() && r.days.length > 0 && /^\d{2}:\d{2}$/.test(r.time);
  const save = async () => {
    if (!valid) return;
    const s = useStore.getState();
    const prev = s.reminders[r.id];
    // A new or re-timed reminder whose time has already passed today starts tomorrow (the web check would otherwise fire it at once).
    const lastFiredOn = prev && prev.time === r.time && prev.lastFiredOn ? prev.lastFiredOn : passedToday(r.time) ? todayKey() : undefined;
    s.upsert('reminders', { ...prev, ...r, label: r.label.trim(), nativeIds: prev?.nativeIds ?? [], lastFiredOn });
    onClose();
    if (perm === 'prompt' && r.enabled) await onAsk(); // contextual permission request
    const saved = useStore.getState().reminders[r.id];
    if (saved) await syncReminderNative(saved);
    toast(exists ? 'Reminder updated' : 'Reminder added');
  };
  const del = async () => {
    if (!(await confirmDialog({ title: 'Delete this reminder?', body: `“${r.label}” will stop.`, confirmLabel: 'Delete', danger: true }))) return;
    const s = useStore.getState();
    await cancelScheduled(s.reminders[r.id]?.nativeIds ?? []);
    s.remove('reminders', r.id);
    onClose();
    toast('Reminder deleted');
  };
  return (
    <Sheet open={!!reminder} onClose={onClose} title={exists ? 'Edit reminder' : 'New reminder'}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Field label="What to remind you about">
          <input className="input" value={r.label} onChange={(e) => setR({ ...r, label: e.target.value })} placeholder="e.g. Ten minutes of sketching" required />
        </Field>
        <Field label="Time">
          <input type="time" className="input" value={r.time} onChange={(e) => e.target.value && setR({ ...r, time: e.target.value })} required />
        </Field>
        <div role="group" aria-labelledby="rem-days">
          <div className="field-label" id="rem-days">Days</div>
          <div className="chips st-days">
            {WEEK.map((d) => (
              <button
                key={d}
                type="button"
                className="chip"
                aria-pressed={r.days.includes(d)}
                aria-label={dayLong(d)}
                onClick={() => setR({ ...r, days: r.days.includes(d) ? r.days.filter((x) => x !== d) : [...r.days, d] })}
              >
                {dayShort(d)}
              </button>
            ))}
          </div>
          {!r.days.length && <p className="tiny" style={{ color: 'var(--danger)', margin: '6px 0 0' }}>Choose at least one day.</p>}
        </div>
        <div className="row between">
          <span style={{ fontWeight: 600 }}>On</span>
          <Toggle label="Reminder on" checked={r.enabled} onChange={(enabled) => setR({ ...r, enabled })} />
        </div>
        <p className="tiny faint" style={{ margin: 0 }}>
          {isNative()
            ? 'Scheduled on this phone, so it fires even when Elsewhere is closed.'
            : 'In the web app, reminders show only while Elsewhere is open (or in a background tab), within 30 minutes of the time.'}
        </p>
        <div className="row">
          {exists && <Button type="button" variant="danger" icon={<Trash2 size={16} />} onClick={del}>Delete</Button>}
          <span className="grow" />
          <Button type="submit" variant="primary" disabled={!valid}>Save</Button>
        </div>
      </form>
    </Sheet>
  );
}

// ---------------------------------------------------------------- privacy
function PrivacySettings() {
  const privacy = useStore((s) => s.settings.privacy);
  const setSettings = useStore((s) => s.setSettings);
  const entries = useStore((s) => s.entries);
  const notes = useStore((s) => s.notes);
  const pe = Object.values(entries).filter((e) => e.private).length;
  const pn = Object.values(notes).filter((x) => x.private).length;
  return (
    <Screen title="Privacy" eyebrow="Settings" backTo="/settings">
      <Panel className="glass-strong">
        <ul className="st-promises">
          <li><ShieldCheck size={20} aria-hidden /><span><b>Everything is stored only on this device</b> — in this browser’s storage, or inside the Android app.</span></li>
          <li><ShieldCheck size={20} aria-hidden /><span><b>No account, no analytics, no tracking.</b> There is no server and no sign-in.</span></li>
          <li><ShieldCheck size={20} aria-hidden /><span><b>Shared content leaves only when you share a code</b> — through whichever app you choose to send it with.</span></li>
          <li><CircleAlert size={20} aria-hidden /><span>Clearing this browser’s site data, or uninstalling the app, deletes everything. <button type="button" className="link-btn" onClick={() => navigate('/settings/data')}>Export a copy</button> to keep one.</span></li>
        </ul>
      </Panel>
      <Section title="Private entries and notes">
        <div className="list y-panel">
          <div className="list-row st-hint-row small muted">
            <span>You have {plural(pe, 'private entry', 'private entries')} and {plural(pn, 'private note', 'private notes')}. Mark anything private from its edit screen.</span>
          </div>
          <ToggleRow
            title="Blur private entries"
            sub={<span className="row" style={{ gap: 6 }}>{privacy.blurPrivate ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />} Hide their text in lists until you tap to reveal.</span>}
            checked={privacy.blurPrivate}
            onChange={(blurPrivate) => setSettings({ privacy: { ...privacy, blurPrivate } })}
          />
          <ToggleRow
            title="Leave private items out of exports"
            sub="Sets the default on the export screen. You can still choose each time."
            checked={privacy.excludePrivateFromExport}
            onChange={(excludePrivateFromExport) => setSettings({ privacy: { ...privacy, excludePrivateFromExport } })}
          />
        </div>
      </Section>
      <p className="tiny faint y-note" style={{ marginTop: 20 }}>
        Blurring is a screen-privacy aid for people looking over your shoulder; it isn’t encryption. Anyone with access to this unlocked device can open the app.
      </p>
    </Screen>
  );
}

// ---------------------------------------------------------------- data
/** Where each kind of imported item shows up in the app. */
const IMPORT_WHERE: Record<string, [string, string]> = {
  entries: ['Version History', '/history'],
  experiences: ['Your experiences', '/builder'],
  capsules: ['Capsules', '/capsules'],
  collections: ['Collections', '/collections'],
  saved: ['Saved', '/saved'],
  completions: ['Progress', '/progress'],
};

function DataSettings() {
  const excludeDefault = useStore((s) => s.settings.privacy.excludePrivateFromExport);
  const [includeMedia, setIncludeMedia] = useState(true);
  const [excludePrivate, setExcludePrivate] = useState(excludeDefault);
  const [mediaCount, setMediaCount] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const lastExport = useRef<string | null>(null);
  // Shown when the clipboard refuses (e.g. a sandboxed preview): the export as selectable text.
  const [copyFallback, setCopyFallback] = useState<string | null>(null);
  const [selectedAll, setSelectedAll] = useState<false | 'selected' | 'copied'>(false);
  const fallbackRef = useRef<HTMLTextAreaElement>(null);

  const [file, setFile] = useState<{ name: string; text: string; source: 'file' | 'paste' } | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [useLook, setUseLook] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  /** After a prototype import: which kinds were added, for "where to find them" links. */
  const [importWhere, setImportWhere] = useState<string[]>([]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  const [pasteReading, setPasteReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [est, setEst] = useState<Awaited<ReturnType<typeof storageEstimate>> | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const native = isNative();

  useEffect(() => {
    blobs.keys().then((k) => setMediaCount(k.length)).catch(() => setMediaCount(0));
    storageEstimate().then(setEst);
  }, []);

  const doExport = async () => {
    setExporting(true);
    setExportMsg(null);
    setCopyFallback(null);
    try {
      const json = await exportData({ includeMedia, excludePrivate });
      lastExport.current = json;
      const r = await saveExportFile(json);
      const size = fmtBytes(new Blob([json]).size);
      setExportMsg({
        kind: 'ok',
        text:
          r.method === 'download' ? `Started a download of ${r.name} (${size}). Keep it somewhere safe — it isn’t encrypted. If no file appears (some previews and embedded browsers block downloads), use “Copy export to clipboard” instead.`
          : r.method === 'documents' ? `Saved to ${r.path} (${size}). Keep it somewhere safe — it isn’t encrypted.`
          : `Opened the share sheet for ${r.name} (${size}). Choose where to save it.`,
      });
    } catch (e) {
      setExportMsg({ kind: 'error', text: `Export failed: ${(e as Error)?.message ?? 'unknown error'}. Nothing was changed.` });
    } finally {
      setExporting(false);
    }
  };
  const doCopy = async () => {
    setExporting(true);
    setExportMsg(null);
    setCopyFallback(null);
    setSelectedAll(false);
    let json: string;
    try {
      json = await exportData({ includeMedia, excludePrivate });
    } catch (e) {
      setExportMsg({ kind: 'error', text: `Export failed: ${(e as Error)?.message ?? 'unknown error'}. Nothing was changed.` });
      setExporting(false);
      return;
    }
    lastExport.current = json;
    const size = fmtBytes(new Blob([json]).size);
    const copied = await copyExportText(json);
    if (copied) {
      setExportMsg({ kind: 'ok', text: `Copied your export (${size}) to the clipboard. Paste it somewhere safe — a note, a file or an email to yourself. It isn’t encrypted.` });
    } else {
      setCopyFallback(json);
      setExportMsg({ kind: 'warn', text: `This browser didn’t allow copying, so your export (${size}) is shown below. Select it all and copy it yourself.` });
    }
    setExporting(false);
  };
  /** Select the fallback text, then try copying it (this tap is a fresh user gesture, which some browsers need). */
  const selectAll = () => {
    const ta = fallbackRef.current;
    if (!ta) return;
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }
    setSelectedAll(copied ? 'copied' : 'selected');
  };
  const doShare = async () => {
    try {
      const json = lastExport.current ?? (await exportData({ includeMedia, excludePrivate }));
      await shareExportFile(json, exportFileName());
    } catch (e) {
      toast(`Couldn’t share: ${(e as Error)?.message ?? 'unknown error'}`, { kind: 'error' });
    }
  };

  /** File and paste both go through here, then the same preview → merge / replace (or add, for prototype backups) flow. */
  const readText = (name: string, text: string, source: 'file' | 'paste') => {
    setPreview(null);
    setImportErr(null);
    setImportMsg(null);
    setImportWhere([]);
    setUseLook(false);
    setMode('merge'); // Replace is destructive: it must be chosen again for each file, never carried over.
    setFile({ name, text, source });
    try {
      setPreview(previewImport(text));
    } catch (e) {
      setImportErr((e as Error)?.message ?? 'This couldn’t be read.');
    }
  };
  const onFile = async (f: File | undefined) => {
    setPreview(null);
    setImportErr(null);
    setImportMsg(null);
    setFile(null);
    if (!f) return;
    try {
      readText(f.name, await f.text(), 'file');
    } catch (e) {
      setImportErr((e as Error)?.message ?? 'This file couldn’t be read.');
    }
  };
  const onPaste = () => {
    if (!pasteText.trim()) return;
    if (fileInput.current) fileInput.current.value = '';
    readText('Pasted text', pasteText.trim(), 'paste');
  };
  /** "Paste to import": open the paste box and try reading the clipboard; if that's refused, the box is the fallback. */
  const openPaste = async () => {
    if (pasteOpen) {
      setPasteOpen(false);
      setPasteNote(null);
      return;
    }
    setPasteOpen(true);
    setPasteNote(null);
    setPasteReading(true);
    const text = await readClipboardText();
    setPasteReading(false);
    const t = text?.trim() ?? '';
    if (text === null) {
      setPasteNote('Elsewhere can’t read your clipboard here, so paste the text into the box yourself: long-press and choose Paste, or press Ctrl+V (⌘V on a Mac).');
    } else if (!t) {
      setPasteNote('Your clipboard is empty. Copy the export text first, or paste it into the box below.');
    } else if (!t.startsWith('{')) {
      // Don't show unrelated clipboard contents (it could be anything); just say it isn't an export.
      setPasteNote('What’s on your clipboard isn’t an Elsewhere export. Copy the export text, or paste it into the box below.');
    } else {
      setPasteText(t);
      if (fileInput.current) fileInput.current.value = '';
      readText('Pasted from the clipboard', t, 'paste');
      setPasteNote('Read from your clipboard — check what’s in it below.');
    }
  };
  const legacy = preview?.source === 'legacy' ? preview.legacy : undefined;
  const doImport = async () => {
    if (!file || !preview) return;
    const ok = await confirmDialog(
      legacy
        ? nothingToImport
          ? { title: 'Use its theme and name?', body: 'Nothing else on this device changes.', confirmLabel: 'Use them' }
          : { title: 'Add this backup?', body: `What it contains is added to what’s on this device. Nothing here is replaced or removed.${useLook ? ' Its theme and name will be used too.' : ''}`, confirmLabel: 'Add to my data' }
        : mode === 'replace'
          ? { title: 'Replace everything?', body: 'All data on this device — entries, notes, progress, settings — will be replaced by this file. Export first if you might want it back.', confirmLabel: 'Replace my data', danger: true }
          : { title: 'Merge this file?', body: 'Items from the file are added. Where the same item exists in both, the more recently changed copy is kept. Your current settings stay.', confirmLabel: 'Merge' },
    );
    if (!ok) return;
    setImporting(true);
    setImportErr(null);
    try {
      const r = await importData(file.text, { mode: legacy ? 'merge' : mode, useLook });
      const by = Object.entries(r.addedBy ?? {}).filter(([, n]) => n > 0);
      setImportWhere(r.source === 'legacy' ? by.map(([k]) => k) : []);
      setImportMsg(
        r.source === 'legacy'
          ? (by.length ? `Added from the prototype backup: ${listJoin(by.map(([k, n]) => countLabel(k, n)))}` : 'Nothing new was added from the prototype backup') +
              (r.duplicates ? `. ${plural(r.duplicates, 'item was', 'items were')} already here from an earlier import, so not added again` : '') +
              '. Nothing on this device was replaced.' +
              (useLook ? ' Its theme and name are now in use.' : '')
          : (mode === 'replace' ? `Replaced your data with ${plural(r.added, 'item', 'items')}` : `Added ${plural(r.added, 'new item', 'new items')} and updated ${r.updated}`) +
              (r.media ? `, plus ${plural(r.media, 'media file', 'media files')}` : '') +
              '.' +
              (r.warnings.length ? ` ${r.warnings.join(' ')}` : ''),
      );
      setFile(null);
      setPreview(null);
      setPasteText('');
      setPasteOpen(false);
      if (fileInput.current) fileInput.current.value = '';
      blobs.keys().then((k) => setMediaCount(k.length)).catch(() => {});
      storageEstimate().then(setEst);
    } catch (e) {
      setImportErr(`Import failed: ${(e as Error)?.message ?? 'unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  const skipped = legacy?.skipped;
  const skippedBuiltIn = skipped ? skipped.saved + skipped.completed + skipped.tickets : 0;
  const look = legacy
    ? [
        legacy.settings.theme && `Theme: ${THEMES.find((t) => t.id === legacy.settings.theme)?.name ?? legacy.settings.theme}`,
        legacy.settings.appearance && `Appearance: ${{ auto: 'Auto', light: 'Day', dark: 'Night' }[legacy.settings.appearance]}`,
        legacy.prefs.name && `Name: ${legacy.prefs.name}`,
        legacy.prefs.comfort && `Surprise Dial: ${COMFORT_LABEL[legacy.prefs.comfort]}`,
      ].filter(Boolean).join(' · ')
    : '';
  const nothingToImport = !!preview && Object.values(preview.counts).every((v) => !v);

  return (
    <Screen title="Your data" eyebrow="Settings" backTo="/settings" subtitle="Everything is on this device. Export a copy, move it to another device, or delete it.">
      <Section title="Export">
        <div className="card y-panel stack">
          <p className="small muted" style={{ margin: 0 }}>A single JSON file with your entries, notes, progress, collections, capsules, preferences and settings.</p>
          <div className="list">
            <ToggleRow
              title="Include media"
              sub={mediaCount === null ? 'Voice notes, photos and sketches.' : `${plural(mediaCount, 'media file', 'media files')} on this device (voice notes, photos, sketches). Makes the file larger.`}
              checked={includeMedia}
              onChange={setIncludeMedia}
            />
            <ToggleRow title="Leave out private entries and notes" sub="They, and links to them, won’t be in the file." checked={excludePrivate} onChange={setExcludePrivate} />
          </div>
          <div className="row wrap">
            <Button variant="primary" icon={<Download size={18} />} onClick={doExport} disabled={exporting}>
              {exporting ? 'Preparing…' : native ? 'Save export' : 'Download export'}
            </Button>
            {native && <Button icon={<Share2 size={18} />} onClick={doShare} disabled={exporting}>Share export…</Button>}
            <Button icon={<ClipboardCopy size={18} />} onClick={doCopy} disabled={exporting}>Copy export to clipboard</Button>
          </div>
          {exportMsg && <div className={'banner ' + exportMsg.kind} role="status">{exportMsg.text}</div>}
          {copyFallback !== null && (
            <div className="stack sm">
              <label className="field">
                <span>Your export ({fmtBytes(new Blob([copyFallback]).size)}, read-only)</span>
                <textarea ref={fallbackRef} className="textarea mono st-export-text" readOnly value={copyFallback} rows={6} spellCheck={false} onFocus={() => setSelectedAll(false)} />
              </label>
              <div className="row wrap">
                <Button size="sm" variant="soft" icon={<TextSelect size={16} />} onClick={selectAll}>Select all and copy</Button>
                <Button size="sm" variant="ghost" onClick={() => setCopyFallback(null)}>Hide</Button>
              </div>
              <p className="tiny faint st-hint" role="status">
                {selectedAll === 'copied'
                  ? 'Copied. Paste it somewhere safe; on another device, use “Paste to import” below.'
                  : selectedAll === 'selected'
                    ? 'Selected. Now copy it: Ctrl+C (⌘C on a Mac), or long-press and choose Copy. Paste it into “Paste to import” on the other device.'
                    : 'Copy this text and keep it somewhere safe. On another device, use “Paste to import” below.'}
              </p>
            </div>
          )}
        </div>
      </Section>

      <Section title="Import">
        <div className="card y-panel stack">
          <p className="small muted" style={{ margin: 0 }}>
            Choose a file made with “Export” in Elsewhere, or paste its text. Backups from the earlier Elsewhere prototype (<span className="mono">elsewhere-backup.json</span>) work too.
            You’ll see what’s in it before anything changes.
          </p>
          <div className="row wrap">
            <label className="btn secondary st-file">
              <Upload size={18} aria-hidden /> {file?.source === 'file' ? file.name : 'Choose export file…'}
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = ''; // so choosing the same file again (e.g. after an error) still triggers a check
                  onFile(f);
                }}
              />
            </label>
            <Button variant={pasteOpen ? 'soft' : 'secondary'} icon={<ClipboardPaste size={18} />} aria-expanded={pasteOpen} onClick={openPaste}>
              Paste to import
            </Button>
          </div>
          {pasteOpen && (
            <form className="stack sm" onSubmit={(e) => { e.preventDefault(); onPaste(); }}>
              <p className="tiny faint st-hint" role="status" style={{ marginTop: 0 }}>
                {pasteReading ? 'Reading your clipboard… (your browser may ask first)' : pasteNote ?? 'Paste the export text into the box below.'}
              </p>
              <Field label="Paste the export text here">
                <textarea
                  className="textarea mono st-export-text"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={5}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  placeholder={'{"app":"elsewhere", …}'}
                />
              </Field>
              <Button type="submit" size="sm" style={{ alignSelf: 'flex-start' }} disabled={!pasteText.trim()}>Check pasted text</Button>
            </form>
          )}
          {importErr && <div className="banner error" role="alert">{importErr}</div>}
          {preview && legacy && (
            <div className="stack sm">
              <div className="small"><b>Backup from the earlier Elsewhere prototype</b>{file?.source === 'paste' ? ' (pasted)' : ''}</div>
              <p className="small muted" style={{ margin: 0 }}>Everything below is added to what’s on this device. Nothing here is replaced or removed.</p>
              <div className="small" style={{ fontWeight: 600 }}>Will be added</div>
              <ul className="st-counts small muted" aria-label="Will be added">
                {Object.entries(preview.counts).filter(([, v]) => v > 0).map(([k, v]) => (
                  <li key={k}>{countLabel(k, v)}</li>
                ))}
                {nothingToImport && <li>No items{look ? ' — only its theme and name, if you choose below' : ''}.</li>}
              </ul>
              {skipped && (skippedBuiltIn > 0 || skipped.collectionItems > 0) && (
                <div className="banner warn st-skipped">
                  <div>
                    <div style={{ fontWeight: 600 }}>Skipped — can’t be carried over</div>
                    <ul className="st-counts" aria-label="Skipped">
                      {skipped.saved > 0 && <li>{plural(skipped.saved, 'saved item', 'saved items')}</li>}
                      {skipped.completed > 0 && <li>{plural(skipped.completed, 'completed item', 'completed items')}</li>}
                      {skipped.tickets > 0 && <li>{plural(skipped.tickets, 'return ticket', 'return tickets')}</li>}
                      {skipped.collectionItems > 0 && <li>{plural(skipped.collectionItems, 'item inside a collection', 'items inside collections')}</li>}
                    </ul>
                    <p className="tiny" style={{ margin: '6px 0 0' }}>
                      These point to the prototype’s own built-in content, which this app doesn’t have.
                      {skipped.collectionItems > 0 ? ' The collections themselves are kept.' : ''}
                    </p>
                  </div>
                </div>
              )}
              {look && (
                <label className="st-check-row">
                  <input type="checkbox" checked={useLook} onChange={(e) => setUseLook(e.target.checked)} />
                  <span>
                    <span style={{ display: 'block', fontWeight: 600 }}>Also use its theme and name</span>
                    <span className="tiny faint">{look}</span>
                  </span>
                </label>
              )}
              <Button variant="primary" onClick={doImport} disabled={importing || (nothingToImport && !useLook)}>
                {importing ? 'Adding…' : nothingToImport ? 'Use its theme and name' : 'Add to my data'}
              </Button>
            </div>
          )}
          {preview && !legacy && (
            <div className="stack sm">
              <div className="small">
                <b>Exported {preview.exportedAt ? fmtDate(preview.exportedAt) : 'on an unknown date'}</b>
                {file?.source === 'paste' ? ' · pasted' : ''}
                {preview.excludedPrivate ? ' · private items were left out' : ''}
              </div>
              <ul className="st-counts small muted">
                {Object.entries(preview.counts).filter(([, v]) => v > 0).map(([k, v]) => (
                  <li key={k}>{countLabel(k, v)}</li>
                ))}
                {nothingToImport && <li>No items — only preferences and settings.</li>}
              </ul>
              {preview.warnings.map((w) => <div key={w} className="banner warn">{w}</div>)}
              <Segmented label="Import mode" value={mode} onChange={setMode} options={[{ value: 'merge', label: 'Merge' }, { value: 'replace', label: 'Replace' }]} />
              <Hint>
                {mode === 'merge'
                  ? 'Merge adds what’s new; where both have the same item, the more recently changed copy wins. Your settings stay.'
                  : 'Replace makes this device match the file exactly, including settings. Anything not in the file is removed.'}
              </Hint>
              <Button variant={mode === 'replace' ? 'danger' : 'primary'} onClick={doImport} disabled={importing}>
                {importing ? 'Importing…' : mode === 'replace' ? 'Replace with this file' : 'Merge this file'}
              </Button>
            </div>
          )}
          {importMsg && <div className="banner ok" role="status">{importMsg}</div>}
          {importMsg && importWhere.length > 0 && (
            <div className="row wrap" aria-label="Where to find what was added">
              {[...new Set(importWhere.map((k) => IMPORT_WHERE[k]).filter(Boolean))].map(([label, url]) => (
                <Button key={url} size="sm" variant="ghost" onClick={() => navigate(url)}>{label} <ChevronRight size={16} aria-hidden /></Button>
              ))}
            </div>
          )}
          <Hint>
            Got a share code from someone instead? <button type="button" className="link-btn" onClick={() => navigate('/import')}>Import a share code</button>.
          </Hint>
        </div>
      </Section>

      <Section title="Storage">
        <div className="card y-panel row" style={{ alignItems: 'flex-start' }}>
          <HardDrive size={20} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
          <div className="small">
            {est === undefined ? (
              'Checking…'
            ) : est === null || est.usage === undefined ? (
              'This browser doesn’t report how much storage Elsewhere uses.'
            ) : (
              <>
                <div>
                  About <b>{fmtBytes(est.usage)}</b> used{est.quota ? ` of roughly ${fmtBytes(est.quota)} available to this app` : ''}.
                </div>
                <div className="muted">This is the browser’s estimate and includes cached app files.</div>
                {est.persisted !== undefined && (
                  <div className="muted" style={{ marginTop: 4 }}>
                    {est.persisted ? 'Protected from automatic clean-up when storage runs low.' : 'Not protected from automatic clean-up: the browser may clear it if the device runs low on space. Export regularly.'}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Section>

      <Section title="Delete">
        <div className="card y-panel stack sm">
          <p className="small muted" style={{ margin: 0 }}>Permanently delete every entry, note, capsule, collection, progress record, reminder, media file, preference and setting on this device.</p>
          <Button
            variant="danger"
            icon={<Trash2 size={16} />}
            style={{ alignSelf: 'flex-start' }}
            onClick={async () => {
              if (await confirmDialog({ title: 'Delete all data?', body: 'This can’t be undone. Consider exporting a copy first.', confirmLabel: 'Continue', danger: true })) setDeleteOpen(true);
            }}
          >
            Delete all data…
          </Button>
        </div>
      </Section>
      <DeleteSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </Screen>
  );
}

function DeleteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!open) { setText(''); setErr(null); }
  }, [open]);
  const go = async () => {
    if (text !== 'DELETE') return;
    setBusy(true);
    try {
      await deleteAllData();
      onClose();
      navigate('/discover', { replace: true });
      toast('All data deleted from this device');
    } catch (e) {
      setErr((e as Error)?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Type DELETE to confirm">
      <form className="stack" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <p className="small muted" style={{ margin: 0 }}>Everything Elsewhere stores on this device will be erased and you’ll start again from the welcome screen.</p>
        <Field label="Type DELETE in capitals">
          <input className="input mono" value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false} />
        </Field>
        {err && <div className="banner error" role="alert">{err}</div>}
        <div className="row">
          <Button type="button" className="grow" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="grow" variant="danger" disabled={text !== 'DELETE' || busy}>{busy ? 'Deleting…' : 'Delete everything'}</Button>
        </div>
      </form>
    </Sheet>
  );
}

// ---------------------------------------------------------------- about
function AboutSettings() {
  const native = isNative();
  return (
    <Screen title="About Elsewhere" eyebrow="Settings" backTo="/settings">
      <div className="card tinted y-panel">
        <div className="label accent">Version</div>
        <div className="display t-lg" style={{ marginTop: 4 }}>Elsewhere {APP_VERSION}</div>
        <p className="small muted" style={{ margin: '6px 0 0' }}>{native ? 'Android app' : isStandalonePWA() ? 'Installed web app' : 'Web app in a browser'}</p>
      </div>

      <Section title="What’s included">
        <Panel className="glass-strong">
          <ul className="st-about">
            <li>Rabbit Hole, Plot Twist, Skill Arcade and Version History, plus the Curiosity Map, Remix Studio, capsules, Experience Builder, field notes, two-person quests, return tickets, Perspective Switch and collections.</li>
            <li>Curated content that works offline once the app has loaded.</li>
            <li>Timers and reminders, with notifications as described in Notifications & reminders.</li>
            <li>Export, import and deletion of all your data.</li>
          </ul>
        </Panel>
      </Section>

      <Section title="Limitations">
        <Panel className="glass-strong">
          <ul className="st-about">
            <li><b>No accounts and no cloud sync.</b> Data lives on one device; move it with export and import.</li>
            <li><b>No AI.</b> Suggestions are rule-based; remixes are template-generated; content is curated.</li>
            <li><b>Sharing works through codes.</b> You send a code with any messaging app; the other person imports it. There’s no server in between.</li>
            <li><b>Notifications on the web</b> only work while the app is open; the Android app can schedule them while closed.</li>
            <li><b>Not a native iOS app.</b> On iPhone and iPad, Elsewhere runs as a web app added to the home screen.</li>
          </ul>
        </Panel>
      </Section>

      <Section title="Design">
        <Panel className="glass-strong stack sm">
          <p className="small" style={{ margin: 0 }}>
            An original editorial layout for Elsewhere, inspired by Framework7-style mobile patterns; no third-party templates copied. Panels are a layer of
            clear, softly frosted glass floating over four artworks, one per theme: {listJoin(THEMES.map((t) => t.name))}.
          </p>
          <p className="small muted" style={{ margin: 0 }}>
            The background images are artworks selected by the app’s owner, from Pinterest links the owner provided. Rights belong to their creators.
            Settings → Appearance → Reduce transparency swaps the glass for solid panels.
          </p>
        </Panel>
      </Section>

      <Section title="Credits">
        <Panel className="glass-strong">
          <ul className="st-about">
            <li>React, Vite and zustand (MIT)</li>
            <li>lucide-react icons (ISC)</li>
            <li>Fonts via Fontsource: Inter, Fraunces and JetBrains Mono (SIL Open Font License)</li>
            <li>Capacitor (MIT) for the Android app</li>
            <li>Background artworks: selected by the owner from Pinterest; © their respective creators</li>
          </ul>
        </Panel>
      </Section>
    </Screen>
  );
}
