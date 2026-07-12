import React from 'react';

const ACCENTS = [
  ['#a855f7', '#6366f1'],
  ['#ec4899', '#8b5cf6'],
  ['#06b6d4', '#6366f1'],
  ['#f59e0b', '#ef4444'],
];

function hashIndex(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h + str.charCodeAt(i) * (i + 1)) % ACCENTS.length;
  return h;
}

function TestCardIcon({ name = 'Test' }) {
  const [c1, c2] = ACCENTS[hashIndex(name)];

  return (
    <div className="test-card-icon" aria-hidden="true">
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`grad-base-${hashIndex(name)}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c1} stopOpacity="0.9" />
            <stop offset="100%" stopColor={c2} stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id={`grad-col-${hashIndex(name)}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id={`shadow-${hashIndex(name)}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor={c1} floodOpacity="0.35" />
          </filter>
        </defs>
        <ellipse cx="60" cy="108" rx="38" ry="6" fill={c1} fillOpacity="0.2" />
        <g filter={`url(#shadow-${hashIndex(name)})`}>
          <rect x="28" y="52" width="64" height="44" rx="4" fill={`url(#grad-base-${hashIndex(name)})`} />
          <rect x="28" y="52" width="64" height="12" rx="4" fill={`url(#grad-col-${hashIndex(name)})`} />
          <rect x="36" y="68" width="10" height="20" rx="2" fill="rgba(255,255,255,0.25)" />
          <rect x="55" y="68" width="10" height="20" rx="2" fill="rgba(255,255,255,0.25)" />
          <rect x="74" y="68" width="10" height="20" rx="2" fill="rgba(255,255,255,0.25)" />
          <path
            d="M20 52 L60 22 L100 52"
            stroke={`url(#grad-base-${hashIndex(name)})`}
            strokeWidth="6"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="60" cy="22" r="5" fill="#fff" fillOpacity="0.6" />
        </g>
        <rect x="54" y="38" width="12" height="18" rx="2" fill="rgba(255,255,255,0.15)" />
      </svg>
    </div>
  );
}

export default TestCardIcon;
