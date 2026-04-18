# Daily News Quiz — Firefox Extension

A Firefox new-tab extension that replaces your blank new tab with a 10-question multiple-choice quiz built from today's top headlines. Every time you open a new tab, you get a fresh set of questions drawn from real news — keeping you informed while you browse.

**Demo:** [https://youtu.be/XnaaKU1Ltfk](https://youtu.be/XnaaKU1Ltfk)

---

## What It Does

- **Replaces the new tab page** with a current-affairs quiz
- **Fetches live headlines** from Google News RSS feeds across 5 topic areas: Top Stories, World, Business, Technology, and Nation
- **Generates 10 MCQs** using the Gemini AI API — questions focus on causes, consequences, and implications of events, not just surface facts
- **Shows instant feedback** after each answer: correct/wrong highlighting, a short explanation, and a link to the source article
- **Tracks your score** and shows a results summary at the end, with a full review screen
- **Caches the quiz for 60 minutes** — subsequent new tabs within the hour load instantly without calling Gemini again
- **Pre-warms in the background** every 60 minutes so the quiz is ready when you open a new tab

---

## How It Works

### Architecture

```
New Tab Open
    │
    ▼
Check storage.local cache
    │
    ├── Fresh (< 60 min) ──► Render quiz instantly
    │
    └── Stale / missing
            │
            ▼
    Fetch Google News RSS (5 feeds in parallel)
            │
            ▼
    Send headlines to Gemini API
            │
            ▼
    Parse + validate JSON response
            │
            ▼
    Shuffle option positions + save to cache
            │
            ▼
    Render quiz
```

### Key Files

| File | Purpose |
|---|---|
| `manifest.json` | MV2 manifest — registers new-tab override, permissions, background script |
| `api/gemini.js` | Gemini REST API client (`generateContent`) |
| `api/news.js` | Fetches 5 Google News RSS feeds in parallel, dedupes and trims items |
| `api/quiz.js` | Builds the prompt, calls Gemini with JSON mode, validates + shuffles response |
| `background/background.js` | Persistent background script — pre-warms quiz every 60 min via alarm |
| `newtab/newtab.html/css/js` | Full quiz UI: loading states, question cards, scoring, results, review |
| `popup/popup.html/css/js` | Settings popup — API key input, model selector, manual refresh button |

### News → Quiz Pipeline

1. **RSS fetch** — `news.js` pulls up to 6 items per feed (30 total), strips HTML from snippets and caps them at 120 characters to keep the prompt compact
2. **Prompt engineering** — `quiz.js` sends the trimmed items to Gemini with strict rules: prioritise high-significance events, frame questions around implications not trivia, ban all-numeric option sets, enforce character limits on all fields
3. **JSON mode** — Gemini is called with `response_mime_type: "application/json"` and `maxOutputTokens: 8192` to get structured output directly
4. **Option shuffling** — After receiving questions, options are shuffled with Fisher-Yates and `correctIndex` is updated to match, preventing the correct answer from always appearing at position A

---

## Setup & Installation

### Prerequisites
- Firefox (any recent version)
- A [Google AI Studio](https://aistudio.google.com/app/apikey) API key (free tier works)

### Load the Extension

1. Open Firefox and navigate to `about:debugging`
2. Click **"This Firefox"** in the left sidebar
3. Click **"Load Temporary Add-on…"**
4. Select `manifest.json` from this folder
5. The extension is now active — you'll see the quiz icon in your toolbar

> **Note:** Temporary add-ons are removed when Firefox restarts. To persist across restarts, the extension would need to be signed via [addons.mozilla.org](https://addons.mozilla.org).

### Configure Your API Key

1. Click the **✦ Daily News Quiz** icon in the Firefox toolbar
2. Paste your Google AI Studio API key into the input field
3. Click **Save**
4. Optionally select a different Gemini model from the dropdown (default: `gemini-3-flash-preview`)

### Open a New Tab

Open any new tab — the extension will fetch headlines and generate your quiz. The first load takes ~10–20 seconds (Gemini call). Subsequent tabs within 60 minutes load instantly from cache.

---

## Usage

| Action | How |
|---|---|
| Start quiz | Open a new tab |
| Answer a question | Click any of the 4 options |
| See explanation + source | Automatically shown after answering |
| Next question | Click **Next →** |
| See final score | Automatically shown after question 10 |
| Review all answers | Click **Review Answers** on the results screen |
| Get fresh questions | Click **↺** in the top-right of the quiz, or **New Quiz** on results |
| Force refresh from popup | Open toolbar popup → click **Refresh quiz now** |
| Change API key or model | Open toolbar popup → edit and save |

---

## Customisation

| Setting | Where | Default |
|---|---|---|
| Gemini model | Toolbar popup → Model dropdown | `gemini-3-flash-preview` |
| Cache TTL | `newtab/newtab.js` → `CACHE_TTL_MS` | 60 minutes |
| Items per RSS feed | `api/news.js` → `ITEMS_PER_FEED` | 6 |
| News topics | `api/news.js` → `NEWS_FEEDS` array | Top Stories, World, Business, Technology, Nation |
| Number of questions | `api/quiz.js` → prompt + `slice(0, 10)` | 10 |

---

## Icons

The `icons/` directory contains placeholder PNGs. Replace `icon16.png`, `icon48.png`, and `icon96.png` with your own artwork at those exact sizes — no code changes needed, just reload the extension.

---

## Known Limitations

- **Temporary install only** — not signed for permanent installation; needs AMO submission for that
- **Cold load latency** — first quiz generation takes ~10–20s depending on Gemini response time
- **RSS snippet quality** — Google News snippets are short; Gemini generates questions from limited context, so occasionally a question may feel thin
- **Rate limits** — if you refresh very frequently, you may hit Google AI Studio's free-tier rate limits

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a full history of changes.
