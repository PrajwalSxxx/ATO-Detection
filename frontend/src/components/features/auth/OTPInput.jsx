import React, { useState, useRef, useEffect } from 'react'
import { RotateCw } from 'lucide-react'

export function OTPInput({
  length = 6,
  onComplete,
  onResend,
  isLoading = false,
  isResending = false,
  error,
}) {
  const [digits, setDigits] = useState(Array(length).fill(''))
  const [timer, setTimer] = useState(60)
  const inputRefs = useRef([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (timer <= 0) return
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [timer])

  const handleChange = (idx, e) => {
    const val = e.target.value.replace(/\D/g, '')
    if (!val) {
      const next = [...digits]
      next[idx] = ''
      setDigits(next)
      return
    }

    const char = val.slice(-1)
    const next = [...digits]
    next[idx] = char
    setDigits(next)

    // Advance to next input
    if (idx < length - 1) {
      inputRefs.current[idx + 1]?.focus()
    }

    // If all digits entered
    if (next.every((d) => d !== '')) {
      onComplete(next.join(''))
    }
  }

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return

    const next = [...digits]
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i]
    }
    setDigits(next)

    const focusIdx = Math.min(pasted.length, length - 1)
    inputRefs.current[focusIdx]?.focus()

    if (next.every((d) => d !== '')) {
      onComplete(next.join(''))
    }
  }

  const handleResend = async () => {
    if (timer > 0 || isResending) return
    if (onResend) {
      await onResend()
      setTimer(60)
      setDigits(Array(length).fill(''))
      inputRefs.current[0]?.focus()
    }
  }

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => (inputRefs.current[idx] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(idx, e)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            disabled={isLoading}
            className={`w-11 h-14 sm:w-12 sm:h-14 text-center font-mono text-xl font-bold rounded-[8px] border bg-paper-raised text-ink transition-all focus:outline-none ${
              error
                ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger'
                : 'border-line-soft focus:border-ink focus:border-[1.5px] focus:shadow-hard-sm'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs text-danger font-mono font-medium text-center" role="alert" aria-live="polite">
          {error}
        </p>
      )}

      {/* Countdown and Resend */}
      <div className="flex items-center justify-between w-full text-xs text-ink-3 pt-3 border-t border-line-soft">
        <span>
          {timer > 0 ? (
            <span>
              Resend passcode in <strong className="font-mono text-ink">{timer}s</strong>
            </span>
          ) : (
            'Didn’t receive the code?'
          )}
        </span>

        <button
          type="button"
          disabled={timer > 0 || isResending}
          onClick={handleResend}
          className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-ink hover:underline disabled:text-ink-3 disabled:no-underline disabled:cursor-not-allowed transition-colors"
        >
          {isResending && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
          Resend OTP
        </button>
      </div>
    </div>
  )
}
