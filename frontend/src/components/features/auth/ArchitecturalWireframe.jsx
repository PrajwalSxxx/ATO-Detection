import React from 'react'

/**
 * ArchitecturalWireframe
 * Renders stacked, thin-outlined isometric wireframe sheets seen at an angle,
 * giving a calm, technical, architectural feel for the enterprise security login screen.
 */
export function ArchitecturalWireframe({ className = '' }) {
  return (
    <div className={`relative w-full select-none overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 540 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-[220px]"
      >
        <defs>
          {/* Subtle plane fills */}
          <linearGradient id="planeGradBottom" x1="90" y1="160" x2="450" y2="270" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#151C2C" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#0F1522" stopOpacity="0.5" />
          </linearGradient>

          <linearGradient id="planeGradMiddle" x1="90" y1="90" x2="450" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1A2236" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#151C2C" stopOpacity="0.6" />
          </linearGradient>

          <linearGradient id="planeGradTop" x1="90" y1="20" x2="450" y2="130" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#151C2C" stopOpacity="0.7" />
          </linearGradient>

          {/* Glowing node filter */}
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ─── VERTICAL ARCHITECTURAL PROJECTION LINES (Connecting the 3 sheets) ─── */}
        {/* Left corner drop */}
        <path d="M 90 65 L 90 205" stroke="#2B3649" strokeWidth="1" strokeDasharray="3 3" />
        {/* Right corner drop */}
        <path d="M 450 65 L 450 205" stroke="#2B3649" strokeWidth="1" strokeDasharray="3 3" />
        {/* Center front drop */}
        <path d="M 270 120 L 270 260" stroke="#2B3649" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
        {/* Center back drop */}
        <path d="M 270 10 L 270 150" stroke="#1F2937" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />

        {/* Internal feature coordinate projections */}
        <path d="M 210 50 L 210 190" stroke="#38BDF8" strokeWidth="1" strokeDasharray="2 3" opacity="0.35" />
        <path d="M 330 50 L 330 190" stroke="#8B5CF6" strokeWidth="1" strokeDasharray="2 3" opacity="0.35" />
        <path d="M 270 65 L 270 205" stroke="#10B981" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />

        {/* ─── SHEET 1 (BOTTOM): Ingestion & Telemetry Grid ─── */}
        <g id="sheet-bottom">
          {/* Main wireframe plane */}
          <polygon
            points="270,150 450,205 270,260 90,205"
            fill="url(#planeGradBottom)"
            stroke="#2B3649"
            strokeWidth="1.2"
          />

          {/* Isometric internal grid lines */}
          <path d="M 180,177.5 L 360,232.5" stroke="#1F2937" strokeWidth="1" />
          <path d="M 360,177.5 L 180,232.5" stroke="#1F2937" strokeWidth="1" />
          <path d="M 135,191.2 L 315,246.2" stroke="#1F2937" strokeWidth="0.75" opacity="0.6" />
          <path d="M 405,191.2 L 225,246.2" stroke="#1F2937" strokeWidth="0.75" opacity="0.6" />

          {/* Telemetry nodes */}
          <circle cx="210" cy="190" r="2.5" fill="#38BDF8" opacity="0.6" />
          <circle cx="330" cy="190" r="2.5" fill="#38BDF8" opacity="0.6" />
          <circle cx="270" cy="205" r="3" fill="#6B778C" />

          {/* Technical label */}
          <text x="96" y="222" fill="#6B778C" fontSize="8.5" fontFamily="monospace" letterSpacing="0.08em">
            L1 // TELEMETRY &amp; DEVICE INGESTION [18-DIM]
          </text>
        </g>

        {/* ─── SHEET 2 (MIDDLE): Isolation Forest Anomaly Matrix ─── */}
        <g id="sheet-middle">
          {/* Main wireframe plane */}
          <polygon
            points="270,80 450,135 270,190 90,135"
            fill="url(#planeGradMiddle)"
            stroke="#334155"
            strokeWidth="1.2"
          />

          {/* Isometric internal grid lines */}
          <path d="M 180,107.5 L 360,162.5" stroke="#2B3649" strokeWidth="1" />
          <path d="M 360,107.5 L 180,162.5" stroke="#2B3649" strokeWidth="1" />
          <path d="M 225,93.8 L 405,148.8" stroke="#2B3649" strokeWidth="0.75" opacity="0.7" />
          <path d="M 315,93.8 L 135,148.8" stroke="#2B3649" strokeWidth="0.75" opacity="0.7" />

          {/* Isolation forest partition lines */}
          <path d="M 240,110 L 300,160" stroke="#8B5CF6" strokeWidth="1" strokeDasharray="3 2" opacity="0.8" />
          <path d="M 220,140 L 320,130" stroke="#8B5CF6" strokeWidth="1" strokeDasharray="3 2" opacity="0.8" />

          {/* Anomaly nodes */}
          <circle cx="270" cy="135" r="3.5" fill="#8B5CF6" filter="url(#softGlow)" />
          <circle cx="240" cy="110" r="2" fill="#8B5CF6" />
          <circle cx="300" cy="160" r="2" fill="#8B5CF6" />

          {/* Technical label */}
          <text x="96" y="152" fill="#8B5CF6" fontSize="8.5" fontFamily="monospace" letterSpacing="0.08em">
            L2 // ISOLATION FOREST ANOMALY ENGINE [EVAL]
          </text>
        </g>

        {/* ─── SHEET 3 (TOP): Zero-Trust Adaptive Policy Mesh ─── */}
        <g id="sheet-top">
          {/* Main wireframe plane with brand border */}
          <polygon
            points="270,10 450,65 270,120 90,65"
            fill="url(#planeGradTop)"
            stroke="#38BDF8"
            strokeWidth="1.4"
          />

          {/* Isometric sub-grid */}
          <path d="M 180,37.5 L 360,92.5" stroke="#2B3649" strokeWidth="1" />
          <path d="M 360,37.5 L 180,92.5" stroke="#2B3649" strokeWidth="1" />

          {/* Decision zones: Green (Allow), Amber (MFA), Red (Block) */}
          {/* Zone 1: Allow (Left) */}
          <circle cx="200" cy="65" r="4.5" fill="#10B981" filter="url(#softGlow)" />
          <circle cx="200" cy="65" r="2" fill="#E6EAF2" />
          <text x="175" y="82" fill="#10B981" fontSize="8" fontFamily="monospace" fontWeight="600">
            ALLOW
          </text>

          {/* Zone 2: Step-Up MFA (Center) */}
          <circle cx="270" cy="65" r="4.5" fill="#F59E0B" filter="url(#softGlow)" />
          <circle cx="270" cy="65" r="2" fill="#E6EAF2" />
          <text x="257" y="82" fill="#F59E0B" fontSize="8" fontFamily="monospace" fontWeight="600">
            MFA
          </text>

          {/* Zone 3: Block (Right) */}
          <circle cx="340" cy="65" r="4.5" fill="#EF4444" filter="url(#softGlow)" />
          <circle cx="340" cy="65" r="2" fill="#E6EAF2" />
          <text x="325" y="82" fill="#EF4444" fontSize="8" fontFamily="monospace" fontWeight="600">
            BLOCK
          </text>

          {/* Connecting vector */}
          <path d="M 200,65 L 270,65 L 340,65" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

          {/* Top Sheet Technical Metadata */}
          <text x="96" y="82" fill="#38BDF8" fontSize="8.5" fontFamily="monospace" letterSpacing="0.08em">
            L3 // ADAPTIVE POLICY THRESHOLD MATRIX
          </text>

          {/* Corner tick marks for architectural blueprint feel */}
          <path d="M 85,63 L 90,65 L 85,67" stroke="#38BDF8" strokeWidth="1" />
          <path d="M 455,63 L 450,65 L 455,67" stroke="#38BDF8" strokeWidth="1" />
          <path d="M 270,5 L 270,10" stroke="#38BDF8" strokeWidth="1" />
        </g>

        {/* Compass / Coordinate indicator in top right */}
        <g opacity="0.5" transform="translate(465, 20)">
          <line x1="0" y1="15" x2="15" y2="7.5" stroke="#6B778C" strokeWidth="1" />
          <line x1="0" y1="15" x2="-15" y2="7.5" stroke="#6B778C" strokeWidth="1" />
          <line x1="0" y1="15" x2="0" y2="0" stroke="#38BDF8" strokeWidth="1" />
          <text x="4" y="6" fill="#38BDF8" fontSize="7" fontFamily="monospace">Z</text>
          <text x="14" y="16" fill="#6B778C" fontSize="7" fontFamily="monospace">X</text>
          <text x="-20" y="16" fill="#6B778C" fontSize="7" fontFamily="monospace">Y</text>
        </g>
      </svg>
    </div>
  )
}
