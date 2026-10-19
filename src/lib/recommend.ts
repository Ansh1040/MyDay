// Recommendation engine for Discover — transparent and RULE-BASED (no machine learning, nothing leaves the device).
// Every score component that matters produces a short human-readable reason, shown in "Why am I seeing this?".
import type { Comfort, Energy, Experience, FormatKey } from '../data/types';
import { allExperiences, getSkill, topicLabel } from '../data/catalog';
import { formatMeta } from '../formats/meta';
import { useStore } from '../store/store';
import { hash, todayKey } from './id';

export interface RankOptions {
  /** Free-text query (title/summary/topics/format). Items that don't match are excluded. */
  query?: string;
  /** Keep only experiences tagged with at least one of these topic ids. */
  topics?: string[];
  /** Keep only experiences that take at most this many minutes. */
  maxMinutes?: number;
  /** Keep only experiences at or below this energy level. */
  energy?: Energy;
  /** Keep only these formats. */
  formats?: FormatKey[];
  /** Include experiences the user already completed (ranked lower). */
  includeDone?: boolean;
  /** Override the Surprise Dial value (defaults to prefs.comfort). */
  comfort?: Comfort;
}

export interface Ranked {
  experience: Experience;
  score: number;
  reasons: string[];
  method: 'rule-based';
}

export const RANKING_METHOD_NOTE = 'Rule-based ranking from your preferences and feedback';

/** Honest one-liner for "Why am I seeing this?" depending on where the content came from. */
export function rankingExplanation(e: Pick<Experience, 'origin'>) {
  const origin =
    e.origin === 'curated' ? 'content is curated' :
    e.origin === 'user' ? 'this one was made by you' :
    e.origin === 'remix' ? 'this one is a template-generated remix' :
    'this one was shared with you';
  return `${RANKING_METHOD_NOTE}; ${origin}.`;
}

// ---------- goals ----------
/** Preset goals offered in onboarding, each mapped to topics/formats by simple, visible rules. */
export const GOAL_PRESETS: { label: string; topics: string[]; formats: string[]; skills?: boolean }[] = [
  { label: 'Be more curious', topics: ['science', 'philosophy', 'history'], formats: ['reading', 'experiment', 'simulation'] },
  { label: 'Break my routines', topics: ['time'], formats: ['challenge', 'outdoor', 'game'] },
  { label: 'Learn a new skill', topics: [], formats: ['project', 'coding', 'sketch'], skills: true },
  { label: 'Make more things', topics: ['craft', 'art', 'code', 'writing'], formats: ['project', 'sketch', 'writing'] },
  { label: 'Get outside more', topics: ['nature', 'cities', 'movement', 'maps'], formats: ['outdoor', 'challenge'] },
  { label: 'Understand myself better', topics: ['mind'], formats: ['reflection', 'writing'] },
  { label: 'Connect with people', topics: ['people', 'language'], formats: ['collab', 'debate'] },
  { label: 'Slow down and notice', topics: ['sound', 'nature', 'plants', 'mind'], formats: ['listening', 'outdoor', 'sketch'] },
];

const STOP = new Set(['about', 'more', 'less', 'with', 'that', 'this', 'what', 'from', 'into', 'have', 'want', 'like', 'make', 'some', 'things', 'thing', 'better', 'every', 'each', 'week', 'time', 'just', 'much', 'very', 'really', 'myself', 'other', 'them', 'they', 'their', 'your', 'will', 'would', 'could', 'should']);

function goalMatches(goal: string, e: Experience): boolean {
  const preset = GOAL_PRESETS.find((g) => g.label.toLowerCase() === goal.trim().toLowerCase());
  if (preset) {
    return e.topics.some((t) => preset.topics.includes(t)) || preset.formats.includes(e.format) || (!!preset.skills && !!e.skillId);
  }
  // Free-text goal: match meaningful words (4+ letters) against title, summary and topic labels.
  const words = tokens(goal).filter((w) => w.length >= 4 && !STOP.has(w));
  if (!words.length) return false;
  const hay = normalize([e.title, e.summary, ...e.topics.map(topicLabel), formatMeta(e.format).label].join(' '));
  return words.some((w) => hay.includes(w.length > 5 ? w.slice(0, w.length - 1) : w)); // crude stem: "walks" ~ "walk"
}

