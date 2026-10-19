// Progress = meaningful participation: skill levels, ideas explored, things finished, saved work.
// Only literal counts. No streaks, points or invented scores.
import { useMemo } from 'react';
import { Check, ChevronRight, Compass, Gamepad2, PenLine } from 'lucide-react';
import type { Completion, RabbitHole, Skill } from '../../data/types';
import { useStore } from '../../store/store';
import { navigate } from '../../lib/router';
import { fmtDate, relTime } from '../../lib/id';
import { resolveRef } from '../../lib/refs';
import { useSkillProgress, levelFraction } from '../../lib/progress';
import { SKILLS, RABBIT_HOLES, getExperience } from '../../data/catalog';
import { formatMeta } from '../../formats/meta';
import { Screen, Button, Section, Progress as Bar, EmptyState } from '../../components/ui';
import { plural, listJoin } from './VersionHistory';
import '../../styles/you.css';

const HOLES: RabbitHole[] = RABBIT_HOLES;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

/** A short, honest description of whatever a format player saved as its result. */
export function describeResult(r: unknown): string {
  if (r == null) return '';
  if (typeof r === 'string') return clip(r.trim(), 120) || 'Saved work';
  if (typeof r === 'number' || typeof r === 'boolean') return `Result: ${String(r)}`;
  if (Array.isArray(r)) return plural(r.length, 'saved item', 'saved items');
  if (typeof r === 'object') {
    const o = r as Record<string, unknown>;
    if (typeof o.summary === 'string' && o.summary.trim()) return clip(o.summary, 120);
    if (typeof o.score === 'number' && typeof o.total === 'number') return `Score: ${o.score} of ${o.total}`;
    if (typeof o.text === 'string' && o.text.trim()) return clip(o.text.trim(), 120);
    if (typeof o.code === 'string') return 'Code saved';
    if (typeof o.blobId === 'string') return 'Sketch, photo or recording saved';
    const firstStr = Object.values(o).find((v) => typeof v === 'string' && v.trim()) as string | undefined;
    if (firstStr) return clip(firstStr.trim(), 120);
  }
  return 'Saved work';
}
const hasResult = (c: Completion) =>
  c.result !== undefined && c.result !== null && !(typeof c.result === 'object' && !Array.isArray(c.result) && Object.keys(c.result as object).length === 0) && c.result !== '';

