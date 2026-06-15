/**
 * MediaPipe initialization and landmark extraction for the browser.
 * Uses @mediapipe/tasks-vision WASM bundle.
 */

import { FilesetResolver, HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";

let handLandmarker = null;
let poseLandmarker = null;
let isInitialized = false;

/**
 * Initialize MediaPipe hand and pose landmarkers.
 * Must be called before extracting landmarks.
 */
export async function initMediaPipe() {
  if (isInitialized) return;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
  );

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "CPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "CPU",
    },
    runningMode: "VIDEO",
    minPoseDetectionConfidence: 0.3,
    minPosePresenceConfidence: 0.3,
    minTrackingConfidence: 0.3,
  });

  isInitialized = true;
}

/**
 * Extract raw landmarks from a video frame.
 * 
 * @param {HTMLVideoElement} videoElement - Video element to extract from
 * @param {number} timestampMs - Current timestamp in milliseconds
 * @returns {Object} Raw landmarks: { leftHand, rightHand, pose }
 */
export function extractLandmarks(videoElement, timestampMs) {
  if (!isInitialized) {
    throw new Error("MediaPipe not initialized. Call initMediaPipe() first.");
  }

  const handResults = handLandmarker.detectForVideo(videoElement, timestampMs);
  const poseResults = poseLandmarker.detectForVideo(videoElement, timestampMs);

  // Parse hands using MediaPipe's handedness detection
  // IMPORTANT: MediaPipe detects hand chirality (shape), not anatomical handedness
  // For front-facing cameras, the image is mirrored, so:
  // - MediaPipe "Left" label → user's actual RIGHT hand (mirrored shape looks like left)
  // - MediaPipe "Right" label → user's actual LEFT hand (mirrored shape looks like right)
  // We swap the labels to get anatomical handedness matching the reference videos
  let leftHand = null;
  let rightHand = null;

  if (handResults.landmarks && handResults.handednesses) {
    for (let i = 0; i < handResults.landmarks.length; i++) {
      const landmarks = handResults.landmarks[i];
      const handedness = handResults.handednesses[i];
      const lms = landmarks.map((lm) => [lm.x, lm.y, lm.z]);

      const label = handedness[0]?.categoryName;

      // Swap labels because webcam is mirrored
      if (label === "Left") {
        rightHand = lms;  // MediaPipe "Left" → user's actual right hand
      } else if (label === "Right") {
        leftHand = lms;   // MediaPipe "Right" → user's actual left hand
      }
    }
  }


  // Parse pose
  let pose = null;
  if (poseResults.landmarks && poseResults.landmarks.length > 0) {
    pose = poseResults.landmarks[0].map((lm) => [lm.x, lm.y, lm.z]);
  }

  return { leftHand, rightHand, pose };
}

/**
 * Check if MediaPipe is initialized.
 */
export function isMediaPipeReady() {
  return isInitialized;
}

// IMAGE mode landmarkers for offline video extraction (cached separately from VIDEO mode)
let imgHandLandmarker = null;
let imgPoseLandmarker = null;

async function ensureImageLandmarkers() {
  if (imgHandLandmarker && imgPoseLandmarker) return;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
  );

  imgHandLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "CPU",
    },
    runningMode: "IMAGE",
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  imgPoseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "CPU",
    },
    runningMode: "IMAGE",
    minPoseDetectionConfidence: 0.3,
    minPosePresenceConfidence: 0.3,
    minTrackingConfidence: 0.3,
  });
}

/**
 * Extract landmarks from every frame of an uploaded video file.
 * Matches the Python extract_lp_landmarks.py convention:
 * hands assigned by wrist x-position (leftmost = left_hand).
 *
 * @param {File} file - Video file to process
 * @param {function} onProgress - Called with 0..1 as frames are processed
 * @returns {Object} Landmark JSON in the same format as public/landmarks/*.json
 */
export async function extractLandmarksFromVideoFile(file, onProgress) {
  await ensureImageLandmarkers();

  const blobUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = blobUrl;
  video.muted = true;

  try {
    await new Promise((resolve, reject) => {
      video.addEventListener("loadedmetadata", resolve, { once: true });
      video.addEventListener("error", () => reject(new Error("Failed to load video")), { once: true });
    });

    const duration = video.duration;
    if (!isFinite(duration) || duration <= 0) throw new Error("Invalid video duration");

    const fps = 30;
    const totalFrames = Math.min(Math.ceil(duration * fps), 150);
    const frames = [];

    for (let i = 0; i < totalFrames; i++) {
      video.currentTime = i / fps;
      await new Promise((resolve) => {
        video.addEventListener("seeked", resolve, { once: true });
      });

      const handResults = imgHandLandmarker.detect(video);
      const poseResults = imgPoseLandmarker.detect(video);

      // Assign by wrist x-position (leftmost = left_hand) — same as Python extractor
      let leftHand = null;
      let rightHand = null;
      if (handResults.landmarks.length === 1) {
        const lms = handResults.landmarks[0].map((lm) => [lm.x, lm.y, lm.z]);
        if (lms[0][0] < 0.5) leftHand = lms;
        else rightHand = lms;
      } else if (handResults.landmarks.length >= 2) {
        const hands = handResults.landmarks.map((h) => ({
          lms: h.map((lm) => [lm.x, lm.y, lm.z]),
          wristX: h[0].x,
        }));
        hands.sort((a, b) => a.wristX - b.wristX);
        leftHand = hands[0].lms;
        rightHand = hands[1].lms;
      }

      let pose = null;
      if (poseResults.landmarks && poseResults.landmarks.length > 0) {
        pose = poseResults.landmarks[0].map((lm) => [lm.x, lm.y, lm.z]);
      }

      frames.push({ left_hand: leftHand, right_hand: rightHand, pose });
      if (onProgress) onProgress((i + 1) / totalFrames);
    }

    return {
      total_frames: frames.length,
      fps,
      width: video.videoWidth,
      height: video.videoHeight,
      frames,
    };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
