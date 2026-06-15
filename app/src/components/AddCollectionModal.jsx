import { useState } from "react";

const ICONS = ["📁", "⭐", "🏠", "🍎", "🚗", "❤️", "🎯", "🌟", "🔥", "💡"];

export default function AddCollectionModal({ vocabulary, onAdd, onClose }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [selected, setSelected] = useState(new Set());

  const toggle = (word) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(word)) next.delete(word); else next.add(word);
    return next;
  });

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed || selected.size === 0) return;
    onAdd({
      key: `custom_${Date.now()}`,
      display: trimmed,
      icon,
      words: [...selected],
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New Collection</h2>

        <div className="modal-field">
          <label>Icon</label>
          <div className="icon-picker">
            {ICONS.map((ic) => (
              <button
                key={ic}
                className={`icon-option${icon === ic ? " active" : ""}`}
                onClick={() => setIcon(ic)}
              >{ic}</button>
            ))}
          </div>
        </div>

        <div className="modal-field">
          <label>Name</label>
          <input
            className="modal-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Daily Basics"
            autoFocus
          />
        </div>

        <div className="modal-field">
          <label>Signs ({selected.size} selected)</label>
          <div className="word-picker">
            {vocabulary.map((v) => (
              <button
                key={v.word}
                className={`word-option${selected.has(v.word) ? " active" : ""}`}
                onClick={() => toggle(v.word)}
              >{v.display}</button>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>Cancel</button>
          <button
            className="modal-submit"
            onClick={handleAdd}
            disabled={!name.trim() || selected.size === 0}
          >Create</button>
        </div>
      </div>
    </div>
  );
}
