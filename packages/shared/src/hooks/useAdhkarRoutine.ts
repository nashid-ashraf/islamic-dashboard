import type {
  AdhkarRoutine,
  AdhkarRoutineId,
  Dua,
  TranslationEditionId,
} from '../models/adhkar';
import { ADHKAR_ROUTINES } from '../data/adhkar';

export interface PickedTranslation {
  editionId: TranslationEditionId;
  text: string;
  /** True when the returned edition differs from the caller's `preferred`. */
  isFallback: boolean;
}

export interface UseAdhkarRoutineState {
  routine: AdhkarRoutine;
}

/**
 * Loads a bundled adhkar routine. Synchronous — all content (Arabic and
 * translations) is inline in the JSON and imported at module load. No corpus,
 * no fetch, no async.
 */
export function useAdhkarRoutine(id: AdhkarRoutineId): UseAdhkarRoutineState {
  return { routine: ADHKAR_ROUTINES[id] };
}

// ──────────────────────────────────────────────────────────────────────────────
// pickTranslation helper (pure; exported for both UI consumers and tests)

/**
 * Select the best translation for a dua given the user's preferred edition.
 * Falls back across editions when the preferred one is unavailable — returns
 * `isFallback: true` so the reader can annotate the rendered text (e.g. "no
 * Bengali available for this dua — showing English instead").
 *
 * Fallback hierarchies:
 *   - preferred = 'en-khattab'    → en-khattab → en-sahih
 *   - preferred = 'en-sahih'      → en-sahih → en-khattab
 *   - preferred = 'bn-muhiuddin'  → bn-muhiuddin → en-sahih (cross-language)
 *
 * Returns `null` only when no translation in the hierarchy is available.
 */
export function pickTranslation(
  dua: Dua,
  preferred: TranslationEditionId,
): PickedTranslation | null {
  for (const editionId of fallbackHierarchy(preferred)) {
    const text = dua.translations[editionId];
    if (typeof text === 'string' && text.length > 0) {
      return { editionId, text, isFallback: editionId !== preferred };
    }
  }
  return null;
}

function fallbackHierarchy(preferred: TranslationEditionId): TranslationEditionId[] {
  switch (preferred) {
    case 'en-khattab':
      return ['en-khattab', 'en-sahih'];
    case 'en-sahih':
      return ['en-sahih', 'en-khattab'];
    case 'bn-muhiuddin':
      return ['bn-muhiuddin', 'en-sahih'];
  }
}
