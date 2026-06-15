/**
 * Landmark normalization - matches the Python demo.py _extract() logic.
 * 
 * Normalization steps:
 * 1. Center on shoulder midpoint
 * 2. Scale by shoulder width
 * 3. Apply aspect ratio correction
 * 4. Rotate to correct shoulder roll
 */

/**
 * Flatten landmarks into a single array [x1, y1, z1, x2, y2, z2, ...].
 * Returns zeros if landmarks are null.
 */
function flattenLandmarks(lms, count) {
  if (!lms) {
    return new Array(count * 3).fill(0);
  }
  const flat = [];
  for (const [x, y, z] of lms) {
    flat.push(x, y, z);
  }
  // Pad with zeros if not enough landmarks
  while (flat.length < count * 3) {
    flat.push(0);
  }
  return flat;
}

/**
 * Normalize a frame's landmarks.
 * 
 * @param {Object} frame - { leftHand, rightHand, pose } or { left_hand, right_hand, pose }
 * @param {number} aspectRatio - width / height of the video
 * @returns {Float32Array} Normalized 225-dimensional landmark vector
 */
export function normalizeFrame(frame, aspectRatio = 16 / 9) {
  // Support both camelCase (live) and snake_case (JSON) keys
  const leftHand = frame.leftHand || frame.left_hand;
  const rightHand = frame.rightHand || frame.right_hand;
  const pose = frame.pose;
  
  // Flatten: left_hand (21) + right_hand (21) + pose (33) = 75 landmarks × 3 = 225 values
  const left = flattenLandmarks(leftHand, 21);
  const right = flattenLandmarks(rightHand, 21);
  const poseFlat = flattenLandmarks(pose, 33);

  const lv = new Float32Array([...left, ...right, ...poseFlat]);

  if (pose && pose.length >= 13) {
    // Shoulder landmarks: 11 = left shoulder, 12 = right shoulder
    const [ls_x, ls_y, ls_z] = pose[11];
    const [rs_x, rs_y, rs_z] = pose[12];

    // Shoulder midpoint (reference point)
    const rx = (ls_x + rs_x) / 2;
    const ry = (ls_y + rs_y) / 2;
    const rz = (ls_z + rs_z) / 2;

    // Center on shoulder midpoint
    for (let i = 0; i < lv.length; i += 3) {
      lv[i] -= rx;
      lv[i + 1] -= ry;
      lv[i + 2] -= rz;
    }

    // Apply aspect ratio correction to y-coordinates
    for (let i = 1; i < lv.length; i += 3) {
      lv[i] *= aspectRatio;
    }

    // Scale by shoulder width
    const shoulderWidth = Math.abs(rs_x - ls_x);
    if (shoulderWidth > 0.01) {
      for (let i = 0; i < lv.length; i += 3) {
        lv[i] /= shoulderWidth;
        lv[i + 1] /= shoulderWidth;
      }

      // Shoulder roll correction: rotate so shoulder line is horizontal
      const angle = Math.atan2(
        (rs_y - ls_y) * aspectRatio,
        rs_x - ls_x
      );
      const cosA = Math.cos(-angle);
      const sinA = Math.sin(-angle);

      for (let i = 0; i < lv.length; i += 3) {
        const x = lv[i];
        const y = lv[i + 1];
        lv[i] = x * cosA - y * sinA;
        lv[i + 1] = x * sinA + y * cosA;
      }
    }
  }

  return lv;
}

/**
 * Normalize an entire sequence of frames.
 * 
 * @param {Array} frames - Array of frame objects
 * @param {number} aspectRatio - width / height
 * @returns {Array<Float32Array>} Array of normalized 225-d vectors
 */
export function normalizeSequence(frames, aspectRatio = 16 / 9) {
  return frames.map((frame) => normalizeFrame(frame, aspectRatio));
}
