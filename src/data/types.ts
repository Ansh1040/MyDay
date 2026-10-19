// Core data model for Elsewhere. Every screen, format player and catalog file builds on these types.

export type ID = string;
export type ISODate = string; // new Date().toISOString()

/** The four core areas. 'general' = not tied to one area. */
export type Area = 'rabbit' | 'twist' | 'skill' | 'history' | 'general';

/**
 * Experience formats. This is intentionally an open string union: a new format only needs
 * an entry in src/formats/registry.tsx. Unknown formats fall back to the generic "steps" player.
 */
export type FormatKey =
  | 'reading'
  | 'quiz'
  | 'experiment'
  | 'simulation'
  | 'listening'
  | 'sketch'
  | 'writing'
  | 'coding'
  | 'project'
  | 'challenge'
  | 'outdoor'
  | 'debate'
  | 'reflection'
  | 'game'
  | 'collab'
  | 'journey'
  | (string & {});

export type Energy = 1 | 2 | 3; // 1 low, 2 medium, 3 high
export type Comfort = 1 | 2 | 3 | 4 | 5; // 1 familiar … 5 adventurous
export type Cost = 0 | 1 | 2; // 0 free, 1 a little, 2 some spending
export type Social = 'solo' | 'shared' | 'either';

/** Where content came from — shown to the user to explain recommendations honestly. */
export type Origin = 'curated' | 'user' | 'remix' | 'shared';

/** A generic step used by the 'steps'/'journey' players and as a building block of other formats. */
export interface Step {
  id: ID;
  title: string;
  body: string; // plain text, may contain \n
  timerMinutes?: number; // shows a timer for this step
  input?: 'none' | 'text' | 'choice' | 'sketch' | 'photo' | 'audio';
  choices?: string[];
}

export interface QuizQuestion {
  id: ID;
  prompt: string;
  options: string[];
  answer?: number; // index of correct option; omitted for opinion polls
  explain?: string;
}

/** Format-specific payloads. Players read `experience.payload` and cast to the relevant shape. */
export interface ReadingPayload { sections: { heading?: string; text: string }[]; sources?: { label: string; url: string }[] }
export interface QuizPayload { questions: QuizQuestion[] }
export interface StepsPayload { steps: Step[] }
export interface SimulationPayload { kind: string; params?: Record<string, number | string> } // kind maps to a built-in simulation
export interface ListeningPayload { kind: 'tones' | 'soundscape' | 'silence' | 'rhythm' | (string & {}); prompts: string[]; seconds?: number }
export interface SketchPayload { prompt: string; constraints?: string[] }
export interface WritingPayload { prompt: string; minWords?: number; hints?: string[] }
export interface CodingPayload { prompt: string; starter: string; checks?: { label: string; expr: string }[] } // expr evaluated against `output` string / `result`
export interface DebatePayload { question: string; sides: { label: string; argument: string }[] }
export interface GamePayload { kind: string; params?: Record<string, number | string>; items?: { q: string; answer: number; unit?: string; note?: string }[] }

export interface Experience {
  id: ID;
  title: string;
  summary: string;
  area: Area;
  format: FormatKey;
  topics: string[]; // topic ids (see catalog/topics.ts)
  minutes: number;
  energy: Energy;
  comfort: Comfort;
  cost: Cost;
  social: Social;
  origin: Origin;
  payload: unknown;
  steps?: Step[]; // optional extra steps shown before/after the main payload
  timerMinutes?: number; // a whole-experience timer, if the activity benefits from one
  skillId?: ID; // links to Skill Arcade
  related?: ID[]; // other experience ids
  followUps?: string[]; // practical next actions in plain text
  createdAt?: ISODate;
  visibility?: 'private' | 'friends'; // user-created only
  remixOf?: { kind: RefKind; id: ID };
}

export interface Topic {
  id: ID;
  label: string;
  blurb: string;
}

