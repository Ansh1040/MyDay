// Light, skippable onboarding. Every answer is saved immediately (so leaving halfway keeps it) and can be changed
// later in You → Settings. Answers feed the rule-based ranking in src/lib/recommend.ts.
// Glass layer: every step's text sits in a glass panel over the theme artwork; the theme step shows each theme's art.
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode, type TouchEvent } from 'react';
import { ArrowRight, Check, ChevronLeft, Gamepad2, History, Lock, Plus, Rabbit, Shuffle, X } from 'lucide-react';
import type { Appearance, Cost, Energy, Preferences, Social, ThemeName } from '../../data/types';
import { useStore } from '../../store/store';
import { navigate } from '../../lib/router';
import { Button, Chip, IconButton, Progress, Segmented, toast } from '../../components/ui';
import { COMFORT_LABEL, COST_LABEL, ENERGY_LABEL } from '../../components/common';
import { SKILLS, TOPICS, topicLabel } from '../../data/catalog';
import { FORMAT_KEYS, formatMeta } from '../../formats/meta';
import { THEMES } from '../../lib/theme';
import { GOAL_PRESETS } from '../../lib/recommend';
import { SurpriseDial } from '../discover/PlotTwist';
import '../../styles/discover.css';

const STEPS = ['welcome', 'name', 'interests', 'skills', 'goals', 'rhythm', 'formats', 'theme', 'finish'] as const;
type StepId = (typeof STEPS)[number];
const STEP_LABEL: Record<StepId, string> = {
  welcome: 'Welcome', name: 'Name', interests: 'Interests', skills: 'Skills', goals: 'Goals', rhythm: 'Your rhythm',
  formats: 'Formats', theme: 'Look & feel', finish: 'Ready',
};
const TIME_OPTS = [10, 20, 30, 60];
const SOCIAL_WORD: Record<Social, string> = { solo: 'Solo', either: 'Solo or together', shared: 'With others' };
const APPEARANCE_WORD: Record<Appearance, string> = { auto: 'Automatic', light: 'Day', dark: 'Night' };

type Intro = (eyebrow: ReactNode, heading: ReactNode, lede?: ReactNode, children?: ReactNode) => ReactNode;

