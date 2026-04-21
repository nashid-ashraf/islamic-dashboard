// Central registry of the text editions the offline corpus caches.
// Web and mobile adapters must agree on these IDs — any addition or change here
// is a corpus schema change (bump CorpusManifest.version) because cached records
// are keyed by EditionId.

export type EditionId =
  | 'ar-uthmani'      // Arabic — Uthmani script (standard mushaf)
  | 'en-sahih'        // English — Saheeh International
  | 'en-khattab'      // English — The Clear Quran, Dr Mustafa Khattab
  | 'bn-muhiuddin';   // Bengali — Muhiuddin Khan

export const EDITION_IDS: readonly EditionId[] = [
  'ar-uthmani',
  'en-sahih',
  'en-khattab',
  'bn-muhiuddin',
] as const;

export type UpstreamSource =
  | { provider: 'alquran.cloud'; editionSlug: string }
  | { provider: 'fawazahmed0-cdn'; editionSlug: string };

export interface EditionMeta {
  id: EditionId;
  label: string;
  language: 'ar' | 'en' | 'bn';
  direction: 'rtl' | 'ltr';
  upstream: UpstreamSource;
}

export const EDITIONS: Record<EditionId, EditionMeta> = {
  'ar-uthmani': {
    id: 'ar-uthmani',
    label: 'Arabic (Uthmani)',
    language: 'ar',
    direction: 'rtl',
    upstream: { provider: 'alquran.cloud', editionSlug: 'quran-uthmani' },
  },
  'en-sahih': {
    id: 'en-sahih',
    label: 'Saheeh International (English)',
    language: 'en',
    direction: 'ltr',
    upstream: { provider: 'alquran.cloud', editionSlug: 'en.sahih' },
  },
  'en-khattab': {
    id: 'en-khattab',
    label: 'The Clear Quran — Mustafa Khattab (English)',
    language: 'en',
    direction: 'ltr',
    // Saheeh International is the only Khattab-grade translation on AlQuran.cloud;
    // the fawazahmed0 quran-api CDN hosts Khattab as 'eng-mustafakhattaba'.
    upstream: { provider: 'fawazahmed0-cdn', editionSlug: 'eng-mustafakhattaba' },
  },
  'bn-muhiuddin': {
    id: 'bn-muhiuddin',
    label: 'Bengali — Muhiuddin Khan',
    language: 'bn',
    direction: 'ltr',
    upstream: { provider: 'alquran.cloud', editionSlug: 'bn.bengali' },
  },
};

/** Default editions displayed in the reader when no user preference is set. */
export const DEFAULT_ARABIC_EDITION: EditionId = 'ar-uthmani';
export const DEFAULT_TRANSLATION_EDITION: EditionId = 'en-sahih';