/** Rabbit Hole: a branching graph of questions/ideas. */
export interface RabbitNode {
  id: ID;
  title: string;
  question?: string;
  body: string; // explanation
  surprise?: string; // an unexpected fact/angle, clearly labelled in UI
  perspectives?: { lens: string; take: string }[];
  experiences?: ID[]; // try-it experiences
  branches: { label: string; to: ID }[];
}

export interface RabbitHole {
  id: ID;
  title: string;
  hook: string;
  topics: string[];
  start: ID;
  nodes: RabbitNode[];
}

/** Skill Arcade */
export interface SkillLevel {
  level: number; // 1-based
  name: string; // e.g. "First sounds"
  goal: string;
  practice: ID[]; // short experience ids
  project: ID; // hands-on project experience id
  unlockAfter: number; // number of practice items to complete before the project counts toward the level
}

export interface Skill {
  id: ID;
  name: string;
  tagline: string;
  topics: string[];
  levels: SkillLevel[];
  realWorld: string[]; // ways to apply it in real life
}

/** Plot Twist template — expanded into a concrete twist by src/lib/twists.ts */
export interface TwistTemplate {
  id: ID;
  text: string; // may contain {slot} placeholders filled from `slots`
  slots?: Record<string, string[]>;
  minutes: number;
  energy: Energy;
  comfort: Comfort;
  cost: Cost;
  social: Social;
  setting: 'home' | 'outside' | 'anywhere';
  kind: 'adventure' | 'creative' | 'unusual' | 'social' | 'sensory';
  topics: string[];
}

export interface Twist {
  id: ID;
  templateId: ID;
  text: string;
  minutes: number;
  energy: Energy;
  comfort: Comfort;
  cost: Cost;
  social: Social;
  kind: TwistTemplate['kind'];
  topics: string[];
  status: 'offered' | 'accepted' | 'done' | 'skipped';
  createdAt: ISODate;
  doneAt?: ISODate;
  captureNoteId?: ID;
  reflection?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
}

/** Perspective Switch */
export interface PerspectiveQuestion {
  id: ID;
  question: string;
  topics: string[];
  lenses: { id: ID; name: string; take: string; prompt: string }[];
}

export interface PerspectiveSession {
  id: ID;
  questionId: ID;
  before: { stance: number; text: string }; // stance -2..2
  responses: Record<ID, string>;
  after?: { stance: number; text: string };
  changed?: boolean;
  createdAt: ISODate;
  completedAt?: ISODate;
}

/** References between any entities, used by collections, links, the curiosity map. */
export type RefKind =
  | 'experience'
  | 'rabbit'
  | 'rabbitNode'
  | 'skill'
  | 'note'
  | 'entry'
  | 'capsule'
  | 'twist'
  | 'quest'
  | 'collection'
  | 'topic'
  | 'perspective';

export interface Ref { kind: RefKind; id: ID }

