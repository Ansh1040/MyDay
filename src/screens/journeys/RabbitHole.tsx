// Rabbit Hole: explore a branching graph of ideas. Progress (current node + visit order) lives in the store,
// so leaving and coming back resumes where you stopped.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookmarkPlus, Check, ChevronDown, ChevronRight, CornerDownRight, Lightbulb, Map as MapIcon,
  NotebookPen, Scale, Sparkles, Ticket,
} from 'lucide-react';
import type { PerspectiveQuestion, RabbitHole, RabbitNode, Ref } from '../../data/types';
import { useStore } from '../../store/store';
import { getRabbitHole, PERSPECTIVES, useExperience } from '../../data/catalog';
import { navigate, useRoute } from '../../lib/router';
import { Button, EmptyState, IconButton, Progress, Screen, Section, toast } from '../../components/ui';
import { AddToCollectionSheet, ExperienceCard, TopicTags } from '../../components/common';
import { ReturnTicketSheet } from '../../components/ReturnTicketSheet';
import { nowISO, uid } from '../../lib/id';
import '../../styles/journeys.css';

const SURPRISED = 'col-surprised';
const NO_PATH: string[] = [];
/** Holes whose leave-without-a-ticket toast was already shown this session (it's offered once, not on every exit). */
const leaveOffered = new Set<string>();

/** Nodes of a rabbit hole I've actually opened (from saved progress and visit records). */
export function exploredIds(hole: RabbitHole, visited: Record<string, string>, path: string[] | undefined): Set<string> {
  const ids = new Set(hole.nodes.map((n) => n.id));
  const out = new Set<string>();
  (path ?? []).forEach((n) => ids.has(n) && out.add(n));
  hole.nodes.forEach((n) => {
    if (visited[`rabbit:${hole.id}:${n.id}`]) out.add(n.id);
  });
  return out;
}

/** Ideas reachable from explored ones that I haven't opened yet. */
function frontier(hole: RabbitHole, explored: Set<string>) {
  const byId = new Map(hole.nodes.map((n) => [n.id, n]));
  const out: { from: RabbitNode; label: string; to: string }[] = [];
  const seen = new Set<string>();
  hole.nodes.forEach((n) => {
    if (!explored.has(n.id)) return;
    n.branches.forEach((b) => {
      if (!explored.has(b.to) && byId.has(b.to) && !seen.has(b.to)) {
        seen.add(b.to);
        out.push({ from: n, label: b.label, to: b.to });
      }
    });
  });
  return out;
}

/** The trail from the start to `current`: the node I came from this session, else the most recently visited parent. */
function trailTo(hole: RabbitHole, order: string[], current: string, cameFrom: Record<string, string>): string[] {
  const idx = new Map(order.map((id, i) => [id, i]));
  const chain = [current];
  const seen = new Set([current]);
  let cur = current;
  for (let guard = 0; guard < hole.nodes.length && cur !== hole.start; guard++) {
    let parent: string | undefined = cameFrom[cur] && !seen.has(cameFrom[cur]) ? cameFrom[cur] : undefined;
    if (!parent) {
      const ci = idx.get(cur) ?? Number.POSITIVE_INFINITY;
      let bestI = -1;
      hole.nodes.forEach((n) => {
        const ni = idx.get(n.id);
        if (seen.has(n.id) || ni === undefined || ni >= ci) return;
        if (n.branches.some((b) => b.to === cur) && ni > bestI) {
          bestI = ni;
          parent = n.id;
        }
      });
    }
    if (!parent) break;
    chain.unshift(parent);
    seen.add(parent);
    cur = parent;
  }
  return chain;
}

const paragraphs = (text: string) => text.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);

export function RabbitHoleScreen({ id }: { id: string }) {
  const hole = getRabbitHole(id);
  if (!hole) {
    return (
      <Screen title="Rabbit hole" backTo="/journeys">
        <EmptyState
          title="This rabbit hole doesn’t exist"
          body="It may have been renamed or the link is incomplete."
          action={<Button variant="primary" onClick={() => navigate('/journeys', { replace: true })}>Back to Journeys</Button>}
        />
      </Screen>
    );
  }
  return <Explorer hole={hole} />;
}

