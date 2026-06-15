import { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import VideoPanel from "./components/VideoPanel";
import WebcamPanel from "./components/WebcamPanel";
import ScoreDisplay from "./components/ScoreDisplay";
import LibraryView from "./components/LibraryView";
import AddSignModal from "./components/AddSignModal";
import AddCollectionModal from "./components/AddCollectionModal";
import AuthButton from "./components/AuthButton";
import { auth, firebaseEnabled } from "./lib/firebase";
import { loadLocalProgress, saveLocalProgress, loadCloudProgress, saveCloudProgress, mergeProgress } from "./lib/progress";
import { VOCABULARY, COLLECTIONS, getVideoUrl, getLandmarksUrl } from "./lib/vocabulary";
import { normalizeSequence } from "./lib/normalize";
import { compareSequences, isPassing, countHandsRaw } from "./lib/dtw";
import { getSigningFeedback, feedbackEnabled } from "./lib/feedback";
import "./App.css";

const PASS_THRESHOLD = 50;
const DTW_THRESHOLD = 15;
const MIN_FRAMES = 15;
const MAX_FRAMES = 120;

function App() {
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [customSigns, setCustomSigns] = useState([]);
  const [view, setView] = useState("practice");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCollectionModal, setShowAddCollectionModal] = useState(false);
  const [customCollections, setCustomCollections] = useState(() => {
    try { return JSON.parse(localStorage.getItem("customCollections") || "[]"); } catch { return []; }
  });
  const [landmarks, setLandmarks] = useState(null);
  const [score, setScore] = useState(null);
  const [passed, setPassed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [completedWords, setCompletedWords] = useState(() => new Set(loadLocalProgress().completedWords));
  const [user, setUser] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [activeCollection, setActiveCollection] = useState(null);

  const vocabulary = [...VOCABULARY, ...customSigns];
  const allCollections = {
    ...COLLECTIONS,
    ...Object.fromEntries(customCollections.map((c) => [c.key, c])),
  };
  const practiceVocabulary = activeCollection
    ? vocabulary.filter((v) => allCollections[activeCollection]?.words.includes(v.word))
    : vocabulary;

  const isRecordingRef = useRef(false);
  const scoreRef = useRef(null);
  const userFramesRef = useRef([]);
  const handDropTimerRef = useRef(null);
  const stopRecordingRef = useRef(null);
  const vocabLenRef = useRef(vocabulary.length);
  const userRef = useRef(null);
  const latestScoreRef = useRef(null);
  const latestPassedRef = useRef(false);
  const feedbackReqRef = useRef(0);

  const addLog = useCallback((msg) => {
    setDebugLogs(prev => [...prev.slice(-9), msg]);
  }, []);

  const currentWord = vocabulary[currentWordIdx];
  const videoUrl = currentWord.videoUrl || getVideoUrl(currentWord.word);

  useEffect(() => { vocabLenRef.current = vocabulary.length; }, [vocabulary.length]);

  // Persist to localStorage on every change
  useEffect(() => { saveLocalProgress(completedWords); }, [completedWords]);
  useEffect(() => { localStorage.setItem("customCollections", JSON.stringify(customCollections)); }, [customCollections]);

  // Firebase auth — sign-in triggers cloud sync
  useEffect(() => {
    if (!firebaseEnabled) return;
    return onAuthStateChanged(auth, async (u) => {
      userRef.current = u;
      setUser(u);
      if (u) {
        try {
          const cloud = await loadCloudProgress(u.uid);
          setCompletedWords((prev) => mergeProgress(prev, cloud.completedWords));
        } catch (err) {
          console.error("[Auth] Failed to load cloud progress:", err);
        }
      }
    });
  }, []);

  // Sync to Firestore whenever completedWords changes and user is signed in
  useEffect(() => {
    if (!firebaseEnabled || !userRef.current) return;
    saveCloudProgress(userRef.current.uid, completedWords).catch(console.error);
  }, [completedWords]);

  // Load reference landmarks when word changes
  useEffect(() => {
    setLandmarks(null);
    setScore(null);
    setPassed(false);
    setFeedback(null);
    setFeedbackLoading(false);
    feedbackReqRef.current++;
    userFramesRef.current = [];

    if (currentWord.landmarks) {
      setLandmarks(currentWord.landmarks);
      return;
    }

    fetch(getLandmarksUrl(currentWord.word))
      .then((res) => res.json())
      .then((data) => {
        setLandmarks(data);
      })
      .catch((err) => console.error("[App] Failed to load landmarks:", err));
  }, [currentWordIdx, customSigns.length]);

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const handleFrame = useCallback((frame) => {
    const hasHands = frame.leftHand || frame.rightHand;

    if (hasHands && !isRecordingRef.current) {
      userFramesRef.current = [];
      scoreRef.current = null;
      isRecordingRef.current = true;
      setScore(null);
      setPassed(false);
      setIsRecording(true);
      setDebugLogs(["Auto-started: hands detected"]);
    }

    if (isRecordingRef.current && hasHands) {
      userFramesRef.current.push(frame);
      if (userFramesRef.current.length > MAX_FRAMES) userFramesRef.current.shift();
      if (handDropTimerRef.current) { clearTimeout(handDropTimerRef.current); handDropTimerRef.current = null; }
    }

    if (isRecordingRef.current && !hasHands) {
      if (!handDropTimerRef.current) {
        handDropTimerRef.current = setTimeout(() => {
          if (userFramesRef.current.length >= MIN_FRAMES && stopRecordingRef.current) {
            setDebugLogs(prev => [...prev, "Auto-stopped: hands dropped"]);
            stopRecordingRef.current();
          }
          handDropTimerRef.current = null;
        }, 1000);
      }
    }
  }, []);

  const startRecording = () => {
    userFramesRef.current = [];
    scoreRef.current = null;
    latestScoreRef.current = null;
    latestPassedRef.current = false;
    feedbackReqRef.current++;
    isRecordingRef.current = false;
    setScore(null);
    setPassed(false);
    setFeedback(null);
    setFeedbackLoading(false);
    setIsRecording(false);
    addLog("Ready - show your hands to start");
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setDebugLogs([]);
    addLog(`User frames: ${userFramesRef.current.length}`);

    if (!landmarks) {
      addLog("ERROR: No landmarks loaded!");
      latestScoreRef.current = 0;
      latestPassedRef.current = false;
      setScore(0);
      setIsRecording(false);
      return;
    }
    if (userFramesRef.current.length < MIN_FRAMES) {
      addLog(`ERROR: Need ${MIN_FRAMES} frames, got ${userFramesRef.current.length}`);
      latestScoreRef.current = 0;
      latestPassedRef.current = false;
      setScore(0);
      setIsRecording(false);
      return;
    }

    const refFrames = landmarks.frames.filter((f) => f.left_hand || f.right_hand);
    addLog(`Ref frames with hands: ${refFrames.length}`);
    if (refFrames.length < MIN_FRAMES) {
      addLog("ERROR: Ref has insufficient hand frames");
      latestScoreRef.current = 0;
      latestPassedRef.current = false;
      setScore(0);
      setIsRecording(false);
      return;
    }

    const userHands = countHandsRaw(userFramesRef.current);
    const refHands = countHandsRaw(refFrames);
    if (userHands.dominantHands !== refHands.dominantHands) {
      const msg = refHands.dominantHands === 2
        ? "This sign uses 2 hands, but you only used 1"
        : "This sign uses 1 hand, but you used 2";
      latestScoreRef.current = 0;
      latestPassedRef.current = false;
      setScore(0);
      setPassed(false);
      setFeedback(msg);
      setIsRecording(false);
      return;
    }

    const aspectRatio = (landmarks.width || 1280) / (landmarks.height || 720);
    const userNorm = normalizeSequence(userFramesRef.current, aspectRatio);
    const refNorm = normalizeSequence(refFrames, aspectRatio);

    const result = compareSequences(userNorm, refNorm, DTW_THRESHOLD);
    addLog(`Distance: ${result.distance.toFixed(3)} → Score: ${result.score}%`);

    latestScoreRef.current = result.score;
    const didPass = isPassing(result.score, PASS_THRESHOLD);
    latestPassedRef.current = didPass;

    // Set score refs before setIsRecording so handleRecordingComplete sees them
    setScore(result.score);
    setPassed(didPass);
    if (didPass) setCompletedWords((prev) => new Set([...prev, currentWord.word]));
    setIsRecording(false);
  };

  useEffect(() => { stopRecordingRef.current = stopRecording; });

  const handleRecordingComplete = useCallback((blob) => {
    if (latestPassedRef.current || latestScoreRef.current === null || !feedbackEnabled) return;
    const reqId = ++feedbackReqRef.current;
    setFeedbackLoading(true);
    getSigningFeedback(blob, currentWord.display, currentWord.description || "", latestScoreRef.current, videoUrl)
      .then((text) => {
        if (feedbackReqRef.current === reqId) {
          setFeedback(text || "AI coaching is temporarily unavailable. Try again in a moment.");
          setFeedbackLoading(false);
        }
      })
      .catch((err) => {
        console.error("[Feedback] Error:", err);
        if (feedbackReqRef.current === reqId) {
          setFeedback("AI coaching is temporarily unavailable. Try again in a moment.");
          setFeedbackLoading(false);
        }
      });
  }, [videoUrl, currentWord.display, currentWord.description]);

  const nextWord = () => {
    const pIdx = practiceVocabulary.findIndex((v) => v.word === vocabulary[currentWordIdx]?.word);
    const next = practiceVocabulary[(pIdx + 1) % practiceVocabulary.length];
    setCurrentWordIdx(vocabulary.findIndex((v) => v.word === next.word));
  };
  const prevWord = () => {
    const pIdx = practiceVocabulary.findIndex((v) => v.word === vocabulary[currentWordIdx]?.word);
    const prev = practiceVocabulary[(pIdx - 1 + practiceVocabulary.length) % practiceVocabulary.length];
    setCurrentWordIdx(vocabulary.findIndex((v) => v.word === prev.word));
  };

  const handlePractice = (idx) => { setCurrentWordIdx(idx); setView("practice"); };

  const handleAddSign = (sign) => {
    setCustomSigns((prev) => [...prev, sign]);
    setCurrentWordIdx(vocabLenRef.current);
    setView("practice");
  };

  const handleAddCollection = (collection) => setCustomCollections((prev) => [...prev, collection]);

  const handleDeleteCollection = (key) => {
    setCustomCollections((prev) => prev.filter((c) => c.key !== key));
    if (activeCollection === key) setActiveCollection(null);
  };

  const handleDeleteSigns = (wordsToDelete) => {
    setCustomSigns((prev) => prev.filter((s) => !wordsToDelete.includes(s.word)));
    // Reset index if current sign was deleted
    if (currentWordIdx >= VOCABULARY.length) {
      const customIdx = currentWordIdx - VOCABULARY.length;
      if (wordsToDelete.includes(customSigns[customIdx]?.word)) {
        setCurrentWordIdx(0);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && score !== null) { e.preventDefault(); startRecording(); }
      else if (e.code === "ArrowRight") nextWord();
      else if (e.code === "ArrowLeft") prevWord();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecording, passed]);

  return (
    <div className="app">
      <header>
        <h1>SignLingo</h1>
        <div className="tabs">
          <button className={`tab${view === "practice" ? " active" : ""}`} onClick={() => setView("practice")}>Practice</button>
          <button className={`tab${view === "library" ? " active" : ""}`} onClick={() => setView("library")}>Library</button>
        </div>
        {firebaseEnabled && <AuthButton user={user} />}
      </header>

      {view === "library" && (
        <LibraryView
          vocabulary={vocabulary}
          builtInCount={VOCABULARY.length}
          currentWordIdx={currentWordIdx}
          completedWords={completedWords}
          onPractice={handlePractice}
          onAddSign={() => setShowAddModal(true)}
          onDeleteSigns={handleDeleteSigns}
          customCollections={customCollections}
          onAddCollection={() => setShowAddCollectionModal(true)}
          onDeleteCollection={handleDeleteCollection}
        />
      )}

      {view === "practice" && (
        <div className="collection-pills practice-collection-pills">
          <button className={`collection-pill${!activeCollection ? " active" : ""}`} onClick={() => setActiveCollection(null)}>All</button>
          {Object.entries(allCollections).map(([key, col]) => (
            <button
              key={key}
              className={`collection-pill${activeCollection === key ? " active" : ""}`}
              onClick={() => setActiveCollection(activeCollection === key ? null : key)}
            >{col.icon} {col.display}</button>
          ))}
        </div>
      )}

      {view === "practice" && (
        <nav className="sign-nav">
          <button className="sign-nav-arrow" onClick={prevWord}>&#8592;</button>
          <div className="progress">
            {practiceVocabulary.map((v) => {
              const i = vocabulary.findIndex((x) => x.word === v.word);
              return (
                <span
                  key={v.word}
                  className={`dot${i === currentWordIdx ? " current" : ""}${completedWords.has(v.word) ? " completed" : ""}`}
                  onClick={() => setCurrentWordIdx(i)}
                  title={v.display}
                />
              );
            })}
          </div>
          <button className="sign-nav-arrow" onClick={nextWord}>&#8594;</button>
        </nav>
      )}

      {view === "practice" && (
        <main>
          <div className="panel left">
            <h2>Reference: {currentWord.display}</h2>
            <VideoPanel videoUrl={videoUrl} landmarks={landmarks} playbackRate={playbackRate} />
            {currentWord.description && <p className="sign-description">{currentWord.description}</p>}
            <div className="speed-controls">
              <button className={playbackRate === 0.5 ? "active" : ""} onClick={() => setPlaybackRate(0.5)}>0.5x</button>
              <button className={playbackRate === 1 ? "active" : ""} onClick={() => setPlaybackRate(1)}>1x</button>
              <button className={playbackRate === 1.5 ? "active" : ""} onClick={() => setPlaybackRate(1.5)}>1.5x</button>
            </div>
          </div>

          <div className="panel right">
            <h2>Your Turn</h2>
            <WebcamPanel onFrame={handleFrame} isRecording={isRecording} onRecordingComplete={handleRecordingComplete} />
            <ScoreDisplay score={score} passed={passed} word={currentWord.display} />
            {feedbackLoading && <p className="feedback feedback-loading">Analyzing your signing...</p>}
            {feedback && <p className="feedback">{feedback}</p>}
            <div className="action-buttons">
              {score !== null ? (
                <button className="record-btn" onClick={startRecording}>Try Again</button>
              ) : isRecording ? (
                <span className="recording-indicator">● Recording... (drop hands to stop)</span>
              ) : (
                <span className="ready-indicator">Show your hands to start</span>
              )}
              {passed && <button className="next-btn" onClick={nextWord}>Next →</button>}
            </div>
          </div>
        </main>
      )}

      {view === "practice" && (
        <footer>
          <p>Show your hands to start recording. Drop hands for 1 second to stop and score.</p>
        </footer>
      )}

      {showAddModal && (
        <AddSignModal onAdd={handleAddSign} onClose={() => setShowAddModal(false)} />
      )}

      {showAddCollectionModal && (
        <AddCollectionModal
          vocabulary={vocabulary}
          onAdd={handleAddCollection}
          onClose={() => setShowAddCollectionModal(false)}
        />
      )}
    </div>
  );
}

export default App;
