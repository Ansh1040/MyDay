// Journeys tab: everything that unfolds over time — rabbit holes, skills, perspective questions, quests,
// return tickets and collections. "Continue" only lists things you've actually started.
import { useMemo, type ReactNode } from 'react';
import { ArrowRight, ChevronRight, Download, Library, Plus, Route as RouteIcon, Scale, Sparkles, Ticket, Users } from 'lucide-react';
import type { PerspectiveQuestion, QuestTemplate, RabbitHole } from '../../data/types';
import { useStore } from '../../store/store';
import { PERSPECTIVES, QUEST_TEMPLATES, RABBIT_HOLES, SKILLS } from '../../data/catalog';
import { navigate } from '../../lib/router';
import { Button, IconButton, Progress, Screen, Section } from '../../components/ui';
import { TopicTags } from '../../components/common';
import { ticketUrl } from '../../components/ReturnTicketSheet';
import { levelFraction, levelSummary, skillProgress } from '../../lib/progress';
import { relTime } from '../../lib/id';
import { exploredIds } from './RabbitHole';
import { questStatus } from './Quests';
import { stanceLabel } from './Perspective';
import '../../styles/journeys.css';

interface HoleRow { h: RabbitHole; explored: number; total: number; last?: string }
interface ContinueItem { key: string; at: string; eyebrow: string; title: string; sub?: string; url: string; icon: ReactNode }

