import React, { useState, useEffect } from 'react'
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
    <div className={cn('relative flex items-center', className)}>
      <Search
        className="w-4 h-4 text-text-muted absolute left-3 pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-bg-surface border border-border-subtle rounded text-text-primary text-xs md:text-sm pl-9 pr-8 py-2 transition-colors placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        {...props}
      />
      {internalValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 text-text-muted hover:text-text-primary p-0.5 rounded focus:outline-none"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
