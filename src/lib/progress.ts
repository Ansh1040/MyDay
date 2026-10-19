// Skill progress, computed only from real completions recorded in the store.
// A level is complete when at least `unlockAfter` practice items AND the level's project are completed.
// Levels unlock in order: level 1 is always open; level N+1 opens when level N is complete.
import { useMemo } from 'react';
import type { Completion, ID, Skill } from '../data/types';
import { getSkill } from '../data/catalog';
import { useStore } from '../store/store';

export interface LevelProgress {
  level: number;
  name: string;
  practiceDone: number;
  practiceTotal: number;
  /** Practice items needed before the project counts (clamped to practiceTotal). */
  practiceNeeded: number;
  projectDone: boolean;
  complete: boolean;
  /** Level 1, or the previous level is complete. */
  unlocked: boolean;
  /** Completed experience ids among this level's practice items. */
  practiceDoneIds: ID[];
}

export interface SkillProgress {
  /** First incomplete level (1-based). Equals the last level when every level is complete; 0 for an unknown skill. */
  currentLevel: number;
  levels: LevelProgress[];
  /** True once any practice item or project of this skill has been completed. */
  started: boolean;
  allComplete: boolean;
}

const EMPTY: SkillProgress = { currentLevel: 0, levels: [], started: false, allComplete: false };

function doneExperienceIds(completions: Completion[] | Record<ID, Completion>): Set<ID> {
  const list = Array.isArray(completions) ? completions : Object.values(completions);
  const out = new Set<ID>();
  list.forEach((c) => {
    if (c.ref.kind === 'experience') out.add(c.ref.id);
  });
  return out;
}

export function skillProgress(skill: Skill | undefined, completions: Completion[] | Record<ID, Completion>): SkillProgress {
  if (!skill || !skill.levels.length) return EMPTY;
  const done = doneExperienceIds(completions);
  const levels: LevelProgress[] = [];
  const sorted = [...skill.levels].sort((a, b) => a.level - b.level);
  sorted.forEach((lv, i) => {
    const practiceDoneIds = lv.practice.filter((pid) => done.has(pid));
    const practiceNeeded = Math.min(Math.max(0, lv.unlockAfter), lv.practice.length);
    const projectDone = !!lv.project && done.has(lv.project);
    const complete = practiceDoneIds.length >= practiceNeeded && projectDone;
    levels.push({
      level: lv.level,
      name: lv.name,
      practiceDone: practiceDoneIds.length,
      practiceTotal: lv.practice.length,
      practiceNeeded,
      projectDone,
      complete,
      unlocked: i === 0 || levels[i - 1].complete,
      practiceDoneIds,
    });
  });
  const firstOpen = levels.find((l) => !l.complete);
  return {
    currentLevel: firstOpen ? firstOpen.level : levels[levels.length - 1].level,
    levels,
    started: levels.some((l) => l.practiceDone > 0 || l.projectDone),
    allComplete: !firstOpen,
  };
}

export function useSkillProgress(skillId: ID | undefined): SkillProgress {
  const completions = useStore((s) => s.completions);
  return useMemo(() => skillProgress(skillId ? getSkill(skillId) : undefined, completions), [skillId, completions]);
}

/**
 * The next thing to do in a skill: in the current level, the first unfinished practice item until enough
 * practice is done for the project to count, then the project, then any remaining practice.
 * Returns undefined when everything is complete.
 */
export function nextSkillStep(skill: Skill | undefined, progress: SkillProgress): { experienceId: ID; level: number; kind: 'practice' | 'project' } | undefined {
  if (!skill) return undefined;
  const lp = progress.levels.find((l) => l.level === progress.currentLevel);
  const lv = skill.levels.find((l) => l.level === progress.currentLevel);
  if (!lp || !lv || lp.complete) {
    // Everything required is done — offer any leftover practice item anywhere.
    for (const level of skill.levels) {
      const p = progress.levels.find((x) => x.level === level.level);
      const left = level.practice.find((id) => !p?.practiceDoneIds.includes(id));
      if (left) return { experienceId: left, level: level.level, kind: 'practice' };
    }
    return undefined;
  }
  const nextPractice = lv.practice.find((id) => !lp.practiceDoneIds.includes(id));
  if (lp.practiceDone < lp.practiceNeeded && nextPractice) return { experienceId: nextPractice, level: lv.level, kind: 'practice' };
  if (!lp.projectDone && lv.project) return { experienceId: lv.project, level: lv.level, kind: 'project' };
  if (nextPractice) return { experienceId: nextPractice, level: lv.level, kind: 'practice' };
  return undefined;
}

/** Plain-language summary like "2 of 3 practice · project not started". No invented stats. */
export function levelSummary(l: LevelProgress, projectHasDraft = false): string {
  const project = l.projectDone ? 'project done' : projectHasDraft ? 'project in progress' : 'project not started';
  return `${l.practiceDone} of ${l.practiceTotal} practice · ${project}`;
}

/** Fraction of a level's required items done (practice needed + project), for a progress bar. */
export function levelFraction(l: LevelProgress): number {
  const total = l.practiceNeeded + 1;
  return (Math.min(l.practiceDone, l.practiceNeeded) + (l.projectDone ? 1 : 0)) / total;
}
