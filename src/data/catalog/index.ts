// Catalog: curated content bundled with the app (works offline). User-created experiences live in the store.
import type { Experience, ID, PerspectiveQuestion, QuestTemplate, RabbitHole, Skill, TwistTemplate } from '../types';
import { useStore } from '../../store/store';
import { TOPICS, topicLabel } from './topics';
import { EXPERIENCES_GENERAL } from './experiences';
import { EXPERIENCES_SKILLS, SKILLS } from './skills';
import { EXPERIENCES_RABBIT, RABBIT_HOLES } from './rabbitholes';
import { TWIST_TEMPLATES } from './twists';
import { PERSPECTIVES } from './perspectives';
import { QUEST_TEMPLATES } from './quests';

export { TOPICS, topicLabel, SKILLS, RABBIT_HOLES, TWIST_TEMPLATES, PERSPECTIVES, QUEST_TEMPLATES };

export const CATALOG_EXPERIENCES: Experience[] = [...EXPERIENCES_GENERAL, ...EXPERIENCES_SKILLS, ...EXPERIENCES_RABBIT];
const byId = new Map(CATALOG_EXPERIENCES.map((e) => [e.id, e]));

/** Curated + user-created/remixed/imported experiences. */
export function allExperiences(): Experience[] {
  return [...CATALOG_EXPERIENCES, ...Object.values(useStore.getState().experiences)];
}
export function getExperience(id: ID): Experience | undefined {
  return byId.get(id) ?? useStore.getState().experiences[id];
}
/** Hook version so components re-render when user experiences change. */
export function useExperience(id: ID | undefined): Experience | undefined {
  const user = useStore((s) => (id ? s.experiences[id] : undefined));
  return id ? byId.get(id) ?? user : undefined;
}
export const getRabbitHole = (id: ID): RabbitHole | undefined => RABBIT_HOLES.find((r) => r.id === id);
export const getSkill = (id: ID): Skill | undefined => SKILLS.find((s) => s.id === id);
export const getPerspective = (id: ID): PerspectiveQuestion | undefined => PERSPECTIVES.find((p) => p.id === id);
export const getTwistTemplate = (id: ID): TwistTemplate | undefined => TWIST_TEMPLATES.find((t) => t.id === id);
export const getQuestTemplate = (id: ID): QuestTemplate | undefined => QUEST_TEMPLATES.find((t) => t.id === id);
