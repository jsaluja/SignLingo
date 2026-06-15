const FRAME_FPS = 5;

async function extractFramesFromBlob(blob) {
  const url = URL.createObjectURL(blob);
  try {
    return await extractFramesFromUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function extractFramesFromUrl(url) {
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.crossOrigin = "anonymous";

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = resolve;
    video.onerror = reject;
  });

  const duration = video.duration;
  const interval = 1 / FRAME_FPS;
  const MAX_W = 1280, MAX_H = 720;
  const scale = Math.min(1, MAX_W / (video.videoWidth || MAX_W), MAX_H / (video.videoHeight || MAX_H));
  const w = Math.round((video.videoWidth || MAX_W) * scale);
  const h = Math.round((video.videoHeight || MAX_H) * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const frames = [];

  for (let t = 0; t < duration; t += interval) {
    video.currentTime = t;
    await new Promise((r) => { video.onseeked = r; });
    ctx.drawImage(video, 0, 0, w, h);
    frames.push(canvas.toDataURL("image/jpeg", 0.75));
  }

  return frames;
}

export async function getSigningFeedback(videoBlob, word, description, score, referenceVideoUrl) {
  if (!videoBlob) return null;

  let userFrames, refFrames;
  try {
    [userFrames, refFrames] = await Promise.all([
      extractFramesFromBlob(videoBlob),
      referenceVideoUrl ? extractFramesFromUrl(referenceVideoUrl) : Promise.resolve([]),
    ]);
  } catch (err) {
    console.error("[feedback] frame extraction failed:", err);
    return null;
  }

  if (userFrames.length === 0) return null;

  try {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userFrames, refFrames, word, description, score }),
    });

    if (!res.ok) {
      console.error("[feedback] server error:", res.status);
      return null;
    }

    const data = await res.json();
    return data.feedback || null;
  } catch (err) {
    console.error("[feedback] fetch error:", err);
    return null;
  }
}

export const feedbackEnabled = true;

export async function generateSignDescription(videoFile, word) {
  let frames = [];
  try {
    frames = await extractFramesFromBlob(videoFile instanceof Blob ? videoFile : new Blob([videoFile]));
  } catch {
    return null;
  }

  if (frames.length === 0) return null;

  try {
    const res = await fetch("/api/describe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frames, word }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.description || null;
  } catch {
    return null;
  }
}
