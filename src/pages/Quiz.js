import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';

function Quiz() {
  const location = useLocation();
  const navigate = useNavigate();

  // useMemo prevents the array from being recreated on every render,
  // which fixes the react-hooks/exhaustive-deps ESLint error on Vercel CI
  const questions = useMemo(
    () => location.state?.questions || [],
    [location.state]
  );

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});

  useEffect(() => {
    if (questions.length === 0) {
      navigate('/', { replace: true });
    }
  }, [questions, navigate]);

  if (questions.length === 0) return null;

  const q = questions[current];
  const isRevealed = revealed[current];
  const userAnswer = answers[current];

  const handleOption = (idx) => {
    if (isRevealed) return;
    setAnswers((prev) => ({ ...prev, [current]: idx }));
    setRevealed((prev) => ({ ...prev, [current]: true }));
  };

  const getOptionClass = (idx) => {
    if (!isRevealed) {
      return userAnswer === idx ? 'option-btn selected' : 'option-btn';
    }
    if (idx === q.correctOption) return 'option-btn correct';
    if (idx === userAnswer && userAnswer !== q.correctOption) return 'option-btn wrong';
    return 'option-btn';
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      navigate('/result', { state: { questions, answers } });
    }
  };

  const handlePrev = () => {
    if (current > 0) setCurrent((c) => c - 1);
  };

  const handleFinish = () => {
    navigate('/result', { state: { questions, answers } });
  };

  const progress = ((current + 1) / questions.length) * 100;
  const answered = Object.keys(answers).length;

  return (
    <div>
      <div className="quiz-header">
        <div className="quiz-meta">
          Question <strong>{current + 1}</strong> of <strong>{questions.length}</strong>
        </div>
        <div className="quiz-meta">
          Answered: <strong>{answered}</strong>
        </div>
        <button
          className="btn-nav"
          style={{ fontSize: '0.82rem', padding: '7px 16px' }}
          onClick={handleFinish}
        >
          Finish Early
        </button>
      </div>

      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="question-card">
        <div className="question-num">Q{current + 1}</div>
        <div className="question-text rich-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.questionText) }} />
        <div className="options-list">
          {q.options.map((opt, idx) => (
            <button
              key={idx}
              className={getOptionClass(idx)}
              onClick={() => handleOption(idx)}
              disabled={isRevealed}
            >
              <span className="opt-letter">{['A', 'B', 'C', 'D'][idx]}</span>
              {opt}
            </button>
          ))}
        </div>

        {isRevealed && (
          <div
            style={{
              marginTop: 16,
              padding: '10px 14px',
              borderRadius: 8,
              background:
                userAnswer === q.correctOption
                  ? 'rgba(34,216,122,0.1)'
                  : 'rgba(255,77,106,0.1)',
              color:
                userAnswer === q.correctOption ? 'var(--success)' : 'var(--danger)',
              fontSize: '0.88rem',
              fontWeight: 500
            }}
          >
            {userAnswer === q.correctOption
              ? '✅ Correct!'
              : userAnswer === undefined
              ? `⏭ Skipped — Correct: ${['A','B','C','D'][q.correctOption]}. ${q.options[q.correctOption]}`
              : `❌ Wrong — Correct: ${['A','B','C','D'][q.correctOption]}. ${q.options[q.correctOption]}`}
          </div>
        )}
      </div>

      <div className="quiz-nav">
        <button className="btn-nav" onClick={handlePrev} disabled={current === 0}>
          ← Previous
        </button>
        {!isRevealed && userAnswer === undefined && (
          <button
            className="btn-nav"
            style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}
            onClick={() => setRevealed((prev) => ({ ...prev, [current]: true }))}
          >
            Skip
          </button>
        )}
        <button
          className="btn-nav primary"
          onClick={handleNext}
          disabled={!isRevealed && userAnswer === undefined}
        >
          {current === questions.length - 1 ? 'See Results →' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

export default Quiz;
