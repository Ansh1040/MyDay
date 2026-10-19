// Skill Arcade: skills, levels that open in order, short practice, hands-on projects and saved work.
// Progress is computed only from real completions (see src/lib/progress.ts).
import { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronRight, Hammer, Lock, NotebookPen, Shuffle, Trash, WandSparkles } from 'lucide-react';
import type { Completion, Experience, Skill } from '../../data/types';
import { useStore } from '../../store/store';
import { SKILLS, getSkill, getExperience, allExperiences, useExperience } from '../../data/catalog';
import { navigate } from '../../lib/router';
import { Button, EmptyState, Field, Progress, Screen, Section, Segmented, Toggle, confirmDialog, toast } from '../../components/ui';
import { ExperienceCard, MetaLine, TimerControl } from '../../components/common';
import { levelFraction, levelSummary, nextSkillStep, skillProgress, useSkillProgress, type LevelProgress, type SkillProgress } from '../../lib/progress';
import { remaining, resetTimer, useNow } from '../../lib/timers';
import { fmtDate, relTime } from '../../lib/id';
import '../../styles/journeys.css';

function useDeveloping(skillId: string): [boolean, (v: boolean) => void] {
  const skills = useStore((s) => s.prefs.skills);
  const setPrefs = useStore((s) => s.setPrefs);
  const on = skills.includes(skillId);
  return [
    on,
    (v: boolean) => {
      const cur = useStore.getState().prefs.skills;
      setPrefs({ skills: v ? [...new Set([...cur, skillId])] : cur.filter((x) => x !== skillId) });
      toast(v ? 'Added to the skills you’re developing' : 'Removed from the skills you’re developing');
    },
  ];
}

// ---------------------------------------------------------------- all skills
export function SkillsScreen() {
  const mine = useStore((s) => s.prefs.skills);
  const completions = useStore((s) => s.completions);
  const ordered = useMemo(() => {
    const m = SKILLS.filter((k) => mine.includes(k.id));
    const rest = SKILLS.filter((k) => !mine.includes(k.id));
    return { m, rest };
  }, [mine]);

  return (
    <Screen title="Skill Arcade" eyebrow="Journeys" backTo="/journeys" subtitle="Short practice, hands-on projects, and levels that open as you go.">
      {!SKILLS.length && <EmptyState title="No skills available" body="The skill catalog couldn’t be loaded." />}
      {!!ordered.m.length && (
        <Section title="Skills you’re developing">
          <div className="stack">
            {ordered.m.map((k) => (
              <SkillCard key={k.id} skill={k} progress={skillProgress(k, completions)} />
            ))}
          </div>
        </Section>
      )}
      {!!ordered.rest.length && (
        <Section title={ordered.m.length ? 'More skills' : 'All skills'}>
          {!ordered.m.length && (
            <p className="glass glass-strong j-note small">Switch on “I’m developing this” to keep a skill at the top here and in Journeys.</p>
          )}
          <div className="stack">
            {ordered.rest.map((k) => (
              <SkillCard key={k.id} skill={k} progress={skillProgress(k, completions)} />
            ))}
          </div>
        </Section>
      )}
    </Screen>
  );
}

