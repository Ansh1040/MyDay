// Curiosity Map: an interactive graph built only from the user's own data.
// Nodes = topics, experiences done/saved, rabbit holes explored, skills in progress, notes, entries, collections, quests.
// Edges = shared topics, explicit links, rabbit hole → experience, skill → experience, collection membership, remixes.
// Layout = a small force simulation written here (no libraries); reduced motion skips the settle animation.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ZoomIn, ZoomOut, Maximize2, X, LocateFixed, ChevronRight, Network, List as ListIcon, Compass } from 'lucide-react';
import type { RabbitHole, Ref } from '../../data/types';
import { useStore } from '../../store/store';
import { navigate } from '../../lib/router';
import { resolveRef } from '../../lib/refs';
import { prefersReducedMotion } from '../../lib/theme';
import { getExperience, getRabbitHole, getSkill, RABBIT_HOLES, SKILLS, topicLabel } from '../../data/catalog';
import { Screen, Button, IconButton, Chip, Segmented, EmptyState } from '../../components/ui';
import '../../styles/you.css';

// ---------------------------------------------------------------- model
export type NodeType = 'topic' | 'experience' | 'twist' | 'rabbit' | 'skill' | 'note' | 'entry' | 'collection' | 'quest';
export const NODE_TYPES: { type: NodeType; label: string; plural: string; shape: string }[] = [
  { type: 'topic', label: 'Topic', plural: 'Topics', shape: 'ring' },
  { type: 'experience', label: 'Experience', plural: 'Experiences', shape: 'circle' },
  { type: 'twist', label: 'Plot Twist', plural: 'Plot Twists', shape: 'cross' },
  { type: 'rabbit', label: 'Rabbit hole', plural: 'Rabbit holes', shape: 'diamond' },
  { type: 'skill', label: 'Skill', plural: 'Skills', shape: 'square' },
  { type: 'note', label: 'Field note', plural: 'Field notes', shape: 'triangle' },
  { type: 'entry', label: 'Version History entry', plural: 'Entries', shape: 'hexagon' },
  { type: 'collection', label: 'Collection', plural: 'Collections', shape: 'bar' },
  { type: 'quest', label: 'Two-person quest', plural: 'Quests', shape: 'star' },
];
const TYPE_META = Object.fromEntries(NODE_TYPES.map((t) => [t.type, t])) as Record<NodeType, (typeof NODE_TYPES)[number]>;

type EdgeWhy = 'topic' | 'link' | 'rabbit' | 'skill' | 'collection' | 'remix';
const WHY_LABEL: Record<EdgeWhy, string> = {
  topic: 'shared topic',
  link: 'linked by you',
  rabbit: 'from this rabbit hole',
  skill: 'part of this skill',
  collection: 'collection',
  remix: 'remix',
};

export interface MapNode { id: string; type: NodeType; ref: Ref; title: string; at: string; private: boolean; topics: string[]; out: Ref[] }
export interface MapEdge { a: string; b: string; why: EdgeWhy }
export interface MapGraph { nodes: MapNode[]; edges: MapEdge[]; totalItems: number; shownItems: number; topicCount: number }

/** Node id + type for a ref, or null when that kind doesn't appear on the map. */
function nodeKey(r: Ref): { id: string; type: NodeType; ref: Ref } | null {
  switch (r.kind) {
    case 'experience': return { id: `experience:${r.id}`, type: 'experience', ref: r };
    case 'twist': return { id: `twist:${r.id}`, type: 'twist', ref: r };
    case 'rabbit': return { id: `rabbit:${r.id}`, type: 'rabbit', ref: r };
    case 'rabbitNode': {
      const rid = r.id.split('/')[0];
      return { id: `rabbit:${rid}`, type: 'rabbit', ref: { kind: 'rabbit', id: rid } };
    }
    case 'skill': return { id: `skill:${r.id}`, type: 'skill', ref: r };
    case 'note': return { id: `note:${r.id}`, type: 'note', ref: r };
    case 'entry': return { id: `entry:${r.id}`, type: 'entry', ref: r };
    case 'collection': return { id: `collection:${r.id}`, type: 'collection', ref: r };
    case 'quest': return { id: `quest:${r.id}`, type: 'quest', ref: r };
    case 'topic': return { id: `topic:${r.id}`, type: 'topic', ref: r };
    default: return null;
  }
}

function topicsForRef(r: Ref): string[] {
  const s = useStore.getState();
  switch (r.kind) {
    case 'experience': return getExperience(r.id)?.topics ?? [];
    case 'twist': return s.twists[r.id]?.topics ?? [];
    case 'rabbit': return getRabbitHole(r.id)?.topics ?? [];
    case 'skill': return getSkill(r.id)?.topics ?? [];
    case 'note': return s.notes[r.id]?.topics ?? [];
    case 'entry': return s.entries[r.id]?.topics ?? [];
    default: return [];
  }
}

type GraphInput = Pick<
  ReturnType<typeof useStore.getState>,
  'completions' | 'saved' | 'twists' | 'rabbitProgress' | 'visited' | 'notes' | 'entries' | 'collections' | 'quests' | 'experiences'
> & { prefSkills: string[] };

