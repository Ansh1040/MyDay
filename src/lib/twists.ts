// Plot Twist generator. TEMPLATE-GENERATED: picks a curated TwistTemplate that fits the user's constraints
// (time, energy, budget, Surprise Dial, solo/shared, setting) and fills its {slot}s at random. No AI involved.
import type { Comfort, Cost, Energy, Social, Twist, TwistTemplate } from '../data/types';
import { TWIST_TEMPLATES as CATALOG_TWISTS } from '../data/catalog';
import { useStore } from '../store/store';
import { nowISO, uid } from './id';

const TWIST_TEMPLATES: TwistTemplate[] = CATALOG_TWISTS;

export type TwistSetting = 'home' | 'outside' | 'anywhere';

export interface TwistOptions {
  minutes: number; // available time
  energy: Energy; // maximum energy
  budget: Cost; // maximum cost
  comfort: Comfort; // Surprise Dial intensity
  social: Social; // 'solo' = alone only, 'shared' = with someone, 'either' = anything
  setting: TwistSetting; // 'home' = at home, 'outside' = out and about, 'anywhere' = no preference
  topics?: string[]; // gentle boost for these topics (e.g. interests)
  avoid?: string[]; // template ids to make less likely (recently offered / "not for me")
  exclude?: string[]; // template ids never to pick (e.g. the one being rerolled)
}

export const TWIST_KIND_LABEL: Record<TwistTemplate['kind'], string> = {
  adventure: 'Small adventure',
  creative: 'Creative prompt',
  unusual: 'Unusual activity',
  social: 'Shared moment',
  sensory: 'For the senses',
};

export const TWIST_METHOD_NOTE = 'Template-generated from a curated list, filtered by your settings (rule-based).';

/** Hard constraints — never relaxed, so a twist always honestly fits time, energy, budget, people and place. */
function fitsHard(t: TwistTemplate, o: TwistOptions) {
  if (t.minutes > o.minutes) return false;
  if (t.energy > o.energy) return false;
  if (t.cost > o.budget) return false;
  if (o.social === 'solo' && t.social === 'shared') return false;
  if (o.social === 'shared' && t.social === 'solo') return false;
  if (o.setting === 'home' && t.setting === 'outside') return false;
  if (o.setting === 'outside' && t.setting === 'home') return false;
  return true;
}

/**
 * Templates that fit the constraints. The Surprise Dial range widens step by step (±1, ±2, any) only when nothing
 * fits closely; `comfortRange` tells the UI whether it had to widen so it can say so.
 */
export function matchingTemplates(o: TwistOptions): { templates: TwistTemplate[]; comfortRange: number } {
  const exclude = new Set(o.exclude ?? []);
  const hard = TWIST_TEMPLATES.filter((t) => !exclude.has(t.id) && fitsHard(t, o));
  for (const range of [1, 2, 4]) {
    const list = hard.filter((t) => Math.abs(t.comfort - o.comfort) <= range);
    if (list.length) return { templates: list, comfortRange: range };
  }
  return { templates: [], comfortRange: 0 };
}

/** Replace each {slot} with a random option from template.slots. Unknown slots are left readable. */
export function fillTemplate(t: Pick<TwistTemplate, 'text' | 'slots'>, rand: () => number = Math.random): string {
  return t.text.replace(/\{(\w+)\}/g, (_, name: string) => {
    const opts = t.slots?.[name];
    if (!opts?.length) return name.replace(/_/g, ' ');
    return opts[Math.floor(rand() * opts.length)];
  });
}

/** Template ids offered most recently (any status), newest first — used to avoid repeats. */
export function recentTemplateIds(limit = 6): string[] {
  return Object.values(useStore.getState().twists)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((t) => t.templateId);
}

/** Build a concrete Twist (status 'offered') or null when no template fits the hard constraints. */
export function generateTwist(o: TwistOptions, rand: () => number = Math.random): Twist | null {
  const { templates } = matchingTemplates(o);
  if (!templates.length) return null;
  const avoid = new Set(o.avoid ?? []);
  const topics = new Set(o.topics ?? []);
  const weights = templates.map((t) => {
    let w = [4, 2, 0.8, 0.3, 0.15][Math.abs(t.comfort - o.comfort)] ?? 0.15;
    if (t.topics.some((x) => topics.has(x))) w *= 1.5;
    if (avoid.has(t.id)) w *= 0.12;
    // Prefer twists that use a good share of the available time, but never require more.
    if (t.minutes >= o.minutes * 0.25) w *= 1.2;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  let pick = templates[templates.length - 1];
  for (let i = 0; i < templates.length; i++) {
    r -= weights[i];
    if (r <= 0) { pick = templates[i]; break; }
  }
  return {
    id: uid('tw-'),
    templateId: pick.id,
    text: fillTemplate(pick, rand),
    minutes: pick.minutes,
    energy: pick.energy,
    comfort: pick.comfort,
    cost: pick.cost,
    // An "either" twist taken with someone becomes a shared one (so the UI can suggest inviting someone).
    social: pick.social === 'either' && o.social === 'shared' ? 'shared' : pick.social,
    kind: pick.kind,
    topics: pick.topics,
    status: 'offered',
    createdAt: nowISO(),
  };
}

/**
 * Reroll: a different template when possible; if only one template fits, refill its slots so the text changes.
 * Returns null when nothing fits at all.
 */
export function rerollTwist(prev: Twist | null | undefined, o: TwistOptions, rand: () => number = Math.random): Twist | null {
  if (!prev) return generateTwist(o, rand);
  const other = generateTwist({ ...o, exclude: [...(o.exclude ?? []), prev.templateId], avoid: [...(o.avoid ?? []), ...recentTemplateIds()] }, rand);
  if (other) return other;
  for (let i = 0; i < 6; i++) {
    const again = generateTwist(o, rand);
    if (!again || again.text !== prev.text) return again;
  }
  return generateTwist(o, rand);
}

// ---------- reflection helpers ----------
export type RoutineAnswer = 'Yes' | 'A little' | 'Not really';
const ROUTINE_RE = /\n*Broke the routine: (Yes|A little|Not really)\s*$/;

/** The Twist type has no dedicated field for "did it break the routine?", so it is stored as a final readable line. */
export function composeReflection(text: string, routine?: RoutineAnswer | '') {
  const body = text.trim();
  if (!routine) return body;
  return `${body}${body ? '\n\n' : ''}Broke the routine: ${routine}`;
}
export function splitReflection(reflection?: string): { text: string; routine?: RoutineAnswer } {
  if (!reflection) return { text: '' };
  const m = reflection.match(ROUTINE_RE);
  return m ? { text: reflection.replace(ROUTINE_RE, ''), routine: m[1] as RoutineAnswer } : { text: reflection };
}
