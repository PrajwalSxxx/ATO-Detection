import React from 'react'

/**
 * ErrorStateIllustration
 * Browser window with a broken/dashed hairline border and a small solid-black warning glyph.
 */
export function ErrorStateIllustration({ className = '', width = 120, height = 90 }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 140 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-ink ${className}`}
    >
      {/* Broken/Dashed Browser Window Frame */}
      <rect
        x="10"
        y="12"
        width="120"
        height="76"
        rx="8"
        fill="#FFFFFF"
        stroke="#161616"
        strokeWidth="1.5"
        strokeDasharray="6 3"
      />

      {/* Window Header Line */}
      <line x1="10" y1="28" x2="130" y2="28" stroke="#DDDAD1" strokeWidth="1" strokeDasharray="4 2" />

      {/* 3 Window Dots */}
      <circle cx="20" cy="20" r="2.5" stroke="#161616" strokeWidth="1.2" fill="none" />
      <circle cx="28" cy="20" r="2.5" stroke="#161616" strokeWidth="1.2" fill="none" />
      <circle cx="36" cy="20" r="2.5" stroke="#161616" strokeWidth="1.2" fill="none" />

      {/* Warning Glyph inside (Muted Danger Triangle with solid ink exclamation) */}
      <g transform="translate(56, 38)">
        <polygon
          points="14,2 27,24 1,24"
          fill="#F6E2DE"
          stroke="#B3382C"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <line x1="14" y1="10" x2="14" y2="16" stroke="#161616" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="14" cy="20" r="1" fill="#161616" />
      </g>

      {/* Dashed Ghost Row */}
      <rect
        x="30"
        y="70"
        width="80"
        height="8"
        rx="2"
        stroke="#B9B6AC"
        strokeWidth="1"
        strokeDasharray="2 2"
        fill="none"
      />
    </svg>
  )
}
