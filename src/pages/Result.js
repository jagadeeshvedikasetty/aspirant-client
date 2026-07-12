import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { getMarks, setMark, removeMark } from '../api';

const MARKS_KEY_PREFIX = 'aspirant_marks_';

function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions = [], answers = {}, testId } = location.state || {};

  const [marks, setMarks] = useState({ '1x': [], '2x': [] });
  const [syncingId, setSyncingId] = useState(null);

  // Load marks from server on mount, fallback to localStorage
  const loadMarks = useCallback(async () => {
    if (!testId) return;
    try {
      const res = await getMarks(testId);
      setMarks(res.data);
      // Also update localStorage cache
      localStorage.setItem(`${MARKS_KEY_PREFIX}${testId}`, JSON.stringify(res.data));
    } catch {
      // Fallback: try localStorage
      try {
        const saved = localStorage.getItem(`${MARKS_KEY_PREFIX}${testId}`);
        if (saved) setMarks(JSON.parse(saved));
      } catch {}
    }
  }, [testId]);

  useEffect(() => {
    loadMarks();
  }, [loadMarks]);

  // Auto-migrate: on first load, if server has no marks but localStorage does, push them to server
  useEffect(() => {
    if (!testId) return;
    const migrateLocalMarks = async () => {
      try {
        const res = await getMarks(testId);
        const serverMarks = res.data;
        const serverHasMarks = (serverMarks['1x']?.length > 0) || (serverMarks['2x']?.length > 0);
        if (serverHasMarks) return; // Server already has marks, no migration needed

        const saved = localStorage.getItem(`${MARKS_KEY_PREFIX}${testId}`);
        if (!saved) return;
        const localMarks = JSON.parse(saved);
        const all1x = localMarks['1x'] || [];
        const all2x = localMarks['2x'] || [];
        if (all1x.length === 0 && all2x.length === 0) return;

        // Push local marks to server
        const promises = [
          ...all1x.map((qId) => setMark(testId, qId, '1x')),
          ...all2x.map((qId) => setMark(testId, qId, '2x'))
        ];
        await Promise.allSettled(promises);
      } catch {
        // Migration failed silently — not critical
      }
    };
    migrateLocalMarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

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

  // Toggle mark for a question — syncs to server + localStorage
  const toggleMark = async (questionId, level) => {
    const currentMark = getMarkState(questionId);
    setSyncingId(questionId);

    try {
      if (currentMark === level) {
        // Unmark — remove from server
        await removeMark(testId, questionId);
      } else {
        // Set or switch mark on server
        await setMark(testId, questionId, level);
      }

      // Update local state from server
      const res = await getMarks(testId);
      setMarks(res.data);
      // Update localStorage cache
      localStorage.setItem(`${MARKS_KEY_PREFIX}${testId}`, JSON.stringify(res.data));
    } catch {
      // Fallback: update locally if server fails
      setMarks((prev) => {
        const other = level === '1x' ? '2x' : '1x';
        const isCurrentlyMarked = prev[level].includes(questionId);

        let newLevel;
        if (isCurrentlyMarked) {
          newLevel = prev[level].filter((id) => id !== questionId);
        } else {
          newLevel = [...prev[level], questionId];
        }

        const newOther = prev[other].filter((id) => id !== questionId);
        const updated = { ...prev, [level]: newLevel, [other]: newOther };

        // Save to localStorage
        localStorage.setItem(`${MARKS_KEY_PREFIX}${testId}`, JSON.stringify(updated));
        return updated;
      });
    } finally {
      setSyncingId(null);
    }
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
          const isSyncing = syncingId === q._id;
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
                      disabled={isSyncing}
                      title="Mark for 1x practice"
                    >
                      {isSyncing && markState !== '1x' ? '...' : '1x'}
                    </button>
                    <button
                      className={`mark-btn mark-2x ${markState === '2x' ? 'active' : ''}`}
                      onClick={() => toggleMark(q._id, '2x')}
                      disabled={isSyncing}
                      title="Mark for 2x (hard) practice"
                    >
                      {isSyncing && markState !== '2x' ? '...' : '2x'}
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