export function buildGraph(s: GraphInput, cap: number): MapGraph {
  const cands = new Map<string, MapNode>();
  const add = (ref: Ref, title: string, at: string, topics: string[], out: Ref[] = [], priv = false) => {
    const k = nodeKey(ref);
    if (!k || k.type === 'topic') return;
    const prev = cands.get(k.id);
    if (prev) {
      if (at > prev.at) prev.at = at;
      prev.topics = [...new Set([...prev.topics, ...topics])];
      prev.out = [...prev.out, ...out];
      return;
    }
    cands.set(k.id, { id: k.id, type: k.type, ref: k.ref, title, at, private: priv, topics: [...new Set(topics)], out: [...out] });
  };

  // Experiences completed
  Object.values(s.completions).forEach((c) => {
    if (c.ref.kind === 'experience') {
      const e = getExperience(c.ref.id);
      if (e) add(c.ref, e.title, c.at, e.topics, e.remixOf ? [e.remixOf] : []);
    }
  });
  // Saved experiences
  s.saved.forEach((id) => {
    const e = getExperience(id);
    if (e) add({ kind: 'experience', id }, e.title, s.visited[`exp:${id}`] ?? '', e.topics, e.remixOf ? [e.remixOf] : []);
  });
  // Plot twists you did
  Object.values(s.twists).forEach((t) => {
    if (t.status === 'done') add({ kind: 'twist', id: t.id }, t.text, t.doneAt ?? t.createdAt, t.topics);
  });
  // Rabbit holes explored
  const rabbitAt = new Map<string, string>();
  Object.entries(s.visited).forEach(([key, at]) => {
    if (!key.startsWith('rabbit:')) return;
    const rid = key.split(':')[1];
    if (!rabbitAt.has(rid) || at > (rabbitAt.get(rid) as string)) rabbitAt.set(rid, at);
  });
  Object.keys(s.rabbitProgress).forEach((rid) => !rabbitAt.has(rid) && rabbitAt.set(rid, ''));
  rabbitAt.forEach((at, rid) => {
    const r = getRabbitHole(rid);
    if (r) add({ kind: 'rabbit', id: rid }, r.title, at, r.topics);
  });
  // Skills in progress (something completed, or chosen as a skill to develop)
  SKILLS.forEach((k) => {
    const ids = new Set(k.levels.flatMap((l) => [...l.practice, l.project]));
    const done = Object.values(s.completions).filter((c) => c.ref.kind === 'experience' && ids.has(c.ref.id));
    if (!done.length && !s.prefSkills.includes(k.id)) return;
    const at = done.reduce((m, c) => (c.at > m ? c.at : m), '');
    add({ kind: 'skill', id: k.id }, k.name, at, k.topics);
  });
  Object.values(s.notes).forEach((n) => add({ kind: 'note', id: n.id }, n.title || n.text.slice(0, 60) || 'Untitled note', n.updatedAt, n.topics, n.links, n.private));
  Object.values(s.entries).forEach((e) => add({ kind: 'entry', id: e.id }, e.title || e.text.slice(0, 60) || 'Untitled entry', e.updatedAt, e.topics, e.links, e.private));
  Object.values(s.collections).forEach((c) => {
    if (c.items.length) add({ kind: 'collection', id: c.id }, c.name, c.createdAt, [], c.items);
  });
  Object.values(s.quests).forEach((q) => add({ kind: 'quest', id: q.id }, q.title, q.updatedAt, []));

  // Things you linked to (that aren't already on the map) join it too.
  [...cands.values()].forEach((n) => {
    n.out.forEach((r) => {
      const k = nodeKey(r);
      if (!k || k.type === 'topic' || cands.has(k.id)) return;
      const res = resolveRef(k.ref);
      if (res.missing) return;
      cands.set(k.id, { id: k.id, type: k.type, ref: k.ref, title: res.title, at: n.at, private: !!res.private, topics: topicsForRef(k.ref), out: [] });
    });
  });

  const all = [...cands.values()].sort((a, b) => b.at.localeCompare(a.at));
  const kept = all.slice(0, cap);
  const keptMap = new Map(kept.map((n) => [n.id, n]));

  // Topic hubs: topics shared by kept nodes (or linked explicitly), most-used first.
  const topicUse = new Map<string, number>();
  kept.forEach((n) => {
    const ts = new Set([...n.topics, ...n.out.filter((r) => r.kind === 'topic').map((r) => r.id)]);
    ts.forEach((t) => topicUse.set(t, (topicUse.get(t) ?? 0) + 1));
  });
  const topics = [...topicUse.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([t]) => t);
  const topicNodes: MapNode[] = topics.map((t) => ({ id: `topic:${t}`, type: 'topic', ref: { kind: 'topic', id: t }, title: topicLabel(t), at: '', private: false, topics: [], out: [] }));
  topicNodes.forEach((n) => keptMap.set(n.id, n));

  const edges: MapEdge[] = [];
  const seen = new Set<string>();
  const edge = (a: string, b: string, why: EdgeWhy) => {
    if (a === b || !keptMap.has(a) || !keptMap.has(b)) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ a, b, why });
  };
  kept.forEach((n) => {
    n.out.forEach((r) => {
      const k = nodeKey(r);
      if (k) edge(n.id, k.id, n.type === 'collection' ? 'collection' : n.ref.kind === 'experience' && r.kind === 'experience' ? 'remix' : 'link');
    });
    if (n.type === 'rabbit') {
      getRabbitHole(n.ref.id)?.nodes.forEach((rn) => rn.experiences?.forEach((eid) => edge(n.id, `experience:${eid}`, 'rabbit')));
    }
    if (n.type === 'skill') {
      getSkill(n.ref.id)?.levels.forEach((l) => [...l.practice, l.project].forEach((eid) => edge(n.id, `experience:${eid}`, 'skill')));
    }
    if (n.ref.kind === 'experience') {
      const e = getExperience(n.ref.id);
      if (e?.skillId) edge(`skill:${e.skillId}`, n.id, 'skill');
    }
  });
  kept.forEach((n) => n.topics.forEach((t) => edge(n.id, `topic:${t}`, 'topic')));

  return { nodes: [...kept, ...topicNodes], edges, totalItems: all.length, shownItems: kept.length, topicCount: topicNodes.length };
}

