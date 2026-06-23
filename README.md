# Drift — Your Voice, Unflattened

> AI helps you write faster. **Drift makes sure it still sounds like you.**

Drift is a voice-preservation studio for creators, students, and writers who use AI drafts but don't want their personal voice to flatten into generic AI writing. It builds a measurable fingerprint of your writing, detects where AI has flattened your voice, and helps restore only the parts that drifted.

**Drift is not an AI detector. Drift is not an AI humanizer.** It doesn't care whether AI wrote something. It cares whether it still sounds like the person it's supposed to sound like.

For young creators, students, and writers who use AI but still want their work to sound like themselves.

## How It Works

1. **Paste your real writing** — Add 3+ samples. Drift builds your voice fingerprint.
2. **Paste any draft** — AI-generated, co-written, edited by someone else. Drift doesn't judge the source.
3. **See where your voice drifted** — Every sentence is scored. Green = aligned. Yellow = slight drift. Red = heavy drift. Each flagged sentence shows specific reasons.
4. **Restore your voice** — Click "Restore my voice" to get rewrite suggestions that match your fingerprint. See a Voice Receipt proving what changed.

## Features

### Editor (Default Tab)
The first thing you see. Includes a guided demo strip: "Try Drift in 30 seconds" with step-by-step buttons.
- Real-time drift score (0–100)
- Sentence-level highlighting by severity
- Drift reasons per sentence (rhythm, vocabulary, punctuation, AI-cliche)
- "Restore my voice" rewrite suggestions (mock + LLM-powered with API key)
- Voice Lock toggle with tooltip
- Voice Receipt with before/after scores, changes, and copy button
- Platform modes: General, Social, Essay, Newsletter, Blog, Application, Founder

### Voice Profile
Build and calibrate your writing fingerprint.
- 5 demo profiles: Casual Posts, Thoughtful Essays, Founder Updates, Student Reflection, Technical Blog
- Fingerprint cards: sentence rhythm, punctuation, vocabulary, common phrases, filler words, paragraph rhythm
- **Voice Calibration** — Drift holds back one sample as a blind test to prove the fingerprint can recognize your writing. Judges have not seen this feature before.
- Voice archetype detection (The Puncher, The Thinker, The Questioner, etc.)
- "Do Not Flatten" traits — things AI tends to erase from your voice
- Sample quality warnings and confidence meter

### Compare
The demo wow moment. Side-by-side draft comparison.
- Two compass gauges with drift scores
- **Hero verdict**: "Draft B is 42 points closer to your voice"
- Trait match breakdown: horizontal bars for rhythm, contractions, cliches, punctuation, fillers
- "Where the voice disappeared" — computed insights about specific differences
- Sentence-level alignment with color-coded drift status
- Suggested restoration plan with actionable steps
- One-click demo loading

### Voyage Log
Proves the social value story: creators slowly losing their voice over time.
- Timeline chart of drift scores
- Headline stats: average drift, latest, total drafts, trend
- Emotional narrative: "Your last 5 drafts became 18% more generic after AI assistance"
- Recent analyses list with timestamps
- Local-only privacy note

### Voice DNA
Your writing fingerprint, visualized and shareable.
- Voice archetype (name + description)
- Rhythm, punctuation, vocabulary, and formality signatures
- **"Do Not Flatten" warnings** — traits AI should never erase
- Confidence score with visual meter
- Signature phrases as tags
- Dark-background shareable card with PNG export
- Text copy button

### About
Explains the mission. Scroll-snapping full-screen sections with intersection-observer animations.

## Hackathon Judging Alignment

