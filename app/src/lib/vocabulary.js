export const VOCABULARY = [
  // Core / general
  { word: "hello", display: "Hello", description: "Start with an open hand near the face, then raise it to wave or gesture clearly. End with the hand held up and slightly away to complete the Hello sign." },
  { word: "yes", display: "Yes", description: "Start with a relaxed hand at rest. Then move the hand to a clenched fist and point forward. Finally return to a relaxed hand position." },
  { word: "no", display: "No", description: "Start with an open hand, then form a no gesture by moving fingers inward. End with the hand lowered and relaxed, completing the sign." },
  { word: "thank_you", display: "Thank You", description: "Start with an open palm facing forward. Then raise and move the hand to touch the face or chest, ending with the palm down or slightly open." },
  { word: "help", display: "Help", description: "Place one fist on top of the opposite flat palm, then raise both hands upward together as if lifting." },

  // Medical / body
  { word: "pain", display: "Pain", description: "Start with both hands near the chest, then move fingers to form a pinching or pointing gesture. End with hands clasped or slightly apart to complete the sign." },
  { word: "head", display: "Head", description: "Start with a hand near the head, then raise it to touch or support the top of the head. End with the hand resting naturally by the side." },
  { word: "back", display: "Back", description: "Start with a relaxed hand at the chest. Then raise the hand to form a back gesture, keeping it near the shoulder. End with the hand lowered, showing the back of the hand." },
  { word: "sick", display: "Sick", description: "Start with one hand raised with fingers extended, then move hands to express the gesture. End with both hands down by the sides to complete the sign." },
  { word: "fever", display: "Fever", description: "Start with the hand near the face forming a shape to cover the eyes. Then move the hand to cover the forehead, indicating the fever sign. Finally return to a neutral position." },
  { word: "medicine", display: "Medicine", description: "Start with hands held apart, then interlock fingers to form a specific shape. Move to position where the hands are clasped or adjusted to convey the sign clearly." },
  { word: "water", display: "Water", description: "Start with an open hand, then raise fingers to form a gesture near the mouth, ending with the hand relaxed at the side." },
  { word: "blood", display: "Blood", description: "Start with hands near the chest, then move to place hands over the chest or above the face. End with hands resting calmly at the sides." },

  // Hospital-specific
  { word: "doctor", display: "Doctor", description: "Start with hands open, palms up, near the chest. Then move the right hand to cover the left hand, forming a gesture that emphasizes the doctor sign. End with hands relaxed, palms facing upward." },
  { word: "nurse", display: "Nurse", description: "Start with the left hand forming a pinch and the right hand open. Then move the left hand's index finger to touch the index finger of the right hand, ending with the left hand holding the right hand's index finger." },
  { word: "emergency", display: "Emergency", description: "Start with an open hand near the face, then move fingers into a small closed gesture, ending with the hand raised and index finger extended." },

  // Bank-specific
  { word: "bank", display: "Bank", description: "Start with a relaxed hand at rest. Raise the index finger vertically to form a point, then hold the finger clearly extended upward signaling the bank sign." },
  { word: "money", display: "Money", description: "Start with hands open, one pointing. Then move the pointing hand downward while keeping the other open. End with both hands relaxed, one holding a gestural position." },
  { word: "pay", display: "Pay", description: "Start with one hand open and the other pointing downward. Then move the pointing hand to form a gesture over the open hand, ending with both hands lowered." },
  { word: "credit_card", display: "Credit Card", description: "Start with a closed fist near the face, then open the palm to form a card shape. End with the hand open and relaxed, showing the sign clearly." },
  { word: "account", display: "Account", description: "Form a curved hand shape and move it in a small circular motion near the palm of the opposite hand, as if counting or tallying. End with hands relaxed." },
  { word: "deposit", display: "Deposit", description: "Start with both hands forming a small V shape in front. Move to point fingers inward to create a closed concave shape, then hold it steady with the V clearly centered." },
  { word: "withdraw", display: "Withdraw", description: "Start with open hands, then move one hand toward the other to withdraw. Place hands together to complete the sign, ensuring clarity and smooth motion." },
];

export const COLLECTIONS = {
  hospital: {
    display: "Hospital",
    icon: "🏥",
    words: ["doctor", "nurse", "pain", "sick", "medicine", "fever", "blood", "emergency"],
  },
  bank: {
    display: "Bank",
    icon: "🏦",
    words: ["bank", "money", "pay", "credit_card", "account", "deposit", "withdraw"],
  },
};

export function getVideoUrl(word) {
  return `/videos/${word}_lp.mp4`;
}

export function getLandmarksUrl(word) {
  return `/landmarks/${word}.json`;
}