function SkillCard({ skill, progress }: { skill: Skill; progress: SkillProgress }) {
  const [on, setOn] = useDeveloping(skill.id);
  const drafts = useStore((s) => s.drafts);
  const lp = progress.levels.find((l) => l.level === progress.currentLevel);
  const lv = skill.levels.find((l) => l.level === progress.currentLevel);
  const step = nextSkillStep(skill, progress);
  const first = skill.levels[0]?.practice[0];
  const entryId = progress.started ? step?.experienceId : first;
  const entry = entryId ? getExperience(entryId) : undefined;
  return (
    <article className="card j-skill-card">
      <button type="button" className="card-tap" style={{ background: 'none', border: 0, padding: 0 }} onClick={() => navigate(`/skill/${skill.id}`)}>
        <div className="label accent">
          {progress.allComplete ? 'All levels complete' : progress.started && lp ? `Level ${lp.level} of ${progress.levels.length} · ${lp.name}` : 'Not started'}
        </div>
        <h3 className="display t-lg" style={{ margin: '6px 0 4px' }}>{skill.name}</h3>
        <p className="muted" style={{ margin: 0 }}>{skill.tagline}</p>
        {progress.started && lp && (
          <div style={{ marginTop: 14 }}>
            <Progress value={levelFraction(lp)} label={`Level ${lp.level} progress`} />
            <div className="tiny muted" style={{ marginTop: 6 }}>{levelSummary(lp, !!(lv && drafts[lv.project]))}</div>
          </div>
        )}
      </button>
      {entry && (
        <button type="button" className="j-start-here" onClick={() => navigate(`/x/${entry.id}`)}>
          <span className="label">{progress.started ? 'Continue' : 'Start here'}</span>
          <span className="grow j-start-title">{entry.title}</span>
          <span className="tiny faint">{entry.minutes} min</span>
          <ArrowRight size={18} aria-hidden />
        </button>
      )}
      <div className="row between j-dev-row">
        <span className="small">I’m developing this</span>
        <Toggle checked={on} onChange={setOn} label={`I’m developing ${skill.name}`} />
      </div>
    </article>
  );
}

// ---------------------------------------------------------------- one skill
const PRACTICE_OPTIONS = [5, 10, 15, 25].map((m) => ({ value: m, label: `${m} min` }));

export function SkillScreen({ id }: { id: string }) {
  const skill = getSkill(id);
  const progress = useSkillProgress(id);
  if (!skill) {
    return (
      <Screen title="Skill" backTo="/skills">
        <EmptyState title="This skill doesn’t exist" body="The link may be incomplete." action={<Button variant="primary" onClick={() => navigate('/skills', { replace: true })}>See all skills</Button>} />
      </Screen>
    );
  }
  return <SkillDetail skill={skill} progress={progress} />;
}

