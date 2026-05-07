import React, { useState, useEffect } from 'react';
import { getCurrentAffairs } from '../api';
import DOMPurify from 'dompurify';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDayRanges(month, year) {
  const monthIdx = MONTHS.indexOf(month);
  if (monthIdx === -1) return ['1-10', '11-20', '21-31'];
  const lastDay = new Date(year, monthIdx + 1, 0).getDate();
  const ranges = ['1-10', '11-20'];
  ranges.push(`21-${lastDay}`);
  return ranges;
}

function CurrentAffairsPage() {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();

  const [month, setMonth] = useState(MONTHS[currentMonthIdx]);
  const [year, setYear] = useState(currentYear);
  const [dayRange, setDayRange] = useState('');
  const [affairs, setAffairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const dayRanges = month ? getDayRanges(month, year) : [];

  useEffect(() => {
    setDayRange('');
  }, [month]);

  useEffect(() => {
    if (!month || !dayRange) {
      setAffairs([]);
      return;
    }
    setLoading(true);
    getCurrentAffairs({ month, year, dayRange, active: 'true' })
      .then((res) => setAffairs(res.data))
      .catch(() => setAffairs([]))
      .finally(() => setLoading(false));
  }, [month, year, dayRange]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div>
      <div className="home-hero" style={{ paddingBottom: 20 }}>
        <h1>Current<br /><span>Affairs.</span></h1>
        <p>Stay updated with the latest current affairs</p>
      </div>

      {/* Selectors */}
      <div className="setup-card">
        <h2>Select Period</h2>
        <div className="setup-grid" style={{ gridTemplateColumns: '1fr 100px 1fr' }}>
          <div className="form-group">
            <label className="form-label">Month</label>
            <select
              className="form-control"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="">-- Select Month --</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Year</label>
            <input
              type="number"
              className="form-control"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10) || currentYear)}
              min={2020}
              max={2099}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Day Range</label>
            <select
              className="form-control"
              value={dayRange}
              onChange={(e) => setDayRange(e.target.value)}
              disabled={!month}
            >
              <option value="">-- Select Days --</option>
              {dayRanges.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="ca-loading">
          <div className="ca-loading-spinner"></div>
          <p>Loading current affairs…</p>
        </div>
      )}

      {!loading && dayRange && affairs.length === 0 && (
        <div className="ca-empty">
          <div className="ca-empty-icon">📰</div>
          <p>No current affairs available for <strong>{month} {year}</strong>, Days <strong>{dayRange}</strong></p>
        </div>
      )}

      {!loading && affairs.length > 0 && (
        <div className="ca-results">
          <div className="ca-results-header">
            <span className="ca-results-badge">{month} {year}</span>
            <span className="ca-results-badge ca-results-days">Days {dayRange}</span>
            <span className="ca-results-count">{affairs.length} article{affairs.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="ca-articles-list">
            {affairs.map((a) => (
              <div
                key={a._id}
                className={`ca-article-card${expandedId === a._id ? ' expanded' : ''}`}
              >
                <button
                  className="ca-article-header"
                  onClick={() => toggleExpand(a._id)}
                >
                  <h3 className="ca-article-title">{a.heading}</h3>
                  <span className={`ca-expand-icon${expandedId === a._id ? ' open' : ''}`}>
                    ▼
                  </span>
                </button>

                {expandedId === a._id && (
                  <div className="ca-article-content rich-content">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(a.content)
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!dayRange && !loading && (
        <div className="ca-empty">
          <div className="ca-empty-icon">📅</div>
          <p>Select a month and day range to view current affairs</p>
        </div>
      )}
    </div>
  );
}

export default CurrentAffairsPage;
