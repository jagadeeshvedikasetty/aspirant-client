import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ClipboardList, ArrowRight } from 'lucide-react';
import { getSubjects, getTopics, getDates, getQuestions, getTests, generateTest } from '../api';
import CustomDropdown from '../components/CustomDropdown';
import MockTestCard from '../components/MockTestCard';
import { enrichTestsWithTopics } from '../utils/testTopics';

const MARKS_KEY_PREFIX = 'aspirant_marks_';

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

  const [tests, setTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [startingTestId, setStartingTestId] = useState(null);

  const [showModeModal, setShowModeModal] = useState(false);
  const [modalTestId, setModalTestId] = useState(null);
  const [modalMarks, setModalMarks] = useState({ '1x': [], '2x': [] });
  const [modalTestName, setModalTestName] = useState('');

  useEffect(() => {
    getSubjects()
      .then((r) => setSubjects(r.data))
      .catch(() => setError('Failed to load subjects'));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTests() {
      setTestsLoading(true);
      try {
        const res = await getTests();
        const enriched = await enrichTestsWithTopics(res.data, getTopics);
        if (!cancelled) setTests(enriched);
      } catch {
        if (!cancelled) setTests([]);
      } finally {
        if (!cancelled) setTestsLoading(false);
      }
    }

    loadTests();
    return () => { cancelled = true; };
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

      const shuffledQuestions = shuffle(questions).slice(0, selectedCount);

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

  const handleStartTest = (testId) => {
    setError('');
    try {
      const saved = localStorage.getItem(`${MARKS_KEY_PREFIX}${testId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const has1x = parsed['1x'] && parsed['1x'].length > 0;
        const has2x = parsed['2x'] && parsed['2x'].length > 0;
        if (has1x || has2x) {
          const test = tests.find((t) => t._id === testId);
          setModalTestId(testId);
          setModalMarks(parsed);
          setModalTestName(test?.name || 'Test');
          setShowModeModal(true);
          return;
        }
      }
    } catch {}
    startTestWithMode(testId, 'normal', []);
  };

  const handleModeSelect = (mode) => {
    setShowModeModal(false);
    const markedIds = mode === '1x' ? modalMarks['1x'] : mode === '2x' ? modalMarks['2x'] : [];
    startTestWithMode(modalTestId, mode, markedIds);
  };

  const startTestWithMode = async (testId, mode, markedQuestionIds) => {
    setStartingTestId(testId);
    setError('');
    try {
      const res = await generateTest(testId, { mode, markedQuestionIds });
      const { questions, timerSeconds: testTimer } = res.data;

      if (!questions || questions.length === 0) {
        setError('No questions available for this test');
        setStartingTestId(null);
        return;
      }

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

      navigate('/quiz', { state: { questions: preparedQuestions, timerSeconds: testTimer, testId } });
    } catch {
      setError('Failed to generate test. Try again.');
      setStartingTestId(null);
    }
  };

  const formatTimer = (totalSec) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (parts.length === 0) parts.push(`${totalSec}s`);
    return parts.join(' ');
  };

  const topicOptions = topics.map((t) => ({ value: t._id, label: t.name }));
  const dateOptions = dates.map((d) => ({ value: d, label: d }));
  const hourOptions = [0, 1, 2, 3, 4, 5].map((h) => ({ value: h, label: String(h) }));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => ({
    value: i,
    label: String(i).padStart(2, '0'),
  }));

  return (
    <div className="home-page">
      <div className="home-hero">
        <h1>
          Practice Makes<br />
          <span className="hero-gradient">Perfect.</span>
        </h1>
        <p>Select your subject, topic and date to start practising</p>
      </div>

      {!testsLoading && tests.length > 0 && (
        <div className="mock-tests-section">
          <div className="section-header">
            <h2 className="section-title">
              <ClipboardList className="section-title-icon" size={22} strokeWidth={2} />
              Mock Tests
            </h2>
            <p className="section-sub">Pre-configured tests created by admin</p>
          </div>
          <div className="test-cards-grid">
            {tests.map((test, index) => (
              <MockTestCard
                key={test._id}
                test={test}
                index={index}
                startingTestId={startingTestId}
                onStart={handleStartTest}
                formatTimer={formatTimer}
              />
            ))}
          </div>
        </div>
      )}

      {!testsLoading && tests.length > 0 && (
        <div className="section-divider">
          <span>or practice by topic</span>
        </div>
      )}

      <div className="setup-card">
        <h2>Setup Your Quiz</h2>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="subject-pills-section">
          <label className="form-label">Subject</label>
          <div className="subject-pills">
            {subjects.map((s) => (
              <button
                key={s._id}
                type="button"
                className={`subject-pill${selectedSubject === s._id ? ' is-active' : ''}`}
                onClick={() => setSelectedSubject(selectedSubject === s._id ? '' : s._id)}
              >
                {s.name}
              </button>
            ))}
            {subjects.length === 0 && (
              <span className="subject-pills-empty">Loading subjects...</span>
            )}
          </div>
        </div>

        <div className="setup-grid">
          <CustomDropdown
            label="Topic"
            value={selectedTopic}
            options={topicOptions}
            onChange={setSelectedTopic}
            disabled={!selectedSubject}
            placeholder="Choose Topic"
          />

          <CustomDropdown
            label="Date"
            value={selectedDate}
            options={dateOptions}
            onChange={setSelectedDate}
            disabled={!selectedTopic}
            placeholder="Choose Date"
          />
        </div>

        {totalAvailable > 0 && (
          <div className="setup-section">
            <label className="form-label">
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
                type="button"
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

        {isValidCount && (
          <div className="timer-selector">
            <label className="form-label timer-label">
              <Clock size={15} strokeWidth={2} />
              Timer Duration
            </label>
            <div className="timer-inputs-row">
              <div className="timer-input-group">
                <CustomDropdown
                  value={timerHours}
                  options={hourOptions}
                  onChange={(v) => setTimerHours(Number(v))}
                  placeholder="0"
                />
                <span className="timer-unit">Hours</span>
              </div>
              <span className="timer-colon">:</span>
              <div className="timer-input-group">
                <CustomDropdown
                  value={timerMinutes}
                  options={minuteOptions}
                  onChange={(v) => setTimerMinutes(Number(v))}
                  placeholder="00"
                />
                <span className="timer-unit">Minutes</span>
              </div>
            </div>
            {isTimerValid && (
              <div className="count-feedback">
                Quiz timer:{' '}
                <strong>
                  {timerHours > 0 ? `${timerHours}h ` : ''}
                  {timerMinutes > 0 ? `${timerMinutes}m` : timerHours > 0 ? '' : '0m'}
                </strong>
              </div>
            )}
          </div>
        )}

        <button
          className="btn-start"
          onClick={handleStart}
          disabled={!isValidCount || !isTimerValid || loading}
        >
          <span>{loading ? 'Loading...' : 'Start Exam'}</span>
          {!loading && <ArrowRight className="btn-start-arrow" size={20} strokeWidth={2.5} />}
        </button>
      </div>

      {showModeModal && (
        <div className="mode-modal-overlay" onClick={() => setShowModeModal(false)}>
          <div className="mode-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mode-modal-header">
              <h3 className="mode-modal-title">Choose Practice Mode</h3>
              <p className="mode-modal-sub">{modalTestName}</p>
            </div>
            <div className="mode-modal-body">
              <p className="mode-modal-desc">
                You have marked questions for this test. How would you like to practice?
              </p>
              <div className="mode-options">
                <button
                  className="mode-option-btn mode-normal"
                  onClick={() => handleModeSelect('normal')}
                >
                  <span className="mode-icon">🎲</span>
                  <span className="mode-label">Normal</span>
                  <span className="mode-desc">Fully random questions</span>
                </button>
                {modalMarks['1x'].length > 0 && (
                  <button
                    className="mode-option-btn mode-1x"
                    onClick={() => handleModeSelect('1x')}
                  >
                    <span className="mode-icon">🔁</span>
                    <span className="mode-label">1x Practice</span>
                    <span className="mode-desc">{modalMarks['1x'].length} marked questions + random fill</span>
                  </button>
                )}
                {modalMarks['2x'].length > 0 && (
                  <button
                    className="mode-option-btn mode-2x"
                    onClick={() => handleModeSelect('2x')}
                  >
                    <span className="mode-icon">🔥</span>
                    <span className="mode-label">2x Practice</span>
                    <span className="mode-desc">{modalMarks['2x'].length} marked questions + random fill</span>
                  </button>
                )}
              </div>
            </div>
            <button className="mode-modal-close" onClick={() => setShowModeModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
