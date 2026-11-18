import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'
import { Select } from './Select'

export function Pagination({
  page = 1,
  pageSize = 25,
  total = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-2 select-none ${className || ''}`}
    >
      <div className="flex items-center gap-2">
        <span>
          Showing <span className="font-mono text-ink font-semibold">{startItem}</span> to{' '}
          <span className="font-mono text-ink font-semibold">{endItem}</span> of{' '}
          <span className="font-mono text-ink font-semibold">{total}</span> results
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-3">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-paper-raised border border-line-soft rounded-[4px] text-xs px-2 py-1 text-ink focus:outline-none focus:border-ink"
            >
              {pageSizeOptions.map((sz) => (
                <option key={sz} value={sz} className="bg-paper-raised text-ink">
                  {sz}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="w-8 h-8 rounded-[4px] border border-line-soft bg-paper-raised text-ink flex items-center justify-center hover:border-ink disabled:opacity-40 transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="w-8 h-8 rounded-[4px] border border-ink bg-ink text-paper font-mono text-xs flex items-center justify-center select-none shadow-sm">
          {page}
        </span>
        <span className="text-xs font-mono text-ink-3 px-1">/ {totalPages}</span>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="w-8 h-8 rounded-[4px] border border-line-soft bg-paper-raised text-ink flex items-center justify-center hover:border-ink disabled:opacity-40 transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
