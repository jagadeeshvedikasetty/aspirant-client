import React, { useRef, useState } from 'react';
import { FileText, Clock, ArrowRight } from 'lucide-react';
import TestCardIcon from './TestCardIcon';
import TopicBreakdownTooltip from './TopicBreakdownTooltip';

function MockTestCard({ test, index, startingTestId, onStart, formatTimer }) {
  const cardRef = useRef(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <div
      ref={cardRef}
      className="test-card"
      style={{ animationDelay: `${index * 80}ms` }}
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      <TopicBreakdownTooltip
        topics={test.topics}
        anchorRef={cardRef}
        visible={tooltipVisible}
      />
      <div className="test-card-body">
        <div className="test-card-content">
          <h3 className="test-card-name">{test.name}</h3>
          <div className="test-card-info">
            <div className="test-info-item">
              <FileText className="test-info-icon" size={16} strokeWidth={2} />
              <span>{test.totalQuestions} Questions</span>
            </div>
            <div className="test-info-item">
              <Clock className="test-info-icon" size={16} strokeWidth={2} />
              <span>
                {formatTimer(test.totalQuestions * test.secondsPerQuestion)}
                <span className="test-info-detail"> ({test.secondsPerQuestion}s/q)</span>
              </span>
            </div>
          </div>
        </div>
        <TestCardIcon name={test.name} />
      </div>
      <button
        className="btn-start-test"
        onClick={() => onStart(test._id)}
        disabled={startingTestId === test._id}
      >
        <span>{startingTestId === test._id ? 'Loading...' : 'Start Test'}</span>
        {startingTestId !== test._id && (
          <ArrowRight className="btn-start-test-arrow" size={18} strokeWidth={2.5} />
        )}
      </button>
    </div>
  );
}

export default MockTestCard;
