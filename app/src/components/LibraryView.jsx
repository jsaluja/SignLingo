import { useState } from "react";
import { getVideoUrl } from "../lib/vocabulary";

function SignCard({ sign, index, isActive, isCompleted, isCustom, isSelecting, isSelected, onPractice, onToggleSelect }) {
  const videoUrl = sign.videoUrl || getVideoUrl(sign.word);

  const handleClick = () => {
    if (isSelecting && isCustom) {
      onToggleSelect(sign.word);
    }
  };

  return (
    <div 
      className={`sign-card${isActive ? " active" : ""}${isCompleted ? " completed" : ""}${isSelected ? " selected" : ""}${isSelecting && isCustom ? " selectable" : ""}`}
      onClick={handleClick}
    >
      <div className="sign-card-video">
        <video src={videoUrl} autoPlay loop muted playsInline style={{ transform: "scaleX(-1)" }} />
        {isCompleted && <div className="sign-card-badge">✓</div>}
        {isSelecting && isCustom && (
          <div className={`sign-card-checkbox${isSelected ? " checked" : ""}`}>
            {isSelected ? "✓" : ""}
          </div>
        )}
        {isCustom && !isSelecting && <div className="sign-card-custom-badge">Custom</div>}
      </div>
      <div className="sign-card-footer">
        <div className="sign-card-footer-row">
          <span className="sign-card-label">{sign.display}</span>
          {!isSelecting && <button className="sign-card-practice" onClick={(e) => { e.stopPropagation(); onPractice(index); }}>Practice</button>}
        </div>
        {sign.description && <p className="sign-card-description">{sign.description}</p>}
      </div>
    </div>
  );
}

export default function LibraryView({ vocabulary, builtInCount, currentWordIdx, completedWords, onPractice, onAddSign, onDeleteSigns }) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedSigns, setSelectedSigns] = useState(new Set());

  const hasCustomSigns = vocabulary.length > builtInCount;

  const toggleSelect = (word) => {
    setSelectedSigns(prev => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  };

  const handleDelete = () => {
    if (selectedSigns.size > 0 && confirm(`Delete ${selectedSigns.size} sign(s)?`)) {
      onDeleteSigns([...selectedSigns]);
      setSelectedSigns(new Set());
      setIsSelecting(false);
    }
  };

  const handleCancel = () => {
    setSelectedSigns(new Set());
    setIsSelecting(false);
  };

  return (
    <div className="library-view">
      <div className="library-toolbar">
        {!isSelecting ? (
          <>
            <button className="add-sign-btn" onClick={onAddSign}>+ Add Sign</button>
            {hasCustomSigns && (
              <button className="select-btn" onClick={() => setIsSelecting(true)}>Select</button>
            )}
          </>
        ) : (
          <>
            <button className="delete-btn" onClick={handleDelete} disabled={selectedSigns.size === 0}>
              Delete ({selectedSigns.size})
            </button>
            <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
          </>
        )}
      </div>
      <div className="library-grid">
        {vocabulary.map((v, i) => (
          <SignCard
            key={v.word}
            sign={v}
            index={i}
            isActive={i === currentWordIdx}
            isCompleted={completedWords.has(v.word)}
            isCustom={i >= builtInCount}
            isSelecting={isSelecting}
            isSelected={selectedSigns.has(v.word)}
            onPractice={onPractice}
            onToggleSelect={toggleSelect}
          />
        ))}
      </div>
    </div>
  );
}
