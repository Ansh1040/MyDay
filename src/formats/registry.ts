// Format registry — the extension point for experience formats.
// To add a new format: write a Player component and add one entry to FORMATS (src/formats/index.ts).
// Unknown formats fall back to the generic step-by-step player, so old/imported content never breaks.
import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Experience } from '../data/types';

export interface PlayerProps {
  experience: Experience;
  /** Previously autosaved in-progress work for this experience (undefined if none). */
  draft: unknown;
  /** Autosave in-progress work. Call freely (debounce inside the player if calling per keystroke is heavy). */
  saveDraft: (data: unknown) => void;
  /** Mark the experience done. `result` is stored as saved work; `summary` is a short human description. */
  onComplete: (result?: unknown, summary?: string) => void;
  /** True if the user has completed this experience before. */
  completed: boolean;
}

export interface FormatDef {
  key: string;
  label: string; // "Experiment"
  verb: string; // "Try", "Read", "Listen" — used on buttons
  icon: LucideIcon;
  description: string;
  Player: ComponentType<PlayerProps>;
}
