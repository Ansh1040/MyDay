// Format registry: maps every format key to its metadata (src/formats/meta.ts) and Player.
// Adding a format = write a Player (implementing PlayerProps) and add one line to PLAYERS below.
// Unknown keys fall back to the generic step-by-step player, so imported or older content never breaks.
import type { ComponentType } from 'react';
import type { Experience } from '../data/types';
import type { FormatDef, PlayerProps } from './registry';
import { FORMAT_META, formatMeta } from './meta';
import { StepsPlayer, normalizeSteps } from './players/StepsPlayer';
import { ReadingPlayer } from './players/ReadingPlayer';
import { QuizPlayer } from './players/QuizPlayer';
import { SimulationPlayer } from './players/SimulationPlayer';
import { ListeningPlayer } from './players/ListeningPlayer';
import { SketchPlayer } from './players/SketchPlayer';
import { WritingPlayer } from './players/WritingPlayer';
import { CodingPlayer } from './players/CodingPlayer';
import { DebatePlayer } from './players/DebatePlayer';
import { GamePlayer } from './players/GamePlayer';

const PLAYERS: Record<string, ComponentType<PlayerProps>> = {
  reading: ReadingPlayer,
  quiz: QuizPlayer,
  simulation: SimulationPlayer,
  listening: ListeningPlayer,
  sketch: SketchPlayer,
  writing: WritingPlayer,
  coding: CodingPlayer,
  debate: DebatePlayer,
  game: GamePlayer,
  // Step-based formats share the generic player.
  experiment: StepsPlayer,
  project: StepsPlayer,
  challenge: StepsPlayer,
  outdoor: StepsPlayer,
  reflection: StepsPlayer,
  collab: StepsPlayer,
  journey: StepsPlayer,
  steps: StepsPlayer,
};

export const FORMATS: Record<string, FormatDef> = Object.fromEntries(
  Object.keys({ ...FORMAT_META, ...PLAYERS }).map((key) => [key, { ...formatMeta(key), key, Player: PLAYERS[key] ?? StepsPlayer }]),
);

/** Format definition for any key. Unknown formats get a generic label and the step-by-step player. */
export function getFormat(key: string | undefined | null): FormatDef {
  const k = key || 'steps';
  return FORMATS[k] ?? { ...formatMeta(k), key: k, Player: StepsPlayer };
}

/**
 * A short, honest description of where a saved draft stopped (used for Return Tickets).
 * Returns undefined when there is nothing specific to say.
 */
export function describeDraft(e: Experience, draft: unknown): string | undefined {
  if (!draft || typeof draft !== 'object') return undefined;
  const d = draft as Record<string, unknown>;
  const PlayerKind = getFormat(e.format).Player;
  if (PlayerKind === StepsPlayer && typeof d.index === 'number') {
    const steps = normalizeSteps(e);
    const s = steps[Math.min(steps.length - 1, Math.max(0, d.index))];
    return steps.length > 1 && s ? `Step ${d.index + 1} of ${steps.length}: ${s.title}` : undefined;
  }
  if (e.format === 'quiz' && typeof d.index === 'number') return `Question ${d.index + 1}`;
  if (e.format === 'reading' && typeof d.progress === 'number') return `About ${Math.round(d.progress * 100)}% through the reading`;
  if ((e.format === 'writing') && typeof d.text === 'string' && d.text.trim()) {
    const words = d.text.trim().split(/\s+/).length;
    return `Draft of ${words} word${words === 1 ? '' : 's'}`;
  }
  if (e.format === 'coding' && typeof d.code === 'string') return 'Code in progress';
  if (e.format === 'debate' && typeof d.stage === 'string') return d.stage === 'before' ? 'Choosing a starting position' : d.stage === 'sides' ? 'Reading the sides' : 'Choosing a position after reading';
  return undefined;
}

export type { FormatDef, PlayerProps };
