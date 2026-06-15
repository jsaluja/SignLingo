# SignLingo — Practical Usefulness Roadmap

## Current State (implemented)

- 12 hospital-scenario ASL signs in `vocabulary.js`
- Videos + landmark JSON files in `public/videos/` and `public/landmarks/`
- DTW scoring compares live webcam landmarks to pre-extracted JSON
- **Practice tab** — reference video left, webcam right, auto-detection, scoring
- **Library tab** — video grid of all signs with completion status, click to practice, Add Sign button

---

## Decisions Made

- **No custom/built-in distinction** — all signs are equal in the library. Add Sign adds to the same flat grid.
- **Library is a top-level tab**, not a modal. Video cards with autoplay previews.
- **No streak counter** — removed, added noise without value.

---

## Idea A: Google Sign-In + Cross-Device Progress Sync ✓ implemented

**Architecture decision:** localStorage is always the primary store (works offline, no account needed). Firebase is the sync layer — opt-in, not required.

- Sign in once per device (Firebase persists the session — no re-login on every visit)
- On sign-in: pull cloud progress, merge with local via union (progress is additive, never regresses)
- On progress change: save to localStorage immediately + fire-and-forget to Firestore
- Firestore offline mode queues writes when offline, flushes when back online
- Users who never sign in: app works exactly as today — localStorage only, fully offline
- Different devices: sign in → Firestore pulls merged progress → resume where you left off

**Status:** implemented. App works fully offline without Firebase. Auth button only shows when `VITE_FIREBASE_*` env vars are present.

---

## Idea B: Generative AI Capabilities

The app currently uses MediaPipe (landmark detection) + DTW (comparison). GenAI adds a coaching layer that rules cannot provide.

### B1: Natural Language Feedback ✓ implemented
A score of 43% tells the user nothing actionable. MiniCPM-V analyzes the signing attempt and returns specific coaching: *"Your wrist is rotating the wrong direction — keep your palm facing outward."* Replaces "try again" with actual instruction.

**Architecture:** MediaRecorder captures the webcam stream as a WebM video clip during the signing attempt (capped at 15s). On a failed attempt, frames are extracted at 1.5fps and POSTed to `/api/feedback` where MiniCPM-V compares them against the sign description. Feedback appears below the score bar automatically. No feedback on passed attempts.

### B2: Conversation Practice Mode
Chain signs in context rather than isolated drills. App displays a scenario prompt — *"The doctor asks: where does it hurt?"* — user signs the response. AI validates in context. This is how real communication works and what makes it a teaching app, not a quiz.

### B3: Sign Description Generation ✓ implemented
Feed a video frame for any sign to MiniCPM-V → get a natural language how-to description auto-generated. No manual authoring needed.

**Architecture:** When adding a custom sign, a frame from the uploaded video is sent to `/api/describe` where MiniCPM-V generates a one-sentence how-to description. Built-in signs have hand-written descriptions in `vocabulary.js`. Descriptions show below each library card and below the reference video in Practice view.

### B4: Personalized Lesson Planner
Feed the user's history (signs passed, attempt counts, scores) to an LLM → generates a prioritized practice session: *"You've struggled with MEDICINE and BLOOD — drill those first, then introduce FEVER."*

### B5: Real-Time Coaching
Multimodal streaming watches the user sign live and gives continuous voice feedback. No button press, no wait — always-on coaching loop.

### B6: Scenario / Lesson Pack Generation
*"Generate a 5-sign restaurant scenario for a beginner"* — LLM picks signs, sequences them, writes the dialogue prompts. Lets teachers create lesson packs without touching code.

---

## Idea 2: Lesson Packs / Scenarios

Right now there is one hardcoded hospital scenario. Structure lessons as swappable packs.

- **Built-in packs**: hospital, restaurant, transport, emergency, school
- Each pack has a name, icon, and ordered word list
- Progress tracked per-pack in localStorage
- Pack switcher in the Library view header

---

## Idea 3: Record-Your-Own Reference

Let a fluent signer record a reference video directly in the app.

- "Teach a sign" mode: signer types the word, records themselves signing via webcam
- App extracts landmarks from the recording in real time (already running for scoring)
- Saves video + landmark JSON to localStorage, shows up in Library alongside built-in signs
- Export as a bundle; import on another device

This is the right path for custom signs — landmarks are extracted from a live webcam session
(which already works) rather than seeking through an uploaded video file.

---

## Idea 4: Mirror / Study Mode

Before scoring, let the user study the sign interactively.

- Side-by-side: reference video plays, webcam shows live landmarks overlaid
- No scoring — just observe alignment in real time
- Ghost overlay of reference landmarks on the webcam canvas

---

## Idea 5: Session Summary

After completing all signs in a pack:
- Results screen: which passed, which failed, time taken
- Replay worst-scoring attempts
- Export as CSV (useful for therapists, teachers)

---

## Idea 6: Configurable Pass Threshold

- Easy / Medium / Strict slider (35 / 50 / 70)
- Lets beginners feel progress while experts push for accuracy

---

## Priority Order

| Priority | Feature | Effort | Impact |
|---|---|---|---|
| A | Google Sign-In + cross-device progress | Low | High — enables multi-device, accounts |
| B1 | VLM feedback on signing attempts | Medium | Very high — core coaching gap |
| B2 | Conversation practice mode | Medium | High — teaches real usage |
| 2 | Lesson packs / scenarios | Low | High — more content immediately |
| 3 | Record-your-own reference | Medium | High — enables adding signs properly |
| B4 | Personalized lesson planner | Low | Medium — personalization |
| 4 | Mirror / study mode | Low | Medium — better learning UX |
| 5 | Session summary | Low | Medium — motivation/tracking |
| B5 | Real-time coaching | High | High — but complex |
| 6 | Configurable pass threshold | Very low | Low |
