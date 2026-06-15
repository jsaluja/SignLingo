import { useRef, useEffect, useState } from "react";
import { drawLandmarks } from "../lib/drawLandmarks";

/**
 * VideoPanel - Displays the LP reference video with landmark overlay.
 */
export default function VideoPanel({ videoUrl, landmarks, playbackRate = 1 }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastFrameRef = useRef(-1);

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Draw landmarks using requestAnimationFrame for smooth sync
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !landmarks) return;

    const ctx = canvas.getContext("2d");
    let animationId;

    const render = () => {
      // Update current time
      setCurrentTime(video.currentTime);

      // Map video time to frame index
      const fps = landmarks.fps || 30;
      const frameIdx = Math.min(
        Math.floor(video.currentTime * fps),
        landmarks.total_frames - 1
      );

      // Only redraw if frame changed
      if (frameIdx !== lastFrameRef.current && frameIdx >= 0) {
        lastFrameRef.current = frameIdx;

        // Get frame landmarks
        const frame = landmarks.frames?.[frameIdx];
        if (frame) {
          const lms = {
            leftHand: frame.left_hand,
            rightHand: frame.right_hand,
            pose: frame.pose,
          };
          drawLandmarks(ctx, lms, canvas.width, canvas.height, false);
        }
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [landmarks]);

  // Update canvas size and duration when video loads
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const onLoadedMetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      setDuration(video.duration);
    };

    // Handle autoplay safely
    const onCanPlay = async () => {
      try {
        await video.play();
        setIsPlaying(true);
      } catch (err) {
        setIsPlaying(false);
      }
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("canplay", onCanPlay);
    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("canplay", onCanPlay);
    };
  }, [videoUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Handle timeline scrubbing
  const handleScrub = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  // Format seconds with 1 decimal
  const formatTime = (seconds) => seconds.toFixed(1) + "s";

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="video-panel">
      <div className="video-container">
        <video
          ref={videoRef}
          src={videoUrl}
          loop
          muted
          playsInline
          style={{ transform: "scaleX(-1)" }}
        />
        <canvas ref={canvasRef} className="overlay" style={{ transform: "scaleX(-1)" }} />
      </div>
      <div className="controls">
        <button onClick={togglePlay} className="play-btn">
          {isPlaying ? "⏸" : "▶"}
        </button>
        <span className="time-display">{formatTime(currentTime)}</span>
        <div className="timeline-container">
          <input
            type="range"
            className="scrubber"
            min="0"
            max={duration || 1}
            step="0.01"
            value={currentTime}
            onChange={handleScrub}
          />
          <div 
            className="timeline-progress" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="time-display">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
