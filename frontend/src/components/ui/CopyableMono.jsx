import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from './Button'

export function CopyableMono({ text, truncateLength = 0, className }) {
  const [copied, setCopied] = useState(false)

  if (!text) return <span className="text-text-muted">—</span>

  const handleCopy = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // fallback
    }
  }

  const displayText =
    truncateLength > 0 && text.length > truncateLength
      ? `${text.slice(0, truncateLength)}…`
      : text

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-xs text-ink bg-paper-sunken px-2 py-0.5 rounded-[4px] border border-line-soft group cursor-pointer hover:border-ink transition-all',
        className
      )}
      onClick={handleCopy}
      title={`Click to copy: ${text}`}
    >
      <span className="truncate">{displayText}</span>
      <button
        type="button"
        className="text-ink-3 group-hover:text-ink transition-colors p-0.5 focus:outline-none"
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-[#2F7D5B]" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  )
}
