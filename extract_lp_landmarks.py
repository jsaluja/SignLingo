#!/usr/bin/env python3
"""
Extract RAW landmarks from Lifeprint (LP) videos for SignLingo.

Outputs: data/lp_landmarks/{word}.json
- Raw x, y, z coordinates (no normalization)
- Normalization is done in JS at comparison time

Usage:
    python extract_lp_landmarks.py              # Process all LP videos
    python extract_lp_landmarks.py hello fever  # Process specific words
"""

import os
import sys
import json
import glob
import cv2
import numpy as np

# Paths
REPO_DIR = os.path.dirname(os.path.abspath(__file__))
LP_VIDEO_DIR = os.path.join(REPO_DIR, "data", "raw_lifeprint")
OUTPUT_DIR = os.path.join(REPO_DIR, "data", "lp_landmarks")
HAND_TASK = os.path.join(REPO_DIR, "hand_landmarker.task")
POSE_TASK = os.path.join(REPO_DIR, "pose_landmarker_lite.task")


def make_landmarkers():
    """Initialize MediaPipe hand and pose landmarkers."""
    import mediapipe as mp
    from mediapipe.tasks import python as mpp
    from mediapipe.tasks.python import vision as mpv
    from mediapipe.tasks.python.vision.core.vision_task_running_mode import VisionTaskRunningMode

    hand_lm = mpv.HandLandmarker.create_from_options(
        mpv.HandLandmarkerOptions(
            base_options=mpp.BaseOptions(model_asset_path=HAND_TASK),
            running_mode=VisionTaskRunningMode.IMAGE,
            num_hands=2,
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
    )
    pose_lm = mpv.PoseLandmarker.create_from_options(
        mpv.PoseLandmarkerOptions(
            base_options=mpp.BaseOptions(model_asset_path=POSE_TASK),
            running_mode=VisionTaskRunningMode.IMAGE,
            min_pose_detection_confidence=0.3,
            min_pose_presence_confidence=0.3,
            min_tracking_confidence=0.3,
        )
    )
    return hand_lm, pose_lm


def extract_frame_landmarks(rgb, hand_lm, pose_lm):
    """
    Extract RAW landmarks from a single frame.
    
    Returns dict with:
      - left_hand: [[x, y, z], ...] × 21 landmarks or null
      - right_hand: [[x, y, z], ...] × 21 landmarks or null  
      - pose: [[x, y, z], ...] × 33 landmarks or null
      
    Note: Hands are assigned by wrist x-position (leftmost = left_hand),
    not by MediaPipe's unreliable handedness label.
    """
    import mediapipe as mp
    rgb = np.ascontiguousarray(rgb)
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    
    hr = hand_lm.detect(mp_img)
    pr = pose_lm.detect(mp_img)
    
    # Parse hands by POSITION (wrist x-coordinate), not handedness label
    # This ensures consistent identity across frames
    left_hand = None
    right_hand = None
    
    if len(hr.hand_landmarks) == 1:
        # Single hand: assign based on which side of frame center it's on
        hand_lms = hr.hand_landmarks[0]
        lms = [[lm.x, lm.y, lm.z] for lm in hand_lms]
        wrist_x = hand_lms[0].x  # wrist is landmark 0
        if wrist_x < 0.5:
            left_hand = lms
        else:
            right_hand = lms
    elif len(hr.hand_landmarks) >= 2:
        # Two hands: sort by wrist x-position (leftmost = left)
        hands_with_x = []
        for hand_lms in hr.hand_landmarks:
            lms = [[lm.x, lm.y, lm.z] for lm in hand_lms]
            wrist_x = hand_lms[0].x
            hands_with_x.append((wrist_x, lms))
        hands_with_x.sort(key=lambda h: h[0])  # sort by wrist x
        left_hand = hands_with_x[0][1]   # leftmost
        right_hand = hands_with_x[1][1]  # rightmost
    
    # Parse pose
    pose = None
    if pr.pose_landmarks:
        pose = [[lm.x, lm.y, lm.z] for lm in pr.pose_landmarks[0]]
    
    return {
        "left_hand": left_hand,
        "right_hand": right_hand,
        "pose": pose,
    }


def extract_video_landmarks(video_path, hand_lm, pose_lm):
    """
    Extract landmarks from all frames of a video.
    
    Returns dict with:
      - frames: list of frame landmarks
      - fps: video frame rate
      - width: video width
      - height: video height
      - total_frames: number of frames processed
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    frames = []
    frame_idx = 0
    
    while True:
        ret, bgr = cap.read()
        if not ret:
            break
        
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        lms = extract_frame_landmarks(rgb, hand_lm, pose_lm)
        lms["frame_idx"] = frame_idx
        frames.append(lms)
        frame_idx += 1
    
    cap.release()
    
    return {
        "fps": fps,
        "width": width,
        "height": height,
        "total_frames": len(frames),
        "frames": frames,
    }


def get_word_from_filename(filename):
    """Extract word from LP video filename (e.g., 'thank_you_lp.mp4' -> 'thank_you')."""
    basename = os.path.basename(filename)
    # Remove _lp.mp4 suffix
    return basename.replace("_lp.mp4", "")


def main():
    # Parse arguments
    words_to_process = sys.argv[1:] if len(sys.argv) > 1 else None
    
    # Check for task files
    if not os.path.exists(HAND_TASK):
        print(f"ERROR: Hand task file not found: {HAND_TASK}")
        sys.exit(1)
    if not os.path.exists(POSE_TASK):
        print(f"ERROR: Pose task file not found: {POSE_TASK}")
        sys.exit(1)
    
    # Find videos to process
    video_files = sorted(glob.glob(os.path.join(LP_VIDEO_DIR, "*_lp.mp4")))
    if not video_files:
        print(f"ERROR: No LP videos found in {LP_VIDEO_DIR}")
        sys.exit(1)
    
    # Filter by words if specified
    if words_to_process:
        video_files = [
            v for v in video_files 
            if get_word_from_filename(v) in words_to_process
        ]
        if not video_files:
            print(f"ERROR: No videos found for words: {words_to_process}")
            sys.exit(1)
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Initialize MediaPipe
    print("Initializing MediaPipe landmarkers...")
    hand_lm, pose_lm = make_landmarkers()
    
    # Process each video
    for video_path in video_files:
        word = get_word_from_filename(video_path)
        output_path = os.path.join(OUTPUT_DIR, f"{word}.json")
        
        print(f"Processing: {word}...")
        
        try:
            data = extract_video_landmarks(video_path, hand_lm, pose_lm)
            data["word"] = word
            data["source_video"] = os.path.basename(video_path)
            
            # Count frames with hand detections
            hands_detected = sum(
                1 for f in data["frames"] 
                if f["left_hand"] or f["right_hand"]
            )
            
            with open(output_path, "w") as f:
                json.dump(data, f, indent=2)
            
            print(f"  → {output_path}")
            print(f"     {data['total_frames']} frames, {hands_detected} with hands, {data['fps']:.1f} fps")
            
        except Exception as e:
            print(f"  ERROR: {e}")
    
    print("\nDone!")


if __name__ == "__main__":
    main()
