import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubjects, getTopics, getDates, getQuestions } from '../api';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSubjects()
      .then((r) => setSubjects(r.data))
      .catch(() => setError('Failed to load subjects'));
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

  const handleStart = async () => {
    if (!isValidCount) { setError('Please enter how many questions to attempt'); return; }
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

      navigate('/quiz', { state: { questions: preparedQuestions } });
    } catch {
      setError('Failed to load questions. Try again.');
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="home-hero">
        <h1>Practice Makes<br /><span>Perfect.</span></h1>
        <p>Select your subject, topic and date to start practising</p>
      </div>

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

        <button
          className="btn-start"
          onClick={handleStart}
          disabled={!isValidCount || loading}
        >
          {loading ? 'Loading...' : `Start Practice →`}
        </button>
      </div>
    </div>
  );
}

export default Home;

