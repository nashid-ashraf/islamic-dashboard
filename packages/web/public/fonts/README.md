# Quran Arabic fonts

This directory hosts the Arabic font assets served by the PWA.

## Uthmani (default)

No font file is shipped — `Amiri` is assumed already available (Google Fonts, system fallbacks). If a stricter Uthmani rendering is wanted later, add `KFGQPC-HafsEx1Uthmanic.otf` and wire it via `@font-face` in `../src/styles/global.css`.

## IndoPak (FR-EX19 follow-up)

The IndoPak script is **rendered from the cached Uthmani text via font swap** — not a separately-cached edition. The switch is controlled by the `data-quran-script="indopak"` attribute on `<html>`, driven by the Quran Reader's script selector.

To ship a true IndoPak rendering, drop one of these font files here and register it via `@font-face`:

| Font | License | Notes |
|------|---------|-------|
| **Scheherazade New** | SIL Open Font License 1.1 | Safe default — redistributable, good Quranic Unicode coverage. [sil.org](https://software.sil.org/scheherazade/) |
| **Noto Naskh Arabic** | SIL OFL 1.1 | Google-maintained, excellent coverage. Not specifically IndoPak-styled. |
| **Al Majeed Quranic Font** | Unclear — investigate before shipping | Closer to traditional IndoPak visually. |
| **Me_Quran** | Unclear | Widely-used but license status unconfirmed. |

**Blocker:** document the chosen font in `LICENSES.md` (repo root) before the scaffold commit is merged with a real IndoPak font included.

Until a font is added, the IndoPak toggle falls through the CSS font stack to whatever system font is available — meaning the rendering difference may be subtle to invisible. That's fine for the scaffold; a later commit adds the actual font file.
