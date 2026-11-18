import React, { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, AlignJustify, List } from 'lucide-react'
import { cn } from './Button'
import { TableRowSkeleton } from './Skeleton'
import { EmptyState } from './EmptyState'

export function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  emptyTitle = 'No data available',
  emptyDescription = 'There are no records to display.',
  onRowClick,
  sortColumn,
  sortDirection = 'asc',
  onSort,
  keyExtractor = (item, idx) => item.id || idx,
  className,
  showDensityToggle = false,
}) {
  const [density, setDensity] = useState('comfortable') // 'compact' | 'comfortable'

  const handleHeaderClick = (col) => {
    if (!col.sortable || !onSort) return
    if (sortColumn === col.key) {
      onSort(col.key, sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(col.key, 'asc')
    }
  }

  const paddingClass = density === 'compact' ? 'py-2 px-3' : 'py-3.5 px-4'

  return (
    <div className={cn('w-full flex flex-col', className)}>
      {showDensityToggle && (
        <div className="flex justify-end mb-2">
          <div className="flex items-center gap-1 bg-bg-surface border border-border-subtle rounded p-0.5">
            <button
              type="button"
              onClick={() => setDensity('comfortable')}
              className={cn(
                'p-1 rounded text-xs transition-colors',
                density === 'comfortable'
                  ? 'bg-bg-elevated text-brand'
                  : 'text-text-muted hover:text-text-primary'
              )}
              title="Comfortable density"
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={cn(
                'p-1 rounded text-xs transition-colors',
                density === 'compact'
                  ? 'bg-bg-elevated text-brand'
                  : 'text-text-muted hover:text-text-primary'
              )}
              title="Compact density"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-[8px] border border-line-soft bg-paper-raised">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-paper-sunken border-b border-line-soft sticky top-0 z-10 select-none">
            <tr>
              {columns.map((col) => {
                const isSorted = sortColumn === col.key
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={{ width: col.width }}
                    onClick={() => handleHeaderClick(col)}
                    className={cn(
                      'text-[11px] font-mono font-medium text-ink-3 uppercase tracking-wider',
                      paddingClass,
                      col.sortable &&
                        'cursor-pointer hover:text-ink transition-colors',
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    )}
                  >
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        col.align === 'right' && 'justify-end w-full',
                        col.align === 'center' && 'justify-center w-full'
                      )}
                    >
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span className="text-ink-3">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-ink" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-ink" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-line-soft">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={columns.length} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => (
                <tr
                  key={keyExtractor(item, rowIdx)}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={cn(
                    'transition-colors duration-100 group relative',
                    onRowClick && 'cursor-pointer hover:bg-paper-hover active:bg-paper-sunken',
                    !onRowClick && 'hover:bg-paper-hover/50'
                  )}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key}
                      className={cn(
                        'text-ink text-xs',
                        paddingClass,
                        colIdx === 0 && 'group-hover:border-l-2 group-hover:border-l-ink',
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      )}
                    >
                      {col.render ? col.render(item[col.key], item, rowIdx) : item[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
