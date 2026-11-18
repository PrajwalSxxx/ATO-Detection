import React from 'react'

/**
 * LoginHeroIllustration
 * Isometric stack of wireframe sheets with a small lock/shield outline,
 * dashed orbit lines, and clean editorial blueprint lines.
 */
export function LoginHeroIllustration({ className = '', width = '100%', height = 'auto' }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 380 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-ink ${className}`}
    >
      {/* Dashed outer orbit ellipses */}
      <ellipse
        cx="190"
        cy="120"
        rx="160"
        ry="80"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeDasharray="5 5"
        opacity="0.3"
      />
      <ellipse
        cx="190"
        cy="115"
        rx="110"
        ry="55"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.4"
      />

      {/* Vertical Corner Projection Lines linking the sheets */}
      <line x1="60" y1="70" x2="60" y2="160" stroke="#DDDAD1" strokeWidth="1.25" strokeDasharray="3 3" />
      <line x1="320" y1="70" x2="320" y2="160" stroke="#DDDAD1" strokeWidth="1.25" strokeDasharray="3 3" />
      <line x1="190" y1="120" x2="190" y2="210" stroke="#DDDAD1" strokeWidth="1.25" strokeDasharray="3 3" />

      {/* ─── BOTTOM SHEET (Telemetry) ─── */}
      <g opacity="0.6">
        <polygon
          points="190,140 320,175 190,210 60,175"
          fill="#F1EFE9"
          stroke="#161616"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        {/* Wireframe sub-divisions */}
        <line x1="125" y1="157.5" x2="255" y2="192.5" stroke="#B9B6AC" strokeWidth="0.8" strokeDasharray="2 2" />
        <line x1="255" y1="157.5" x2="125" y2="192.5" stroke="#B9B6AC" strokeWidth="0.8" strokeDasharray="2 2" />
      </g>

      {/* ─── MIDDLE SHEET (Isolation Forest Feature Matrix) ─── */}
      <g opacity="0.85">
        <polygon
          points="190,95 320,130 190,165 60,130"
          fill="#FFFFFF"
          stroke="#161616"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        {/* Wireframe grid */}
        <line x1="125" y1="112.5" x2="255" y2="147.5" stroke="#DDDAD1" strokeWidth="0.8" />
        <line x1="255" y1="112.5" x2="125" y2="147.5" stroke="#DDDAD1" strokeWidth="0.8" />
        {/* Anomaly split indicator */}
        <circle cx="190" cy="130" r="2.5" fill="#161616" />
      </g>

      {/* ─── TOP SHEET (Zero-Trust Adaptive Envelope) ─── */}
      <g>
        <polygon
          points="190,50 320,85 190,120 60,85"
          fill="#FFFFFF"
          stroke="#161616"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Grid lines */}
        <line x1="125" y1="67.5" x2="255" y2="102.5" stroke="#DDDAD1" strokeWidth="1" />
        <line x1="255" y1="67.5" x2="125" y2="102.5" stroke="#DDDAD1" strokeWidth="1" />

        {/* Isometric Corner Accents */}
        <path d="M 56 83 L 60 85 L 56 87" stroke="#161616" strokeWidth="1.25" />
        <path d="M 324 83 L 320 85 L 324 87" stroke="#161616" strokeWidth="1.25" />

        {/* Small Floating Lock / Shield Outline in the center */}
        <g transform="translate(181, 72)">
          {/* Lock Shackle */}
          <path
            d="M 5 6 V 3 C 5 1.5 6.5 0 9 0 C 11.5 0 13 1.5 13 3 V 6"
            stroke="#161616"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Lock Body (Solid Black with white keyhole) */}
          <rect x="2" y="6" width="14" height="11" rx="2" fill="#161616" stroke="#161616" strokeWidth="1.5" />
          <circle cx="9" cy="10.5" r="1.5" fill="#F8F7F3" />
          <line x1="9" y1="12" x2="9" y2="14" stroke="#F8F7F3" strokeWidth="1" strokeLinecap="round" />
        </g>

        {/* Micro coordinate markers */}
        <circle cx="130" cy="85" r="2" fill="#2F7D5B" />
        <circle cx="250" cy="85" r="2" fill="#B3382C" />
      </g>

      {/* Floating accent satellite mark */}
      <g transform="translate(295, 45)">
        <circle cx="8" cy="8" r="4" stroke="#161616" strokeWidth="1.25" fill="#F8F7F3" />
        <path d="M 8 1 L 8 4 M 8 12 L 8 15 M 1 8 L 4 8 M 12 8 L 15 8" stroke="#161616" strokeWidth="1" strokeLinecap="round" />
      </g>
    </svg>
  )
}
