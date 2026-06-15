# SignLingo — Plan

## Concept
Duolingo-style ASL teaching app. Side-by-side: LP reference video (left) + user webcam (right).
User mirrors the sign, app scores how close they are. Pass → advance to next sign.

Separate from sign-bridge conversation demo. No LLM, no server, no training.

## Key Decision: No ASL Transformer, No Training Required

The LP video IS the reference. Pre-extract its landmarks once, store as JSON.
At runtime, compare user's live landmarks to stored LP landmarks via DTW.

Adding new vocabulary = just add the LP video. No retraining ever.

## Full Pipeline

### One-time prep (Python script)
```
LP video → MediaPipe → save RAW landmarks as JSON (no normalization)
```
Script: `extract_lp_landmarks.py` (to be written)
Output: `data/lp_landmarks/{word}.json` — one file per sign, raw landmarks

### Runtime (browser, fully offline)
```
Webcam → MediaPipe WASM → raw landmarks
                                ↓
         normalize both sequences in JS at comparison time
                                ↓
              DTW → score → pass/fail UI
```

## Normalization (done in JS at DTW time, not at extraction time)
Normalize both the stored LP sequence and the live user sequence in JS before comparing.
This eliminates any Python↔JS mismatch — Python only extracts raw landmarks, JS owns all normalization.

Normalization steps (port from `demo.py` `_extract()`):
- Shoulder-centered coordinates
- Scaled by shoulder width
- Rotation-corrected (shoulder roll)

Storing raw landmarks also means re-normalization strategies can be changed without re-running the prep script.

## Tech Stack
- **MediaPipe JS** (`@mediapipe/tasks-vision`) — landmark extraction in browser (WASM)
- **DTW in JS** — ~30 lines, no library needed, handles speed differences between user and LP signer
- **React** (or plain HTML/JS to start)
- **LP videos** as static assets
- **No backend, no model, no server**

## UI Layout
```
LEFT panel                    RIGHT panel
──────────────────────────    ──────────────────────────
LP video (loops)              Webcam + landmark overlay

[slow] [▶] [fast] scrubber

"Sign: THANK YOU"             [  THANK YOU  ✓ 92%  ]

                              [Try again]  [Next →]
```

## Scoring
- DTW distance between normalized user landmark sequence and stored LP landmark sequence
- One threshold (tune globally or per-sign) → pass/fail
- Calibrate by having a few people test it

## Vocabulary Scaling
- Current LP videos: `data/raw_lifeprint/{word}_lp.mp4`
- Current words (hospital scenario): back, blood, fever, head, hello, medicine, no, pain, thank_you, yes
- Adding new scenarios = add LP videos + run prep script. No retraining.

## Files Already Useful from sign-bridge
- `demo.py` — `_extract()` normalization logic to port to JS
- `data/raw_lifeprint/` — LP videos already downloaded
- `SCRIPT.md` — hospital scenario script (first lesson)

## Build Order
1. `extract_lp_landmarks.py` — Python script: run MediaPipe on each LP video, normalize, save JSON
2. Browser MediaPipe setup — get webcam landmarks working in JS with same normalization
3. DTW scoring in JS — compare live sequence to stored JSON, return 0-100 score
4. Basic UI — LP video left, webcam right, score display, pass/fail, advance
5. Lesson mode — sequence signs in order (hospital script), track progress
6. Polish — slow-mo scrubber, session score

## Instruction for New Conversation

Paste this into a new Claude Code session opened in `/Users/jaspal/Documents/GitHub/sign-bridge`:

> Read ASL_TEACHING_APP_PLAN.md and build the ASL teaching app starting from step 1.
> Repo already has LP videos in data/raw_lifeprint/ and normalization logic in demo.py _extract().
> Start with extract_lp_landmarks.py, then move to the browser JS app.
