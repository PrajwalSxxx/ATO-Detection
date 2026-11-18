import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'

/**
 * Format a date string or Date object
 */
export function formatDate(date, fmt = 'MMM d, yyyy') {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  return format(d, fmt)
}

/**
 * Format a date with time
 */
export function formatDateTime(date) {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  return format(d, 'MMM d, yyyy HH:mm:ss')
}

/**
 * Format relative time (e.g. "2 hours ago")
 */
export function formatRelativeTime(date) {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  return formatDistanceToNow(d, { addSuffix: true })
}

/**
 * Format a number with comma separators
 */
export function formatNumber(n) {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat().format(n)
}

/**
 * Format a risk score (0-100)
 */
export function formatRiskScore(score) {
  if (score === null || score === undefined) return '—'
  return Number(score).toFixed(1)
}

/**
 * Format a percentage
 */
export function formatPercent(n, decimals = 1) {
  if (n === null || n === undefined) return '—'
  return `${Number(n).toFixed(decimals)}%`
}

/**
 * Format bytes to human-readable
 */
export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Truncate a string with ellipsis
 */
export function truncate(str, max = 32) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

/**
 * Format IP address (highlight if private)
 */
export function formatIP(ip) {
  return ip || '—'
}

/**
 * Format a risk level label
 */
export function formatRiskLevel(level) {
  if (!level) return '—'
  return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()
}

/**
 * Format decision label
 */
export function formatDecision(decision) {
  const map = {
    ALLOW: 'Allow',
    REQUIRE_MFA: 'Require MFA',
    BLOCK: 'Block',
  }
  return map[decision] || decision || '—'
}

/**
 * Format duration in seconds to readable string
 */
export function formatDuration(seconds) {
  if (!seconds) return '0s'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}