function SkillDetail({ skill, progress }: { skill: Skill; progress: SkillProgress }) {
  const [on, setOn] = useDeveloping(skill.id);
  const drafts = useStore((s) => s.drafts);
  const [selected, setSelected] = useState(progress.currentLevel || 1);
  const step = nextSkillStep(skill, progress);
  const stepExp = useExperience(step?.experienceId);
  const lp = progress.levels.find((l) => l.level === selected);
  const lv = skill.levels.find((l) => l.level === selected);

  return (
    <Screen title={skill.name} eyebrow="Skill Arcade" subtitle={skill.tagline} backTo="/skills">
      <div className="glass row between j-dev-panel">
        <span className="small">I’m developing this</span>
        <Toggle checked={on} onChange={setOn} label={`I’m developing ${skill.name}`} />
      </div>

      {/* Continue */}
      <div className="card inverse j-continue-card" style={{ marginTop: 16 }}>
        {step && stepExp ? (
          <>
            <div className="label">{progress.started ? 'Next up' : 'Start here'} · Level {step.level} {step.kind === 'project' ? 'project' : 'practice'}</div>
            <h2 className="display t-lg" style={{ margin: '8px 0 6px' }}>{stepExp.title}</h2>
            <p className="muted" style={{ margin: '0 0 14px' }}>{stepExp.summary}</p>
            <Button variant="primary" icon={<ArrowRight size={18} />} onClick={() => navigate(`/x/${stepExp.id}`)}>
              {drafts[stepExp.id] ? 'Continue where you left off' : progress.started ? 'Continue' : 'Start'}
            </Button>
          </>
        ) : progress.allComplete ? (
          <>
            <div className="label">All levels complete</div>
            <h2 className="display t-lg" style={{ margin: '8px 0 6px' }}>You’ve finished every level of {skill.name}.</h2>
            <p className="muted" style={{ margin: '0 0 14px' }}>Take it somewhere real, or keep a free practice habit going below.</p>
            <Button variant="primary" icon={<Shuffle size={18} />} onClick={() => navigate(`/remix?from=skill:${skill.id}`)}>Turn it into a real-world challenge</Button>
          </>
        ) : (
          <>
            <div className="label">Next up</div>
            <p style={{ margin: '8px 0 0' }}>The next item for this skill isn’t available on this device.</p>
          </>
        )}
      </div>

      {/* Level path */}
      <Section title="Levels">
        <ol className="glass j-track" aria-label={`${skill.name} levels`}>
          {progress.levels.map((l) => {
            const state = l.complete ? 'complete' : l.unlocked ? 'open' : 'locked';
            return (
              <li key={l.level} className={`j-step ${state}${l.level === selected ? ' selected' : ''}`}>
                <button type="button" aria-pressed={l.level === selected} onClick={() => setSelected(l.level)}>
                  <span className="j-step-dot" aria-hidden>
                    {state === 'complete' ? <Check size={16} /> : state === 'locked' ? <Lock size={14} /> : l.level}
                  </span>
                  <span className="grow">
                    <span className="j-step-name">Level {l.level} · {l.name}</span>
                    <span className="tiny muted" style={{ display: 'block' }}>
                      {state === 'complete' ? 'Complete' : state === 'locked' ? 'Locked — opens when the level before is complete' : levelSummary(l, !!drafts[skill.levels.find((x) => x.level === l.level)?.project ?? ''])}
                    </span>
                  </span>
                  {l.level === progress.currentLevel && !progress.allComplete && <span className="tag accent">Current</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </Section>

      {lp && lv && <LevelDetail skill={skill} lp={lp} goal={lv.goal} practice={lv.practice} project={lv.project} projectDraft={!!drafts[lv.project]} prevName={progress.levels.find((x) => x.level === lp.level - 1)?.name} />}

      <PracticeTimer skill={skill} />
      <SavedWork skill={skill} />

      <Section title="Use it in the real world">
        <div className="card">
          {skill.realWorld.length ? (
            <ul className="j-realworld">
              {skill.realWorld.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ margin: 0 }}>No suggestions listed for this skill yet.</p>
          )}
          <button type="button" className="j-inline-link" onClick={() => navigate(`/remix?from=skill:${skill.id}`)}>
            <WandSparkles size={16} aria-hidden />
            <span className="grow">Turn this into a real-world challenge</span>
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </Section>
    </Screen>
  );
}

function LevelDetail({ skill, lp, goal, practice, project, projectDraft, prevName }: { skill: Skill; lp: LevelProgress; goal: string; practice: string[]; project: string; projectDraft: boolean; prevName?: string }) {
  const projectExp = useExperience(project);
  const projectCounts = lp.practiceDone >= lp.practiceNeeded;
  return (
    <Section title={`Level ${lp.level} · ${lp.name}`}>
      <div className="glass glass-strong j-panel j-level-intro">
        <p className="prose" style={{ marginTop: 0 }}>{goal}</p>
        {!lp.unlocked && (
          <div className="banner warn" role="note">
            <Lock size={16} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
            <span>You’re peeking ahead. This level opens once {prevName ? `“${prevName}”` : 'the level before'} is complete. Anything you finish here still counts.</span>
          </div>
        )}
        <Progress value={levelFraction(lp)} label={`Level ${lp.level} progress`} />
        <p className="small muted" style={{ margin: '8px 0 0' }} aria-live="polite">
          {levelSummary(lp, projectDraft)}
          {lp.complete ? ' · level complete' : lp.practiceNeeded < lp.practiceTotal ? ` · ${lp.practiceNeeded} practice needed for the level` : ''}
        </p>
      </div>

      <h3 className="label on-art j-sub-head">Practice</h3>
      <div className="stack sm">
        {practice.map((pid) => (
          <PracticeItem key={pid} id={pid} />
        ))}
        {!practice.length && <p className="glass glass-strong j-note small">No practice items in this level.</p>}
      </div>

      <h3 className="label on-art j-sub-head">Project</h3>
      {projectExp ? (
        <ExperienceCard
          e={projectExp}
          variant="feature"
          reason={lp.projectDone ? 'Done' : projectCounts ? 'Ready — this completes the level' : `Counts toward the level after ${lp.practiceNeeded} practice item${lp.practiceNeeded === 1 ? '' : 's'}`}
          footer={
            <div className="row" style={{ marginTop: 10, gap: 8 }}>
              <Hammer size={16} aria-hidden className="faint" />
              <span className="tiny muted">{lp.projectDone ? 'Project done' : projectDraft ? 'Project in progress — your draft is saved' : 'Project not started'}</span>
            </div>
          }
        />
      ) : (
        <p className="glass glass-strong j-note small">This level’s project isn’t available on this device.</p>
      )}
    </Section>
  );
}

function PracticeItem({ id }: { id: string }) {
  const e = useExperience(id);
  if (!e) return <div className="card small muted">A practice item (“{id}”) isn’t available on this device.</div>;
  return <ExperienceCard e={e} variant="compact" />;
}

function PracticeTimer({ skill }: { skill: Skill }) {
  const timerId = `skill:${skill.id}:practice`;
  const t = useStore((s) => s.timers[timerId]);
  const complete = useStore((s) => s.complete);
  const remove = useStore((s) => s.remove);
  const completions = useStore((s) => s.completions);
  const sessions = useMemo(
    () => Object.values(completions).filter((c) => c.ref.kind === 'skill' && c.ref.id === skill.id).sort((a, b) => b.at.localeCompare(a.at)),
    [completions, skill.id],
  );
  const [minutes, setMinutes] = useState(() => (t ? Math.max(1, Math.round(t.durationMs / 60000)) : 10));
  const [note, setNote] = useState('');
  const status = t?.status ?? 'idle';
  const now = useNow(status === 'running', 1000);
  const elapsedMs = t ? t.durationMs - remaining(t, now) : 0;
  const canLog = status !== 'idle' && elapsedMs >= 30000;

  const log = () => {
    const tt = useStore.getState().timers[timerId];
    if (!tt) return;
    const ms = tt.durationMs - remaining(tt, Date.now());
    const mins = Math.max(1, Math.round(ms / 60000));
    complete({ kind: 'skill', id: skill.id }, { minutes: mins, result: { kind: 'practice-session', text: note.trim() } });
    resetTimer(timerId);
    setNote('');
    toast(`Logged a ${mins}-minute practice session.`);
  };

  return (
    <Section title="Free practice">
      <div className="card stack j-form">
        <p className="muted small" style={{ margin: 0 }}>
          Practise anything for {skill.name.toLowerCase()} on your own. Sessions are only logged when you tap “Log session”, and they’re kept separate from level progress.
        </p>
        <Segmented label="Practice length" value={minutes} options={PRACTICE_OPTIONS} onChange={(m) => status === 'idle' && setMinutes(m)} />
        {status !== 'idle' && <small className="faint">Reset the timer to choose a different length.</small>}
        <TimerControl id={timerId} label={`${skill.name} practice`} minutes={minutes} refTo={{ kind: 'skill', id: skill.id }} />
        <Field label="What did you practise? (optional)">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Layered two field recordings" />
        </Field>
        <Button variant="primary" icon={<NotebookPen size={18} />} disabled={!canLog} onClick={log}>Log session</Button>
        {!canLog && <small className="faint">{status === 'idle' ? 'Start the timer, then log the session when you’re done.' : 'Practise for at least 30 seconds to log a session.'}</small>}
      </div>
      {!!sessions.length && (
        <>
          <h3 className="label on-art j-sub-head">Practice log · {sessions.length} session{sessions.length === 1 ? '' : 's'}</h3>
          <div className="list">
            {sessions.slice(0, 8).map((c) => (
              <div key={c.id} className="list-row">
                <span className="grow">
                  <span className="lr-title" style={{ display: 'block' }}>{c.minutes ? `${c.minutes} min` : 'Session'} · {fmtDate(c.at)}</span>
                  {sessionNote(c) && <span className="lr-sub">{sessionNote(c)}</span>}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Delete practice session from ${fmtDate(c.at)}`}
                  onClick={async () => {
                    if (await confirmDialog({ title: 'Delete this practice session?', body: 'It will be removed from your practice log.', confirmLabel: 'Delete', danger: true })) {
                      remove('completions', c.id);
                      toast('Session deleted');
                    }
                  }}
                >
                  <Trash size={18} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}

const sessionNote = (c: Completion) => {
  const r = c.result as { text?: unknown } | undefined;
  return typeof r?.text === 'string' && r.text ? r.text : '';
};

/** Best-effort readable snippet of a completion's saved work. */
function workSnippet(result: unknown): { text: string; code?: boolean } | null {
  if (result == null) return null;
  if (typeof result === 'string') return result.trim() ? { text: result } : null;
  if (typeof result === 'number' || typeof result === 'boolean') return { text: String(result) };
  if (typeof result !== 'object') return null;
  const r = result as Record<string, unknown>;
  if (typeof r.code === 'string' && r.code.trim()) return { text: r.code, code: true };
  for (const k of ['text', 'summary', 'note', 'notes', 'answer', 'reflection', 'response', 'output']) {
    const v = r[k];
    if (typeof v === 'string' && v.trim()) return { text: v };
  }
  if (typeof r.score === 'number') return { text: `Score: ${r.score}${typeof r.total === 'number' ? ` of ${r.total}` : ''}` };
  if (r.answers && typeof r.answers === 'object') {
    const vals = Object.values(r.answers as Record<string, unknown>).filter((v): v is string => typeof v === 'string' && !!v.trim());
    if (vals.length) return { text: vals.join('\n') };
  }
  if (typeof r.blobId === 'string') return { text: 'Saved file — open the experience to see it.' };
  return null;
}

function SavedWork({ skill }: { skill: Skill }) {
  const completions = useStore((s) => s.completions);
  const items = useMemo(() => {
    const ids = new Set<string>();
    skill.levels.forEach((l) => {
      l.practice.forEach((p) => ids.add(p));
      ids.add(l.project);
    });
    allExperiences().forEach((e: Experience) => e.skillId === skill.id && ids.add(e.id));
    return Object.values(completions)
      .filter((c) => c.ref.kind === 'experience' && ids.has(c.ref.id) && c.result != null)
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [completions, skill]);

  return (
    <Section title="Saved work">
      {items.length ? (
        <div className="stack sm">
          {items.slice(0, 20).map((c) => {
            const e = getExperience(c.ref.id);
            const snip = workSnippet(c.result);
            return (
              <button key={c.id} type="button" className="card card-tap j-work" onClick={() => navigate(`/x/${c.ref.id}`)}>
                <div className="row between">
                  <span className="lr-title" style={{ fontWeight: 650 }}>{e?.title ?? 'Removed experience'}</span>
                  <span className="tiny faint">{relTime(c.at)}</span>
                </div>
                {e && <div style={{ marginTop: 4 }}><MetaLine e={e} /></div>}
                {snip ? (
                  snip.code ? <pre className="j-snippet mono">{clip(snip.text, 400)}</pre> : <p className="j-snippet-text">{clip(snip.text, 240)}</p>
                ) : (
                  <p className="tiny muted" style={{ margin: '8px 0 0' }}>Saved result — open to view.</p>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="glass glass-strong j-note small">Work you save while practising (writing, code, sketches, scores) will appear here.</p>
      )}
    </Section>
  );
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
