import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubjects, getTopics, getDates, getQuestions, getTests, generateTest } from '../api';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Home() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [dates, setDates] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [selectedCount, setSelectedCount] = useState('');
  const [timerHours, setTimerHours] = useState(1);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Mock Tests state
  const [tests, setTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [startingTestId, setStartingTestId] = useState(null);

  useEffect(() => {
    getSubjects()
      .then((r) => setSubjects(r.data))
      .catch(() => setError('Failed to load subjects'));
  }, []);

  // Fetch active tests
  useEffect(() => {
    setTestsLoading(true);
    getTests()
      .then((r) => {
        // Only show active tests
        setTests(r.data.filter((t) => t.isActive));
      })
      .catch(() => {})
      .finally(() => setTestsLoading(false));
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      setSelectedTopic('');
      setSelectedDate('');
      setDates([]);
      setTotalAvailable(0);
      setSelectedCount('');
      getTopics(selectedSubject).then((r) => setTopics(r.data)).catch(() => {});
    } else {
      setTopics([]);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedTopic) {
      setSelectedDate('');
      setTotalAvailable(0);
      setSelectedCount('');
      getDates(selectedTopic).then((r) => setDates(r.data)).catch(() => {});
    } else {
      setDates([]);
    }
  }, [selectedTopic]);

  const fetchCount = useCallback(async () => {
    if (selectedTopic && selectedDate) {
      try {
        const res = await getQuestions({ topic: selectedTopic, date: selectedDate });
        setTotalAvailable(res.data.length);
        setSelectedCount('');
      } catch {
        setTotalAvailable(0);
      }
    }
  }, [selectedTopic, selectedDate]);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  const handleCountChange = (e) => {
    const val = e.target.value;
    // Allow empty string (user clearing input)
    if (val === '') {
      setSelectedCount('');
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= totalAvailable) {
      setSelectedCount(num);
    } else if (!isNaN(num) && num > totalAvailable) {
      setSelectedCount(totalAvailable);
    }
  };

  const handleSelectAll = () => {
    setSelectedCount(totalAvailable);
  };

  const isValidCount = typeof selectedCount === 'number' && selectedCount >= 1 && selectedCount <= totalAvailable;
  const timerSeconds = timerHours * 3600 + timerMinutes * 60;
  const isTimerValid = timerSeconds > 0;

  const handleStart = async () => {
    if (!isValidCount) { setError('Please enter how many questions to attempt'); return; }
    if (!isTimerValid) { setError('Please set a timer duration'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await getQuestions({ topic: selectedTopic, date: selectedDate });
      const questions = res.data;

      // Shuffle questions and take selectedCount
      const shuffledQuestions = shuffle(questions).slice(0, selectedCount);

      // Shuffle options within each question, track correct answer text
      const preparedQuestions = shuffledQuestions.map((q) => {
        const optionsWithIndex = q.options.map((text, idx) => ({
          text,
          isCorrect: idx === q.correctOption
        }));
        const shuffledOptions = shuffle(optionsWithIndex);
        const newCorrectIndex = shuffledOptions.findIndex((o) => o.isCorrect);
        return {
          _id: q._id,
          questionText: q.questionText,
          options: shuffledOptions.map((o) => o.text),
          correctOption: newCorrectIndex
        };
      });

      navigate('/quiz', { state: { questions: preparedQuestions, timerSeconds } });
    } catch {
      setError('Failed to load questions. Try again.');
      setLoading(false);
    }
  };

  // Start a mock test
  const handleStartTest = async (testId) => {
    setStartingTestId(testId);
    setError('');
    try {
      const res = await generateTest(testId);
      const { questions, timerSeconds: testTimer } = res.data;

      if (!questions || questions.length === 0) {
        setError('No questions available for this test');
        setStartingTestId(null);
        return;
      }

      // Shuffle options within each question
      const preparedQuestions = questions.map((q) => {
        const optionsWithIndex = q.options.map((text, idx) => ({
          text,
          isCorrect: idx === q.correctOption
        }));
        const shuffledOptions = shuffle(optionsWithIndex);
        const newCorrectIndex = shuffledOptions.findIndex((o) => o.isCorrect);
        return {
          _id: q._id,
          questionText: q.questionText,
          options: shuffledOptions.map((o) => o.text),
          correctOption: newCorrectIndex
        };
      });

      navigate('/quiz', { state: { questions: preparedQuestions, timerSeconds: testTimer } });
    } catch {
      setError('Failed to generate test. Try again.');
      setStartingTestId(null);
    }
  };

  const formatTimer = (totalSec) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    let parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (parts.length === 0) parts.push(`${totalSec}s`);
    return parts.join(' ');
  };

  return (
    <div>
      <div className="home-hero">
        <h1>Practice Makes<br /><span>Perfect.</span></h1>
        <p>Select your subject, topic and date to start practising</p>
      </div>

      {/* Mock Tests Section */}
      {!testsLoading && tests.length > 0 && (
        <div className="mock-tests-section">
          <div className="section-header">
            <h2 className="section-title">📝 Mock Tests</h2>
            <p className="section-sub">Pre-configured tests created by admin</p>
          </div>
          <div className="test-cards-grid">
            {tests.map((test) => (
              <div key={test._id} className="test-card">
                <div className="test-card-header">
                  <h3 className="test-card-name">{test.name}</h3>
                </div>
                <div className="test-card-subjects">
                  {test.subjects.map((s) => (
                    <span key={s._id} className="test-subject-badge">{s.name}</span>
                  ))}
                </div>
                <div className="test-card-info">
                  <div className="test-info-item">
                    <span className="test-info-icon">📋</span>
                    <span>{test.totalQuestions} Questions</span>
                  </div>
                  <div className="test-info-item">
                    <span className="test-info-icon">⏱</span>
                    <span>
                      {formatTimer(test.totalQuestions * test.secondsPerQuestion)}
                      <span className="test-info-detail"> ({test.secondsPerQuestion}s/q)</span>
                    </span>
                  </div>
                </div>
                <button
                  className="btn-start-test"
                  onClick={() => handleStartTest(test._id)}
                  disabled={startingTestId === test._id}
                >
                  {startingTestId === test._id ? 'Loading...' : 'Start Test →'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      {!testsLoading && tests.length > 0 && (
        <div className="section-divider">
          <span>or practice by topic</span>
        </div>
      )}

      <div className="setup-card">
        <h2>Setup Your Quiz</h2>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="setup-grid">
          <div className="form-group">
            <label className="form-label">Subject</label>
            <select
              className="form-control"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">-- Choose Subject --</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Topic</label>
            <select
              className="form-control"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              disabled={!selectedSubject}
            >
              <option value="">-- Choose Topic --</option>
              {topics.map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Date</label>
            <select
              className="form-control"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={!selectedTopic}
            >
              <option value="">-- Choose Date --</option>
              {dates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {totalAvailable > 0 && (
          <div style={{ marginTop: 24 }}>
            <label className="form-label" style={{ display: 'block', marginBottom: 10 }}>
              How many questions? ({totalAvailable} available)
            </label>
            <div className="count-input-row">
              <input
                type="number"
                className="form-control count-input"
                min={1}
                max={totalAvailable}
                value={selectedCount}
                onChange={handleCountChange}
                placeholder={`Enter 1 – ${totalAvailable}`}
              />
              <button
                className={`count-btn all-btn${selectedCount === totalAvailable ? ' active' : ''}`}
                onClick={handleSelectAll}
              >
                All ({totalAvailable})
              </button>
            </div>
            {isValidCount && (
              <div className="count-feedback">
                You'll attempt <strong>{selectedCount}</strong> out of <strong>{totalAvailable}</strong> questions
              </div>
            )}
          </div>
        )}

        {/* Timer Duration Selector */}
        {isValidCount && (
          <div className="timer-selector">
            <label className="form-label" style={{ display: 'block', marginBottom: 10 }}>
              ⏱ Timer Duration
            </label>
            <div className="timer-inputs-row">
              <div className="timer-input-group">
                <select
                  className="form-control timer-select"
                  value={timerHours}
                  onChange={(e) => setTimerHours(parseInt(e.target.value, 10))}
                >
                  {[0, 1, 2, 3, 4, 5].map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="timer-unit">Hours</span>
              </div>
              <span className="timer-colon">:</span>
              <div className="timer-input-group">
                <select
                  className="form-control timer-select"
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(parseInt(e.target.value, 10))}
                >
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
                <span className="timer-unit">Minutes</span>
              </div>
            </div>
            {isTimerValid && (
              <div className="count-feedback" style={{ marginTop: 10 }}>
                Quiz timer: <strong>{timerHours > 0 ? `${timerHours}h ` : ''}{timerMinutes > 0 ? `${timerMinutes}m` : timerHours > 0 ? '' : '0m'}</strong>
              </div>
            )}
          </div>
        )}

        <button
          className="btn-start"
          onClick={handleStart}
          disabled={!isValidCount || !isTimerValid || loading}
        >
          {loading ? 'Loading...' : `Start Exam →`}
        </button>
      </div>
    </div>
  );
}

export default Home;
