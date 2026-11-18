import React from 'react'

/**
 * ScanningLoaderIllustration
 * Wireframe browser window with a thin vertical sweeping laser/scan line.
 */
export function ScanningLoaderIllustration({ className = '', width = 120, height = 90 }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 140 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-ink ${className}`}
    >
      <defs>
        <linearGradient id="scanBeam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#161616" stopOpacity="0" />
          <stop offset="50%" stopColor="#161616" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#161616" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Outer Window */}
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

      {/* Header Divider */}
      <line x1="10" y1="28" x2="130" y2="28" stroke="#DDDAD1" strokeWidth="1" />

      {/* 3 Header Dots */}
      <circle cx="20" cy="20" r="2.5" stroke="#161616" strokeWidth="1.2" fill="none" />
      <circle cx="28" cy="20" r="2.5" stroke="#161616" strokeWidth="1.2" fill="none" />
      <circle cx="36" cy="20" r="2.5" stroke="#161616" strokeWidth="1.2" fill="none" />

      {/* Ghost Matrix Inside */}
      <rect x="22" y="38" width="40" height="8" rx="2" stroke="#B9B6AC" strokeWidth="1" strokeDasharray="2 2" fill="none" />
      <rect x="22" y="52" width="70" height="8" rx="2" stroke="#B9B6AC" strokeWidth="1" strokeDasharray="2 2" fill="none" />
      <rect x="22" y="66" width="50" height="8" rx="2" stroke="#B9B6AC" strokeWidth="1" strokeDasharray="2 2" fill="none" />
      <circle cx="106" cy="56" r="10" stroke="#DDDAD1" strokeWidth="1" strokeDasharray="3 3" fill="none" />

      {/* Animated Scan Line (CSS animation) */}
      <line x1="20" y1="30" x2="20" y2="86" stroke="#161616" strokeWidth="1.5" className="animate-[scan_2s_infinite_ease-in-out]" />
    </svg>
  )
}
