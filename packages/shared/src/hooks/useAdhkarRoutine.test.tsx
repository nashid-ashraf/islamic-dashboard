import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAdhkarRoutine, pickTranslation } from './useAdhkarRoutine';
import type { Dua } from '../models/adhkar';

function stub(translations: Partial<Record<'en-sahih' | 'en-khattab' | 'bn-muhiuddin', string>>): Dua {
  return {
    id: 'x',
    order: 1,
    arabic: 'AR',
    translations,
    repetitions: 1,
    source: 'Bukhari 1',
  };
}

describe('useAdhkarRoutine', () => {
  it('returns the bundled routine synchronously', () => {
    const { result } = renderHook(() => useAdhkarRoutine('sleep'));
    expect(result.current.routine.id).toBe('sleep');
    expect(result.current.routine.duas.length).toBeGreaterThan(0);
    // Every dua has inline Arabic (no async resolution needed).
    for (const d of result.current.routine.duas) {
      expect(typeof d.arabic).toBe('string');
      expect(d.arabic.length).toBeGreaterThan(0);
    }
  });

  it('exposes empty duas arrays for out-of-scope routines', () => {
    for (const id of ['friday-post-asr', 'post-salah'] as const) {
      const { result } = renderHook(() => useAdhkarRoutine(id));
      expect(result.current.routine.duas).toEqual([]);
      expect(result.current.routine.curationNote).toBeTruthy();
    }
  });
});

describe('pickTranslation', () => {
  it('returns the preferred edition when available', () => {
    const picked = pickTranslation(
      stub({ 'en-sahih': 'S', 'en-khattab': 'K' }),
      'en-khattab',
    );
    expect(picked).toEqual({ editionId: 'en-khattab', text: 'K', isFallback: false });
  });

  it('falls back from en-khattab → en-sahih', () => {
    const picked = pickTranslation(stub({ 'en-sahih': 'S' }), 'en-khattab');
    expect(picked?.editionId).toBe('en-sahih');
    expect(picked?.isFallback).toBe(true);
  });

  it('falls back from en-sahih → en-khattab when Sahih is missing', () => {
    const picked = pickTranslation(stub({ 'en-khattab': 'K' }), 'en-sahih');
    expect(picked?.editionId).toBe('en-khattab');
    expect(picked?.isFallback).toBe(true);
  });

  it('falls back from bn-muhiuddin → en-sahih cross-language', () => {
    const picked = pickTranslation(stub({ 'en-sahih': 'S' }), 'bn-muhiuddin');
    expect(picked?.editionId).toBe('en-sahih');
    expect(picked?.isFallback).toBe(true);
  });

  it('returns bn-muhiuddin when available as preferred', () => {
    const picked = pickTranslation(
      stub({ 'bn-muhiuddin': 'B', 'en-sahih': 'S' }),
      'bn-muhiuddin',
    );
    expect(picked?.editionId).toBe('bn-muhiuddin');
    expect(picked?.isFallback).toBe(false);
  });

  it('returns null when no translation is available in the hierarchy', () => {
    const empty = stub({});
    expect(pickTranslation(empty, 'en-sahih')).toBeNull();
    expect(pickTranslation(empty, 'en-khattab')).toBeNull();
    expect(pickTranslation(empty, 'bn-muhiuddin')).toBeNull();
  });
});
