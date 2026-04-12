import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';

function Quiz() {
  const location = useLocation();
  const navigate = useNavigate();

  const questions = useMemo(
    () => location.state?.questions || [],
    [location.state]
  );
  const initialTimerSeconds = useMemo(
    () => location.state?.timerSeconds || 3600,
    [location.state]
  );

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});        // { questionIndex: optionIndex }
  const [visited, setVisited] = useState({ 0: true }); // track visited questions
  const [marked, setMarked] = useState({});            // { questionIndex: true }
  const [timeLeft, setTimeLeft] = useState(initialTimerSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (questions.length === 0) {
      navigate('/', { replace: true });
    }
  }, [questions, navigate]);

  // Timer countdown
  useEffect(() => {
    if (isPaused || questions.length === 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isPaused, questions.length]);

  // Auto-submit when timer expires
  const handleSubmit = useCallback(() => {
    navigate('/result', { state: { questions, answers } });
  }, [navigate, questions, answers]);

  useEffect(() => {
    if (timeLeft === 0 && questions.length > 0) {
      handleSubmit();
    }
  }, [timeLeft, questions.length, handleSubmit]);

  if (questions.length === 0) return null;

  const q = questions[current];

  const handleOption = (idx) => {
    setAnswers((prev) => ({ ...prev, [current]: idx }));
  };

  const handleSaveNext = () => {
    if (current < questions.length - 1) {
      const next = current + 1;
      setCurrent(next);
      setVisited((prev) => ({ ...prev, [next]: true }));
    }
  };

  const handlePrev = () => {
    if (current > 0) {
      setCurrent((c) => c - 1);
    }
  };

  const handleMarkForReview = () => {
    setMarked((prev) => ({ ...prev, [current]: !prev[current] }));
  };

  const handleJumpTo = (idx) => {
    setCurrent(idx);
    setVisited((prev) => ({ ...prev, [idx]: true }));
  };

  const togglePause = () => {
    setIsPaused((p) => !p);
  };

  // Stats
  const answeredCount = Object.keys(answers).length;
  const notAnsweredCount = Object.keys(visited).filter(
    (k) => answers[k] === undefined
  ).length;
  const markedCount = Object.keys(marked).filter((k) => marked[k]).length;
  const answeredMarkedCount = Object.keys(marked).filter(
    (k) => marked[k] && answers[k] !== undefined
  ).length;

  // Format time
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Get status of a question for the grid
  const getQuestionStatus = (idx) => {
    if (marked[idx]) return 'marked';
    if (answers[idx] !== undefined) return 'answered';
    if (visited[idx]) return 'not-answered';
    return 'not-visited';
  };

  // Timer urgency class
  const getTimerClass = () => {
    if (timeLeft <= 60) return 'exam-timer urgent';
    if (timeLeft <= 300) return 'exam-timer warning';
    return 'exam-timer';
  };

  return (
    <div className="exam-wrapper">
      {/* Top Bar */}
      <div className="exam-topbar">
        <div className="exam-topbar-left">
          <div className={getTimerClass()}>
            <span className="timer-icon">⏱</span>
            <span className="timer-value">{formatTime(timeLeft)}</span>
            <button className="timer-toggle-btn" onClick={togglePause}>
              {isPaused ? '▶' : '⏸'}
            </button>
          </div>
        </div>
        <div className="exam-topbar-right">
          <div className="exam-stat-chip">
            Answered: <strong>{answeredCount}</strong> / {questions.length}
          </div>
        </div>
      </div>

      {/* Main 2-column Layout */}
      <div className="exam-layout">
        {/* LEFT: Question Area */}
        <div className="exam-question-area">
          <div className="question-card">
            <div className="question-num">
              Question {current + 1} of {questions.length}
              {marked[current] && <span className="mark-indicator">▲ Marked</span>}
            </div>
            <div
              className="question-text rich-content"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.questionText) }}
            />
            <div className="options-list">
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  className={`option-btn${answers[current] === idx ? ' selected' : ''}`}
                  onClick={() => handleOption(idx)}
                >
                  <span className="opt-letter">{['A', 'B', 'C', 'D'][idx]}</span>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Bar */}
          <div className="exam-nav-bar">
            <button
              className="btn-nav"
              onClick={handlePrev}
              disabled={current === 0}
            >
              ← Previous
            </button>
            <button
              className={`btn-nav${marked[current] ? ' btn-marked-active' : ' btn-mark'}`}
              onClick={handleMarkForReview}
            >
              {marked[current] ? '★ Unmark' : '☆ Mark for Review'}
            </button>
            <button
              className="btn-nav primary"
              onClick={handleSaveNext}
              disabled={current === questions.length - 1}
            >
              Save & Next →
            </button>
            <button
              className="btn-nav btn-submit"
              onClick={handleSubmit}
            >
              Submit
            </button>
          </div>
        </div>

        {/* RIGHT: Sidebar */}
        <div className="exam-sidebar">
          {/* Question Number Grid */}
          <div className="sidebar-section">
            <h3 className="sidebar-title">Question Navigator</h3>
            <div className="question-grid">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  className={`grid-cell ${getQuestionStatus(idx)}${idx === current ? ' current' : ''}`}
                  onClick={() => handleJumpTo(idx)}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="sidebar-section">
            <div className="grid-legend">
              <div className="legend-item">
                <span className="legend-dot answered"></span> Answered
              </div>
              <div className="legend-item">
                <span className="legend-dot not-answered"></span> Not Answered
              </div>
              <div className="legend-item">
                <span className="legend-dot marked"></span> Marked
              </div>
              <div className="legend-item">
                <span className="legend-dot not-visited"></span> Not Visited
              </div>
            </div>
          </div>

          {/* Analytics Panel */}
          <div className="sidebar-section analytics-panel">
            <h3 className="sidebar-title">Analytics</h3>
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
                <tr>
                  <td className="analytics-label">Answered & Marked</td>
                  <td className="analytics-value">{answeredMarkedCount}</td>
                </tr>
                <tr className="analytics-total-row">
                  <td className="analytics-label"><strong>Total</strong></td>
                  <td className="analytics-value"><strong>{questions.length}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Quiz;
