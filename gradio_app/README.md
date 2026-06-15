---
title: SignLingo ASL Coach
emoji: 🤟
colorFrom: blue
colorTo: indigo
sdk: gradio
app_file: app.py
pinned: true
license: mit
hardware: zero-gpu
tags:
  - asl
  - sign-language
  - mediapipe
  - minicpm
  - education
  - backyard-ai
  - build-small
  - off-brand
  - tiny-titan
---

# SignLingo ASL Coach

Learn American Sign Language with real-time AI coaching. Built for the **Hugging Face × Gradio Build Small** hackathon.

## What it does

- Watch the reference ASL sign on the left
- Sign in front of your webcam on the right
- **MediaPipe** detects your hands automatically — recording starts when you raise your hands, stops when you drop them
- **DTW (Dynamic Time Warping)** scores your attempt against the reference in real time
- On a failed attempt, frames from your recording are sent to **MiniCPM-V** which returns one specific coaching tip

## How it works

- Hand + pose landmarks extracted in-browser via MediaPipe WASM (no server round-trip for detection)
- Normalized landmark sequences compared with DTW for a 0–100 similarity score
- Failed attempts: 1-2fps frames → MiniCPM-V 4.6 → natural language coaching tip
- No cloud APIs — scoring runs entirely in the browser; coaching runs on HF Zero GPU

## Tech Stack

| Component | Choice |
|-----------|--------|
| Frontend | React + Vite served via `gr.Server` |
| Hand detection | MediaPipe Tasks Vision (WASM, in-browser) |
| Scoring | DTW on normalized landmark sequences |
| Coaching VLM | MiniCPM-V 4.6 on HF Zero GPU |
| Reference Signs | Lifeprint ASL Dictionary |

## Vocabulary (12 signs)

Hello, Yes, No, Thank You, Pain, Head, Back, Sick, Fever, Medicine, Water, Blood

## Demo Video

[Link to demo video]

## Social Post

[Link to social post]

## Built for

**Hugging Face × Gradio "Build Small" Hackathon** — Track: Backyard AI (Practical)

Made with care for the deaf and hard-of-hearing community.
