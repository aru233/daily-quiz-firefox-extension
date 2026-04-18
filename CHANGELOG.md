# Changelog

## [Unreleased]

---

## [0.1.9] - 2026-04-18
### Fixed
- Cache check now happens before showing the loading screen — cache hits are instant with zero flicker
- `forceRefresh = false` (new tab auto-load): serves from cache if `generatedAt` is within 60 min, otherwise fetches fresh
- `forceRefresh = true` (↺ Refresh, Retry, New Quiz): always bypasses cache and calls Gemini

---

## [0.1.8] - 2026-04-18
### Fixed
- Shuffle each question's options using Fisher-Yates after receiving them from Gemini, updating `correctIndex` to match — prevents correct answer always appearing at position A

---

## [0.1.7] - 2026-04-18
### Fixed
- `gemini.js`: `maxOutputTokens: 8192` was being silently dropped because the `generationConfig` spread overwrote it — fixed by pinning `maxOutputTokens` after the spread
- `gemini.js`: now checks `finishReason === "MAX_TOKENS"` and throws a descriptive error instead of a confusing JSON parse failure
- Tightened prompt output size: enforced hard char limits on each field (q: 140, options: 60, explanation: 120, sourceTitle: 80) to keep total response well within token budget

---

## [0.1.6] - 2026-04-18
### Improved
- Reduced news items sent to Gemini: 6 items per feed (down from 8), snippets capped at 120 chars — smaller prompt = faster response
- Background script set to `persistent: true` so the 60-min pre-warm alarm always fires reliably; subsequent new tabs load from cache instantly
- Loading screen now cycles through step-by-step messages ("Fetching latest headlines…" → "Picking the most important stories…" → "Generating your quiz…") so the wait feels shorter
- Refresh button (↺), Retry, and New Quiz now always bypass cache and force a fresh Gemini call
- `init()` consolidated into `generateAndStart(forceRefresh)` — single code path, cache bypass controlled by a flag

---

## [0.1.5] - 2026-04-18
### Improved
- Rewrote Gemini quiz prompt for higher question quality:
  - Prioritises significant events (policy, elections, conflicts, diplomacy) — skips routine product launches, minor earnings, celebrity news
  - Questions must ask about causes/consequences/implications, not surface facts ("Why did X?" not "In which country did X?")
  - Options must be named concepts/actors/outcomes — all-numeric/percentage option sets are explicitly banned
  - Distractors must be plausible to a news-aware reader (no absurd fillers)
  - Explanations now required to state why the answer matters, not just what it is
  - No more than 2 questions from the same topic area per quiz

---

## [0.1.4] - 2026-04-18
### Fixed
- Removed background script message-passing (`REFRESH_QUIZ`) entirely — non-persistent background scripts go to sleep and cause "Receiving end does not exist" errors
- `newtab.js` now calls `fetchGoogleNewsItems()` + `generateQuiz()` directly
- `popup.js` "Refresh quiz now" button does the same — no runtime messaging
- Added `gemini.js`, `news.js`, `quiz.js` as `<script>` tags in both `newtab.html` and `popup.html`
- Popup error messages no longer auto-dismiss (only success toasts dismiss after 3s)

---

## [0.1.3] - 2026-04-18
### Fixed
- Increased `maxOutputTokens` from 4096 → 8192 to prevent Gemini truncating the JSON mid-response

---

## [0.1.2] - 2026-04-18
### Fixed
- Strip markdown code fences (` ```json ... ``` `) from Gemini response before `JSON.parse` — Gemini was wrapping valid JSON in fences despite `response_mime_type: "application/json"`

---

## [0.1.1] - 2026-04-18
### Fixed
- Moved `host_permissions` entries (`generativelanguage.googleapis.com`, `news.google.com`) into the `permissions` array — `host_permissions` is a Manifest V3 field and unsupported in MV2

---

## [0.1.0] - 2026-04-18
### Added
- Initial extension scaffold as a fresh separate project (`firefox-extension-newsquiz/`)
- `manifest.json` — MV2, new-tab override via `chrome_url_overrides.newtab`, storage + alarms permissions
- `api/gemini.js` — Gemini REST client, default model `gemini-3-flash-preview`
- `api/news.js` — fetches 5 Google News RSS feeds in parallel, dedupes by URL
- `api/quiz.js` — builds prompt, calls Gemini with JSON mode (`response_mime_type`), validates response shape
- `background/background.js` — 60-min alarm + message handler for quiz refresh (later superseded by direct calls)
- `newtab/newtab.html` + `newtab.css` + `newtab.js` — full quiz UI: loading, one-question-at-a-time, score badge, correct/wrong feedback, explanation, source link, results screen, review screen
- `popup/popup.html` + `popup.css` + `popup.js` — settings popup: API key input, model selector, manual refresh button