export function useCuriosityGraph(cap = 80): MapGraph {
  const completions = useStore((s) => s.completions);
  const saved = useStore((s) => s.saved);
  const twists = useStore((s) => s.twists);
  const rabbitProgress = useStore((s) => s.rabbitProgress);
  const visited = useStore((s) => s.visited);
  const notes = useStore((s) => s.notes);
  const entries = useStore((s) => s.entries);
  const collections = useStore((s) => s.collections);
  const quests = useStore((s) => s.quests);
  const experiences = useStore((s) => s.experiences);
  const prefSkills = useStore((s) => s.prefs.skills);
  return useMemo(
    () => buildGraph({ completions, saved, twists, rabbitProgress, visited, notes, entries, collections, quests, experiences, prefSkills }, cap),
    [completions, saved, twists, rabbitProgress, visited, notes, entries, collections, quests, experiences, prefSkills, cap],
  );
}

// ---------------------------------------------------------------- force simulation (d3-style, tiny)
export class ForceSim {
  ids: string[];
  x: Float64Array;
  y: Float64Array;
  vx: Float64Array;
  vy: Float64Array;
  links: { s: number; t: number; dist: number; strength: number; bias: number }[];
  alpha = 1;
  private alphaDecay = 1 - Math.pow(0.001, 1 / 300);
  private index = new Map<string, number>();

  constructor(nodes: { id: string }[], edges: MapEdge[]) {
    this.ids = nodes.map((n) => n.id).sort();
    const n = this.ids.length;
    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    this.vx = new Float64Array(n);
    this.vy = new Float64Array(n);
    // Deterministic phyllotaxis start so the same data always gives the same map.
    const golden = Math.PI * (3 - Math.sqrt(5));
    this.ids.forEach((id, i) => {
      this.index.set(id, i);
      const r = 14 * Math.sqrt(0.5 + i);
      this.x[i] = r * Math.cos(i * golden);
      this.y[i] = r * Math.sin(i * golden);
    });
    const deg = new Array(n).fill(0);
    const raw = edges
      .map((e) => ({ s: this.index.get(e.a), t: this.index.get(e.b), why: e.why }))
      .filter((e): e is { s: number; t: number; why: EdgeWhy } => e.s !== undefined && e.t !== undefined);
    raw.forEach((e) => {
      deg[e.s]++;
      deg[e.t]++;
    });
    this.links = raw.map((e) => ({
      s: e.s,
      t: e.t,
      dist: e.why === 'topic' ? 55 : 40,
      strength: 1 / Math.max(1, Math.min(deg[e.s], deg[e.t])),
      bias: deg[e.s] / (deg[e.s] + deg[e.t]),
    }));
  }

  get done() {
    return this.alpha < 0.002;
  }

  tick() {
    const { x, y, vx, vy } = this;
    const n = this.ids.length;
    const a = this.alpha;
    // Links (springs)
    for (const l of this.links) {
      let dx = x[l.t] + vx[l.t] - x[l.s] - vx[l.s];
      let dy = y[l.t] + vy[l.t] - y[l.s] - vy[l.s];
      const d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
      const k = ((d - l.dist) / d) * a * l.strength;
      dx *= k;
      dy *= k;
      vx[l.t] -= dx * l.bias;
      vy[l.t] -= dy * l.bias;
      vx[l.s] += dx * (1 - l.bias);
      vy[l.s] += dy * (1 - l.bias);
    }
    // Many-body repulsion (n is capped, so O(n²) is fine)
    const strength = -90;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = x[j] - x[i];
        const dy = y[j] - y[i];
        let d2 = dx * dx + dy * dy;
        if (d2 > 250000) continue;
        if (d2 < 36) d2 = 36;
        const w = (strength * a) / d2;
        vx[i] += dx * w;
        vy[i] += dy * w;
        vx[j] -= dx * w;
        vy[j] -= dy * w;
      }
    }
    // Gentle gravity towards the centre
    for (let i = 0; i < n; i++) {
      vx[i] -= x[i] * 0.08 * a;
      vy[i] -= y[i] * 0.08 * a;
      x[i] += vx[i] *= 0.6;
      y[i] += vy[i] *= 0.6;
    }
    this.alpha += (0 - this.alpha) * this.alphaDecay;
  }

  pos(id: string) {
    const i = this.index.get(id);
    return i === undefined ? { x: 0, y: 0 } : { x: this.x[i], y: this.y[i] };
  }
}