export function Journeys() {
  const tickets = useStore((s) => s.tickets);
  const rabbitProgress = useStore((s) => s.rabbitProgress);
  const visited = useStore((s) => s.visited);
  const completions = useStore((s) => s.completions);
  const mySkills = useStore((s) => s.prefs.skills);
  const quests = useStore((s) => s.quests);
  const collections = useStore((s) => s.collections);
  const perspectives = useStore((s) => s.perspectives);

  const holes: HoleRow[] = useMemo(
    () =>
      RABBIT_HOLES.map((h: RabbitHole) => {
        const ex = exploredIds(h, visited, rabbitProgress[h.id]?.path);
        const last = Object.entries(visited)
          .filter(([k]) => k.startsWith(`rabbit:${h.id}:`))
          .map(([, v]) => v)
          .sort()
          .pop();
        return { h, explored: ex.size, total: h.nodes.length, last };
      }),
    [visited, rabbitProgress],
  );

  const skills = useMemo(() => {
    const list = SKILLS.map((k) => ({ k, p: skillProgress(k, completions), mine: mySkills.includes(k.id) }));
    return [...list.filter((x) => x.mine), ...list.filter((x) => !x.mine)];
  }, [completions, mySkills]);

  const continueItems = useMemo(() => {
    const out: ContinueItem[] = [];
    Object.values(tickets)
      .filter((t) => !t.resolvedAt)
      .forEach((t) =>
        out.push({
          key: 'tk' + t.id,
          at: t.createdAt,
          eyebrow: 'Return ticket',
          title: t.title,
          sub: t.next ? `Next: ${t.next}` : t.stoppedAt || undefined,
          url: ticketUrl(t),
          icon: <Ticket size={18} aria-hidden />,
        }),
      );
    const ticketed = new Set(Object.values(tickets).filter((t) => !t.resolvedAt && t.target.kind === 'rabbit').map((t) => t.target.id));
    holes
      .filter((x) => rabbitProgress[x.h.id] && x.explored < x.total && !ticketed.has(x.h.id))
      .forEach((x) => {
        const node = x.h.nodes.find((n) => n.id === rabbitProgress[x.h.id].node);
        out.push({
          key: 'rh' + x.h.id,
          at: x.last ?? '',
          eyebrow: `Rabbit hole · ${x.explored} of ${x.total} idea${x.total === 1 ? '' : 's'}`,
          title: x.h.title,
          sub: node ? `Last at “${node.title}”` : undefined,
          url: `/rabbit/${x.h.id}`,
          icon: <RouteIcon size={18} aria-hidden />,
        });
      });
    skills
      .filter((x) => x.p.started && !x.p.allComplete)
      .forEach((x) => {
        const lp = x.p.levels.find((l) => l.level === x.p.currentLevel);
        const last = Object.values(completions)
          .filter((c) => c.ref.kind === 'experience' && x.k.levels.some((l) => l.practice.includes(c.ref.id) || l.project === c.ref.id))
          .map((c) => c.at)
          .sort()
          .pop();
        out.push({
          key: 'sk' + x.k.id,
          at: last ?? '',
          eyebrow: lp ? `Skill · Level ${lp.level} · ${lp.name}` : 'Skill',
          title: x.k.name,
          sub: lp ? levelSummary(lp) : undefined,
          url: `/skill/${x.k.id}`,
          icon: <Sparkles size={18} aria-hidden />,
        });
      });
    Object.values(quests).forEach((q) => {
      const st = questStatus(q);
      if (!st.waiting) return;
      out.push({ key: 'q' + q.id, at: q.updatedAt, eyebrow: `Two-person quest · ${st.text}`, title: q.title, url: `/quest/${q.id}`, icon: <Users size={18} aria-hidden /> });
    });
    Object.values(perspectives)
      .filter((p) => !p.completedAt)
      .forEach((p) => {
        const q = PERSPECTIVES.find((x: PerspectiveQuestion) => x.id === p.questionId);
        if (q) out.push({ key: 'ps' + p.id, at: p.createdAt, eyebrow: 'Perspective Switch · in progress', title: q.question, sub: `You started at “${stanceLabel(p.before.stance)}”`, url: `/perspective/${q.id}`, icon: <Scale size={18} aria-hidden /> });
      });
    return out.sort((a, b) => b.at.localeCompare(a.at));
  }, [tickets, holes, rabbitProgress, skills, quests, perspectives, completions]);

  const questList = useMemo(() => Object.values(quests).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [quests]);
  const colList = useMemo(() => Object.values(collections).sort((a, b) => (a.system === b.system ? a.createdAt.localeCompare(b.createdAt) : a.system ? -1 : 1)), [collections]);
  const openTickets = Object.values(tickets).filter((t) => !t.resolvedAt).length;
  const firstHole: RabbitHole | undefined = RABBIT_HOLES[0];

  return (
    <Screen
      title="Journeys"
      eyebrow="Go deeper"
      subtitle="Rabbit holes, skills, questions and quests — the things that unfold over time."
      backTo={false}
      actions={
        <>
          <IconButton label={`Return tickets${openTickets ? ` (${openTickets} open)` : ''}`} onClick={() => navigate('/tickets')}>
            <Ticket size={21} />
          </IconButton>
          <IconButton label="Import a share code" onClick={() => navigate('/import')}>
            <Download size={21} />
          </IconButton>
        </>
      }
    >
      {/* Continue */}
      <Section title="Continue" action={openTickets ? <button type="button" className="j-see-all" onClick={() => navigate('/tickets')}>Tickets ({openTickets})</button> : undefined}>
        {continueItems.length ? (
          <div className="list j-wrap">
            {continueItems.slice(0, 6).map((c) => (
              <button key={c.key} type="button" className="list-row j-continue-row" onClick={() => navigate(c.url)}>
                <span className="lr-icon">{c.icon}</span>
                <span className="grow">
                  <span className="label" style={{ display: 'block' }}>{c.eyebrow}</span>
                  <span className="lr-title" style={{ display: 'block' }}>{c.title}</span>
                  {c.sub && <span className="lr-sub j-clamp" style={{ display: 'block' }}>{c.sub}</span>}
                </span>
                <ChevronRight size={18} aria-hidden className="faint" />
              </button>
            ))}
            {continueItems.length > 6 && <div className="list-row small muted">And {continueItems.length - 6} more below.</div>}
          </div>
        ) : (
          <div className="card tinted j-first">
            <h3 className="display t-md" style={{ marginBottom: 6 }}>Nothing in progress yet</h3>
            <p className="muted" style={{ margin: '0 0 14px' }}>
              Open a rabbit hole or start a skill. Elsewhere remembers where you stop, and you can leave yourself a return ticket for later.
            </p>
            <div className="row wrap">
              {firstHole && (
                <Button variant="primary" size="sm" icon={<ArrowRight size={16} />} onClick={() => navigate(`/rabbit/${firstHole.id}`)} aria-label={`Open a rabbit hole: ${firstHole.title}`}>
                  Open a rabbit hole
                </Button>
              )}
              <Button size="sm" onClick={() => navigate('/skills')}>Browse skills</Button>
            </div>
          </div>
        )}
      </Section>

      {/* Rabbit holes */}
      <Section title="Rabbit holes" action={<span className="on-art tiny muted">Curated</span>}>
        {holes.length ? (
          <div className="j-holes">
            {holes.map(({ h, explored, total }, i) => (
              <button key={h.id} type="button" className={'card card-tap j-hole' + (i === 0 ? ' feature tinted' : '')} onClick={() => navigate(`/rabbit/${h.id}`)}>
                <div className="label accent">{explored ? `Explored ${explored} of ${total} idea${total === 1 ? '' : 's'}` : `${total} idea${total === 1 ? '' : 's'} to explore`}</div>
                <h3 className={'display ' + (i === 0 ? 't-lg' : 't-md')} style={{ margin: '6px 0' }}>{h.title}</h3>
                <p className="muted" style={{ margin: '0 0 12px' }}>{h.hook}</p>
                {explored > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <Progress value={explored / Math.max(1, total)} label={`${h.title}: ${explored} of ${total} ideas explored`} />
                  </div>
                )}
                <TopicTags topics={h.topics} />
              </button>
            ))}
          </div>
        ) : (
          <p className="glass glass-strong j-note small">No rabbit holes are available right now.</p>
        )}
      </Section>

      {/* Skill Arcade */}
      <Section title="Skill Arcade" action={<button type="button" className="j-see-all" onClick={() => navigate('/skills')}>All skills</button>}>
        {skills.length ? (
          <div className="list">
            {skills.map(({ k, p, mine }) => {
              const lp = p.levels.find((l) => l.level === p.currentLevel);
              return (
                <button key={k.id} type="button" className="list-row j-skill-row" onClick={() => navigate(`/skill/${k.id}`)}>
                  <span className="grow">
                    <span className="row" style={{ gap: 8 }}>
                      <span className="lr-title">{k.name}</span>
                      {mine && <span className="tag accent">Developing</span>}
                    </span>
                    <span className="lr-sub" style={{ display: 'block' }}>
                      {p.allComplete ? 'All levels complete' : p.started && lp ? `Level ${lp.level} · ${levelSummary(lp)}` : k.tagline}
                    </span>
                    {p.started && lp && !p.allComplete && (
                      <span style={{ display: 'block', marginTop: 8 }}>
                        <Progress value={levelFraction(lp)} label={`${k.name} level ${lp.level} progress`} />
                      </span>
                    )}
                  </span>
                  <ChevronRight size={18} aria-hidden className="faint" />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="glass glass-strong j-note small">No skills are available right now.</p>
        )}
      </Section>

      {/* Perspective Switch */}
      <Section title="Perspective Switch" action={<button type="button" className="j-see-all" onClick={() => navigate('/perspectives')}>All questions</button>}>
        {PERSPECTIVES.length ? (
          <div className="card inverse j-perspective">
            <p className="small" style={{ margin: '0 0 6px', opacity: 0.8 }}>Say where you stand, look through other lenses, then see whether anything moved.</p>
            <div className="stack sm">
              {PERSPECTIVES.slice(0, 3).map((q: PerspectiveQuestion) => (
                <button key={q.id} type="button" className="j-pq-row" onClick={() => navigate(`/perspective/${q.id}`)}>
                  <span className="display t-sm grow">{q.question}</span>
                  <ArrowRight size={18} aria-hidden />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="glass glass-strong j-note small">No questions are available right now.</p>
        )}
      </Section>

      {/* Two-person quests */}
      <Section title="Two-person quests" action={<button type="button" className="j-see-all" onClick={() => navigate('/quests')}>All quests</button>}>
        <p className="glass glass-strong j-note small">Answer the same prompts as one other person and compare. You swap codes through any messaging app — there’s no account or server.</p>
        {questList.length ? (
          <div className="list j-wrap">
            {questList.slice(0, 3).map((q) => (
              <button key={q.id} type="button" className="list-row" onClick={() => navigate(`/quest/${q.id}`)}>
                <span className="lr-icon"><Users size={18} aria-hidden /></span>
                <span className="grow">
                  <span className="lr-title" style={{ display: 'block' }}>{q.title}</span>
                  <span className="lr-sub">{questStatus(q).text} · {relTime(q.updatedAt)}</span>
                </span>
                <ChevronRight size={18} aria-hidden className="faint" />
              </button>
            ))}
          </div>
        ) : QUEST_TEMPLATES.length ? (
          <div className="j-hscroll" role="list">
            {QUEST_TEMPLATES.slice(0, 4).map((t: QuestTemplate) => (
              <button key={t.id} role="listitem" type="button" className="card card-tap j-quest-tpl" onClick={() => navigate(`/quests?template=${t.id}`)}>
                <div className="label accent">Start a quest</div>
                <h3 className="display t-sm" style={{ margin: '6px 0' }}>{t.title}</h3>
                <p className="small muted j-clamp" style={{ margin: 0 }}>{t.intro}</p>
              </button>
            ))}
          </div>
        ) : (
          <Button icon={<Plus size={18} />} onClick={() => navigate('/quests')}>Start a quest</Button>
        )}
      </Section>

      {/* Collections */}
      <Section title="Collections" action={<button type="button" className="j-see-all" onClick={() => navigate('/collections')}>Manage</button>}>
        {colList.length ? (
          <div className="list j-wrap">
            {colList.slice(0, 5).map((c) => (
              <button key={c.id} type="button" className="list-row" onClick={() => navigate(`/collection/${c.id}`)}>
                <span className="lr-icon"><Library size={18} aria-hidden /></span>
                <span className="grow">
                  <span className="lr-title" style={{ display: 'block' }}>{c.name}</span>
                  <span className="lr-sub">{c.items.length ? `${c.items.length} item${c.items.length === 1 ? '' : 's'}` : 'Empty — save things here as you explore'}</span>
                </span>
                <ChevronRight size={18} aria-hidden className="faint" />
              </button>
            ))}
          </div>
        ) : (
          <Button icon={<Plus size={18} />} onClick={() => navigate('/collections')}>Create a collection</Button>
        )}
      </Section>

      <Section>
        <div className="list">
          <button type="button" className="list-row" onClick={() => navigate('/tickets')}>
            <span className="lr-icon"><Ticket size={18} aria-hidden /></span>
            <span className="grow">
              <span className="lr-title" style={{ display: 'block' }}>Return tickets</span>
              <span className="lr-sub">{openTickets ? `${openTickets} open` : 'Notes for picking up unfinished explorations'}</span>
            </span>
            <ChevronRight size={18} aria-hidden className="faint" />
          </button>
          <button type="button" className="list-row" onClick={() => navigate('/import')}>
            <span className="lr-icon"><Download size={18} aria-hidden /></span>
            <span className="grow">
              <span className="lr-title" style={{ display: 'block' }}>Import a share code</span>
              <span className="lr-sub">Experiences, quest invitations and replies someone sent you</span>
            </span>
            <ChevronRight size={18} aria-hidden className="faint" />
          </button>
        </div>
      </Section>
    </Screen>
  );
}
