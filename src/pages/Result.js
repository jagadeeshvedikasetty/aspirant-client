import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions = [], answers = {} } = location.state || {};

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
          return (
            <div key={q._id || idx} className={getReviewClass(idx)}>
              <div className="review-q">
                <strong style={{ color: 'var(--text2)', fontFamily: 'JetBrains Mono', fontSize: '0.78rem' }}>
                  Q{idx + 1}.{' '}
                </strong>
                {q.questionText}
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
