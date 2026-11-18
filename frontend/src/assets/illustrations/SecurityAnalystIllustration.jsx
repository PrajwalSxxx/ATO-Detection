import React from 'react'

/**
 * SecurityAnalystIllustration
 * Original line-art illustration: a friendly, intelligent analyst with glasses,
 * cap, and sweater working on a laptop with dashed motion/orbit lines and a solid black shield icon.
 */
export function SecurityAnalystIllustration({ className = '', width = 160, height = 130 }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-ink ${className}`}
    >
      {/* Dashed background orbit / motion lines */}
      <path
        d="M 20 80 C 20 35, 180 35, 180 80 C 180 125, 20 125, 20 80"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeDasharray="4 4"
        opacity="0.35"
      />
      <path
        d="M 145 25 C 165 40, 185 70, 175 105"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeDasharray="3 3"
        opacity="0.4"
      />

      {/* Solid Black Shield Accent Icon (Floating top-right) */}
      <g transform="translate(150, 32)">
        <path
          d="M 12 3 L 22 7 V 14 C 22 19.5 17.5 24 12 25.5 C 6.5 24 2 19.5 2 14 V 7 Z"
          fill="#161616"
          stroke="#161616"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 8.5 13.5 L 11 16 L 15.5 11"
          stroke="#F8F7F3"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Desk Surface (Calm hairline) */}
      <line x1="30" y1="138" x2="170" y2="138" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

      {/* Analyst Figure */}
      {/* Cap */}
      <path
        d="M 82 46 C 82 34 118 34 118 46 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cap Brim */}
      <path
        d="M 112 45 C 122 45 130 48 132 50 C 124 51 114 50 108 48"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Head & Ear */}
      <path
        d="M 87 46 C 87 60 113 60 113 46"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M 86 52 C 84 52 83 55 85 57 C 87 58 87 56 87 54"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />

      {/* Round Glasses */}
      <circle cx="94" cy="50" r="4.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="106" cy="50" r="4.5" stroke="currentColor" strokeWidth="1.25" />
      <line x1="98.5" y1="50" x2="101.5" y2="50" stroke="currentColor" strokeWidth="1.25" />
      {/* Temple */}
      <line x1="88" y1="49" x2="89.5" y2="50" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />

      {/* Friendly Smile */}
      <path d="M 97 57 Q 100 60 103 57" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />

      {/* Neck */}
      <path d="M 95 62 L 95 67" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 105 62 L 105 67" stroke="currentColor" strokeWidth="1.5" />

      {/* Sweater & Shoulders */}
      <path
        d="M 92 68 C 80 72 65 82 62 108 L 138 108 C 135 82 120 72 108 68"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Collar */}
      <path d="M 93 68 Q 100 73 107 68" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

      {/* Small Stitched Mark on the Sweater (Star/Cross emblem) */}
      <g transform="translate(80, 82)">
        <line x1="0" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="4" y1="0" x2="4" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="4" cy="4" r="1.5" fill="#161616" />
      </g>

      {/* Arms & Hands Typing */}
      <path
        d="M 64 102 C 67 114 80 120 95 120"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M 136 102 C 133 114 120 120 105 120"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Laptop */}
      {/* Screen */}
      <path
        d="M 100 95 L 126 95 L 122 122 L 98 122 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Base / Keyboard */}
      <path
        d="M 88 122 L 136 122 L 140 126 L 84 126 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Tiny coffee mug on the desk */}
      <rect x="44" y="126" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <path d="M 44 129 C 40 129 40 135 44 135" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
