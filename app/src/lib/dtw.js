/**
 * Dynamic Time Warping (DTW) implementation for comparing landmark sequences.
 * Handles speed differences between the reference and user sign.
 */

/**
 * Compute Euclidean distance between two landmark vectors.
 */
function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Compute DTW distance between two sequences.
 * 
 * @param {Array<Float32Array>} seq1 - First sequence of landmark vectors
 * @param {Array<Float32Array>} seq2 - Second sequence of landmark vectors
 * @returns {number} DTW distance (lower = more similar)
 */
export function dtwDistance(seq1, seq2) {
  const n = seq1.length;
  const m = seq2.length;

  if (n === 0 || m === 0) {
    return Infinity;
  }

  // Create cost matrix with infinity edges
  const dtw = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(Infinity)
  );
  dtw[0][0] = 0;

  // Fill the matrix
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = euclideanDistance(seq1[i - 1], seq2[j - 1]);
      dtw[i][j] = cost + Math.min(
        dtw[i - 1][j],     // insertion
        dtw[i][j - 1],     // deletion
        dtw[i - 1][j - 1]  // match
      );
    }
  }

  // Normalize by path length
  return dtw[n][m] / (n + m);
}

/**
 * Convert DTW distance to a 0-100 similarity score.
 * Lower distance = higher score.
 * 
 * @param {number} distance - DTW distance
 * @param {number} threshold - Distance at which score is ~50%
 * @returns {number} Score from 0-100
 */
export function distanceToScore(distance, threshold = 0.5) {
  // Sigmoid-like mapping: score = 100 / (1 + (distance / threshold)^2)
  const ratio = distance / threshold;
  const score = 100 / (1 + ratio * ratio);
  return Math.round(score);
}

/**
 * Compute similarity score between two landmark sequences.
 * 
 * @param {Array<Float32Array>} userSeq - User's landmark sequence (normalized)
 * @param {Array<Float32Array>} refSeq - Reference landmark sequence (normalized)
 * @param {number} threshold - Calibration threshold
 * @returns {{ distance: number, score: number }}
 */
export function compareSequences(userSeq, refSeq, threshold = 0.5) {
  if (userSeq.length === 0 || refSeq.length === 0) {
    return { distance: Infinity, score: 0 };
  }

  const distance = dtwDistance(userSeq, refSeq);
  const score = distanceToScore(distance, threshold);
  return { distance, score };
}

/**
 * Determine pass/fail based on score.
 * 
 * @param {number} score - Similarity score (0-100)
 * @param {number} passThreshold - Minimum score to pass (default 70)
 * @returns {boolean}
 */
export function isPassing(score, passThreshold = 70) {
  return score >= passThreshold;
}

export function countHandsRaw(frames) {
  let leftCount = 0, rightCount = 0;
  for (const f of frames) {
    if (f.leftHand) leftCount++;
    if (f.rightHand) rightCount++;
  }
  const dominantHands = (leftCount > frames.length * 0.3 ? 1 : 0) + (rightCount > frames.length * 0.3 ? 1 : 0);
  return { leftCount, rightCount, dominantHands };
}
