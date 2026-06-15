---
tags:
  - track:backyard
  - sponsor:openbmb
  - sponsor:openai
  - achievement:offgrid
  - achievement:offbrand
---

# SignLingo

Practice American Sign Language with real-time webcam feedback and DTW-based scoring.

## Demo

Watch the demo video: https://youtu.be/qynGluC2ZLc

## What it does

- **Practice tab** — reference LP video on the left, live webcam with MediaPipe landmark detection on the right. Show your hands to auto-start recording, drop them to stop and score.
- **Library tab** — browse all signs as video cards, click Practice to jump to any sign.
- **DTW scoring** — compares your landmark sequence to the reference using Dynamic Time Warping, handles speed differences.
- **Google Sign-In** (optional) — cross-device progress sync via Firebase. Works fully offline without an account.

## Setup

```bash
cd app
npm install
npm run dev
```

App runs at http://localhost:5173

## Firebase (optional)

Copy `app/.env.example` to `app/.env` and fill in your Firebase project config to enable Google Sign-In and cross-device progress sync. See `firestore.rules` for the required Firestore security rules.

## Adding signs

Run `extract_lp_landmarks.py` to extract landmarks from new LP videos:

```bash
pip install mediapipe opencv-python
python extract_lp_landmarks.py
```

Requires `hand_landmarker.task` and `pose_landmarker_lite.task` in the repo root.

## Tech

- React + Vite
- MediaPipe Tasks Vision (hand + pose landmarks)
- DTW comparison in JS
- Firebase Auth + Firestore (optional)
