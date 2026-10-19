// Lightweight format metadata (labels/icons) used by cards and filters. Players live in src/formats/index.ts.
import {
  BookOpen, CircleHelp, FlaskConical, Orbit, Headphones, PenTool, PenLine, Code2, Hammer, Flag, Footprints,
  MessagesSquare, Sparkles, Gamepad2, Users, Route, ListChecks, type LucideIcon,
} from 'lucide-react';

export interface FormatMeta { key: string; label: string; verb: string; icon: LucideIcon; description: string }

export const FORMAT_META: Record<string, FormatMeta> = {
  reading: { key: 'reading', label: 'Reading', verb: 'Read', icon: BookOpen, description: 'Short articles and explanations.' },
  quiz: { key: 'quiz', label: 'Quiz', verb: 'Play', icon: CircleHelp, description: 'Test hunches and learn from the answers.' },
  experiment: { key: 'experiment', label: 'Experiment', verb: 'Try', icon: FlaskConical, description: 'Try something and observe what happens.' },
  simulation: { key: 'simulation', label: 'Simulation', verb: 'Explore', icon: Orbit, description: 'Play with a living model of a system.' },
  listening: { key: 'listening', label: 'Listening', verb: 'Listen', icon: Headphones, description: 'Audio and attention exercises.' },
  sketch: { key: 'sketch', label: 'Sketching', verb: 'Draw', icon: PenTool, description: 'Draw to see and think.' },
  writing: { key: 'writing', label: 'Writing', verb: 'Write', icon: PenLine, description: 'Prompts for stories, notes and ideas.' },
  coding: { key: 'coding', label: 'Coding', verb: 'Code', icon: Code2, description: 'Small programs you can run right here.' },
  project: { key: 'project', label: 'Project', verb: 'Make', icon: Hammer, description: 'Hands-on things to build or make.' },
  challenge: { key: 'challenge', label: 'Real-world challenge', verb: 'Go', icon: Flag, description: 'Do something in the world.' },
  outdoor: { key: 'outdoor', label: 'Outdoors', verb: 'Head out', icon: Footprints, description: 'Walks and explorations outside.' },
  debate: { key: 'debate', label: 'Conversation', verb: 'Discuss', icon: MessagesSquare, description: 'Debates, viewpoints and conversations.' },
  reflection: { key: 'reflection', label: 'Reflection', verb: 'Reflect', icon: Sparkles, description: 'Look inward and write it down.' },
  game: { key: 'game', label: 'Game', verb: 'Play', icon: Gamepad2, description: 'Playful practice.' },
  collab: { key: 'collab', label: 'Together', verb: 'Start', icon: Users, description: 'Activities for two or more.' },
  journey: { key: 'journey', label: 'Journey', verb: 'Begin', icon: Route, description: 'A sequence of steps over time.' },
  steps: { key: 'steps', label: 'Activity', verb: 'Start', icon: ListChecks, description: 'A step-by-step activity.' },
};

export const formatMeta = (key: string): FormatMeta => FORMAT_META[key] ?? { ...FORMAT_META.steps, key, label: key.charAt(0).toUpperCase() + key.slice(1) };
export const FORMAT_KEYS = Object.keys(FORMAT_META).filter((k) => k !== 'steps');
