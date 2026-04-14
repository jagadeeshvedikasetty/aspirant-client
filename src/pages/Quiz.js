import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';

const STORAGE_KEY = 'aspirant_quiz_state';

function Quiz() {
  const location = useLocation();
  const navigate = useNavigate();

  // Try to restore questions from sessionStorage on refresh, fallback to location.state
  const questions = useMemo(() => {
    const fromState = location.state?.questions;
    if (fromState && fromState.length > 0) return fromState;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.questions || [];
      }
    } catch {}
    return [];
  }, [location.state]);

  const initialTimerSeconds = useMemo(() => {
    const fromState = location.state?.timerSeconds;
    if (fromState) return fromState;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.initialTimerSeconds || 3600;
      }
    } catch {}
    return 3600;
  }, [location.state]);

  // Restore state from sessionStorage if available (browser refresh)
  const savedState = useMemo(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only restore if questions match (same quiz session)
        if (parsed.questions && parsed.questions.length === questions.length) {
          return parsed;
        }
      }
    } catch {}
    return null;
  }, [questions.length]);

  const [current, setCurrent] = useState(savedState?.current || 0);
  const [answers, setAnswers] = useState(savedState?.answers || {});
  const [visited, setVisited] = useState(savedState?.visited || { 0: true });
  const [marked, setMarked] = useState(savedState?.marked || {});
  const [timeLeft, setTimeLeft] = useState(savedState?.timeLeft ?? initialTimerSeconds);
  const timerRef = useRef(null);

  useEffect(() => {
    setVisited(prev => ({ ...prev, [current]: true }));
  }, [current]);

  useEffect(() => {
    if (questions.length === 0) {
      navigate('/', { replace: true });
    }
  }, [questions, navigate]);

  // Persist state to sessionStorage on every change
  useEffect(() => {
    if (questions.length === 0) return;
    try {
      const stateToSave = {
        questions,
        initialTimerSeconds,
        current,
        answers,
        visited,
        marked,
        timeLeft
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch {}
  }, [questions, initialTimerSeconds, current, answers, visited, marked, timeLeft]);

  // Timer
  useEffect(() => {
    if (questions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [questions.length]);

  const handleSubmit = useCallback(() => {
    // Clear saved state on submit
    sessionStorage.removeItem(STORAGE_KEY);
    navigate('/result', { state: { questions, answers } });
  }, [navigate, questions, answers]);

  useEffect(() => {
    if (timeLeft === 0 && questions.length > 0) {
      handleSubmit();
    }
  }, [timeLeft, questions.length, handleSubmit]);

  if (questions.length === 0) return null;

  const q = questions[current];

  // ================= HANDLERS =================

  const handleOption = (idx) => {
    setAnswers(prev => ({ ...prev, [current]: idx }));
  };

  const handleSaveNext = () => {
    // BUG FIX: Clear "marked" flag when saving an answered question
    // so palette turns green instead of staying yellow
    if (answers[current] !== undefined && marked[current]) {
      setMarked(prev => {
        const updated = { ...prev };
        delete updated[current];
        return updated;
      });
    }

    if (current < questions.length - 1) {
      const next = current + 1;
      setCurrent(next);
      setVisited(prev => ({ ...prev, [next]: true }));
    }
  };

  const handleMarkAndNext = () => {
    setMarked(prev => ({ ...prev, [current]: true }));

    if (current < questions.length - 1) {
      const next = current + 1;
      setCurrent(next);
      setVisited(prev => ({ ...prev, [next]: true }));
    }
  };

  const handleJumpTo = (idx) => {
    setCurrent(idx);
    setVisited(prev => ({ ...prev, [idx]: true }));
  };

  // ================= STATS =================

  const answeredCount = Object.keys(answers).length;

  const notAnsweredCount = Object.keys(visited).filter(
    k => answers[k] === undefined
  ).length;

  const markedCount = Object.keys(marked).filter(k => marked[k]).length;

  // ================= HELPERS =================

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return {
      h: String(h).padStart(2, '0'),
      m: String(m).padStart(2, '0'),
      s: String(s).padStart(2, '0')
    };
  };

  const getTimerClass = () => {
    if (timeLeft <= 60) return 'exam-timer urgent';
    if (timeLeft <= 300) return 'exam-timer warning';
    return 'exam-timer';
  };

  const time = formatTime(timeLeft);

  // Auto-fit: compute question font scale based on text length
  const questionLen = q.questionText ? q.questionText.length : 0;
  const qFontSize = questionLen > 800 ? '0.78rem'
    : questionLen > 500 ? '0.85rem'
    : questionLen > 300 ? '0.92rem'
    : '1rem';

  // ================= UI =================

  return (
    <div className="exam-wrapper">

      {/* TOPBAR */}
      <div className="exam-topbar">
        {/* Left: Question Number */}
        <div className="exam-topbar-left">
          <span className="topbar-qnum">Question No. {current + 1}</span>
        </div>

        {/* Center: Timer */}
        <div className="exam-topbar-timer-wrap">
          <div className={getTimerClass()}>
            <span className="timer-label">Time Left</span>
            <div className="timer-boxes">
              <span className="timer-box">{time.h}</span>
              <span className="timer-sep">:</span>
              <span className="timer-box">{time.m}</span>
              <span className="timer-sep">:</span>
              <span className="timer-box">{time.s}</span>
            </div>
          </div>
        </div>

        {/* Right: Total Answered */}
        <div className="exam-topbar-right">
          <div className="total-answered-chip">
            Total Questions Answered: <strong>{answeredCount}</strong>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS BAR */}
      <div className="exam-action-bar">
        <div className="action-buttons-group">
          <button
            className={`btn-topbar btn-review ${marked[current] ? 'btn-review-active' : ''}`}
            onClick={handleMarkAndNext}
          >
            Mark for Review &amp; Next
          </button>

          <button className="btn-topbar btn-save-next" onClick={handleSaveNext}>
            Save &amp; Next
          </button>

          <button className="btn-topbar btn-submit-top" onClick={handleSubmit}>
            Submit Test
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="exam-layout">

        {/* SIDEBAR */}
        <div className="exam-sidebar">
          {/* DIV 1: General Intelligence — scrollable question grid */}
          <div className="sidebar-section sidebar-navigator">
            <h3 className="sidebar-title">General Intelligence</h3>

            <div className="question-grid-scroll">
              <div className="question-grid">
                {questions.map((_, i) => {
                  let status = 'not-visited';

                  if (marked[i]) status = 'marked';
                  else if (answers[i] !== undefined) status = 'answered';
                  else if (visited[i]) status = 'not-answered';

                  return (
                    <div
                      key={i}
                      className={`grid-cell ${status} ${current === i ? 'current' : ''}`}
                      onClick={() => handleJumpTo(i)}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* DIV 2: PART-A Analysis — pinned at bottom */}
          <div className="sidebar-section analytics-panel">
            <h3 className="sidebar-title analytics-title-bar">PART-A Analysis</h3>

            <table className="analytics-table">
              <tbody>
                <tr>
                  <td className="analytics-label">Answered</td>
                  <td className="analytics-value answered-val">{answeredCount}</td>
                </tr>
                <tr>
                  <td className="analytics-label">Not Answered</td>
                  <td className="analytics-value not-answered-val">{notAnsweredCount}</td>
                </tr>
                <tr>
                  <td className="analytics-label">Marked for Review</td>
                  <td className="analytics-value marked-val">{markedCount}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* QUESTION AREA */}
        <div className="exam-question-area">
          <div className="question-card">
            <div className="question-num">
              Question No. {current + 1}
              {marked[current] && <span className="mark-indicator">📌 MARKED</span>}
            </div>

            <div
              className="question-text rich-content"
              style={{ fontSize: qFontSize }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.questionText) }}
            />

            <div className="options-list">
              {q.options.map((opt, idx) => (
                <label
                  key={idx}
                  className={`option-radio ${answers[current] === idx ? 'selected' : ''}`}
                  onClick={() => handleOption(idx)}
                >
                  <span className="radio-circle">
                    <input
                      type="radio"
                      name={`question-${current}`}
                      checked={answers[current] === idx}
                      onChange={() => handleOption(idx)}
                    />
                    <span className="radio-dot"></span>
                  </span>
                  <span
                    className="opt-text rich-content"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(opt) }}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Quiz;