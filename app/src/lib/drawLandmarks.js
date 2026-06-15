/**
 * Draw MediaPipe landmarks on a canvas overlay.
 */

// Hand connections (finger bones)
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // index
  [0, 9], [9, 10], [10, 11], [11, 12],  // middle
  [0, 13], [13, 14], [14, 15], [15, 16], // ring
  [0, 17], [17, 18], [18, 19], [19, 20], // pinky
  [5, 9], [9, 13], [13, 17],            // palm
];

// Pose connections (upper body only)
const POSE_CONNECTIONS = [
  [11, 12], // shoulders
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], // torso
  [23, 24], // hips
];

/**
 * Draw landmarks on a canvas.
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} landmarks - { leftHand, rightHand, pose }
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {boolean} mirror - Whether to mirror horizontally (for webcam)
 */
export function drawLandmarks(ctx, landmarks, width, height, mirror = false) {
  ctx.clearRect(0, 0, width, height);

  const { leftHand, rightHand, pose } = landmarks;

  // Helper to convert normalized coords to canvas pixels
  const toPixel = (x, y) => {
    const px = mirror ? (1 - x) * width : x * width;
    const py = y * height;
    return [px, py];
  };

  // Draw pose (gray)
  if (pose && pose.length >= 25) {
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;
    
    for (const [a, b] of POSE_CONNECTIONS) {
      if (a < pose.length && b < pose.length) {
        const [x1, y1] = toPixel(pose[a][0], pose[a][1]);
        const [x2, y2] = toPixel(pose[b][0], pose[b][1]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // Draw shoulder midpoint
    const [ls_x, ls_y] = pose[11];
    const [rs_x, rs_y] = pose[12];
    const [mx, my] = toPixel((ls_x + rs_x) / 2, (ls_y + rs_y) / 2);
    ctx.fillStyle = "#0ff";
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw hands
  const drawHand = (hand, color) => {
    if (!hand) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    for (const [a, b] of HAND_CONNECTIONS) {
      if (a < hand.length && b < hand.length) {
        const [x1, y1] = toPixel(hand[a][0], hand[a][1]);
        const [x2, y2] = toPixel(hand[b][0], hand[b][1]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    ctx.fillStyle = color;
    for (const [x, y] of hand) {
      const [px, py] = toPixel(x, y);
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Note: MediaPipe labels are from the camera's POV, so "Left" appears on right side
  // When mirrored, we swap the colors to match user's actual hands
  drawHand(leftHand, "#4CAF50");  // green
  drawHand(rightHand, "#2196F3"); // blue
}
