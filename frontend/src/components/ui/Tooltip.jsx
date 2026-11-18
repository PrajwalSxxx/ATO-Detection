import React, { useState } from 'react'

export function Tooltip({ content, children, className = '' }) {
  const [isVisible, setIsVisible] = useState(false)

  if (!content) return children

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-0.5 text-[11px] font-mono font-medium text-paper bg-ink rounded-[6px] shadow-hard-sm whitespace-nowrap z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-100"
        >
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ink" />
        </div>
      )}
    </div>
  )
}
