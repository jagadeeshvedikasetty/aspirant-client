import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';

const STORAGE_KEY = 'aspirant_quiz_state';
const MOBILE_BREAKPOINT = 768;

function Quiz() {
  const location = useLocation();
  const navigate = useNavigate();

  // Try to restore questions from sessionStorage on refresh, fallback to location.state
  const testId = useMemo(() => {
    const fromState = location.state?.testId;
    if (fromState) return fromState;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.testId || null;
      }
    } catch {}
    return null;
  }, [location.state]);

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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const timerRef = useRef(null);

  // Mobile state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerView, setDrawerView] = useState('grid'); // 'grid' or 'list'

  // Detect mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
      if (window.innerWidth > MOBILE_BREAKPOINT) setDrawerOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        testId,
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
    sessionStorage.removeItem(STORAGE_KEY);
    navigate('/result', { state: { questions, answers, testId } });
  }, [navigate, questions, answers, testId]);

  useEffect(() => {
    if (timeLeft === 0 && questions.length > 0) {
      handleSubmit();
    }
  }, [timeLeft, questions.length, handleSubmit]);

  // Fullscreen toggle
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullScreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullScreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFSChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  if (questions.length === 0) return null;

  const q = questions[current];

  // ================= HANDLERS =================

  const handleOption = (idx) => {
    setAnswers(prev => ({ ...prev, [current]: idx }));
  };

  const handleClearResponse = () => {
    setAnswers(prev => {
      const updated = { ...prev };
      delete updated[current];
      return updated;
    });
  };

  const handleSaveNext = () => {
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
    if (isMobile) setDrawerOpen(false);
  };

  // ================= STATS =================

  const answeredCount = Object.keys(answers).length;
  const notAnsweredCount = Object.keys(visited).filter(k => answers[k] === undefined).length;
  const markedCount = Object.keys(marked).filter(k => marked[k]).length;
  const markedAndAnsweredCount = Object.keys(marked).filter(k => marked[k] && answers[k] !== undefined).length;
  const notVisitedCount = questions.length - Object.keys(visited).length;

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

  const questionLen = q.questionText ? q.questionText.length : 0;
  const qFontSize = questionLen > 800 ? '0.78rem'
    : questionLen > 500 ? '0.85rem'
    : questionLen > 300 ? '0.92rem'
    : '1rem';

  // Question status helper
  const getStatus = (i) => {
    if (marked[i] && answers[i] !== undefined) return 'marked-answered';
    if (marked[i]) return 'marked';
    if (answers[i] !== undefined) return 'answered';
    if (visited[i]) return 'not-answered';
    return 'not-visited';
  };

  // ================= MOBILE UI =================

  if (isMobile) {
    return (
      <div className="m-exam-wrapper">
        {/* MOBILE TOP BAR */}
        <div className="m-topbar">
          <div className="m-topbar-timer">
            <span className="m-timer-text">{time.h}:{time.m}:{time.s}</span>
          </div>
          <button className="m-hamburger" onClick={() => setDrawerOpen(true)}>
            <span></span><span></span><span></span>
          </button>
        </div>

        {/* MOBILE QUESTION AREA */}
        <div className="m-question-area">
          <div className="m-question-badge">{current + 1}</div>

          <div
            className="m-question-text rich-content"
            style={{ fontSize: qFontSize }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.questionText) }}
          />

          <div className="m-options-list">
            {q.options.map((opt, idx) => (
              <div
                key={idx}
                className={`m-option-card ${answers[current] === idx ? 'selected' : ''}`}
                onClick={() => handleOption(idx)}
              >
                <span className="m-option-num">{idx + 1}.</span>
                <span
                  className="m-option-text rich-content"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(opt) }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* MOBILE BOTTOM BAR */}
        <div className="m-bottom-bar">
          <button className="m-btn m-btn-mark" onClick={handleMarkAndNext}>
            Mark &amp; Next
          </button>
          <button className="m-btn m-btn-clear" onClick={handleClearResponse}>
            Clear
          </button>
          <button className="m-btn m-btn-save" onClick={handleSaveNext}>
            Save &amp; Next
          </button>
        </div>

        {/* DRAWER OVERLAY */}
        {drawerOpen && (
          <div className="m-drawer-overlay" onClick={() => setDrawerOpen(false)} />
        )}

        {/* MOBILE DRAWER */}
        <div className={`m-drawer ${drawerOpen ? 'open' : ''}`}>
          {/* Drawer tabs */}
          <div className="m-drawer-tabs">
            <button
              className={`m-drawer-tab ${drawerView === 'grid' ? 'active' : ''}`}
              onClick={() => setDrawerView('grid')}
            >
              Grid View
            </button>
            <button
              className={`m-drawer-tab ${drawerView === 'list' ? 'active' : ''}`}
              onClick={() => setDrawerView('list')}
            >
              List View
            </button>
          </div>

          {/* Drawer content */}
          <div className="m-drawer-body">
            {/* Legend */}
            <div className="m-drawer-legend">
              <div className="m-legend-row">
                <span className="m-legend-item">
                  <span className="m-legend-dot marked-dot">★</span>
                  Marked for Review
                </span>
                <span className="m-legend-item">
                  <span className="m-legend-dot unattempted-dot"></span>
                  Unattempted
                </span>
              </div>
              <div className="m-legend-row">
                <span className="m-legend-item">
                  <span className="m-legend-dot unseen-dot"></span>
                  Unseen
                </span>
                <span className="m-legend-item">
                  <span className="m-legend-dot attempted-dot"></span>
                  Attempted
                </span>
              </div>
            </div>

            {/* Test section */}
            <div className="m-drawer-section">
              <div className="m-drawer-section-header">
                <span className="m-section-title">Test</span>
              </div>

              {/* Status summary */}
              <div className="m-status-summary">
                <span className="m-status-item">
                  <span className="m-legend-dot marked-dot small">★</span> {markedCount}
                </span>
                <span className="m-status-item">
                  <span className="m-legend-dot attempted-dot small"></span> {answeredCount}
                </span>
                <span className="m-status-item">
                  <span className="m-legend-dot unattempted-dot small"></span> {notAnsweredCount}
                </span>
                <span className="m-status-item">
                  <span className="m-legend-dot unseen-dot small"></span> {notVisitedCount}
                </span>
              </div>

              {/* Grid or List view */}
              {drawerView === 'grid' ? (
                <div className="m-grid-view">
                  {questions.map((_, i) => {
                    const status = getStatus(i);
                    return (
                      <div
                        key={i}
                        className={`m-grid-cell ${status} ${current === i ? 'current' : ''}`}
                        onClick={() => handleJumpTo(i)}
                      >
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="m-list-view">
                  {questions.map((q, i) => {
                    const status = getStatus(i);
                    return (
                      <div
                        key={i}
                        className={`m-list-item ${status} ${current === i ? 'current' : ''}`}
                        onClick={() => handleJumpTo(i)}
                      >
                        <div className={`m-list-num ${status}`}>{i + 1}</div>
                        <div
                          className="m-list-text rich-content"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(
                              (q.questionText || '').length > 100
                                ? q.questionText.substring(0, 100) + '...'
                                : q.questionText
                            )
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Submit button at bottom of drawer */}
          <div className="m-drawer-footer">
            <button className="m-btn-submit" onClick={handleSubmit}>
              SUBMIT TEST
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= DESKTOP UI =================

  return (
    <div className="exam-wrapper">

      {/* TOPBAR */}
      <div className="exam-topbar">
        <div className="exam-topbar-left"></div>

        <div className="exam-topbar-center">
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

        <div className="exam-topbar-right">
          <button className="btn-fullscreen" onClick={toggleFullScreen}>
            {isFullScreen ? 'Exit Full Screen' : 'Switch Full Screen'}
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="exam-layout">

        {/* QUESTION AREA (LEFT) */}
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

        {/* SIDEBAR (RIGHT) */}
        <div className="exam-sidebar">
          <div className="sidebar-legend">
            <div className="legend-row">
              <span className="legend-item">
                <span className="legend-badge answered-badge">{answeredCount}</span>
                Answered
              </span>
              <span className="legend-item">
                <span className="legend-badge marked-badge">{markedCount}</span>
                Marked
              </span>
              <span className="legend-item">
                <span className="legend-badge not-visited-badge">{notVisitedCount}</span>
                Not Visited
              </span>
            </div>
            <div className="legend-row">
              <span className="legend-item">
                <span className="legend-badge marked-answered-badge">{markedAndAnsweredCount}</span>
                Marked and answered
              </span>
              <span className="legend-item not-answered-legend">
                <span className="legend-count-red">{notAnsweredCount}</span>
                Not Answered
              </span>
            </div>
          </div>

          <div className="sidebar-section sidebar-navigator">
            <div className="question-grid-scroll">
              <div className="question-grid">
                {questions.map((_, i) => {
                  const status = getStatus(i);
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
        </div>

      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="exam-action-bar">
        <div className="action-bar-left">
          <button
            className={`btn-action btn-mark-review ${marked[current] ? 'btn-review-active' : ''}`}
            onClick={handleMarkAndNext}
          >
            Mark for Review &amp; Next
          </button>
          <button className="btn-action btn-clear" onClick={handleClearResponse}>
            Clear Response
          </button>
        </div>
        <div className="action-bar-center">
          <button className="btn-action btn-save-next" onClick={handleSaveNext}>
            Save &amp; Next
          </button>
        </div>
        <div className="action-bar-right">
          <button className="btn-action btn-submit" onClick={handleSubmit}>
            Submit Test
          </button>
        </div>
      </div>

    </div>
  );
}

export default Quiz;