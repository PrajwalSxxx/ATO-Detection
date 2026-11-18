import React from 'react'

/**
 * EmptyStateIllustration
 * Small wireframe browser window with dashed ghost boxes and a single solid black accent.
 */
export function EmptyStateIllustration({ className = '', width = 120, height = 90 }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 140 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-ink ${className}`}
    >
      {/* Browser Window Outline */}
      <rect
        x="10"
        y="12"
        width="120"
        height="76"
        rx="8"
        fill="#FFFFFF"
        stroke="#161616"
        strokeWidth="1.5"
      />

      {/* Window Header Line */}
      <line x1="10" y1="28" x2="130" y2="28" stroke="#DDDAD1" strokeWidth="1" />

      {/* 3 Window Dots (6px outlined unfilled circles) */}
      <circle cx="20" cy="20" r="2.5" stroke="#161616" strokeWidth="1.2" fill="none" />
      <circle cx="28" cy="20" r="2.5" stroke="#161616" strokeWidth="1.2" fill="none" />
      <circle cx="36" cy="20" r="2.5" stroke="#161616" strokeWidth="1.2" fill="none" />

      {/* Dashed Ghost Wireframe Boxes */}
      <rect
        x="22"
        y="38"
        width="96"
        height="12"
        rx="3"
        stroke="#B9B6AC"
        strokeWidth="1.2"
        strokeDasharray="3 3"
        fill="none"
      />
      <rect
        x="22"
        y="56"
        width="60"
        height="10"
        rx="3"
        stroke="#B9B6AC"
        strokeWidth="1.2"
        strokeDasharray="3 3"
        fill="none"
      />

      {/* Single Solid Black Accent Mark */}
      <rect x="92" y="56" width="26" height="10" rx="3" fill="#161616" />

      {/* Subtle bottom drop shadow hint */}
      <path d="M 16 91 L 126 91" stroke="#DDDAD1" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
