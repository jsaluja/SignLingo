import { useState, useRef } from "react";
import { extractLandmarksFromVideoFile } from "../lib/mediapipe";
import { generateSignDescription } from "../lib/feedback";

export default function AddSignModal({ onAdd, onClose }) {
  const [label, setLabel] = useState("");
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const acceptFile = (f) => {
    if (!f || !f.type.startsWith("video/")) {
      setError("Please select a video file.");
      return;
    }
    setFile(f);
    setError(null);
    if (!label) {
      const name = f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      setLabel(name.charAt(0).toUpperCase() + name.slice(1));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    acceptFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!label.trim() || !file || extracting) return;
    setExtracting(true);
    setProgress(0);
    setProgressMsg("Initializing...");
    setError(null);

    try {
      const landmarks = await extractLandmarksFromVideoFile(file, (p) => {
        setProgress(p);
        setProgressMsg(`Extracting frames ${Math.round(p * 100)}%`);
      });

      let description = null;
      setProgressMsg("Generating description...");
      description = await generateSignDescription(file, label.trim());

      const videoUrl = URL.createObjectURL(file);
      const word = label.trim().toLowerCase().replace(/\s+/g, "_");
      onAdd({ word, display: label.trim(), videoUrl, landmarks, description });
      onClose();
    } catch (err) {
      setError(err.message || "Extraction failed");
      setExtracting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={extracting ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add a Sign</h2>

        <div className="modal-field">
          <label>Label</label>
          <input
            type="text"
            placeholder="e.g. Help"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={extracting}
            autoFocus
          />
        </div>

        <div
          className={`drop-zone${isDragging ? " dragging" : ""}${file ? " has-file" : ""}`}
          onClick={() => !extracting && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            style={{ display: "none" }}
            onChange={(e) => acceptFile(e.target.files[0])}
          />
          {file ? (
            <span className="drop-filename">{file.name}</span>
          ) : (
            <>
              <span className="drop-icon">🎬</span>
              <span>Drop a video or click to browse</span>
            </>
          )}
        </div>

        {extracting && (
          <div className="extraction-progress">
            <div className="progress-msg">{progressMsg}</div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          </div>
        )}

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose} disabled={extracting}>
            Cancel
          </button>
          <button
            className="modal-submit"
            onClick={handleSubmit}
            disabled={!label.trim() || !file || extracting}
          >
            {extracting ? "Processing..." : "Add Sign"}
          </button>
        </div>
      </div>
    </div>
  );
}
