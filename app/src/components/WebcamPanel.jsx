import { useRef, useEffect, useState, useCallback } from "react";
import { initMediaPipe, extractLandmarks, isMediaPipeReady } from "../lib/mediapipe";
import { drawLandmarks } from "../lib/drawLandmarks";

const MAX_RECORDING_MS = 15000;

export default function WebcamPanel({ onFrame, isRecording, onRecordingComplete }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [handsDetected, setHandsDetected] = useState(false);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const onRecordingCompleteRef = useRef(onRecordingComplete);

  useEffect(() => { onRecordingCompleteRef.current = onRecordingComplete; }, [onRecordingComplete]);

  // Start/stop MediaRecorder based on isRecording prop
  useEffect(() => {
    if (isRecording) {
      if (!streamRef.current) return;
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";
      const chunks = [];
      const mr = new MediaRecorder(streamRef.current, { mimeType });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        onRecordingCompleteRef.current?.(blob);
      };
      mediaRecorderRef.current = mr;
      mr.start();

      const timer = setTimeout(() => {
        if (mr.state === "recording") mr.stop();
      }, MAX_RECORDING_MS);

      return () => {
        clearTimeout(timer);
        if (mr.state === "recording") mr.stop();
      };
    }
  }, [isRecording]);

  const setupCamera = useCallback(async () => {
    setError(null);
    try {
      await initMediaPipe();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      video.srcObject = stream;
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
        video.play();
      });

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      setIsReady(true);
      return true;
    } catch (err) {
      console.error("[Webcam] Setup error:", err);
      setError(err.message);
      return false;
    }
  }, []);

  useEffect(() => {
    let animationId;
    let mounted = true;

    async function setup() {
      const success = await setupCamera();
      if (!success || !mounted) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const ctx = canvas.getContext("2d");
      let lastTime = 0;

      function detect(timestamp) {
        if (!mounted) return;

        if (timestamp - lastTime < 33) {
          animationId = requestAnimationFrame(detect);
          return;
        }
        lastTime = timestamp;

        if (!isMediaPipeReady()) {
          animationId = requestAnimationFrame(detect);
          return;
        }

        const landmarks = extractLandmarks(video, performance.now());
        setHandsDetected(!!(landmarks.leftHand || landmarks.rightHand));
        drawLandmarks(ctx, landmarks, canvas.width, canvas.height, false);
        if (onFrame) onFrame(landmarks);

        animationId = requestAnimationFrame(detect);
      }

      animationId = requestAnimationFrame(detect);
    }

    setup();

    return () => {
      mounted = false;
      if (animationId) cancelAnimationFrame(animationId);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [setupCamera, onFrame]);

  if (error) {
    return (
      <div className="webcam-panel">
        <div className="video-container error-container">
          <div className="error-content">
            <span className="error-icon">📷</span>
            <h3>Camera Access Required</h3>
            <p>{error.includes("Permission") || error.includes("NotAllowed")
              ? "Please allow camera access in your browser settings, then click Retry."
              : error}</p>
            <button className="retry-btn" onClick={setupCamera}>Retry</button>
          </div>
        </div>
        <div className="status-bar">
          <span className="status-dot"></span>
          <span>Camera unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div className="webcam-panel">
      <div className="video-container">
        <video ref={videoRef} playsInline muted style={{ transform: "scaleX(-1)" }} />
        <canvas ref={canvasRef} className="overlay" style={{ transform: "scaleX(-1)" }} />
        {!isReady && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Loading MediaPipe...</p>
          </div>
        )}
        {isRecording && (
          <div className="recording-overlay">
            <span className="rec-dot">●</span> Recording
          </div>
        )}
      </div>
      <div className="status-bar">
        <span className={`status-dot ${handsDetected ? "detected" : ""}`}></span>
        <span>{handsDetected ? "Hands detected" : "Show your hands"}</span>
        {isRecording && <span className="recording-badge">● REC</span>}
      </div>
    </div>
  );
}