/** Field Notes */
export type NoteKind = 'text' | 'voice' | 'sketch' | 'photo' | 'link';
export interface FieldNote {
  id: ID;
  kind: NoteKind;
  title: string;
  text: string; // body text or caption
  url?: string; // for links
  blobId?: ID; // voice/photo/sketch binary in IndexedDB blob store
  topics: string[];
  links: Ref[];
  private: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** Version History entries */
export type EntryKind = 'reflection' | 'opinion' | 'interest' | 'goal' | 'milestone' | 'mindchange';
export interface EntryRevision { text: string; at: ISODate; note?: string }
export interface HistoryEntry {
  id: ID;
  kind: EntryKind;
  title: string;
  text: string; // current version
  before?: string; // for mindchange: what I used to think
  revisions: EntryRevision[]; // earlier versions, oldest first
  topics: string[];
  links: Ref[];
  mood?: 1 | 2 | 3 | 4 | 5;
  private: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** Personal Capsules */
export type CapsuleKind = 'prediction' | 'opinion' | 'message' | 'voice' | 'creation';
export interface Capsule {
  id: ID;
  kind: CapsuleKind;
  title: string;
  text: string;
  blobId?: ID;
  links: Ref[];
  sealedAt: ISODate;
  opensAt: ISODate;
  openedAt?: ISODate;
  response?: string; // what I think when reopening
  notified?: boolean;
  nativeId?: number;
}

/** Collections */
export interface Collection {
  id: ID;
  name: string;
  description: string;
  items: Ref[];
  createdAt: ISODate;
  system?: boolean; // seeded default collections (can still be renamed/deleted)
}

/** Return Tickets */
export interface ReturnTicket {
  id: ID;
  target: Ref; // usually rabbit (with nodeId), experience or skill
  nodeId?: ID;
  title: string;
  stoppedAt: string;
  caught: string; // what caught my attention
  next: string; // what I wanted to try next
  createdAt: ISODate;
  remindAt?: ISODate;
  reminded?: boolean;
  nativeId?: number;
  resolvedAt?: ISODate;
}

/** Two-Person Quests. Shared by link — no server. */
export interface QuestPrompt { id: ID; text: string; kind: 'text' | 'choice' | 'task'; choices?: string[] }
export interface QuestAnswerSet { name: string; answers: Record<ID, string>; at: ISODate }
export interface TwoPersonQuest {
  id: ID;
  title: string;
  intro: string;
  kind: 'interpretation' | 'challenge' | 'project';
  prompts: QuestPrompt[];
  mine?: QuestAnswerSet;
  theirs?: QuestAnswerSet;
  role: 'owner' | 'guest';
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** Template for starting a Two-Person Quest. */
export interface QuestTemplate { id: ID; title: string; intro: string; kind: TwoPersonQuest['kind']; prompts: QuestPrompt[]; topics: string[] }

/** Progress records */
export interface Completion {
  id: ID;
  ref: Ref;
  at: ISODate;
  minutes?: number;
  result?: unknown; // format-specific saved work (quiz score, text, code, sketch blobId…)
  rating?: 1 | 2 | 3 | 4 | 5;
}

/** Drafts / in-progress work for any player — keyed by experience id. Autosaved. */
export interface Draft { key: string; data: unknown; updatedAt: ISODate }

/** Timers persist as timestamps so they survive navigation/backgrounding. */
export interface TimerState {
  id: ID;
  label: string;
  ref?: Ref;
  durationMs: number;
  startedAt?: number; // epoch ms when (re)started; undefined when paused/idle
  remainingMs: number; // remaining at last pause
  status: 'idle' | 'running' | 'paused' | 'done';
  nativeNotificationId?: number;
}

export interface Reminder {
  id: ID;
  label: string;
  time: string; // "HH:MM"
  days: number[]; // 0=Sun..6
  enabled: boolean;
  target?: Ref;
  lastFiredOn?: string; // YYYY-MM-DD
  nativeIds?: number[]; // Android scheduled notification ids
}

export type ThemeName = 'vermilion' | 'cobalt' | 'plum' | 'graphite';
export type Appearance = 'auto' | 'light' | 'dark';

export interface Preferences {
  name: string;
  interests: string[]; // topic ids
  skills: string[]; // skill ids
  goals: string[];
  minutes: number; // typical available time
  energy: Energy;
  comfort: Comfort; // Surprise Dial default
  budget: Cost;
  social: Social;
  formats: FormatKey[];
}

export interface Settings {
  theme: ThemeName;
  appearance: Appearance;
  reducedMotion: 'system' | 'on' | 'off';
  textScale: number; // 0.9 – 1.3
  notifications: {
    timers: boolean;
    reminders: boolean;
    capsules: boolean;
    shared: boolean;
    tickets: boolean;
    quietStart: string; // "22:00"
    quietEnd: string; // "08:00"
    quietEnabled: boolean;
  };
  privacy: {
    blurPrivate: boolean; // blur private entries in lists
    excludePrivateFromExport: boolean;
  };
  haptics: boolean;
  sound: boolean;
  /** Opaque panels instead of glass (also follows the device's reduce-transparency setting). */
  reduceTransparency?: boolean;
}

/** Explicit feedback that shapes recommendations. */
export interface Feedback {
  topic: Record<string, number>; // + more like this, - less
  format: Record<string, number>;
  hidden: ID[]; // hidden experience ids
}
