"""
SignLingo ASL — Gradio Space
gr.Server serves the React/Vite build at /.
POST /api/feedback runs MiniCPM-V 4.6 locally for coaching feedback.

Run ./build.sh first to compile the frontend into gradio_app/dist/.
"""

from gradio import Server
from fastapi import Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import base64
import io
import json
import os
import torch
from PIL import Image

try:
    import spaces
    HAS_ZERO_GPU = True
except ImportError:
    HAS_ZERO_GPU = False

HERE = Path(__file__).parent
DIST = HERE / "dist"

SIGN_DESCRIPTIONS = {}
desc_path = HERE / "sign_descriptions.json"
if desc_path.exists():
    with open(desc_path) as f:
        SIGN_DESCRIPTIONS = json.load(f)

# ── MiniCPM-V 4.6 (lazy load) ────────────────────────────────────────────────
_model = None
_processor = None
MODEL_ID = os.environ.get("MODEL_ID", "openbmb/MiniCPM-V-4.6")
DOWNSAMPLE_MODE = "16x"


def _get_device():
    if torch.cuda.is_available():
        return "cuda", torch.bfloat16
    if torch.backends.mps.is_available():
        return "mps", torch.float16
    return "cpu", torch.float32


def load_model():
    global _model, _processor
    if _model is None:
        from transformers import AutoModelForImageTextToText, AutoProcessor
        hf_token = os.environ.get("HF_TOKEN")
        device, dtype = _get_device()
        print(f"Loading {MODEL_ID} on {device} ({dtype})…")
        _model = AutoModelForImageTextToText.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
            device_map=device if device in ("cuda", "mps") else None,
            token=hf_token,
        )
        _processor = AutoProcessor.from_pretrained(MODEL_ID, token=hf_token)
        _model.eval()
        print("Model ready.")
    return _model, _processor


def _run_vlm_inner(images: list, prompt: str, max_new_tokens: int = 120) -> str:
    model, processor = load_model()
    device = next(model.parameters()).device
    content = [{"type": "image", "image": img} for img in images]
    content.append({"type": "text", "text": prompt})
    messages = [{"role": "user", "content": content}]

    inputs = processor.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_dict=True,
        return_tensors="pt",
        downsample_mode=DOWNSAMPLE_MODE,
        max_slice_nums=1,
    ).to(device)

    with torch.no_grad():
        generated_ids = model.generate(
            **inputs,
            downsample_mode=DOWNSAMPLE_MODE,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=0.7,
        )

    trimmed = [out[len(inp):] for inp, out in zip(inputs.input_ids, generated_ids)]
    return processor.batch_decode(trimmed, skip_special_tokens=True)[0].strip()


if HAS_ZERO_GPU:
    run_vlm = spaces.GPU(_run_vlm_inner)
else:
    run_vlm = _run_vlm_inner
    # Eager load on startup so first request has no cold start
    try:
        load_model()
    except Exception as e:
        print(f"Warning: model preload failed: {e}")


# ── gr.Server ─────────────────────────────────────────────────────────────────
server = Server()


# ── VLM feedback endpoint ─────────────────────────────────────────────────────
@server.post("/api/feedback")
async def api_feedback(request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "invalid json"}, status_code=400)

    user_frames_b64: list = data.get("userFrames", [])
    ref_frames_b64: list = data.get("refFrames", [])
    word: str = data.get("word", "")
    description: str = data.get("description", "")
    score: int = data.get("score", 0)

    if not user_frames_b64:
        return JSONResponse({"error": "no frames"}, status_code=400)

    def decode_frames(raw_list):
        imgs = []
        for raw in raw_list:
            try:
                img = Image.open(io.BytesIO(base64.b64decode(raw.split(",", 1)[-1]))).convert("RGB")
                imgs.append(img)
            except Exception:
                continue
        return imgs

    user_images = decode_frames(user_frames_b64)
    ref_images = decode_frames(ref_frames_b64)

    if not user_images:
        return JSONResponse({"error": "could not decode frames"}, status_code=400)

    try:
        load_model()
    except Exception as e:
        return JSONResponse({"error": f"model load failed: {e}"}, status_code=500)

    if ref_images:
        prompt = (
            f'You are an ASL coach. The student is learning to sign "{word}".\n'
            f"Correct technique: {description}\n\n"
            f"The first {len(ref_images)} images are the REFERENCE (correct sign at 1fps). "
            f"The next {len(user_images)} images are the STUDENT's attempt (score: {score}% at 1fps).\n\n"
            "Compare them and give ONE specific correction. Name exactly what's different — "
            "hand shape, wrist position, movement path, or location. Maximum 2 sentences."
        )
        all_images = ref_images + user_images
    else:
        prompt = (
            f'You are an ASL coach. The student is learning to sign "{word}".\n'
            f"Correct technique: {description}\n\n"
            f"These {len(user_images)} images show the student's attempt at 1fps (score: {score}%).\n"
            "Give ONE specific correction — hand shape, position, or movement. Maximum 2 sentences."
        )
        all_images = user_images

    try:
        feedback = run_vlm(all_images, prompt, max_new_tokens=120)
        return JSONResponse({"feedback": feedback})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ── Sign description endpoint ─────────────────────────────────────────────────
@server.post("/api/describe")
async def api_describe(request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "invalid json"}, status_code=400)

    frames_b64: list = data.get("frames", [])
    word: str = data.get("word", "")

    # Backward compat: single frame
    if not frames_b64 and data.get("frame"):
        frames_b64 = [data.get("frame")]

    if not frames_b64:
        return JSONResponse({"error": "no frames"}, status_code=400)

    images = []
    for fb64 in frames_b64:
        try:
            img_bytes = base64.b64decode(fb64.split(",", 1)[-1])
            images.append(Image.open(io.BytesIO(img_bytes)).convert("RGB"))
        except Exception:
            continue

    if not images:
        return JSONResponse({"error": "bad frames"}, status_code=400)

    try:
        load_model()
    except Exception as e:
        return JSONResponse({"error": f"model load failed: {e}"}, status_code=500)

    n = len(images)
    prompt = (
        f'These {n} images show the sequence of the ASL sign for "{word}" at 1 frame per second. '
        "Describe step-by-step how to perform this sign: starting hand shape and position, "
        "movement, and ending position. Be specific and practical for a learner. 2-3 sentences max."
    )

    try:
        description = run_vlm(images, prompt, max_new_tokens=150)
        return JSONResponse({"description": description})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ── Static React build ────────────────────────────────────────────────────────
if (DIST / "assets").exists():
    server.mount("/assets", StaticFiles(directory=str(DIST / "assets")), name="vite-assets")

if (DIST / "videos").exists():
    server.mount("/videos", StaticFiles(directory=str(DIST / "videos")), name="videos")

if (DIST / "landmarks").exists():
    server.mount("/landmarks", StaticFiles(directory=str(DIST / "landmarks")), name="landmarks")


@server.get("/favicon.svg")
async def favicon():
    f = DIST / "favicon.svg"
    return FileResponse(str(f)) if f.exists() else JSONResponse({})


@server.get("/icons.svg")
async def icons():
    f = DIST / "icons.svg"
    return FileResponse(str(f)) if f.exists() else JSONResponse({})


@server.get("/")
async def root():
    return FileResponse(str(DIST / "index.html"))


@server.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    return FileResponse(str(DIST / "index.html"))


if __name__ == "__main__":
    server.launch(server_name="0.0.0.0", server_port=7860)
