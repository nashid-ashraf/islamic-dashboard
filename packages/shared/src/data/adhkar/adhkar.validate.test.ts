// Runtime schema validation for the bundled adhkar JSON. Guards the invariants
// required by the data model and licensing policy:
//
//   1. Every dua carries inline Arabic text (non-empty string).
//   2. Every dua has at least one translation — otherwise the entry ships
//      inaccessible to non-Arabic readers.
//   3. `source` follows a recognised citation format (Quran N[:N[-N]] or a
//      recognised hadith collection + number).
//   4. Translation keys use only the recognised `TranslationEditionId` values.
//   5. `quranRef`, when present, references a valid surah/ayah range.
//
// Runs as part of the shared test suite so invalid JSON blocks CI.

import { describe, it, expect } from 'vitest';
import { ADHKAR_ROUTINES } from '.';
import type { AdhkarRoutineId } from '../../models/adhkar';
import { TRANSLATION_EDITIONS } from '../../models/adhkar';

const SOURCE_PATTERN =
  /^(Quran \d+(:\d+(-\d+)?)?|Bukhari \d+|Muslim \d+|Abu Dawud \d+|Tirmidhi \d+|Nasa'i \d+|Ibn Majah \d+|Ahmad \d+|Tabarani|al-Hakim \d+)/;

describe('adhkar bundled JSON', () => {
  const routineIds = Object.keys(ADHKAR_ROUTINES) as AdhkarRoutineId[];

  for (const routineId of routineIds) {
    const routine = ADHKAR_ROUTINES[routineId];

    describe(`routine: ${routineId}`, () => {
      it('has a matching id and a label', () => {
        expect(routine.id).toBe(routineId);
        expect(typeof routine.label).toBe('string');
        expect(routine.label.length).toBeGreaterThan(0);
      });

      it('has unique dua ids', () => {
        const ids = routine.duas.map((d) => d.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      for (const dua of routine.duas) {
        describe(`dua: ${dua.id}`, () => {
          it('has the required base fields', () => {
            expect(typeof dua.id).toBe('string');
            expect(dua.id.length).toBeGreaterThan(0);
            expect(typeof dua.order).toBe('number');
            expect(dua.order).toBeGreaterThan(0);
            expect(typeof dua.repetitions).toBe('number');
            expect(dua.repetitions).toBeGreaterThan(0);
            expect(typeof dua.source).toBe('string');
            expect(dua.source).toMatch(SOURCE_PATTERN);
          });

          it('has non-empty inline Arabic', () => {
            expect(typeof dua.arabic).toBe('string');
            expect(dua.arabic.length).toBeGreaterThan(0);
          });

          it('has at least one non-empty translation', () => {
            const count = Object.values(dua.translations).filter(
              (t) => typeof t === 'string' && t.length > 0,
            ).length;
            expect(count).toBeGreaterThan(0);
          });

          it('only uses recognised translation edition keys', () => {
            const allowed = new Set<string>(TRANSLATION_EDITIONS);
            for (const key of Object.keys(dua.translations)) {
              expect(allowed.has(key)).toBe(true);
            }
          });

          if (dua.quranRef) {
            it('has a well-formed quranRef (surah 1-114, ayahFrom ≤ ayahTo)', () => {
              const { surah, ayahFrom, ayahTo } = dua.quranRef!;
              expect(surah).toBeGreaterThanOrEqual(1);
              expect(surah).toBeLessThanOrEqual(114);
              expect(ayahFrom).toBeGreaterThanOrEqual(1);
              expect(ayahTo).toBeGreaterThanOrEqual(ayahFrom);
            });
          }
        });
      }
    });
  }
});