| Category | How Drift Delivers |
|----------|-------------------|
| **Originality** | Voice preservation, not detection/humanizing. Voice Calibration is a novel technical proof. Voice archetypes haven't been done. |
| **Presentation** | Guided 30-second demo. Compare tab is the wow moment. Voice DNA is the closing screenshot. |
| **Social Value** | For young creators and students using AI — protects personal voice and self-expression. Voyage Log makes invisible drift visible. |
| **UI/UX** | Warm light/dark theme, compass motif, sentence-level highlights, polished receipts, guided onboarding, empty states. |
| **Technical** | Client-side stylometry, voice calibration holdout test, Web Worker scoring, LLM rewrite pipeline with mock fallback, CSS variable theming. |
| **Impact** | Any creator using AI can use Drift today, locally, with zero setup. Works without an API key. |

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + CSS custom properties (light/dark mode)
- **NLP**: compromise.js for sentence parsing
- **Scoring**: Custom stylometric z-score engine with voice archetype classification
- **Worker**: Web Worker for non-blocking live scoring
- **Storage**: IndexedDB via idb-keyval (local, no account required)
- **Export**: html-to-image for PNG card generation
- **LLM (optional)**: Gemini or OpenAI for voice-aware rewrites (falls back to deterministic mock)

## Local Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

### Enable AI rewrites (optional)

Create a `.env.local` file in the project root:

```env
# Use one or both — Gemini is checked first
VITE_GEMINI_KEY=AIzaSy...
# VITE_OPENAI_KEY=sk-...
```

Restart the dev server after adding the file. Without a key, everything works using local mock rewrites.

## Docker Setup

```bash
docker compose up --build
```

Open http://localhost:8080

## How Scoring Works 

Drift's scoring is deterministic and measurable — not vibes.

It compares these measurable writing traits between your draft and your voice fingerprint:
- **Sentence rhythm** — average length, variance, short/long mix
- **Contraction rate** — "don't" vs "do not" ratio
- **AI cliche density** — phrases like "in today's fast-paced world", "leverage", "innovative"
- **Formality level** — passive voice, corporate vocabulary, transition words
- **Filler word frequency** — "honestly", "actually", "basically"
- **Punctuation habits** — em-dashes, exclamation points, question marks

Each trait is computed locally using z-score deviation from the profile baseline. The drift score is a weighted combination normalized to 0–100.

AI is used only for rewrite suggestions (optional, requires API key). The scoring itself never touches an API.

Voice Calibration proves the system works: it holds back one of your samples, builds a fingerprint from the rest, then checks whether it can recognize the held-back sample. If it can, the fingerprint is real.

## Privacy

**Local by default.** Writing samples, voice profiles, drift history, and receipts are stored in IndexedDB in your browser. Nothing is transmitted to any server.

Draft text is sent to Gemini or OpenAI **only** if you explicitly provide an API key (via `.env.local` or localStorage). Without a key, all features — scoring, analysis, calibration, compare — work fully offline using deterministic local computation. The API key is stored in `.env.local` (gitignored, never committed) or in your browser's localStorage. It is sent only to the respective API endpoint, nowhere else.

## Architecture

```
src/
├── app/App.tsx              # Tab shell, state, dark mode, profile selector
├── components/
│   ├── EditorTab.tsx        # Guided demo + editor + platform modes + rewrites
│   ├── VoiceProfileTab.tsx  # Calibration + demo picker + fingerprint cards
│   ├── CompareTab.tsx       # Sentence alignment + trait breakdown + restoration plan
│   ├── VoyageLogTab.tsx     # Emotional narrative + timeline + stats
│   ├── VoiceDNATab.tsx      # Archetype + signatures + do-not-flatten + export
│   ├── AboutTab.tsx         # Scroll-snap sections with intersection animations
│   └── CompassGauge.tsx     # Animated SVG compass
├── lib/
│   ├── stylometry.ts        # Scoring engine + archetype + calibration
│   ├── rewrite.ts           # Mock + LLM rewrite pipeline
│   ├── headings.ts          # IndexedDB CRUD
│   ├── demoData.ts          # 5 demo profiles + compare texts
│   └── scoringWorker.ts     # Web Worker
└── index.css                # CSS variables, light/dark tokens, Tailwind layers
```

---
Your voice is your competitive advantage. Keep it.