// ---------------------------------------------------------------- shapes (meaning by shape, not only colour)
function starPoints(r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r * 1.25 : r * 0.55;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(rr * Math.cos(ang)).toFixed(2)},${(rr * Math.sin(ang)).toFixed(2)}`);
  }
  return pts.join(' ');
}
/** A plus/cross shape, so plot twists differ from the other kinds by shape, not only colour. */
function crossPoints(r: number) {
  const a = r * 1.2, b = r * 0.42;
  const pts = [[-b, -a], [b, -a], [b, -b], [a, -b], [a, b], [b, b], [b, a], [-b, a], [-b, b], [-a, b], [-a, -b], [-b, -b]];
  return pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}
function polyPoints(sides: number, r: number, rot = -Math.PI / 2) {
  return Array.from({ length: sides }, (_, i) => {
    const ang = rot + (i * 2 * Math.PI) / sides;
    return `${(r * Math.cos(ang)).toFixed(2)},${(r * Math.sin(ang)).toFixed(2)}`;
  }).join(' ');
}
export function NodeShape({ type, r }: { type: NodeType; r: number }) {
  const cls = `cm-shape s-${type}`;
  switch (type) {
    case 'topic': return <circle className={cls} r={r} />;
    case 'experience': return <circle className={cls} r={r} />;
    case 'rabbit': return <polygon className={cls} points={polyPoints(4, r * 1.3)} />;
    case 'skill': return <rect className={cls} x={-r * 0.95} y={-r * 0.95} width={r * 1.9} height={r * 1.9} rx={1.5} />;
    case 'note': return <polygon className={cls} points={polyPoints(3, r * 1.3)} />;
    case 'entry': return <polygon className={cls} points={polyPoints(6, r * 1.1, 0)} />;
    case 'collection': return <rect className={cls} x={-r * 1.4} y={-r * 0.7} width={r * 2.8} height={r * 1.4} rx={r * 0.5} />;
    case 'quest': return <polygon className={cls} points={starPoints(r)} />;
    case 'twist': return <polygon className={cls} points={crossPoints(r)} />;
  }
}
export function Glyph({ type, size = 16 }: { type: NodeType; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-10 -10 20 20" aria-hidden className="cm-glyph" style={{ display: 'inline-block', flexShrink: 0 }}>
      <NodeShape type={type} r={5.5} />
    </svg>
  );
}

// ---------------------------------------------------------------- preview for the You tab
export function CuriosityPreview() {
  const graph = useCuriosityGraph(36);
  const layout = useMemo(() => {
    const sim = new ForceSim(graph.nodes, graph.edges);
    for (let i = 0; i < 300; i++) sim.tick();
    const pts = graph.nodes.map((n) => ({ n, ...sim.pos(n.id) }));
    if (!pts.length) return null;
    const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
    const W = 320, H = 150, pad = 14;
    const k = Math.min((W - pad * 2) / Math.max(1, maxX - minX), (H - pad * 2) / Math.max(1, maxY - minY), 1.6);
    const ox = W / 2 - ((minX + maxX) / 2) * k, oy = H / 2 - ((minY + maxY) / 2) * k;
    const P = new Map(pts.map((p) => [p.n.id, { x: p.x * k + ox, y: p.y * k + oy }]));
    return { P, W, H };
  }, [graph]);
  const things = graph.shownItems;
  return (
    <span className="cm-preview">
      {layout && things > 0 ? (
        <svg viewBox={`0 0 ${layout.W} ${layout.H}`} className="cm-mini" aria-hidden preserveAspectRatio="xMidYMid meet">
          {graph.edges.map((e) => {
            const a = layout.P.get(e.a)!, b = layout.P.get(e.b)!;
            return <line key={e.a + e.b} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={'cm-edge w-' + e.why} />;
          })}
          {graph.nodes.map((n) => {
            const p = layout.P.get(n.id)!;
            return (
              <g key={n.id} transform={`translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`}>
                <NodeShape type={n.type} r={n.type === 'topic' ? 4.5 : 3.6} />
              </g>
            );
          })}
        </svg>
      ) : null}
      <span className="small muted" style={{ display: 'block', marginTop: 10 }}>
        {things === 0
          ? 'Empty for now. It fills in as you explore, finish experiences and write notes.'
          : `${things} ${things === 1 ? 'thing' : 'things'} across ${graph.topicCount} ${graph.topicCount === 1 ? 'topic' : 'topics'}, with ${graph.edges.length} ${graph.edges.length === 1 ? 'connection' : 'connections'}.`}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------- screen
interface View { k: number; tx: number; ty: number }
const K_MIN = 0.3;
const K_MAX = 4;
const clampK = (k: number) => Math.max(K_MIN, Math.min(K_MAX, k));
const MAP_CAP = 60;

export function CuriosityMapScreen() {
  const graph = useCuriosityGraph(MAP_CAP);
  const blur = useStore((s) => s.settings.privacy.blurPrivate);
  const interests = useStore((s) => s.prefs.interests);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [hidden, setHidden] = useState<Set<NodeType>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(null);

  const presentTypes = useMemo(() => NODE_TYPES.filter((t) => graph.nodes.some((n) => n.type === t.type)), [graph]);
  const visibleNodes = useMemo(() => graph.nodes.filter((n) => !hidden.has(n.type)), [graph, hidden]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
  const visibleEdges = useMemo(() => graph.edges.filter((e) => visibleIds.has(e.a) && visibleIds.has(e.b)), [graph, visibleIds]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const neighbours = useMemo(() => {
    const m = new Map<string, { id: string; why: EdgeWhy }[]>();
    visibleEdges.forEach((e) => {
      if (!m.has(e.a)) m.set(e.a, []);
      if (!m.has(e.b)) m.set(e.b, []);
      m.get(e.a)!.push({ id: e.b, why: e.why });
      m.get(e.b)!.push({ id: e.a, why: e.why });
    });
    return m;
  }, [visibleEdges]);
  const titleOf = (n: MapNode) => (n.private && blur ? `Private ${TYPE_META[n.type].label.toLowerCase()}` : n.title);
  const urlOf = (n: MapNode) => resolveRef(n.ref).url;

  useEffect(() => {
    if (selected && !visibleIds.has(selected)) setSelected(null);
  }, [selected, visibleIds]);

  const realItems = graph.shownItems;
  const firstRabbit = useMemo(
    () => (RABBIT_HOLES as RabbitHole[]).find((r) => r.topics.some((t) => interests.includes(t))) ?? (RABBIT_HOLES as RabbitHole[])[0],
    [interests],
  );

  const toggleType = (t: NodeType) =>
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });

  return (
    <Screen
      title="Curiosity Map"
      eyebrow="You"
      backTo="/you"
      subtitle="Everything you’ve explored, made and written — joined by shared topics and the links you’ve made."
    >
      {realItems < 2 ? (
        <>
          <EmptyState
            icon={<Network size={24} />}
            title={realItems === 0 ? 'Your map is empty — for now' : 'Your map has just begun'}
            body="The map grows as you go: every rabbit hole you explore, experience you finish or save, note, entry, collection and skill becomes a point, and shared topics and your own links join them up. Nothing is added that you didn’t do."
            action={
              firstRabbit ? (
                <Button variant="primary" icon={<Compass size={18} />} onClick={() => navigate(`/rabbit/${firstRabbit.id}`)}>
                  Start with “{firstRabbit.title}”
                </Button>
              ) : (
                <Button variant="primary" onClick={() => navigate('/discover')}>Go to Discover</Button>
              )
            }
          />
          {realItems === 1 && <p className="small muted y-note" style={{ textAlign: 'center', margin: '12px auto 0' }}>One more thing and you’ll see your first connections.</p>}
        </>
      ) : (
        <>
          <div className="card y-panel cm-toolbar">
          <div className="row between wrap" style={{ gap: 10 }}>
            <div className="cm-view-toggle">
              <Segmented
                label="View"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'map', label: <span className="row cm-seg-label"><Network size={15} aria-hidden /> Map</span> },
                  { value: 'list', label: <span className="row cm-seg-label"><ListIcon size={15} aria-hidden /> List view</span> },
                ]}
              />
            </div>
            <span className="tiny muted cm-count">
              {graph.totalItems > graph.shownItems
                ? `Showing your ${graph.shownItems} most recent things (of ${graph.totalItems}).`
                : `${graph.shownItems} things · ${graph.topicCount} topics · ${graph.edges.length} connections`}
            </span>
          </div>

          <div className="chips scroll y-chips cm-filters" role="group" aria-label="Show or hide kinds of things">
            {presentTypes.map((t) => (
              <Chip key={t.type} active={!hidden.has(t.type)} onClick={() => toggleType(t.type)} icon={<Glyph type={t.type} size={14} />}>
                {t.plural}
              </Chip>
            ))}
          </div>
          </div>

          {mode === 'map' ? (
            <MapCanvas
              nodes={visibleNodes}
              edges={visibleEdges}
              neighbours={neighbours}
              selected={selected}
              onSelect={setSelected}
              titleOf={titleOf}
              panel={
                selected && byId.get(selected) ? (
                  <FocusPanel
                    node={byId.get(selected)!}
                    links={neighbours.get(selected) ?? []}
                    byId={byId}
                    titleOf={titleOf}
                    urlOf={urlOf}
                    onClose={() => setSelected(null)}
                    onFocus={(id) => setSelected(id)}
                  />
                ) : null
              }
            />
          ) : (
            <MapList nodes={visibleNodes} neighbours={neighbours} byId={byId} titleOf={titleOf} urlOf={urlOf} />
          )}

          <Legend types={presentTypes.map((t) => t.type)} />
        </>
      )}
    </Screen>
  );
}

function Legend({ types }: { types: NodeType[] }) {
  return (
    <section className="card y-panel cm-legend" aria-label="Legend">
      <h2 className="label" style={{ margin: '0 0 10px' }}>Legend</h2>
      <ul>
        {types.map((t) => (
          <li key={t}><Glyph type={t} /> {TYPE_META[t].plural}</li>
        ))}
        <li><svg width="28" height="10" aria-hidden className="cm-glyph"><line x1="2" y1="5" x2="26" y2="5" className="cm-edge w-topic" /></svg> Shared topic</li>
        <li><svg width="28" height="10" aria-hidden className="cm-glyph"><line x1="2" y1="5" x2="26" y2="5" className="cm-edge w-link" /></svg> Linked by you, rabbit hole or skill</li>
        <li><svg width="28" height="10" aria-hidden className="cm-glyph"><line x1="2" y1="5" x2="26" y2="5" className="cm-edge w-collection" /></svg> In a collection</li>
      </ul>
      <p className="tiny faint" style={{ margin: '14px 0 0' }}>
        Built only from what you’ve done, saved and written on this device. Lines are shared topics, links you made, collections, and the
        curated structure of rabbit holes and skills. Nothing here is generated or guessed.
      </p>
    </section>
  );
}

function MapCanvas({ nodes, edges, neighbours, selected, onSelect, titleOf, panel }: {
  nodes: MapNode[];
  edges: MapEdge[];
  neighbours: Map<string, { id: string; why: EdgeWhy }[]>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  titleOf: (n: MapNode) => string;
  panel: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 360, h: 460 });
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const [view, setView] = useState<View>({ k: 1, tx: 180, ty: 230 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const userMoved = useRef(false);
  const dragged = useRef(false);
  const [, setFrame] = useState(0);
  const reduce = prefersReducedMotion();

  // Simulation: pre-run most iterations synchronously, then (full motion only) animate the settle.
  const sim = useMemo(() => {
    const s = new ForceSim(nodes, edges);
    const pre = reduce ? 320 : 170;
    for (let i = 0; i < pre; i++) s.tick();
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const fit = (s = sim, sz = sizeRef.current) => {
    if (!nodes.length) return;
    const pts = nodes.map((n) => s.pos(n.id));
    const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
    const pad = 48;
    const k = clampK(Math.min((sz.w - pad * 2) / Math.max(1, maxX - minX), (sz.h - pad * 2) / Math.max(1, maxY - minY), 1.6));
    setView({ k, tx: sz.w / 2 - ((minX + maxX) / 2) * k, ty: sz.h / 2 - ((minY + maxY) / 2) * k });
  };

  useEffect(() => {
    // New data or filters: start from a fitted view again.
    userMoved.current = false;
    fit();
    if (reduce) {
      while (!sim.done) sim.tick();
      if (!userMoved.current) fit();
      setFrame((f) => f + 1);
      return;
    }
    let raf = 0;
    let n = 0;
    const loop = () => {
      sim.tick();
      sim.tick();
      n += 2;
      setFrame((f) => f + 1);
      if (n < 140 && !sim.done) raf = requestAnimationFrame(loop);
      else if (!userMoved.current) fit();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);

  // Track the container size.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const next = { w: Math.max(240, Math.round(r.width)), h: Math.max(280, Math.round(r.height)) };
      sizeRef.current = next;
      setSize((s) => (s.w === next.w && s.h === next.h ? s : next));
      if (!userMoved.current) fit(sim, next);
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);

  // ---- zoom / pan ----
  const zoomAt = (p: { x: number; y: number }, factor: number) => {
    userMoved.current = true;
    setView((v) => {
      const k = clampK(v.k * factor);
      const f = k / v.k;
      return { k, tx: p.x - (p.x - v.tx) * f, ty: p.y - (p.y - v.ty) * f };
    });
  };
  const centre = () => ({ x: size.w / 2, y: size.h / 2 });
  const local = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ mode: 'pan' | 'pinch'; view0: View; p0: { x: number; y: number }; d0: number; moved: boolean } | null>(null);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 1) {
      dragged.current = false;
      gesture.current = { mode: 'pan', view0: viewRef.current, p0: p, d0: 0, moved: false };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { mode: 'pinch', view0: viewRef.current, p0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, moved: true };
    }
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId) || !gesture.current || !svgRef.current) return;
      const p = local(e);
      pointers.current.set(e.pointerId, p);
      const g = gesture.current;
      if (g.mode === 'pan' && pointers.current.size === 1) {
        const dx = p.x - g.p0.x, dy = p.y - g.p0.y;
        if (!g.moved && Math.hypot(dx, dy) < 6) return;
        g.moved = true;
        userMoved.current = true;
        setView({ ...g.view0, tx: g.view0.tx + dx, ty: g.view0.ty + dy });
      } else if (g.mode === 'pinch' && pointers.current.size >= 2) {
        const [a, b] = [...pointers.current.values()];
        const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const k = clampK((g.view0.k * Math.hypot(a.x - b.x, a.y - b.y)) / g.d0);
        const wx = (g.p0.x - g.view0.tx) / g.view0.k, wy = (g.p0.y - g.view0.ty) / g.view0.k;
        userMoved.current = true;
        setView({ k, tx: m.x - wx * k, ty: m.y - wy * k });
      }
    };
    const up = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.delete(e.pointerId);
      const g = gesture.current;
      if (!g) return;
      if (pointers.current.size === 0) {
        dragged.current = g.moved;
        gesture.current = null;
      } else if (pointers.current.size === 1) {
        const [p] = [...pointers.current.values()];
        gesture.current = { mode: 'pan', view0: viewRef.current, p0: p, d0: 0, moved: true };
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(local(e), Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 48;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => setView((v) => ({ ...v, tx: v.tx + step })),
      ArrowRight: () => setView((v) => ({ ...v, tx: v.tx - step })),
      ArrowUp: () => setView((v) => ({ ...v, ty: v.ty + step })),
      ArrowDown: () => setView((v) => ({ ...v, ty: v.ty - step })),
      '+': () => zoomAt(centre(), 1.25),
      '=': () => zoomAt(centre(), 1.25),
      '-': () => zoomAt(centre(), 0.8),
      '0': () => { userMoved.current = false; fit(); },
      Escape: () => onSelect(null),
    };
    const fn = keys[e.key];
    if (fn) {
      e.preventDefault();
      userMoved.current = true;
      fn();
    }
  };

  const focusOn = (id: string) => {
    const p = sim.pos(id);
    userMoved.current = true;
    setView((v) => ({ ...v, tx: size.w / 2 - p.x * v.k, ty: size.h * 0.32 - p.y * v.k }));
  };
  useEffect(() => {
    if (selected) focusOn(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const near = new Set<string>(selected ? [selected, ...(neighbours.get(selected) ?? []).map((x) => x.id)] : []);
  const deg = (id: string) => neighbours.get(id)?.length ?? 0;
  const screen = (id: string) => {
    const p = sim.pos(id);
    return { x: p.x * view.k + view.tx, y: p.y * view.k + view.ty };
  };
  const nodeScale = Math.max(0.85, Math.min(1.35, Math.sqrt(view.k)));
  const showAllLabels = view.k >= 1.25 || nodes.length <= 18;
  const radiusOf = (n: MapNode) => (n.type === 'topic' ? 7 + Math.min(6, deg(n.id) * 0.45) : 6 + Math.min(4, deg(n.id) * 0.6)) * nodeScale;
  const labelText = (n: MapNode) => {
    const l = titleOf(n);
    return l.length > 26 ? l.slice(0, 24) + '…' : l;
  };
  // Labels are placed greedily, most important first (selected, its neighbours, topics, then busier points), and a label
  // that would overlap one already placed is left out. Zooming in spreads points apart, so more labels appear; tapping a
  // point and List view always show every name.
  const labelled = new Set<string>();
  {
    const prio = (n: MapNode) => (n.id === selected ? 1e6 : near.has(n.id) ? 1e4 : 0) + (n.type === 'topic' ? 100 : 0) + deg(n.id);
    const boxes: { x1: number; y1: number; x2: number; y2: number }[] = [];
    [...nodes]
      .filter((n) => n.type === 'topic' || showAllLabels || near.has(n.id))
      .sort((a, b) => prio(b) - prio(a) || (a.id < b.id ? -1 : 1))
      .forEach((n) => {
        const p = screen(n.id);
        const w = labelText(n).length * 6.2 + 6;
        const top = p.y + radiusOf(n) + 2;
        const b = { x1: p.x - w / 2, y1: top, x2: p.x + w / 2, y2: top + 14 };
        if (n.id !== selected && boxes.some((o) => b.x1 < o.x2 && b.x2 > o.x1 && b.y1 < o.y2 && b.y2 > o.y1)) return;
        boxes.push(b);
        labelled.add(n.id);
      });
  }

  return (
    <div className="glass glass-strong cm-wrap" ref={wrapRef}>
      <svg
        ref={svgRef}
        className="cm-svg"
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        role="group"
        aria-label="Curiosity Map. Drag to pan, pinch or scroll to zoom, arrow keys pan and plus or minus zoom. Tab to a point and press Enter to see its connections. List view shows the same information as text."
        tabIndex={0}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <rect
          className="cm-bg"
          width={size.w}
          height={size.h}
          onClick={() => {
            if (dragged.current) return;
            onSelect(null);
          }}
        />
        <g>
          {edges.map((e) => {
            const a = screen(e.a), b = screen(e.b);
            const on = !!selected && (e.a === selected || e.b === selected);
            return (
              <line
                key={e.a + '|' + e.b}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                className={'cm-edge w-' + e.why + (on ? ' hi' : selected ? ' dim' : '')}
              />
            );
          })}
        </g>
        <g>
          {nodes.map((n) => {
            const p = screen(n.id);
            const r = radiusOf(n);
            const isSel = selected === n.id;
            const dim = !!selected && !near.has(n.id);
            const label = titleOf(n);
            const showLabel = labelled.has(n.id);
            return (
              <g
                key={n.id}
                data-node={n.id}
                className={'cm-node t-' + n.type + (isSel ? ' sel' : '') + (dim ? ' dim' : '')}
                transform={`translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`}
                role="button"
                tabIndex={0}
                aria-label={`${TYPE_META[n.type].label}: ${label}. ${deg(n.id)} ${deg(n.id) === 1 ? 'connection' : 'connections'}.`}
                aria-pressed={isSel}
                onClick={(ev) => {
                  ev.stopPropagation();
                  if (dragged.current) return;
                  onSelect(isSel ? null : n.id);
                }}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    ev.stopPropagation();
                    onSelect(n.id);
                  }
                }}
              >
                {/* Invisible hit area: at least 44px across, so every point is a comfortable touch target. */}
                <circle className="cm-hit" r={Math.max(22, r + 8)} />
                {isSel && <circle className="cm-sel-ring" r={r + 6} />}
                <NodeShape type={n.type} r={r} />
                {showLabel && (
                  <text className={'cm-label' + (n.type === 'topic' ? ' topic' : '')} y={r + 13} textAnchor="middle">
                    {labelText(n)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="cm-zoom" role="toolbar" aria-label="Zoom">
        <IconButton label="Zoom in" className="filled" onClick={() => zoomAt(centre(), 1.3)}><ZoomIn size={20} /></IconButton>
        <IconButton label="Zoom out" className="filled" onClick={() => zoomAt(centre(), 1 / 1.3)}><ZoomOut size={20} /></IconButton>
        <IconButton label="Reset view" className="filled" onClick={() => { userMoved.current = false; fit(); }}><Maximize2 size={18} /></IconButton>
      </div>
      {panel}
    </div>
  );
}

function FocusPanel({ node, links, byId, titleOf, urlOf, onClose, onFocus }: {
  node: MapNode;
  links: { id: string; why: EdgeWhy }[];
  byId: Map<string, MapNode>;
  titleOf: (n: MapNode) => string;
  urlOf: (n: MapNode) => string;
  onClose: () => void;
  onFocus: (id: string) => void;
}) {
  const list = links.map((l) => ({ n: byId.get(l.id)!, why: l.why })).filter((x) => x.n);
  return (
    <section className="cm-panel" aria-label={`Connections of ${titleOf(node)}`} aria-live="polite">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <div className="label row" style={{ gap: 6 }}><Glyph type={node.type} size={14} /> {TYPE_META[node.type].label}</div>
          <h2 className="display t-md" style={{ margin: '4px 0 0' }}>{titleOf(node)}</h2>
        </div>
        <IconButton label="Close connections" onClick={onClose}><X size={20} /></IconButton>
      </div>
      <div className="row" style={{ margin: '10px 0 8px' }}>
        <Button size="sm" variant="primary" onClick={() => navigate(urlOf(node))}>Open</Button>
        <span className="small muted">{list.length} {list.length === 1 ? 'connection' : 'connections'}</span>
      </div>
      {list.length > 0 && (
        <ul className="cm-panel-list">
          {list.map(({ n, why }) => (
            <li key={n.id}>
              <button type="button" className="cm-panel-row" onClick={() => navigate(urlOf(n))}>
                <Glyph type={n.type} />
                <span className="grow">
                  <span className="lr-title" style={{ display: 'block' }}>{titleOf(n)}</span>
                  <span className="lr-sub">{TYPE_META[n.type].label} · {WHY_LABEL[why]}</span>
                </span>
                <ChevronRight size={18} aria-hidden />
              </button>
              <IconButton label={`Show ${titleOf(n)} on the map`} onClick={() => onFocus(n.id)}><LocateFixed size={18} /></IconButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MapList({ nodes, neighbours, byId, titleOf, urlOf }: {
  nodes: MapNode[];
  neighbours: Map<string, { id: string; why: EdgeWhy }[]>;
  byId: Map<string, MapNode>;
  titleOf: (n: MapNode) => string;
  urlOf: (n: MapNode) => string;
}) {
  return (
    <div className="cm-list stack lg">
      {NODE_TYPES.map((t) => {
        const group = nodes.filter((n) => n.type === t.type);
        if (!group.length) return null;
        return (
          <section key={t.type} aria-labelledby={`cm-list-${t.type}`}>
            <h2 id={`cm-list-${t.type}`} className="label on-art cm-list-head">
              <Glyph type={t.type} /> {t.plural} ({group.length})
            </h2>
            <ul className="list glass-strong" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {group.map((n) => {
                const nb = (neighbours.get(n.id) ?? []).map((x) => byId.get(x.id)).filter((x): x is MapNode => !!x);
                return (
                  <li key={n.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                    <span className="grow">
                      <button type="button" className="cm-link lr-title" onClick={() => navigate(urlOf(n))}>{titleOf(n)}</button>
                      <span className="lr-sub" style={{ display: 'block' }}>
                        {nb.length === 0 ? (
                          'No connections yet.'
                        ) : (
                          <>
                            Connected to{' '}
                            {nb.slice(0, 8).map((x, i) => (
                              <span key={x.id}>
                                <button type="button" className="cm-link" onClick={() => navigate(urlOf(x))}>{titleOf(x)}</button>
                                {i < Math.min(nb.length, 8) - 1 ? ', ' : ''}
                              </span>
                            ))}
                            {nb.length > 8 ? ` and ${nb.length - 8} more` : ''}.
                          </>
                        )}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
