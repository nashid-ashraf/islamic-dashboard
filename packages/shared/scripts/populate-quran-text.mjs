#!/usr/bin/env node
/**
 * Populate Quran-derived adhkar entries with inline Arabic + three translations.
 *
 * Reads each routine JSON in packages/shared/src/data/adhkar/, locates every
 * dua with a `quranRef`, and fetches the ayah range from:
 *   - AlQuran.cloud → Arabic Uthmani, Sahih International, Bengali Muhiuddin Khan
 *   - fawazahmed0/quran-api CDN (JSDelivr) → Mustafa Khattab "The Clear Quran"
 * Then writes the text back into the JSON as inline `arabic` + `translations`.
 *
 * Idempotent: re-running overwrites existing inline text with fresh API output.
 *
 * Run: `node packages/shared/scripts/populate-quran-text.mjs`
 * Requires: Node 20+ (global fetch).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'src', 'data', 'adhkar');

const ROUTINES = ['morning', 'evening', 'sleep', 'waking'];

const ALQURAN_BASE = 'https://api.alquran.cloud/v1/surah';
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions';

// Edition → upstream slug / provider mapping. Must stay in sync with
// packages/shared/src/models/editions.ts.
const EDITIONS = {
  'ar-uthmani':    { provider: 'alquran.cloud', slug: 'quran-uthmani' },
  'en-sahih':      { provider: 'alquran.cloud', slug: 'en.sahih' },
  'en-khattab':    { provider: 'fawazahmed0',   slug: 'eng-mustafakhattaba' },
  'bn-muhiuddin':  { provider: 'alquran.cloud', slug: 'bn.bengali' },
};

const TRANSLATION_EDITIONS = ['en-sahih', 'en-khattab', 'bn-muhiuddin'];

/** Fetch a full surah for one edition; return an array of {ayah, text}. */
async function fetchSurah(editionKey, surahNumber) {
  const meta = EDITIONS[editionKey];
  if (!meta) throw new Error(`Unknown edition ${editionKey}`);

  if (meta.provider === 'alquran.cloud') {
    const url = `${ALQURAN_BASE}/${surahNumber}/${meta.slug}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 200) throw new Error(`${url} → AlQuran.cloud code ${json.code}`);
    return json.data.ayahs.map((a) => ({ ayah: a.numberInSurah, text: a.text }));
  }

  if (meta.provider === 'fawazahmed0') {
    const url = `${CDN_BASE}/${meta.slug}/${surahNumber}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.chapter)) throw new Error(`${url} → malformed shape`);
    return json.chapter.map((v) => ({ ayah: v.verse, text: v.text }));
  }

  throw new Error(`Unknown provider for ${editionKey}`);
}

/** Slice [ayahFrom, ayahTo] from a full-surah array; concatenate to a string. */
function sliceAndJoin(ayahs, ayahFrom, ayahTo) {
  const picked = ayahs.filter((a) => a.ayah >= ayahFrom && a.ayah <= ayahTo);
  if (picked.length === 0) {
    throw new Error(`No ayahs matched range ${ayahFrom}-${ayahTo}`);
  }
  // For a single ayah: return the text plain.
  // For multiple ayahs: insert an ayah-end marker between them so the reader
  // can visually distinguish verse boundaries. Uses U+06DD (Arabic End of
  // Ayah) with the ayah number in Arabic-Indic digits after each verse.
  if (picked.length === 1) return picked[0].text;
  return picked.map((a) => `${a.text} ۝${toArabicIndic(a.ayah)}`).join(' ');
}

function toArabicIndic(n) {
  const map = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(n).split('').map((d) => map[Number(d)] ?? d).join('');
}

/** Cache per-surah responses so a routine that references the same surah
 *  multiple times only hits the API once per edition. */
const surahCache = new Map(); // key = `${edition}:${surah}` → ayah array
async function getSurah(editionKey, surahNumber) {
  const key = `${editionKey}:${surahNumber}`;
  if (!surahCache.has(key)) {
    process.stdout.write(`    fetching ${key}...\n`);
    surahCache.set(key, await fetchSurah(editionKey, surahNumber));
  }
  return surahCache.get(key);
}

async function populateDua(dua) {
  if (!dua.quranRef) return dua;
  const { surah, ayahFrom, ayahTo } = dua.quranRef;

  const arabicAyahs = await getSurah('ar-uthmani', surah);
  dua.arabic = sliceAndJoin(arabicAyahs, ayahFrom, ayahTo);

  dua.translations = dua.translations ?? {};
  for (const ed of TRANSLATION_EDITIONS) {
    try {
      const ayahs = await getSurah(ed, surah);
      dua.translations[ed] = sliceAndJoin(ayahs, ayahFrom, ayahTo);
    } catch (e) {
      console.warn(`  ! failed to fetch ${ed} for ${dua.id}: ${e.message}`);
    }
  }
  return dua;
}

async function processRoutine(name) {
  const path = resolve(DATA_DIR, `${name}.json`);
  const raw = await readFile(path, 'utf8');
  const routine = JSON.parse(raw);
  console.log(`\n[${name}] ${routine.duas.length} duas`);

  for (const dua of routine.duas) {
    if (dua.quranRef) {
      console.log(`  populating ${dua.id} (${dua.source})`);
      await populateDua(dua);
    } else {
      console.log(`  skipping ${dua.id} (no quranRef; hadith-inline)`);
    }
  }

  // Stable key order on output for clean diffs.
  routine.duas.sort((a, b) => a.order - b.order);
  await writeFile(path, JSON.stringify(routine, null, 2) + '\n', 'utf8');
  console.log(`  → wrote ${path}`);
}

async function main() {
  for (const r of ROUTINES) {
    await processRoutine(r);
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
