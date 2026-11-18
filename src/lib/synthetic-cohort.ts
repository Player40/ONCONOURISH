type LanguageGroup = "English" | "Arabic" | "Other";

interface SimulatedPerson {
  readonly language: LanguageGroup;
  readonly checkIns: readonly number[];
}

export interface WeeklyMetric {
  readonly week: number;
  readonly persistencePercent: number;
  readonly retentionPercent: number;
}

export interface LanguageMetric {
  readonly language: LanguageGroup;
  readonly sampleSize: number;
  readonly weekSixPersistencePercent: number;
}

export interface SyntheticCohortMetrics {
  readonly cohortSize: number;
  readonly observedDays: number;
  readonly weekly: readonly WeeklyMetric[];
  readonly recoveryGaps: readonly number[];
  readonly recoveryHistogram: Readonly<Record<2 | 3 | 4 | 5 | 6 | 7, number>>;
  readonly medianRecoveryDays: number;
  readonly byLanguage: readonly LanguageMetric[];
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createPeople(): SimulatedPerson[] {
  const random = seededRandom(2026);
  const cohort: SimulatedPerson[] = [];
  for (let person = 0; person < 40; person += 1) {
    const languageSample = random();
    const language: LanguageGroup = languageSample < 0.45 ? "English" : languageSample < 0.8 ? "Arabic" : "Other";
    const baseline = 0.5 + random() * 0.4;
    const checkIns: number[] = [];
    let forcedMissedDays = 0;
    for (let day = 0; day < 42; day += 1) {
      if (forcedMissedDays > 0) {
        checkIns.push(0);
        forcedMissedDays -= 1;
        continue;
      }
      if (random() < 0.04) {
        forcedMissedDays = Math.floor(random() * 5) + 1;
        checkIns.push(0);
        continue;
      }
      checkIns.push(random() < baseline - day * 0.002 ? 1 : 0);
    }
    cohort.push({ language, checkIns });
  }
  return cohort;
}

export function generateSyntheticCohortMetrics(): SyntheticCohortMetrics {
  const people = createPeople();
  const weekly = Array.from({ length: 6 }, (_, index): WeeklyMetric => {
    const weekRows = people.map(({ checkIns }) => checkIns.slice(index * 7, index * 7 + 7));
    return {
      week: index + 1,
      persistencePercent: weekRows.filter((week) => week.reduce((sum, day) => sum + day, 0) >= 4).length / people.length * 100,
      retentionPercent: weekRows.filter((week) => week.some(Boolean)).length / people.length * 100,
    };
  });

  const recoveryGaps: number[] = [];
  for (const { checkIns } of people) {
    let day = 0;
    while (day < checkIns.length) {
      if (checkIns[day] !== 0) {
        day += 1;
        continue;
      }
      const start = day;
      while (day < checkIns.length && checkIns[day] === 0) day += 1;
      if (day < checkIns.length && day - start >= 2) recoveryGaps.push(day - start);
    }
  }
  recoveryGaps.sort((a, b) => a - b);
  const recoveryHistogram: Record<2 | 3 | 4 | 5 | 6 | 7, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  for (const gap of recoveryGaps) recoveryHistogram[Math.min(gap, 7) as 2 | 3 | 4 | 5 | 6 | 7] += 1;

  const byLanguage = (["English", "Arabic", "Other"] as const).map((language): LanguageMetric => {
    const group = people.filter((person) => person.language === language);
    const persisted = group.filter((person) => person.checkIns.slice(35, 42).reduce((sum, day) => sum + day, 0) >= 4).length;
    return {
      language,
      sampleSize: group.length,
      weekSixPersistencePercent: group.length ? persisted / group.length * 100 : 0,
    };
  });

  return {
    cohortSize: people.length,
    observedDays: 42,
    weekly,
    recoveryGaps,
    recoveryHistogram,
    medianRecoveryDays: recoveryGaps.length ? recoveryGaps[Math.floor(recoveryGaps.length / 2)] : 0,
    byLanguage,
  };
}
