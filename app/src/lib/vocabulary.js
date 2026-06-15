export const VOCABULARY = [
  { word: "hello", display: "Hello", description: "Start with an open hand near the face, then raise it to wave or gesture clearly. End with the hand held up and slightly away to complete the Hello sign." },
  { word: "yes", display: "Yes", description: "Start with a relaxed hand at rest. Then move the hand to a clenched fist and point forward. Finally return to a relaxed hand position." },
  { word: "no", display: "No", description: "Start with an open hand, then form a no gesture by moving fingers inward. End with the hand lowered and relaxed, completing the sign." },
  { word: "thank_you", display: "Thank You", description: "Start with an open palm facing forward. Then raise and move the hand to touch the face or chest, ending with the palm down or slightly open." },
  { word: "pain", display: "Pain", description: "Start with both hands near the chest, then move fingers to form a pinching or pointing gesture. End with hands clasped or slightly apart to complete the sign." },
  { word: "head", display: "Head", description: "Start with a hand near the head, then raise it to touch or support the top of the head. End with the hand resting naturally by the side." },
  { word: "back", display: "Back", description: "Start with a relaxed hand at the chest. Then raise the hand to form a back gesture, keeping it near the shoulder. End with the hand lowered, showing the back of the hand." },
  { word: "sick", display: "Sick", description: "Start with one hand raised with fingers extended, then move hands to express the gesture. End with both hands down by the sides to complete the sign." },
  { word: "fever", display: "Fever", description: "Start with the hand near the face forming a shape to cover the eyes. Then move the hand to cover the forehead, indicating the fever sign. Finally return to a neutral position." },
  { word: "medicine", display: "Medicine", description: "Start with hands held apart, then interlock fingers to form a specific shape. Move to position where the hands are clasped or adjusted to convey the sign clearly." },
  { word: "water", display: "Water", description: "Start with an open hand, then raise fingers to form a gesture near the mouth, ending with the hand relaxed at the side." },
  { word: "blood", display: "Blood", description: "Start with hands near the chest, then move to place hands over the chest or above the face. End with hands resting calmly at the sides." },
];

export function getVideoUrl(word) {
  return `/videos/${word}_lp.mp4`;
}

export function getLandmarksUrl(word) {
  return `/landmarks/${word}.json`;
}
