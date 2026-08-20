import React from 'react';

export function LevelBadge({ 
  totalDeposits = 0, 
  isAdmin = false, 
  className = '',
  profileWrapper = false
}: { 
  totalDeposits?: number, 
  isAdmin?: boolean, 
  className?: string,
  profileWrapper?: boolean
}) {
  const amount = totalDeposits;
  let num = 0;
  let topColor = '';
  let bottomColor = '';
  
  if (isAdmin) {
    num = 0;
    topColor = '#60A5FA'; // blue-400
    bottomColor = '#1E3A8A'; // blue-900
  } else if (amount >= 500000) {
    num = 6;
    topColor = '#FB7185';
    bottomColor = '#BE123C';
  } else if (amount >= 100000) {
    num = 5;
    topColor = '#FDBA74';
    bottomColor = '#C2410C';
  } else if (amount >= 50000) {
    num = 4;
    topColor = '#FCD34D';
    bottomColor = '#B45309';
  } else if (amount >= 10000) {
    num = 3;
    topColor = '#D8B4FE';
    bottomColor = '#6B21A8';
  } else if (amount >= 5000) {
    num = 2;
    topColor = '#6EE7B7';
    bottomColor = '#047857';
  } else if (amount >= 1000) {
    num = 1;
    topColor = '#93C5FD';
    bottomColor = '#1D4ED8';
  } else {
    if (!isAdmin) return null;
  }

  const idSuffix = Math.random().toString(36).substring(7);
  const gradId = `starGrad-${idSuffix}`;
  const glowId = `glow-${idSuffix}`;

  if (profileWrapper) {
    return (
      <svg 
        viewBox="0 0 220 220" 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[135%] h-[135%] pointer-events-none z-10 ${className}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={topColor}/>
            <stop offset="100%" stopColor={bottomColor}/>
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>

        {/* Outer glowing circle */}
        <circle cx="110" cy="110" r="95" stroke={topColor} strokeWidth="3" fill="none" opacity="0.8">
          <animate attributeName="stroke-opacity" values="0.4;1;0.4" dur="3s" repeatCount="indefinite"/>
        </circle>
        
        <circle cx="110" cy="110" r="86" fill="none" stroke={bottomColor} strokeWidth="2" opacity="0.8"/>

        {/* Star badge */}
        <g filter={`url(#${glowId})`}>
          <polygon 
            points="170,147 181,173 208,173 186,189 194,216 170,200 146,216 154,189 132,173 159,173"
            fill={`url(#${gradId})`} 
            stroke="#0A0A0A" 
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Level number or Admin Star */}
        {isAdmin ? (
          <polygon 
            points="170,165 174,180 188,183 176,192 180,206 170,198 160,206 164,192 152,183 166,180"
            fill="#FFFFFF" 
            style={{ dropShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
          />
        ) : (
          <text 
            x="170" 
            y="190" 
            textAnchor="middle" 
            alignmentBaseline="middle"
            fontSize="26" 
            fontWeight="900" 
            fill="white"
            style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}
          >
            {num}
          </text>
        )}
      </svg>
    );
  }

  // Standalone badge variant
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full relative z-10 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={topColor}/>
            <stop offset="100%" stopColor={bottomColor}/>
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>
        <g filter={`url(#${glowId})`}>
          <polygon 
            points="50,15 62,45 93,45 68,64 77,95 50,76 23,95 32,64 7,45 38,45"
            fill={`url(#${gradId})`} 
            stroke="#0A0A0A" 
            strokeWidth="4"
            strokeLinejoin="round"
          />
        </g>
        {isAdmin ? (
          <polygon 
            points="50,35 55,54 75,58 60,69 65,88 50,78 35,88 40,69 25,58 45,54"
            fill="#FFFFFF" 
          />
        ) : (
          <text 
            x="50" 
            y="65" 
            textAnchor="middle" 
            alignmentBaseline="middle"
            fontSize="34" 
            fontWeight="900" 
            fill="white"
            style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}
          >
            {num}
          </text>
        )}
      </svg>
    </div>
  );
}
