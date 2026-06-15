---
tags:
  - track:backyard
  - sponsor:openbmb
  - sponsor:openai
  - achievement:offgrid
  - achievement:offbrand
---

# SignLingo

[![Hugging Face Space](https://img.shields.io/badge/Hugging%20Face-Space-ffcc4d?style=for-the-badge)](https://huggingface.co/spaces/build-small-hackathon/SignLingo)
[![Gradio](https://img.shields.io/badge/Gradio-App-f97316?style=for-the-badge)](https://www.gradio.app/)
[![OpenAI Codex](https://img.shields.io/badge/OpenAI-Codex-111827?style=for-the-badge)](https://openai.com/codex/)
[![OpenBMB MiniCPM--V](https://img.shields.io/badge/OpenBMB-MiniCPM--V-2563eb?style=for-the-badge)](https://github.com/OpenBMB/MiniCPM-V)

Practice American Sign Language with real-time webcam feedback and DTW-based scoring.

## Demo

Watch the demo video: https://youtu.be/qynGluC2ZLc

## Social Post

Read the launch post: https://x.com/JaspalS44414885/status/2066665273739092445

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

## Custom signs

Use **Add Sign** in the app to add your own practice items and organize signs into collections.

## Tech

- React + Vite
- MediaPipe Tasks Vision (hand + pose landmarks)
- DTW comparison in JS
- Firebase Auth + Firestore (optional)
