import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { cn } from './Button'

export function SearchInput({
  value: controlledValue,
  onChange,
  onSearch,
  placeholder = 'Search...',
  debounceMs = 300,
  className,
  ...props
}) {
  const [internalValue, setInternalValue] = useState(controlledValue || '')

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue)
    }
  }, [controlledValue])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) {
        onSearch(internalValue)
      }
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [internalValue, debounceMs, onSearch])

  const handleChange = (e) => {
    const val = e.target.value
    setInternalValue(val)
    if (onChange) onChange(e)
  }

  const handleClear = () => {
    setInternalValue('')
    if (onChange) {
      onChange({ target: { value: '' } })
    }
    if (onSearch) {
      onSearch('')
    }
  }

  return (
    <div className={cn('relative flex items-center group', className)}>
      <Search
        className="w-4 h-4 text-ink-3 absolute left-3 pointer-events-none group-focus-within:text-ink transition-colors duration-150"
        aria-hidden="true"
      />
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-paper-sunken border border-line-soft rounded-[6px] text-ink text-xs md:text-sm pl-9 pr-8 py-2 transition-all placeholder:text-ink-3 focus:outline-none focus:border-ink focus:bg-paper-raised focus:ring-1 focus:ring-ink shadow-2xs"
        {...props}
      />
      <AnimatePresence>
        {internalValue && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 text-ink-3 hover:text-ink p-1 rounded-[4px] hover:bg-paper-hover transition-colors focus:outline-none cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
