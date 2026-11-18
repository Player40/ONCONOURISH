import type { ActionId, DemoDay, LoggedDemoDay } from "@/engine/types";

export interface WorkedActionStat {
  readonly action: ActionId;
  readonly offered: number;
  readonly completed: number;
  readonly completionRate: number;
}

function isLogged(day: DemoDay): day is LoggedDemoDay {
  return day.logged;
}

/** Counts logged check-ins through and including `throughDay`. */
export function getProgressBank(days: readonly DemoDay[], throughDay = Number.POSITIVE_INFINITY): number {
  return days.filter((day) => day.day <= throughDay && isLogged(day)).length;
}

/** Counts offered and completed actions through and including `throughDay`. */
export function getWorkedActionStats(days: readonly DemoDay[], throughDay = Number.POSITIVE_INFINITY): WorkedActionStat[] {
  const counts = new Map<ActionId, { offered: number; completed: number }>();
  for (const day of days) {
    if (day.day > throughDay || !isLogged(day)) continue;
    for (const action of day.actionsOffered) {
      const count = counts.get(action) ?? { offered: 0, completed: 0 };
      count.offered += 1;
      if (day.actionsCompleted.includes(action)) count.completed += 1;
      counts.set(action, count);
    }
  }
  return [...counts.entries()]
    .map(([action, { offered, completed }]) => ({
      action,
      offered,
      completed,
      completionRate: completed / offered,
    }))
    .sort((a, b) => b.completionRate - a.completionRate);
}
