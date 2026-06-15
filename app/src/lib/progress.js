import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const LOCAL_KEY = "signlingo_progress";

export function loadLocalProgress() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : { completedWords: [] };
  } catch {
    return { completedWords: [] };
  }
}

export function saveLocalProgress(completedWords) {
  const arr = completedWords instanceof Set ? [...completedWords] : completedWords;
  localStorage.setItem(LOCAL_KEY, JSON.stringify({ completedWords: arr }));
}

export async function loadCloudProgress(uid) {
  const snap = await getDoc(doc(db, "progress", uid));
  return snap.exists() ? snap.data() : { completedWords: [] };
}

export async function saveCloudProgress(uid, completedWords) {
  const arr = completedWords instanceof Set ? [...completedWords] : completedWords;
  await setDoc(doc(db, "progress", uid), {
    completedWords: arr,
    updatedAt: Date.now(),
  });
}

// Union merge — progress is additive, never regresses across devices
export function mergeProgress(localWords, cloudWords) {
  return new Set([...localWords, ...cloudWords]);
}
