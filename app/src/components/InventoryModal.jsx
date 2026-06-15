import { VOCABULARY } from "../lib/vocabulary";

export default function InventoryModal({
  vocabulary,
  currentWordIdx,
  completedWords,
  onNavigate,
  onDelete,
  onClose,
}) {
  const builtInCount = VOCABULARY.length;

  const handleNavigate = (i) => {
    onNavigate(i);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal inventory-modal" onClick={(e) => e.stopPropagation()}>
        <div className="inventory-header">
          <h2>Sign Library</h2>
          <button className="inventory-close" onClick={onClose}>✕</button>
        </div>

        <section>
          <div className="inventory-section-label">Built-in ({builtInCount})</div>
          <div className="inventory-grid">
            {vocabulary.slice(0, builtInCount).map((v, i) => (
              <button
                key={v.word}
                className={`inventory-card${i === currentWordIdx ? " active" : ""}${completedWords.has(v.word) ? " completed" : ""}`}
                onClick={() => handleNavigate(i)}
              >
                <span className="inventory-card-label">{v.display}</span>
                {completedWords.has(v.word) && <span className="inventory-check">✓</span>}
              </button>
            ))}
          </div>
        </section>

        {vocabulary.length > builtInCount && (
          <section>
            <div className="inventory-section-label">Custom ({vocabulary.length - builtInCount})</div>
            <div className="inventory-grid">
              {vocabulary.slice(builtInCount).map((v, relIdx) => {
                const absIdx = builtInCount + relIdx;
                return (
                  <div
                    key={v.word}
                    className={`inventory-card custom${absIdx === currentWordIdx ? " active" : ""}${completedWords.has(v.word) ? " completed" : ""}`}
                  >
                    <button
                      className="inventory-card-main"
                      onClick={() => handleNavigate(absIdx)}
                    >
                      <span className="inventory-card-label">{v.display}</span>
                      {completedWords.has(v.word) && <span className="inventory-check">✓</span>}
                    </button>
                    <button
                      className="inventory-delete"
                      onClick={() => onDelete(absIdx)}
                      title="Remove sign"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
