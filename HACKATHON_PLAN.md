# SignLingo ASL — Hackathon Plan

## Hackathon: Hugging Face × Gradio "Build Small"
**Deadline:** Jun 15, 23:59 UTC (tomorrow!)

### Requirements
- ✅ Models ≤ 32B parameters
- ✅ Gradio app deployed to HuggingFace Spaces
- ✅ Demo video
- ✅ Social media post
- ✅ Tagged README

### Track
**Backyard AI** (Practical) — ASL teaching app that runs locally

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **VLM** | MiniCPM-V 2.6 (~8B) | Hackathon sponsor, strong vision, under 32B |
| **Framework** | Gradio | Required by hackathon |
| **Deployment** | HuggingFace Spaces | Required by hackathon |
| **Frame sampling** | 1-2 fps | Simple, consistent |
| **Feedback style** | Natural language | "Rotate wrist outward" not "In frame 3..." |
| **Sign descriptions** | Detailed JSON | Rich step-by-step instructions |
| **Reference** | Video frames + text description | Compare user attempt to reference |

---

## Architecture

```
Gradio Interface
├── Video Input (webcam recording)
├── Reference Video Display
├── Sign Selector (dropdown)
└── Feedback Output (text)

Backend (Python):
1. User uploads/records signing video
2. Extract frames at 1-2 fps from both user + reference
3. Load sign description from JSON
4. MiniCPM-V compares:
   - User frames
   - Reference frames  
   - Text description
5. Generate natural language feedback
```

---

## Todos

### Phase 1: Core (Today)
- [ ] Create `gradio_app/` directory structure
- [ ] Create `sign_descriptions.json` with detailed descriptions
- [ ] Build Gradio interface with video upload + reference display
- [ ] Implement frame extraction (1-2 fps)
- [ ] Integrate MiniCPM-V for feedback generation
- [ ] Test locally

### Phase 2: Deploy (Tonight)
- [ ] Create HuggingFace Space in Build Small org
- [ ] Upload app with requirements.txt
- [ ] Record demo video
- [ ] Post on social media
- [ ] Update README with tags + writeup

---

## Sign Descriptions Format

```json
{
  "yes": {
    "word": "yes",
    "display": "Yes", 
    "description": "Fist nodding motion. Dominant hand forms a fist (like the letter S). Fist moves up and down repeatedly at the wrist, mimicking a head nodding yes. Located in neutral signing space in front of the body. 2-3 small nodding movements. One hand used (dominant)."
  }
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `gradio_app/app.py` | Main Gradio application |
| `gradio_app/sign_descriptions.json` | Detailed sign descriptions |
| `gradio_app/requirements.txt` | Python dependencies |
| `gradio_app/videos/` | Reference videos |
| `gradio_app/README.md` | HuggingFace Space README |

---

## Model Options (≤32B)

| Model | Size | Notes |
|-------|------|-------|
| **MiniCPM-V 2.6** | ~8B | Hackathon sponsor (OpenBMB prize), current choice |
| MiniCPM-V 4.6 | ~1.3B | Tinier, qualifies for Tiny Titan badge ($1.5k) |
| Gemma-4-12B | 12B | Google multimodal, runs on HF Zero GPU — `google/gemma-4-12B`. Option if MiniCPM quality insufficient, but loses OpenBMB sponsor prize eligibility. NOT implemented. |
| Qwen2-VL-7B | 7B | Strong baseline |

---

## Prompt Template

```
You are an ASL (American Sign Language) coach. 

REFERENCE SIGN: {sign_name}
How to perform it correctly: {description}

I'm showing you two sets of video frames:
1. REFERENCE frames - the correct way to sign "{sign_name}"
2. LEARNER frames - a student's attempt

Compare the learner's attempt to the reference and give ONE specific, encouraging tip to improve. 
Focus on hand shape, position, or movement. 
Be direct and practical - no frame numbers, just describe what to adjust.
Keep it to 1-2 sentences max.
```