export function Onboarding() {
  const prefs = useStore((s) => s.prefs);
  const settings = useStore((s) => s.settings);
  const setPrefs = useStore((s) => s.setPrefs);
  const setSettings = useStore((s) => s.setSettings);
  const [step, setStep] = useState(0);
  const id = STEPS[step];
  const last = STEPS.length - 1;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, [step]);

  const next = () => setStep((s) => Math.min(last, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));
  const finish = (skipped = false) => {
    navigate('/discover', { replace: true });
    useStore.getState().completeOnboarding();
    if (skipped) toast('Setup skipped. You can set preferences any time in You → Settings.');
  };

  // Swipe between steps (buttons are always available too). Ignore gestures that start on inputs or scrollers.
  const onTouchStart = (e: TouchEvent) => {
    const el = e.target as HTMLElement;
    touch.current = el.closest('input, textarea, .chips.scroll, .pt-dial, .segmented, [data-noswipe]') ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && step < last) next();
      else if (dx > 0 && step > 0) prev();
    }
  };

  const hasValue: Record<StepId, boolean> = {
    welcome: true,
    name: !!prefs.name.trim(),
    interests: prefs.interests.length > 0,
    skills: prefs.skills.length > 0,
    goals: prefs.goals.length > 0,
    rhythm: true,
    formats: prefs.formats.length > 0,
    theme: true,
    finish: true,
  };
  const nextLabel = id === 'welcome' ? 'Let’s begin' : id === 'finish' ? 'Start exploring' : hasValue[id] ? 'Next' : 'Skip this step';

  const toggleIn = (key: 'interests' | 'skills' | 'goals' | 'formats', v: string) => {
    const list = prefs[key] as string[];
    const nextList = list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
    setPrefs({ [key]: nextList } as unknown as Partial<Preferences>);
  };

  const title = (text: ReactNode) => (
    <h1 className="display t-xl ob-step-title" tabIndex={-1} ref={headingRef}>{text}</h1>
  );
  /** Every step opens with a glass panel: eyebrow, heading, lede (+ optional controls). Text never sits on the artwork. */
  const intro: Intro = (eyebrow, heading, lede, children) => (
    <section className="card ob-panel">
      <div className="label accent">{eyebrow}</div>
      {title(heading)}
      {lede && <p className="ob-lede">{lede}</p>}
      {children}
    </section>
  );

  let body: ReactNode;
  switch (id) {
    case 'welcome':
      body = (
        <>
          {intro('Welcome to', 'Elsewhere', 'A personal playground for curiosity. Follow questions, break routines, practise skills, make things — and keep a record of how you change.')}
          <div className="list ob-areas">
            <Area icon={<Rabbit size={20} />} name="Rabbit Hole" text="Questions that branch into connected ideas, experiments and perspectives." />
            <Area icon={<Shuffle size={20} />} name="Plot Twist" text="Small real-world surprises sized to your time, energy and comfort." />
            <Area icon={<Gamepad2 size={20} />} name="Skill Arcade" text="Short practice, hands-on projects and visible levels." />
            <Area icon={<History size={20} />} name="Version History" text="Reflections, opinions and goals over time — and where your mind changed." />
          </div>
          <div className="banner ob-banner">
            <Lock size={18} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
            <span>Everything you add stays on this device. There’s no account and no tracking. You can export or delete your data any time.</span>
          </div>
          <p className="small dc-caption ob-caption">A few quick questions help shape suggestions. Every step is optional.</p>
        </>
      );
      break;
    case 'name':
      body = intro('About you', 'What should we call you?', 'Only used for greetings on this device. Leave it blank if you like.', (
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); next(); }}>
          <input
            className="input"
            value={prefs.name}
            maxLength={40}
            autoComplete="given-name"
            enterKeyHint="next"
            placeholder="Your name (optional)"
            aria-label="Your name (optional)"
            onChange={(e) => setPrefs({ name: e.target.value })}
          />
        </form>
      ));
      break;
    case 'interests':
      body = intro('Interests', 'What are you curious about?', 'Pick a few. Matching topics rank higher in your For You feed.', (
        <>
          <div className="chips" role="group" aria-label="Interests">
            {TOPICS.map((t) => (
              <Chip key={t.id} accent active={prefs.interests.includes(t.id)} onClick={() => toggleIn('interests', t.id)}>{t.label}</Chip>
            ))}
          </div>
          <p className="small muted ob-count" aria-live="polite">{prefs.interests.length ? `${prefs.interests.length} selected` : 'None selected yet'}</p>
        </>
      ));
      break;
    case 'skills':
      body = (
        <>
          {intro('Skill Arcade', 'Any skills you’d like to develop?', 'Short practice sessions, beginner entry points and hands-on projects. Practice for these skills shows up more often.')}
          {SKILLS.length ? (
            <div className="ob-tiles one" role="group" aria-label="Skills to develop">
              {SKILLS.map((k) => {
                const on = prefs.skills.includes(k.id);
                return (
                  <button key={k.id} type="button" className="ob-tile glass" aria-pressed={on} onClick={() => toggleIn('skills', k.id)}>
                    <span className="ob-tile-head">{k.name}</span>
                    <span className="small muted">{k.tagline}</span>
                    {on && <Check size={18} className="ob-check" aria-hidden />}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="muted card">No skills are available in this build yet — you can choose some later in Settings.</p>
          )}
        </>
      );
      break;
    case 'goals':
      body = <GoalsStep intro={intro} goals={prefs.goals} toggle={(g) => toggleIn('goals', g)} add={(g) => !prefs.goals.includes(g) && setPrefs({ goals: [...prefs.goals, g] })} />;
      break;
    case 'rhythm':
      body = (
        <>
          {intro('Your rhythm', 'How do you usually show up?', 'Used to size suggestions and Plot Twists. You can change these whenever your day looks different.')}
          <div className="card ob-panel">
            <div className="ob-field">
              <span className="label">Time you usually have</span>
              <Segmented<number> label="Time you usually have" value={prefs.minutes} options={TIME_OPTS.map((m) => ({ value: m, label: m >= 60 ? '1 h+' : `${m} min` }))} onChange={(v) => setPrefs({ minutes: v })} />
            </div>
            <div className="ob-field">
              <span className="label">Typical energy</span>
              <Segmented<Energy> label="Typical energy" value={prefs.energy} options={[{ value: 1, label: 'Low' }, { value: 2, label: 'Medium' }, { value: 3, label: 'High' }]} onChange={(v) => setPrefs({ energy: v })} />
            </div>
          </div>
          <div className="card ob-panel">
            <SurpriseDial value={prefs.comfort} onChange={(c) => setPrefs({ comfort: c })} />
            <p className="tiny faint" style={{ margin: '10px 0 0' }}>How far outside your comfort zone suggestions go — from familiar to adventurous.</p>
          </div>
          <div className="card ob-panel">
            <div className="ob-field">
              <span className="label">Budget for activities</span>
              <Segmented<Cost> label="Budget for activities" value={prefs.budget} options={[{ value: 0, label: 'Free' }, { value: 1, label: 'A little' }, { value: 2, label: 'Some' }]} onChange={(v) => setPrefs({ budget: v })} />
            </div>
            <div className="ob-field">
              <span className="label">Solo or shared</span>
              <Segmented<Social> label="Solo or shared" value={prefs.social} options={[{ value: 'solo', label: 'Solo' }, { value: 'either', label: 'Either' }, { value: 'shared', label: 'With others' }]} onChange={(v) => setPrefs({ social: v })} />
            </div>
          </div>
        </>
      );
      break;
    case 'formats':
      body = (
        <>
          {intro('Formats', 'How do you like to explore?', 'Choose any that appeal. Others still appear — these just rank a little higher.')}
          <div className="ob-tiles" role="group" aria-label="Preferred formats">
            {FORMAT_KEYS.map((k) => {
              const F = formatMeta(k);
              const on = prefs.formats.includes(k);
              return (
                <button key={k} type="button" className="ob-tile glass" aria-pressed={on} onClick={() => toggleIn('formats', k)}>
                  <span className="ob-tile-head"><F.icon size={18} aria-hidden /> {F.label}</span>
                  <span className="tiny muted">{F.description}</span>
                  {on && <Check size={18} className="ob-check" aria-hidden />}
                </button>
              );
            })}
          </div>
        </>
      );
      break;
    case 'theme': {
      const current = THEMES.find((t) => t.id === settings.theme) ?? THEMES[0];
      body = (
        <>
          {intro(<>Look &amp; feel</>, 'Pick a theme', 'Each theme has its own artwork behind the app, and it changes right away. Switching later keeps all your data.')}
          <ThemePicker value={settings.theme} onChange={(theme) => setSettings({ theme })} />
          <div className="card ob-panel">
            <div className="ob-field">
              <span className="label">Appearance</span>
              <Segmented<Appearance> label="Appearance" value={settings.appearance} options={[{ value: 'auto', label: 'Auto' }, { value: 'light', label: 'Day' }, { value: 'dark', label: 'Night' }]} onChange={(v) => setSettings({ appearance: v })} />
              <span className="tiny faint">Auto follows your device’s day/night setting. Night darkens the artwork without hiding it.</span>
            </div>
          </div>
          <div className="card ob-preview" role="group" aria-label={`Preview of the ${current.name} theme`}>
            <div className="row between">
              <span className="label accent">Preview · {current.name}</span>
              <span className="tag">Sample card</span>
            </div>
            <h3 className="display t-lg">Why does a minor key sound sad?</h3>
            <p className="muted small" style={{ margin: '0 0 12px' }}>This is how glass cards, type and accents look over the {current.name} artwork.</p>
            <div className="row wrap" style={{ gap: 8 }} aria-hidden inert>
              <Chip active>Selected</Chip>
              <Chip>Chip</Chip>
              <Button variant="primary" size="sm" tabIndex={-1}>Button</Button>
            </div>
          </div>
        </>
      );
      break;
    }
    case 'finish': {
      const themeName = THEMES.find((t) => t.id === settings.theme)?.name ?? settings.theme;
      const skillNames = prefs.skills.map((sid) => SKILLS.find((k) => k.id === sid)?.name ?? sid);
      body = (
        <>
          {intro('Ready', prefs.name.trim() ? `You’re set, ${prefs.name.trim()}.` : 'You’re set.', undefined, (
            <dl className="ob-summary small">
              <Row k="Interests" v={prefs.interests.length ? prefs.interests.map(topicLabel).join(', ') : 'None yet'} />
              <Row k="Skills" v={skillNames.length ? skillNames.join(', ') : 'None yet'} />
              <Row k="Goals" v={prefs.goals.length ? prefs.goals.join('; ') : 'None yet'} />
              <Row k="Rhythm" v={`${prefs.minutes >= 60 ? '1 h+' : `${prefs.minutes} min`} · ${ENERGY_LABEL[prefs.energy]} · ${COST_LABEL[prefs.budget]} · ${SOCIAL_WORD[prefs.social]}`} />
              <Row k="Surprise Dial" v={`${COMFORT_LABEL[prefs.comfort]} (${prefs.comfort} of 5)`} />
              <Row k="Formats" v={prefs.formats.length ? prefs.formats.map((f) => formatMeta(f).label).join(', ') : 'No preference'} />
              <Row k="Theme" v={`${themeName} · ${APPEARANCE_WORD[settings.appearance]}`} />
            </dl>
          ))}
          <div className="card tinted">
            <h2 className="display t-sm" style={{ marginBottom: 6 }}>How suggestions work</h2>
            <p className="small" style={{ margin: 0 }}>
              Elsewhere’s experiences are curated. Suggestions are ranked with simple, rule-based scoring from these answers and your
              feedback (“more like this”, “less like this”, “hide”) — no AI, and nothing leaves your device. Tap “Why am I seeing this?” on
              any card to see the reasons. You can change everything later in You → Settings.
            </p>
          </div>
        </>
      );
      break;
    }
  }

  return (
    <div className="ob">
      <header className="ob-top">
        <div className="ob-top-inner">
          <div className="ob-top-row">
            <div className="ob-top-side">
              {step > 0 && <IconButton label="Previous step" className="liquid" onClick={prev}><ChevronLeft size={26} /></IconButton>}
            </div>
            <div className="ob-where small muted" aria-live="polite">
              Step {step + 1} of {STEPS.length} · {STEP_LABEL[id]}
            </div>
            <div className="ob-top-side right">
              {step < last && <Button size="sm" onClick={() => finish(true)}>Skip setup</Button>}
            </div>
          </div>
          <Progress value={(step + 1) / STEPS.length} label={`Setup progress: step ${step + 1} of ${STEPS.length}`} />
        </div>
      </header>

      <main className="container ob-body" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* Transform-only entrance: fading an ancestor would switch off the panels' backdrop blur mid-animation. */}
        <div key={id} className="ob-step">{body}</div>
      </main>

      <footer className="ob-foot">
        <div className="ob-foot-inner">
          {step > 0 && <Button onClick={prev}>Back</Button>}
          <Button variant="primary" onClick={() => (id === 'finish' ? finish() : next())} icon={id === 'finish' ? <Check size={18} /> : undefined}>
            {nextLabel}
            {id !== 'finish' && <ArrowRight size={18} aria-hidden />}
          </Button>
        </div>
        {step === 0 && <p className="tiny faint ob-hint">Swipe or use the buttons to move between steps.</p>}
      </footer>
    </div>
  );
}

/** Theme choice shown as each theme's real artwork (THEMES[].art), so the four can be compared side by side. */
function ThemePicker({ value, onChange }: { value: ThemeName; onChange: (t: ThemeName) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = Math.max(0, THEMES.findIndex((t) => t.id === value));
  const onKey = (e: KeyboardEvent) => {
    let n: number;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (idx + 1) % THEMES.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (idx - 1 + THEMES.length) % THEMES.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = THEMES.length - 1;
    else return;
    e.preventDefault();
    onChange(THEMES[n].id);
    refs.current[n]?.focus();
  };
  return (
    <div className="ob-themes" role="radiogroup" aria-label="Theme" onKeyDown={onKey}>
      {THEMES.map((t, i) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className="ob-theme glass"
            onClick={() => onChange(t.id)}
          >
            <span className="ob-art">
              <img src={t.art} alt="" decoding="async" draggable={false} />
              {on && <span className="ob-art-check" aria-hidden><Check size={15} strokeWidth={2.6} /></span>}
            </span>
            <span className="ob-theme-name">
              <span className="display t-sm">{t.name}</span>
              <span className="ob-dots" aria-hidden>
                {/* Each theme's own palette (data from THEMES), not the current screen's colours. */}
                {t.swatch.slice(1).map((c, k) => <i key={k} style={{ background: c }} />)}
              </span>
            </span>
            <span className="tiny muted ob-art-note">{t.artNote}</span>
            {on && <span className="tiny ob-in-use">In use</span>}
          </button>
        );
      })}
    </div>
  );
}

function Area({ icon, name, text }: { icon: ReactNode; name: string; text: string }) {
  return (
    <div className="list-row ob-area">
      <span className="ob-area-icon" aria-hidden>{icon}</span>
      <div>
        <h3 className="display t-sm">{name}</h3>
        <p className="small muted">{text}</p>
      </div>
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div>
    <dt className="label">{k}</dt>
    <dd>{v}</dd>
  </div>
);

function GoalsStep({ intro, goals, toggle, add }: { intro: Intro; goals: string[]; toggle: (g: string) => void; add: (g: string) => void }) {
  const [text, setText] = useState('');
  const presets = GOAL_PRESETS.map((g) => g.label);
  const custom = goals.filter((g) => !presets.includes(g));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const g = text.trim();
    if (!g) return;
    add(g.slice(0, 80));
    setText('');
  };
  return intro('Goals', 'What would you like from this?', 'Choose any, or write your own. Goals nudge related suggestions up — matched by simple rules, never guessed.', (
    <>
      <div className="chips" role="group" aria-label="Goals">
        {presets.map((g) => <Chip key={g} accent active={goals.includes(g)} onClick={() => toggle(g)}>{g}</Chip>)}
      </div>
      {custom.length > 0 && (
        <div className="chips" style={{ marginTop: 12 }} aria-label="Your own goals">
          {custom.map((g) => (
            <span key={g} className="chip ob-goal-custom">
              {g}
              <IconButton label={`Remove goal “${g}”`} onClick={() => toggle(g)}><X size={14} /></IconButton>
            </span>
          ))}
        </div>
      )}
      <form className="row" style={{ marginTop: 18 }} onSubmit={submit}>
        <input className="input grow" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your own goal" aria-label="Write your own goal" maxLength={80} enterKeyHint="done" />
        <Button type="submit" variant="secondary" disabled={!text.trim()} icon={<Plus size={18} />}>Add</Button>
      </form>
    </>
  ));
}
