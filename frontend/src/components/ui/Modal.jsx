import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from './Button'

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
}) {
  const modalRef = useRef(null)

  // Esc key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop (flat rgba, no blur) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#161616]/35"
          />

          {/* Modal Panel - WindowFrame motif with hard shadow */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={cn(
              'relative w-full bg-paper-raised border-[1.5px] border-ink rounded-[14px] shadow-hard z-10 max-h-[90vh] overflow-hidden flex flex-col',
              sizes[size] || sizes.md,
              className
            )}
          >
            {/* Titlebar with 3 dots */}
            <div className="h-10 px-4 bg-paper-sunken border-b border-line-soft flex items-center justify-between select-none shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border-[1.25px] border-ink bg-transparent" />
                <span className="w-2 h-2 rounded-full border-[1.25px] border-ink bg-transparent" />
                <span className="w-2 h-2 rounded-full border-[1.25px] border-ink bg-transparent" />
              </div>

              {title && (
                <span className="text-xs font-semibold text-ink tracking-tight truncate px-2">
                  {title}
                </span>
              )}

              <button
                type="button"
                onClick={onClose}
                className="text-ink-3 hover:text-ink p-1 rounded hover:bg-paper-hover transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6 overflow-y-auto">
              {description && (
                <p className="text-xs text-ink-2 mb-4">
                  {description}
                </p>
              )}
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
