export default function ScoreDisplay({ score, passed, word }) {
  if (score === null) {
    return (
      <div className="score-display waiting">
        <span className="word">{word}</span>
        <span className="instruction">Copy the sign shown on the left</span>
      </div>
    );
  }

  return (
    <div className={`score-display ${passed ? "passed" : "failed"}`}>
      <span className="word">{word}</span>
      <span className="score">{score}%</span>
      {passed && <span className="result">✓ Great!</span>}
    </div>
  );
}
