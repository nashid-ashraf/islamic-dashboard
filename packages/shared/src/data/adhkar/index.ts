// Typed barrel for the bundled adhkar routines. Importing JSON with
// `resolveJsonModule: true` infers literal types (e.g. `id: 'morning'` narrows
// to the literal, which doesn't always unify with our union type). We cast
// through `unknown` into the domain type so consumers get the fully-typed
// `AdhkarRoutine` shape regardless of the JSON's literal narrowing.

import type { AdhkarRoutine, AdhkarRoutineId } from '../../models/adhkar';
import morningJson from './morning.json';
import eveningJson from './evening.json';
import sleepJson from './sleep.json';
import wakingJson from './waking.json';

const morning = morningJson as unknown as AdhkarRoutine;
const evening = eveningJson as unknown as AdhkarRoutine;
const sleep = sleepJson as unknown as AdhkarRoutine;
const waking = wakingJson as unknown as AdhkarRoutine;

export const ADHKAR_ROUTINES: Record<AdhkarRoutineId, AdhkarRoutine> = {
  morning,
  evening,
  sleep,
  waking,
  // Out-of-scope routines ship as empty stubs so `AdhkarRoutineId` stays
  // exhaustive at the type level. They render as empty-state in the UI until
  // curated.
  'friday-post-asr': {
    id: 'friday-post-asr',
    label: 'Friday — after Asr',
    curationNote: 'Out of scope for v1.1a. See REQUIREMENTS.md §5B.3.',
    duas: [],
  },
  'post-salah': {
    id: 'post-salah',
    label: 'After Salah',
    curationNote: 'Out of scope for v1.1a — will ship alongside the post-salah tasbih counter (FR-EX2).',
    duas: [],
  },
};

export const ADHKAR_ROUTINE_IDS: readonly AdhkarRoutineId[] = [
  'morning',
  'evening',
  'sleep',
  'waking',
  'friday-post-asr',
  'post-salah',
] as const;