function Explorer({ hole }: { hole: RabbitHole }) {
  const route = useRoute();
  const progress = useStore((s) => s.rabbitProgress[hole.id]);
  const visited = useStore((s) => s.visited);
  const collections = useStore((s) => s.collections);
  const setRabbitProgress = useStore((s) => s.setRabbitProgress);
  const markVisited = useStore((s) => s.markVisited);
  const addToCollection = useStore((s) => s.addToCollection);
  const removeFromCollection = useStore((s) => s.removeFromCollection);

  const byId = useMemo(() => new Map(hole.nodes.map((n) => [n.id, n])), [hole]);
  const requested = route.query.get('node');
  const fallbackId = progress?.node && byId.has(progress.node) ? progress.node : hole.start;
  const badNode = !!requested && !byId.has(requested);
  const nodeId = requested && byId.has(requested) ? requested : fallbackId;
  const node = byId.get(nodeId) ?? hole.nodes[0];

  const [cameFrom, setCameFrom] = useState<Record<string, string>>({});
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const closeCollection = useCallback(() => setCollectionOpen(false), []);
  const closeTicket = useCallback(() => setTicketOpen(false), []);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const trailRef = useRef<HTMLElement>(null);
  const lastNodeId = useRef(nodeId);
  const ticketSavedThisVisit = useRef(false);

  // Record progress and the visit for every node I open.
  useEffect(() => {
    if (!node) return;
    setRabbitProgress(hole.id, node.id);
    markVisited(`rabbit:${hole.id}:${node.id}`);
  }, [hole.id, node, setRabbitProgress, markVisited]);

  // Move focus to the new idea's heading so screen readers announce it (only when the idea changes, not on mount).
  useEffect(() => {
    if (lastNodeId.current === nodeId) return;
    lastNodeId.current = nodeId;
    headingRef.current?.focus({ preventScroll: true });
  }, [nodeId]);

  const order = progress?.path ?? NO_PATH;
  const explored = useMemo(() => {
    const s = exploredIds(hole, visited, order);
    if (node) s.add(node.id);
    return s;
  }, [hole, visited, order, node]);
  const finished = explored.size >= hole.nodes.length;
  const trail = useMemo(() => trailTo(hole, order, nodeId, cameFrom), [hole, order, nodeId, cameFrom]);
  const pos = order.indexOf(nodeId);
  const prevId = pos > 0 ? order[pos - 1] : undefined;
  const nextId = pos >= 0 && pos < order.length - 1 ? order[pos + 1] : undefined;

  const go = useCallback(
    (to: string, from?: string) => {
      if (from) setCameFrom((m) => ({ ...m, [to]: from }));
      navigate(`/rabbit/${hole.id}?node=${encodeURIComponent(to)}`, { replace: true });
    },
    [hole.id],
  );

  // Keep latest values for the leave handler (it runs as the screen is going away).
  const latest = useRef({ nodeId, finished });
  latest.current = { nodeId, finished };

  // Offer a return ticket once per session if I leave with Back before the hole is finished (non-blocking toast).
  // Detected on unmount: the route left this hole and history went back (router depth didn't grow).
  useEffect(() => {
    const depthOf = () => (history.state as { depth?: number } | null)?.depth ?? 0;
    const depthAtMount = depthOf();
    return () => {
      const seg = (location.hash.replace(/^#/, '').split('?')[0] || '').split('/').filter(Boolean).map(decodeURIComponent);
      if (seg[0] === 'rabbit' && seg[1] === hole.id) return; // still here (e.g. a dev re-mount)
      if (depthOf() > depthAtMount) return; // moved forward, e.g. into a "Try it" experience
      const st = useStore.getState();
      const hasOpen = Object.values(st.tickets).some((t) => !t.resolvedAt && t.target.kind === 'rabbit' && t.target.id === hole.id);
      if (latest.current.finished || hasOpen || ticketSavedThisVisit.current || leaveOffered.has(hole.id)) return;
      leaveOffered.add(hole.id);
      const stopNode = hole.nodes.find((n) => n.id === latest.current.nodeId);
      toast('Leaving mid-journey? Save a return ticket to pick up here later.', {
        ms: 7000,
        action: {
          label: 'Save ticket',
          run: () => {
            const ex = exploredIds(hole, useStore.getState().visited, useStore.getState().rabbitProgress[hole.id]?.path);
            const nextLabels = (stopNode?.branches ?? []).filter((b) => !ex.has(b.to)).map((b) => b.label);
            useStore.getState().upsert('tickets', {
              id: uid('tk-'),
              target: { kind: 'rabbit', id: hole.id },
              nodeId: stopNode?.id,
              title: hole.title,
              stoppedAt: stopNode ? `At “${stopNode.title}”` : '',
              caught: '',
              next: nextLabels.length ? `Follow: ${nextLabels.slice(0, 2).join(' / ')}` : '',
              createdAt: nowISO(),
            });
            toast('Return ticket saved.', { action: { label: 'Edit', run: () => navigate('/tickets') } });
          },
        },
      });
    };
  }, [hole]);

  // Keyboard: ← / → move between visited ideas (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.closest('input,textarea,select,[contenteditable="true"]') || document.querySelector('.sheet'))) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowLeft' && prevId) go(prevId);
      if (e.key === 'ArrowRight' && nextId) go(nextId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prevId, nextId, go]);

  // Keep the current idea (the end of the breadcrumb trail) in view.
  useEffect(() => {
    const el = trailRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [nodeId, trail.length]);

  // Swipe left/right between visited ideas. Visible Previous/Next buttons exist below.
  const sw = useRef({ x: 0, y: 0, lock: '' as '' | 'h' | 'v', active: false });
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const target = e.target as HTMLElement;
    // Leave room for the edge-swipe back gesture and for typing/scrolling widgets.
    sw.current = { x: t.clientX, y: t.clientY, lock: '', active: t.clientX > 28 && !target.closest('input,textarea,.j-trail,.swipe-wrap') };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!sw.current.active || sw.current.lock) return;
    const dx = e.touches[0].clientX - sw.current.x;
    const dy = e.touches[0].clientY - sw.current.y;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) sw.current.lock = 'h';
    else if (Math.abs(dy) > 12) sw.current.lock = 'v';
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!sw.current.active || sw.current.lock !== 'h') return;
    const dx = e.changedTouches[0].clientX - sw.current.x;
    if (dx < -70 && nextId) go(nextId);
    else if (dx > 70 && prevId) go(prevId);
  };

  if (!node) {
    return (
      <Screen title={hole.title} backTo="/journeys">
        <EmptyState title="This rabbit hole is empty" body="It has no ideas to explore yet." />
      </Screen>
    );
  }

  const nodeRef: Ref = { kind: 'rabbitNode', id: `${hole.id}/${node.id}` };
  const surprisedCol = collections[SURPRISED];
  const inSurprised = !!surprisedCol?.items.some((r) => r.kind === nodeRef.kind && r.id === nodeRef.id);
  const savedSomewhere = Object.values(collections).some((c) => c.items.some((r) => r.kind === nodeRef.kind && r.id === nodeRef.id));
  const related: PerspectiveQuestion | undefined = PERSPECTIVES.find((p: PerspectiveQuestion) => p.topics.some((t) => hole.topics.includes(t)));
  const branches = node.branches.filter((b) => byId.has(b.to));
  const open = frontier(hole, explored);

  const toggleSurprised = () => {
    if (!surprisedCol) {
      setCollectionOpen(true);
      return;
    }
    if (inSurprised) {
      removeFromCollection(SURPRISED, nodeRef);
      toast(`Removed from “${surprisedCol.name}”`);
    } else {
      addToCollection(SURPRISED, nodeRef);
      toast(`Saved to “${surprisedCol.name}”`, { action: { label: 'Undo', run: () => removeFromCollection(SURPRISED, nodeRef) } });
    }
  };

  return (
    <Screen
      title={hole.title}
      backTo="/journeys"
      hideLargeTitle
      actions={
        <>
          <IconButton label="Jump to map of this rabbit hole" onClick={() => document.getElementById('rh-map')?.scrollIntoView({ block: 'start' })}>
            <MapIcon size={21} />
          </IconButton>
          <IconButton label={savedSomewhere ? 'Saved — manage collections' : 'Save discovery to a collection'} className={savedSomewhere ? 'accent' : ''} onClick={() => setCollectionOpen(true)}>
            <BookmarkPlus size={21} />
          </IconButton>
        </>
      }
    >
      {/* Breadcrumb trail of the path taken */}
      {trail.length > 1 && (
        <nav ref={trailRef} aria-label="Your path through this rabbit hole" className="glass j-trail">
          <ol>
            {trail.map((tid, i) => {
              const n = byId.get(tid);
              if (!n) return null;
              const isCurrent = tid === node.id;
              return (
                <li key={tid}>
                  {i > 0 && <ChevronRight size={14} aria-hidden className="faint" />}
                  {isCurrent ? (
                    <span aria-current="step" className="j-trail-current">{n.title}</span>
                  ) : (
                    <button type="button" onClick={() => go(tid)}>{i === 0 && tid === hole.start ? 'Start' : n.title}</button>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {badNode && (
        <div className="banner warn" role="status" style={{ marginBottom: 16 }}>
          That idea isn’t part of this rabbit hole, so you’re back at your last stop.
        </div>
      )}

      <div className="j-swipe" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <article key={node.id} className="j-node j-rise" aria-labelledby="rh-node-title">
          <header className="glass glass-strong j-panel j-node-head">
            <div className="label accent">{hole.title}</div>
            <h1 id="rh-node-title" ref={headingRef} tabIndex={-1} className="display t-xl j-node-title">
              {node.title}
            </h1>
            <p className="tiny j-node-meta" aria-live="polite">
              Explored {explored.size} of {hole.nodes.length} idea{hole.nodes.length === 1 ? '' : 's'}
            </p>

            {node.question && <p className="display t-md j-question">{node.question}</p>}
          </header>

          <div className="prose glass j-body">
            {paragraphs(node.body).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {node.surprise && (
            <aside className="glass j-surprise" aria-label="Unexpected">
              <div className="label accent row" style={{ gap: 6 }}>
                <Sparkles size={14} aria-hidden /> Unexpected
              </div>
              <p>{node.surprise}</p>
              <Button size="sm" variant={inSurprised ? 'soft' : 'secondary'} aria-pressed={inSurprised} icon={inSurprised ? <Check size={16} /> : <BookmarkPlus size={16} />} onClick={toggleSurprised}>
                {inSurprised ? `In “${surprisedCol?.name}”` : surprisedCol ? `Save to “${surprisedCol.name}”` : 'Save to a collection'}
              </Button>
            </aside>
          )}

          {/* Primary actions, always visible */}
          <div className="j-actions" role="group" aria-label="Actions for this idea">
            <Button size="sm" icon={<BookmarkPlus size={16} />} onClick={() => setCollectionOpen(true)}>Save discovery</Button>
            <Button size="sm" icon={<NotebookPen size={16} />} onClick={() => navigate(`/note/new?kind=text&link=${encodeURIComponent(`rabbitNode:${hole.id}/${node.id}`)}`)}>
              Capture note
            </Button>
            <Button size="sm" icon={<Ticket size={16} />} onClick={() => setTicketOpen(true)}>Return ticket</Button>
          </div>

          {!!node.perspectives?.length && (
            <Section title="Perspectives">
              <div className="glass j-lenses">
                {node.perspectives.map((p, i) => (
                  <Lens key={i} name={p.lens} take={p.take} />
                ))}
              </div>
              {related && (
                <button type="button" className="glass j-inline-link" onClick={() => navigate(`/perspective/${related.id}`)}>
                  <Scale size={16} aria-hidden />
                  <span className="grow">Test your own view in Perspective Switch: <em>{related.question}</em></span>
                  <ChevronRight size={16} aria-hidden />
                </button>
              )}
            </Section>
          )}

          {!!node.experiences?.length && (
            <Section title="Try it">
              <div className="stack">
                {node.experiences.map((eid) => (
                  <TryIt key={eid} id={eid} />
                ))}
              </div>
            </Section>
          )}

          <Section title={branches.length ? 'Follow a thread' : 'End of this thread'}>
            {branches.length ? (
              <div className="stack">
                {branches.map((b) => {
                  const seen = explored.has(b.to);
                  return (
                    <button key={b.to} type="button" className="glass j-branch card-tap" onClick={() => go(b.to, node.id)}>
                      <span className="grow">
                        <span className="label accent row" style={{ gap: 6 }}>
                          <CornerDownRight size={14} aria-hidden /> Follow this thread
                        </span>
                        <span className="display t-md j-branch-label">{b.label}</span>
                        {seen && <span className="tag" style={{ marginTop: 8 }}><Check size={12} aria-hidden /> Explored</span>}
                      </span>
                      <ArrowRight size={22} aria-hidden className="j-branch-arrow" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <ThreadEnd hole={hole} finished={finished} open={open} onGo={(to, from) => go(to, from)} />
            )}
          </Section>
        </article>
      </div>

      {/* Move between visited ideas (same as swiping) */}
      <div className="glass j-panel j-prevnext-panel">
        <nav className="j-prevnext" aria-label="Visited ideas">
          <Button size="sm" icon={<ArrowLeft size={18} />} disabled={!prevId} onClick={() => prevId && go(prevId)} aria-label={prevId ? `Previous visited idea: ${byId.get(prevId)?.title}` : 'No previous visited idea'}>
            Previous
          </Button>
          <span className="tiny muted">{pos >= 0 ? `${pos + 1} / ${order.length} visited` : ''}</span>
          <Button size="sm" disabled={!nextId} onClick={() => nextId && go(nextId)} aria-label={nextId ? `Next visited idea: ${byId.get(nextId)?.title}` : 'No next visited idea'}>
            Next <ArrowRight size={18} aria-hidden />
          </Button>
        </nav>
        <p className="tiny muted j-prevnext-tip">Tip: swipe sideways to move between ideas you’ve visited.</p>
      </div>

      <MiniMap hole={hole} explored={explored} current={node.id} onGo={(to) => go(to)} />

      <AddToCollectionSheet open={collectionOpen} onClose={closeCollection} target={nodeRef} />
      <ReturnTicketSheet
        open={ticketOpen}
        onClose={closeTicket}
        target={{ kind: 'rabbit', id: hole.id }}
        nodeId={node.id}
        title={hole.title}
        defaultStoppedAt={`At “${node.title}”`}
        onSaved={() => (ticketSavedThisVisit.current = true)}
      />
    </Screen>
  );
}

function Lens({ name, take }: { name: string; take: string }) {
  const [open, setOpen] = useState(false);
  const pid = useId();
  return (
    <div className={'j-lens' + (open ? ' open' : '')}>
      <button type="button" aria-expanded={open} aria-controls={pid} onClick={() => setOpen((o) => !o)}>
        <Lightbulb size={16} aria-hidden />
        <span className="grow">{name}</span>
        <ChevronDown size={18} aria-hidden className="j-chev" />
      </button>
      <div id={pid} hidden={!open} className="j-lens-take">
        {take}
      </div>
    </div>
  );
}

function TryIt({ id }: { id: string }) {
  const e = useExperience(id);
  if (!e) return null;
  return <ExperienceCard e={e} variant="compact" />;
}

function ThreadEnd({ hole, finished, open, onGo }: { hole: RabbitHole; finished: boolean; open: ReturnType<typeof frontier>; onGo: (to: string, from: string) => void }) {
  if (finished || !open.length) {
    return (
      <div className="card tinted">
        <h3 className="display t-md" style={{ marginBottom: 6 }}>{finished ? 'You’ve explored every idea here.' : 'This thread ends here.'}</h3>
        <p className="muted" style={{ margin: '0 0 14px' }}>
          {finished ? 'Worth writing down what stayed with you while it’s fresh.' : 'Every thread you opened has been followed.'}
        </p>
        <div className="row wrap">
          <Button size="sm" variant="primary" onClick={() => navigate(`/entry/new?kind=reflection&link=${encodeURIComponent(`rabbit:${hole.id}`)}&title=${encodeURIComponent(hole.title)}`)}>
            Write a reflection
          </Button>
          <Button size="sm" onClick={() => navigate('/journeys')}>Back to Journeys</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="card stack sm">
      <p className="muted" style={{ margin: 0 }}>This idea doesn’t branch further. Threads you saw but haven’t followed yet:</p>
      <div className="list">
        {open.map((f) => (
          <button key={f.to} type="button" className="list-row" onClick={() => onGo(f.to, f.from.id)}>
            <span className="lr-icon"><CornerDownRight size={18} aria-hidden /></span>
            <span className="grow">
              <span className="lr-title" style={{ display: 'block' }}>{f.label}</span>
              <span className="lr-sub">From “{f.from.title}”</span>
            </span>
            <ChevronRight size={18} aria-hidden className="faint" />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Small SVG overview: explored, reachable-next and undiscovered ideas, plus an accessible list. */
function MiniMap({ hole, explored, current, onGo }: { hole: RabbitHole; explored: Set<string>; current: string; onGo: (to: string) => void }) {
  const layout = useMemo(() => {
    const depth = new Map<string, number>();
    const byId = new Map(hole.nodes.map((n) => [n.id, n]));
    const queue = [hole.start];
    depth.set(hole.start, 0);
    while (queue.length) {
      const id = queue.shift()!;
      byId.get(id)?.branches.forEach((b) => {
        if (byId.has(b.to) && !depth.has(b.to)) {
          depth.set(b.to, depth.get(id)! + 1);
          queue.push(b.to);
        }
      });
    }
    const maxD = Math.max(0, ...depth.values());
    hole.nodes.forEach((n) => !depth.has(n.id) && depth.set(n.id, maxD + 1));
    const rows: string[][] = [];
    hole.nodes.forEach((n) => {
      const d = depth.get(n.id)!;
      (rows[d] ??= []).push(n.id);
    });
    const W = 320;
    const RH = 54;
    const pos = new Map<string, { x: number; y: number }>();
    rows.forEach((row, r) => {
      (row ?? []).forEach((id, i) => pos.set(id, { x: ((i + 1) * W) / (row.length + 1), y: 24 + r * RH }));
    });
    const edges: { a: { x: number; y: number }; b: { x: number; y: number }; key: string }[] = [];
    hole.nodes.forEach((n) =>
      n.branches.forEach((b) => {
        const pa = pos.get(n.id);
        const pb = pos.get(b.to);
        if (pa && pb) edges.push({ a: pa, b: pb, key: `${n.id}-${b.to}` });
      }),
    );
    return { pos, edges, W, H: 24 * 2 + (rows.length - 1) * RH };
  }, [hole]);

  const reachable = new Set(frontier(hole, explored).map((f) => f.to));
  const exploredNodes = hole.nodes.filter((n) => explored.has(n.id));
  const remaining = hole.nodes.length - exploredNodes.length;

  return (
    <Section title="Map of this rabbit hole" style={{ scrollMarginTop: 72 }}>
      <div id="rh-map" className="card j-map">
        <svg viewBox={`0 0 ${layout.W} ${layout.H}`} role="img" aria-label={`Map: ${exploredNodes.length} of ${hole.nodes.length} ideas explored.`}>
          {layout.edges.map((e) => (
            <line key={e.key} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} className="j-map-edge" />
          ))}
          {hole.nodes.map((n) => {
            const p = layout.pos.get(n.id)!;
            const state = n.id === current ? 'current' : explored.has(n.id) ? 'explored' : reachable.has(n.id) ? 'next' : 'hidden';
            return (
              <g key={n.id} className={`j-map-node ${state}`} onClick={state === 'explored' ? () => onGo(n.id) : undefined}>
                {state === 'current' && <circle cx={p.x} cy={p.y} r={14} className="ring" />}
                <circle cx={p.x} cy={p.y} r={state === 'hidden' ? 6 : 9} />
                {state === 'explored' && <title>{n.title}</title>}
              </g>
            );
          })}
        </svg>
        <div className="j-map-legend tiny muted" aria-hidden>
          <span><i className="dot explored" /> Explored</span>
          <span><i className="dot next" /> Thread you’ve seen</span>
          <span><i className="dot hidden" /> Not found yet</span>
        </div>
        <Progress value={exploredNodes.length / Math.max(1, hole.nodes.length)} label={`${exploredNodes.length} of ${hole.nodes.length} ideas explored`} />
        <p className="small muted" style={{ margin: '10px 0 0' }}>
          {exploredNodes.length} of {hole.nodes.length} ideas explored{remaining ? ` · ${remaining} still to find` : ' · all found'}.
        </p>
        <div className="j-map-tags">
          <TopicTags topics={hole.topics} max={4} />
        </div>
      </div>
      <div className="list" style={{ marginTop: 12 }}>
        {exploredNodes.map((n) => (
          <button key={n.id} type="button" className="list-row" aria-current={n.id === current ? 'location' : undefined} onClick={() => onGo(n.id)}>
            <span className="lr-icon">{n.id === current ? <MapIcon size={18} aria-hidden /> : <Check size={18} aria-hidden />}</span>
            <span className="grow">
              <span className="lr-title" style={{ display: 'block' }}>{n.title}</span>
              {n.id === current && <span className="lr-sub">You are here</span>}
            </span>
            <ChevronRight size={18} aria-hidden className="faint" />
          </button>
        ))}
      </div>
    </Section>
  );
}

