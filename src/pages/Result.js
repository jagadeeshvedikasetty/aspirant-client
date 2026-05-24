import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';

const MARKS_KEY_PREFIX = 'aspirant_marks_';

function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions = [], answers = {}, testId } = location.state || {};

  // Load marks from localStorage
  const [marks, setMarks] = useState(() => {
    if (!testId) return { '1x': [], '2x': [] };
    try {
      const saved = localStorage.getItem(`${MARKS_KEY_PREFIX}${testId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { '1x': [], '2x': [] };
  });

  // Persist marks to localStorage whenever they change
  useEffect(() => {
    if (!testId) return;
    localStorage.setItem(`${MARKS_KEY_PREFIX}${testId}`, JSON.stringify(marks));
  }, [marks, testId]);

  if (questions.length === 0) {
    navigate('/', { replace: true });
    return null;
  }

  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  questions.forEach((q, idx) => {
    const userAns = answers[idx];
    if (userAns === undefined) {
      skipped++;
    } else if (userAns === q.correctOption) {
      correct++;
    } else {
      wrong++;
    }
  });

  const percentage = Math.round((correct / questions.length) * 100);

  const getEmoji = () => {
    if (percentage >= 80) return '🏆';
    if (percentage >= 60) return '👍';
    if (percentage >= 40) return '📚';
    return '💪';
  };

  const getReviewClass = (idx) => {
    const userAns = answers[idx];
    if (userAns === undefined) return 'review-card skipped-card';
    if (userAns === questions[idx].correctOption) return 'review-card correct-card';
    return 'review-card wrong-card';
  };

  // Toggle mark for a question
  const toggleMark = (questionId, level) => {
    setMarks((prev) => {
      const other = level === '1x' ? '2x' : '1x';
      const isCurrentlyMarked = prev[level].includes(questionId);

      let newLevel;
      if (isCurrentlyMarked) {
        // Unmark — toggle off
        newLevel = prev[level].filter((id) => id !== questionId);
      } else {
        // Mark — add to this level
        newLevel = [...prev[level], questionId];
      }

      // Always remove from the other level (a question can only be 1x OR 2x)
      const newOther = prev[other].filter((id) => id !== questionId);

      return {
        ...prev,
        [level]: newLevel,
        [other]: newOther,
      };
    });
  };

  const getMarkState = (questionId) => {
    if (marks['1x'].includes(questionId)) return '1x';
    if (marks['2x'].includes(questionId)) return '2x';
    return null;
  };

  return (
    <div>
      <div className="result-hero">
        <div style={{ fontSize: '3rem' }}>{getEmoji()}</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '12px 0 4px' }}>
          Quiz Complete!
        </h1>
        <p style={{ color: 'var(--text2)' }}>Here's how you did</p>

        <div className="result-score-ring">
          <span className="result-score-num">{percentage}%</span>
          <span className="result-score-label">Score</span>
        </div>

        <div className="result-stats-row">
          <div className="result-stat">
            <div className="result-stat-num correct">{correct}</div>
            <div className="result-stat-label">Correct</div>
          </div>
          <div className="result-stat">
            <div className="result-stat-num wrong">{wrong}</div>
            <div className="result-stat-label">Wrong</div>
          </div>
          <div className="result-stat">
            <div className="result-stat-num skipped">{skipped}</div>
            <div className="result-stat-label">Skipped</div>
          </div>
          <div className="result-stat">
            <div className="result-stat-num" style={{ color: 'var(--text2)' }}>
              {questions.length}
            </div>
            <div className="result-stat-label">Total</div>
          </div>
        </div>

        <button className="btn-home" onClick={() => navigate('/')}>
          ← Practice Again
        </button>
      </div>

      {/* Review Section */}
      <div className="review-section">
        <div className="review-title">📋 Question Review</div>
        {questions.map((q, idx) => {
          const userAns = answers[idx];
          const isCorrect = userAns === q.correctOption;
          const isSkipped = userAns === undefined;
          const markState = getMarkState(q._id);
          return (
            <div key={q._id || idx} className={getReviewClass(idx)}>
              <div className="review-q-header">
                <div className="review-q">
                  <strong style={{ color: 'var(--text2)', fontFamily: 'JetBrains Mono', fontSize: '0.78rem' }}>
                    Q{idx + 1}.{' '}
                  </strong>
                  <span
                    className="rich-content"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.questionText) }}
                  />
                </div>
                {/* 1x / 2x Mark Buttons — only show for mock tests (when testId exists) */}
                {testId && (
                  <div className="mark-buttons">
                    <button
                      className={`mark-btn mark-1x ${markState === '1x' ? 'active' : ''}`}
                      onClick={() => toggleMark(q._id, '1x')}
                      title="Mark for 1x practice"
                    >
                      1x
                    </button>
                    <button
                      className={`mark-btn mark-2x ${markState === '2x' ? 'active' : ''}`}
                      onClick={() => toggleMark(q._id, '2x')}
                      title="Mark for 2x (hard) practice"
                    >
                      2x
                    </button>
                  </div>
                )}
              </div>
              <div className="review-answers">
                {isSkipped ? (
                  <>
                    <span className="review-ans" style={{ background: 'rgba(255,184,48,0.15)', color: 'var(--warning)' }}>
                      ⏭ Skipped
                    </span>
                    <span className="review-ans right-ans">
                      ✅ {['A','B','C','D'][q.correctOption]}. {q.options[q.correctOption]}
                    </span>
                  </>
                ) : isCorrect ? (
                  <span className="review-ans correct-ans">
                    ✅ {['A','B','C','D'][q.correctOption]}. {q.options[q.correctOption]}
                  </span>
                ) : (
                  <>
                    <span className="review-ans your-ans">
                      ❌ Your: {['A','B','C','D'][userAns]}. {q.options[userAns]}
                    </span>
                    <span className="review-ans right-ans">
                      ✅ Correct: {['A','B','C','D'][q.correctOption]}. {q.options[q.correctOption]}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Result;