function SkillCard({ skill }: { skill: Skill }) {
  const p = useSkillProgress(skill.id);
  const total = p.levels.length || skill.levels.length;
  const allDone = p.allComplete;
  const cur = p.levels.find((l) => l.level === p.currentLevel);
  const practiceLine = (l: (typeof p.levels)[number]) =>
    `Practice ${l.practiceDone} of ${l.practiceTotal}` +
    (l.practiceNeeded < l.practiceTotal && l.practiceDone < l.practiceNeeded ? ` (${l.practiceNeeded} needed)` : '') +
    ` · Project ${l.projectDone ? 'done' : 'not yet'}`;
  return (
    <article className="card y-panel pg-skill">
      <div className="row between">
        <span className="label accent">Skill</span>
        <span className="tiny faint">{allDone ? `All ${total} levels complete` : cur ? `Level ${cur.level} of ${total}` : ''}</span>
      </div>
      <h3 className="display t-md" style={{ margin: '6px 0 4px' }}>{skill.name}</h3>
      {cur && !allDone && (
        <>
          <p className="small muted" style={{ margin: 0 }}>Now: {cur.name}</p>
          <div style={{ marginTop: 12 }}>
            <Bar value={levelFraction(cur)} label={`${skill.name}, level ${cur.level}: ${practiceLine(cur)}`} />
            <div className="tiny muted" style={{ marginTop: 6 }}>{practiceLine(cur)}</div>
          </div>
        </>
      )}
      <ol className="pg-levels">
        {p.levels.map((l) => (
          <li key={l.level} className={l.complete ? 'done' : l.level === p.currentLevel ? 'current' : ''}>
            <span className="pg-lnum mono" aria-hidden>{l.complete ? <Check size={14} /> : l.level}</span>
            <span className="grow">
              <span className="small" style={{ fontWeight: 600, display: 'block' }}>
                <span className="sr-only">Level {l.level}: </span>
                {l.name}
              </span>
              <span className="tiny muted">
                {l.complete ? 'Complete · ' : !l.unlocked ? 'Opens after the previous level · ' : ''}
                {practiceLine(l)}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <Button size="sm" variant="soft" onClick={() => navigate(`/skill/${skill.id}`)} style={{ marginTop: 12 }}>
        {allDone ? 'Open skill' : 'Continue'}
      </Button>
    </article>
  );
}

export function ProgressScreen() {
  const completions = useStore((s) => s.completions);
  const prefSkills = useStore((s) => s.prefs.skills);
  const rabbitProgress = useStore((s) => s.rabbitProgress);
  const visited = useStore((s) => s.visited);
  const twists = useStore((s) => s.twists);
  const perspectives = useStore((s) => s.perspectives);
  const quests = useStore((s) => s.quests);
  const capsules = useStore((s) => s.capsules);
  const entries = useStore((s) => s.entries);
  const userExperiences = useStore((s) => s.experiences);

  const list = useMemo(() => Object.values(completions).sort((a, b) => b.at.localeCompare(a.at)), [completions]);

  const skills = useMemo(() => {
    const doneIds = new Set(list.filter((c) => c.ref.kind === 'experience').map((c) => c.ref.id));
    return SKILLS.filter((k) => prefSkills.includes(k.id) || k.levels.some((l) => [...l.practice, l.project].some((id) => doneIds.has(id))));
  }, [list, prefSkills]);

  const rabbits = useMemo(
    () =>
      HOLES.map((r) => {
        const seen = new Set<string>(rabbitProgress[r.id]?.path ?? []);
        Object.keys(visited).forEach((k) => {
          const [kind, rid, node] = k.split(':');
          if (kind === 'rabbit' && rid === r.id && node) seen.add(node);
        });
        const valid = r.nodes.filter((n) => seen.has(n.id)).length;
        return { r, visited: valid, total: r.nodes.length, at: rabbitProgress[r.id]?.node };
      }).filter((x) => x.visited > 0),
    [rabbitProgress, visited],
  );

  const byFormat = useMemo(() => {
    const m = new Map<string, { n: number; ids: Set<string> }>();
    list.forEach((c) => {
      if (c.ref.kind !== 'experience') return;
      const e = getExperience(c.ref.id);
      const f = e?.format ?? 'unknown';
      if (!m.has(f)) m.set(f, { n: 0, ids: new Set() });
      const x = m.get(f)!;
      x.n++;
      x.ids.add(c.ref.id);
    });
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, userExperiences]);

  const others = useMemo(() => {
    const out: { label: string; n: number; url: string }[] = [];
    const tw = Object.values(twists).filter((t) => t.status === 'done').length;
    const ps = Object.values(perspectives).filter((p) => p.completedAt).length;
    const qs = Object.values(quests).filter((q) => q.mine).length;
    const cs = Object.values(capsules).filter((c) => c.openedAt).length;
    const es = Object.keys(entries).length;
    if (tw) out.push({ label: plural(tw, 'plot twist done', 'plot twists done'), n: tw, url: '/twist' });
    if (ps) out.push({ label: plural(ps, 'perspective switch finished', 'perspective switches finished'), n: ps, url: '/perspectives' });
    if (qs) out.push({ label: plural(qs, 'two-person quest answered', 'two-person quests answered'), n: qs, url: '/quests' });
    if (cs) out.push({ label: plural(cs, 'capsule opened', 'capsules opened'), n: cs, url: '/capsules' });
    if (es) out.push({ label: plural(es, 'Version History entry', 'Version History entries'), n: es, url: '/history' });
    return out;
  }, [twists, perspectives, quests, capsules, entries]);

  const saved = useMemo(() => list.filter(hasResult).slice(0, 12), [list]);
  const expCompletions = list.filter((c) => c.ref.kind === 'experience').length;
  // Distinct experiences (same count as the You tab); repeats are mentioned separately.
  const expDistinct = new Set(list.filter((c) => c.ref.kind === 'experience').map((c) => c.ref.id)).size;
  const othersText = listJoin(others.slice(0, 3).map((o) => o.label));
  const first = list.length ? list[list.length - 1].at : undefined;
  const nothing = !list.length && !rabbits.length && !skills.length && !others.length;

  return (
    <Screen title="Progress" eyebrow="You" backTo="/you" subtitle="What you’ve actually done — counted, not scored. No streaks.">
      {nothing ? (
        <EmptyState
          icon={<Compass size={24} />}
          title="Nothing counted yet"
          body="Progress here is simply what you do: experiences you finish, ideas you explore in rabbit holes, skill practice and projects. Start anywhere."
          action={<Button variant="primary" onClick={() => navigate('/journeys')}>Find something to try</Button>}
        />
      ) : (
        <>
          {first && (
            <div className="card glass-strong y-panel pg-lede-card">
            <p className="pg-lede">
              {expDistinct
                ? `Since ${fmtDate(first)}, you’ve completed ${plural(expDistinct, 'experience', 'experiences')}` +
                  (expCompletions > expDistinct ? ` (${expCompletions} times in all)` : '') +
                  (others.length ? `, along with ${othersText}` : '') + '.'
                : `Since ${fmtDate(first)}: ${othersText || 'nothing finished yet'}.`}
            </p>
            </div>
          )}

          <Section title="Skills" action={<Button size="sm" variant="secondary" onClick={() => navigate('/skills')}>All skills</Button>}>
            {skills.length ? (
              <div className="stack">{skills.map((k) => <SkillCard key={k.id} skill={k} />)}</div>
            ) : (
              <div className="card y-panel">
                <p className="muted" style={{ marginTop: 0 }}>No skills started yet. Each skill has short practice, a hands-on project per level, and real-world uses.</p>
                <Button size="sm" variant="soft" icon={<Gamepad2 size={16} />} onClick={() => navigate('/skills')}>Open Skill Arcade</Button>
              </div>
            )}
          </Section>

          <Section title="Rabbit holes explored">
            {rabbits.length ? (
              <div className="list y-panel">
                {rabbits.map(({ r, visited: v, total, at }) => (
                  <button key={r.id} type="button" className="list-row" onClick={() => navigate(`/rabbit/${r.id}${at ? `?node=${encodeURIComponent(at)}` : ''}`)}>
                    <span className="grow">
                      <span className="lr-title" style={{ display: 'block' }}>{r.title}</span>
                      <span className="lr-sub" style={{ display: 'block', marginBottom: 6 }}>Ideas visited: {v} of {total}</span>
                      <Bar value={total ? v / total : 0} label={`${r.title}: ${v} of ${total} ideas visited`} />
                    </span>
                    <ChevronRight size={18} aria-hidden />
                  </button>
                ))}
              </div>
            ) : (
              <p className="card y-panel small muted" style={{ margin: 0 }}>
                None yet. <button type="button" className="link-btn" onClick={() => navigate('/journeys')}>Start a rabbit hole</button> — each idea you open is counted here.
              </p>
            )}
          </Section>

          <Section title="Completed, by format">
            {byFormat.length ? (
              <ul className="card y-panel pg-formats">
                {byFormat.map(([f, x]) => {
                  const F = formatMeta(f === 'unknown' ? 'steps' : f);
                  return (
                    <li key={f}>
                      <F.icon size={18} aria-hidden />
                      <span className="grow">{f === 'unknown' ? 'Removed experiences' : F.label}</span>
                      <span className="pg-num">
                        {x.n} completed{x.ids.size !== x.n ? ` (${x.ids.size} different)` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="card y-panel small muted" style={{ margin: 0 }}>No experiences completed yet.</p>
            )}
            {others.length > 0 && (
              <ul className="card y-panel pg-formats" style={{ marginTop: 12 }}>
                {others.map((o) => (
                  <li key={o.label}>
                    <button type="button" className="link-btn grow" style={{ textAlign: 'left' }} onClick={() => navigate(o.url)}>{o.label}</button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Recent saved work">
            {saved.length ? (
              <div className="list y-panel">
                {saved.map((c) => {
                  const r = resolveRef(c.ref);
                  return (
                    <button key={c.id} type="button" className="list-row" onClick={() => navigate(r.url)}>
                      <span className="lr-icon"><PenLine size={18} aria-hidden /></span>
                      <span className="grow">
                        <span className="lr-title" style={{ display: 'block' }}>{r.title}</span>
                        <span className="lr-sub" style={{ display: 'block' }}>{describeResult(c.result)}</span>
                        <span className="tiny faint">{r.kindLabel} · {relTime(c.at)}</span>
                      </span>
                      <ChevronRight size={18} aria-hidden />
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="card y-panel small muted" style={{ margin: 0 }}>Work you save while doing experiences — answers, writing, code, sketches — will be listed here so you can open it again.</p>
            )}
          </Section>
        </>
      )}
    </Screen>
  );
}
