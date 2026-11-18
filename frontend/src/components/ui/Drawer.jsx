import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from './Button'

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  width = 'max-w-xl',
  className,
}) {
  const drawerRef = useRef(null)

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden"
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

          {/* Drawer Panel - WindowFrame motif */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
            <motion.div
              ref={drawerRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className={cn(
                'w-screen bg-paper-raised border-l-[1.5px] border-ink shadow-hard flex flex-col',
                width,
                className
              )}
            >
              {/* Header Titlebar with 3 dots */}
              <div className="h-12 px-5 bg-paper-sunken border-b border-line-soft flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-3 truncate">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full border-[1.25px] border-ink bg-transparent" />
                    <span className="w-2 h-2 rounded-full border-[1.25px] border-ink bg-transparent" />
                    <span className="w-2 h-2 rounded-full border-[1.25px] border-ink bg-transparent" />
                  </div>
                  <div className="truncate">
                    {title && (
                      <h3 className="text-xs font-semibold text-ink tracking-tight truncate">
                        {title}
                      </h3>
                    )}
                    {description && (
                      <p className="text-[11px] font-mono text-ink-3 truncate">
                        {description}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="text-ink-3 hover:text-ink p-1 rounded hover:bg-paper-hover transition-colors shrink-0"
                  aria-label="Close drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-paper-raised">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
