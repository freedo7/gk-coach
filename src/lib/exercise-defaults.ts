import type { ExerciseWithCategory } from '@/lib/api/exercises';

export interface ExerciseDefaults {
  difficulty: 'base' | 'intermedio' | 'avanzato' | null;
  duration_minutes: number | null;
  sets: number | null;
  reps: number | null;
  equipment: string | null;
}

// Defaults statici per categoria (chiave = nome categoria lowercase)
const STATIC_DEFAULTS: Record<string, ExerciseDefaults> = {
  'tecnica di base': {
    difficulty: 'base',
    duration_minutes: 15,
    sets: 3,
    reps: 10,
    equipment: 'Palloni',
  },
  'coordinazione e mobilità': {
    difficulty: 'base',
    duration_minutes: 20,
    sets: 3,
    reps: 8,
    equipment: 'Cinesini, over, scaletta',
  },
  'forza e reattività': {
    difficulty: 'intermedio',
    duration_minutes: 15,
    sets: 4,
    reps: 6,
    equipment: 'Palloni, elastici',
  },
  'tecnica situazionale': {
    difficulty: 'intermedio',
    duration_minutes: 20,
    sets: 3,
    reps: 8,
    equipment: 'Palloni, sagome, cinesini',
  },
  'tecnica podalica': {
    difficulty: 'base',
    duration_minutes: 15,
    sets: 3,
    reps: 10,
    equipment: 'Palloni, cinesini',
  },
};

/** Valore più frequente in un array */
function mode<T>(values: T[]): T | null {
  if (values.length === 0) return null;
  const freq = new Map<T, number>();
  let best: T = values[0];
  let bestCount = 0;
  for (const v of values) {
    const c = (freq.get(v) ?? 0) + 1;
    freq.set(v, c);
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return best;
}

/** Calcola defaults dinamici dalla lista esercizi del team per una categoria */
function dynamicDefaults(exercises: ExerciseWithCategory[], categoryId: string): Partial<ExerciseDefaults> {
  const filtered = exercises.filter((e) => e.category_id === categoryId);
  if (filtered.length < 2) return {};

  const result: Partial<ExerciseDefaults> = {};

  const diffs = filtered.map((e) => e.difficulty).filter(Boolean) as ('base' | 'intermedio' | 'avanzato')[];
  if (diffs.length > 0) result.difficulty = mode(diffs);

  const durations = filtered.map((e) => e.duration_minutes).filter((v): v is number => v != null);
  if (durations.length > 0) result.duration_minutes = mode(durations);

  const setsList = filtered.map((e) => e.sets).filter((v): v is number => v != null);
  if (setsList.length > 0) result.sets = mode(setsList);

  const repsList = filtered.map((e) => e.reps).filter((v): v is number => v != null);
  if (repsList.length > 0) result.reps = mode(repsList);

  const equips = filtered.map((e) => e.equipment).filter((v): v is string => !!v);
  if (equips.length > 0) result.equipment = mode(equips);

  return result;
}

/**
 * Restituisce i defaults per una categoria, combinando statici + dinamici.
 * I dinamici hanno priorità (override) sui statici.
 */
export function getDefaults(
  categoryName: string,
  categoryId: string,
  teamExercises: ExerciseWithCategory[],
): ExerciseDefaults {
  const staticDef = STATIC_DEFAULTS[categoryName.toLowerCase()] ?? {
    difficulty: null, duration_minutes: null, sets: null, reps: null, equipment: null,
  };
  const dynamicDef = dynamicDefaults(teamExercises, categoryId);

  return { ...staticDef, ...dynamicDef };
}