// ---------- text matching (shared with search) ----------
export function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
export function tokens(q: string) {
  return normalize(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/**
 * Weighted text match. Every query word must appear in some field (AND); each word scores the best field weight
 * (full weight at a word start, half inside a word). Returns 0 when there is no match.
 */
export function textScore(q: string, fields: { text: string; weight: number }[]): number {
  const words = tokens(q);
  if (!words.length) return 0;
  const norm = fields.map((f) => ({ t: normalize(f.text), w: f.weight }));
  let total = 0;
  for (const w of words) {
    let best = 0;
    for (const f of norm) {
      let i = f.t.indexOf(w);
      while (i >= 0) {
        const atStart = i === 0 || /[^\p{L}\p{N}]/u.test(f.t[i - 1]);
        best = Math.max(best, f.w * (atStart ? 1 : 0.5));
        if (atStart) break;
        i = f.t.indexOf(w, i + 1);
      }
    }
    if (!best) return 0;
    total += best;
  }
  const phrase = normalize(q).trim();
  if (words.length > 1 && norm.some((f) => f.t.includes(phrase))) total += 2;
  return total;
}

function experienceFields(e: Experience) {
  return [
    { text: e.title, weight: 5 },
    { text: e.topics.map(topicLabel).join(' · '), weight: 3 },
    { text: formatMeta(e.format).label, weight: 3 },
    { text: e.summary, weight: 1.5 },
  ];
}

/** Search experiences by title/summary/topics/format label. Hidden experiences are excluded. Sorted by relevance. */
export function searchExperiences(q: string): Experience[] {
  if (!tokens(q).length) return [];
  const hidden = new Set(useStore.getState().feedback.hidden);
  return allExperiences()
    .filter((e) => !hidden.has(e.id))
    .map((e) => ({ e, s: textScore(q, experienceFields(e)) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.e.title.localeCompare(b.e.title))
    .map((x) => x.e);
}

// ---------- labels used in reasons ----------
const FORMAT_PLURAL: Record<string, string> = {
  reading: 'Reading', quiz: 'Quizzes', experiment: 'Experiments', simulation: 'Simulations', listening: 'Listening exercises',
  sketch: 'Sketching', writing: 'Writing prompts', coding: 'Coding exercises', project: 'Projects', challenge: 'Real-world challenges',
  outdoor: 'Outdoor activities', debate: 'Conversations', reflection: 'Reflections', game: 'Games', collab: 'Shared activities', journey: 'Journeys',
};
export const formatPlural = (key: string) => FORMAT_PLURAL[key] ?? formatMeta(key).label;
const ENERGY_WORD = ['', 'low', 'medium', 'high'];
const DIAL_WORD = ['', 'Familiar', 'Gentle stretch', 'Curious', 'Bold', 'Adventurous'];
const DAY = 864e5;

// Topic labels themselves contain "&" ("Cities & places"), so pairs are joined with "and".
const listLabels = (ids: string[]) => {
  const l = ids.slice(0, 2).map(topicLabel);
  return l.length === 2 ? `${l[0]} and ${l[1]}` : l[0];
};

/**
 * Rank all experiences (curated + user-made) for the For You feed.
 * Filters are hard constraints; preferences/feedback shape the score; a tiny deterministic daily shuffle adds variety.
 */
export function rankExperiences(opts: RankOptions = {}): Ranked[] {
  const s = useStore.getState();
  const { prefs, feedback, completions, visited } = s;
  const comfort = opts.comfort ?? prefs.comfort;
  const hidden = new Set(feedback.hidden);
  const saved = new Set(s.saved);
  const done = new Set(Object.values(completions).filter((c) => c.ref.kind === 'experience').map((c) => c.ref.id));
  const interests = new Set(prefs.interests);
  const prefFormats = new Set<string>(prefs.formats);
  const developing = new Set(prefs.skills);
  const skillTopics = new Set(prefs.skills.flatMap((id) => getSkill(id)?.topics ?? []));
  const timeBudget = opts.maxMinutes ?? prefs.minutes;
  const energyTarget = opts.energy ?? prefs.energy;
  const query = opts.query?.trim() ?? '';
  const day = todayKey();
  const now = Date.now();

  const out: Ranked[] = [];
  for (const e of allExperiences()) {
    if (hidden.has(e.id)) continue;
    const isDone = done.has(e.id);
    if (isDone && !opts.includeDone) continue;
    if (opts.topics?.length && !e.topics.some((t) => opts.topics!.includes(t))) continue;
    if (opts.formats?.length && !opts.formats.includes(e.format)) continue;
    if (opts.maxMinutes && e.minutes > opts.maxMinutes) continue;
    if (opts.energy && e.energy > opts.energy) continue;

    const parts: { w: number; reason?: string }[] = [];

    if (query) {
      const q = textScore(query, experienceFields(e));
      if (!q) continue;
      parts.push({ w: q * 2, reason: `Matches “${query.length > 24 ? query.slice(0, 23) + '…' : query}”` });
    }

    // Interests chosen in onboarding / settings / topic follows.
    const matched = e.topics.filter((t) => interests.has(t));
    if (matched.length) parts.push({ w: 3 + (matched.length - 1), reason: `Matches your interest in ${listLabels(matched)}` });

    // Explicit "More / Less like this" feedback on topics.
    let topicFb = 0;
    let bestTopic = '';
    let bestVal = 0;
    for (const t of e.topics) {
      const v = feedback.topic[t] ?? 0;
      topicFb += v;
      if (v > bestVal) { bestVal = v; bestTopic = t; }
    }
    if (topicFb) parts.push({ w: Math.max(-6, Math.min(6, topicFb)) * 1.2, reason: topicFb > 0 && bestTopic ? `You asked for more ${topicLabel(bestTopic)}` : undefined });

    // Preferred formats + format feedback.
    if (prefFormats.has(e.format)) parts.push({ w: 2, reason: `A format you like: ${formatMeta(e.format).label}` });
    const fFb = feedback.format[e.format] ?? 0;
    if (fFb) parts.push({ w: fFb * 1.5, reason: fFb > 0 ? `You asked for more ${formatPlural(e.format)}` : undefined });

    // Skills the user is developing.
    if (e.skillId && developing.has(e.skillId)) {
      parts.push({ w: 2.5, reason: `Builds your ${getSkill(e.skillId)?.name ?? 'chosen'} skill` });
    } else if (e.topics.some((t) => skillTopics.has(t))) {
      parts.push({ w: 0.8, reason: 'Related to a skill you’re developing' });
    }

    // Goals (preset goals map to topics/formats; free-text goals match keywords).
    const goal = prefs.goals.find((g) => goalMatches(g, e));
    if (goal) parts.push({ w: 1.2, reason: `Connects to your goal “${goal.length > 36 ? goal.slice(0, 35) + '…' : goal}”` });

    // Time fit.
    if (e.minutes <= timeBudget) parts.push({ w: 1.2, reason: `Fits ${timeBudget} minutes` });
    else parts.push({ w: -Math.min(3, (e.minutes / Math.max(1, timeBudget) - 1) * 1.5) });

    // Energy fit.
    if (e.energy === energyTarget) parts.push({ w: 0.8, reason: `Suits ${ENERGY_WORD[e.energy]} energy` });
    else if (e.energy < energyTarget) parts.push({ w: 0.4 });
    else parts.push({ w: -1.2 * (e.energy - energyTarget) });

    // Surprise Dial: distance from the chosen comfort level.
    const dist = Math.abs(e.comfort - comfort);
    const dialW = [2, 0.9, -0.4, -1.6, -2.8][dist] ?? -2.8;
    if (dist === 0) parts.push({ w: dialW, reason: `Matches your Surprise Dial (${DIAL_WORD[comfort]})` });
    else if (dist === 1 && e.comfort > comfort) parts.push({ w: dialW, reason: 'A small step past your usual' });
    else parts.push({ w: dialW });

    // Budget and solo/shared fit.
    if (e.cost > prefs.budget) parts.push({ w: -1.5 * (e.cost - prefs.budget) });
    if (prefs.social === 'solo' && e.social === 'shared') parts.push({ w: -2 });
    if (prefs.social === 'shared' && e.social === 'shared') parts.push({ w: 0.8, reason: 'Made for doing with someone' });

    // Novelty.
    const v = visited[`exp:${e.id}`];
    if (isDone) parts.push({ w: -3 });
    else if (v && now - Date.parse(v) < 3 * DAY) parts.push({ w: -1 });
    else if (!v) parts.push({ w: 0.6, reason: 'Something you haven’t tried yet' });
    if (saved.has(e.id)) parts.push({ w: 0.4, reason: 'In your Saved' });

    // Small deterministic daily shuffle so the feed changes a little each day.
    const shuffle = hash(`${day}:${e.id}`) * 1.5;

    const score = parts.reduce((a, p) => a + p.w, 0) + shuffle;
    const reasons = parts
      .filter((p) => p.reason && p.w > 0)
      .sort((a, b) => b.w - a.w)
      .slice(0, 4)
      .map((p) => p.reason!);
    if (!reasons.length) reasons.push('Part of today’s curated rotation');
    out.push({ experience: e, score: Math.round(score * 100) / 100, reasons, method: 'rule-based' });
  }
  return out.sort((a, b) => b.score - a.score || a.experience.title.localeCompare(b.experience.title));
}

/**
 * Possibility Shelf: up to `n` picks in rank order with a different format each (rule-based diversity — the
 * best-ranked item of each format wins). The first `skip` items are left for the feed's top pick.
 */
export function diversePicks(ranked: Ranked[], n = 8, skip = 1): Ranked[] {
  const out: Ranked[] = [];
  const seen = new Set<string>();
  for (const r of ranked.slice(skip)) {
    if (seen.has(r.experience.format)) continue;
    seen.add(r.experience.format);
    out.push(r);
    if (out.length >= n) break;
  }
  return out;
}

/**
 * Weighted random pick near the Surprise Dial level. Prefers things not done, not hidden and not seen in the last
 * few days; nudged (not restricted) by interests and feedback. Returns undefined only when nothing is available.
 */
export function surpriseMe(comfort: Comfort, opts: { exclude?: string[] } = {}): Experience | undefined {
  const s = useStore.getState();
  const hidden = new Set(s.feedback.hidden);
  const done = new Set(Object.values(s.completions).filter((c) => c.ref.kind === 'experience').map((c) => c.ref.id));
  const exclude = new Set(opts.exclude ?? []);
  let pool = allExperiences().filter((e) => !hidden.has(e.id) && !exclude.has(e.id));
  const fresh = pool.filter((e) => !done.has(e.id));
  if (fresh.length) pool = fresh;
  if (!pool.length) return undefined;
  const W = [6, 3, 1, 0.3, 0.1];
  const now = Date.now();
  const interests = new Set(s.prefs.interests);
  const weights = pool.map((e) => {
    let w = W[Math.abs(e.comfort - comfort)] ?? 0.1;
    const v = s.visited[`exp:${e.id}`];
    if (v && now - Date.parse(v) < 3 * DAY) w *= 0.3;
    if (e.topics.some((t) => interests.has(t))) w *= 1.3;
    const fb = e.topics.reduce((a, t) => a + (s.feedback.topic[t] ?? 0), 0) + (s.feedback.format[e.format] ?? 0);
    if (fb < 0) w *= 0.5;
    else if (fb > 0) w *= 1.2;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
