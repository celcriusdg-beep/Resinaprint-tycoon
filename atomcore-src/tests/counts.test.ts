import { it, expect } from 'vitest';
import { ACHIEVEMENTS } from '../src/game/progression/achievements';
import { MILESTONES } from '../src/game/progression/milestones';
import { RESEARCH, RESEARCH_CATEGORIES } from '../src/game/research/tree';
import { BUILDING_LIST } from '../src/game/buildings/defs';
import { EVENTS } from '../src/game/events/events';
it('content counts', () => {
  console.log({ achievements: ACHIEVEMENTS.length, milestones: MILESTONES.length, research: RESEARCH.length, categories: RESEARCH_CATEGORIES.length, buildings: BUILDING_LIST.length, events: EVENTS.length });
  expect(BUILDING_LIST.length).toBeGreaterThanOrEqual(9);
  for (const c of RESEARCH_CATEGORIES) expect(RESEARCH.some((r) => r.category === c.id)).toBe(true);
});
