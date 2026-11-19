import { formatDistanceToNow, isValid } from 'date-fns'

/**
 * Safely parse any date value (ISO UTC string, SQLite naive timestamp, or Date)
 * into a valid UTC Date object.
 */
export function parseDateUTC(date) {
  if (!date) return null
  if (date instanceof Date) return isValid(date) ? date : null
  let s = String(date).trim()
  if (!s) return null
  // If string does not contain an explicit offset or Z indicator, treat as UTC
  if (!s.endsWith('Z') && !s.includes('+') && !/[-+]\d{2}:\d{2}$/.test(s)) {
    s = s.replace(' ', 'T') + 'Z'
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Format date in Asia/Kolkata timezone (e.g. "20 Nov 2026")
 */
export function formatDate(date) {
  const d = parseDateUTC(date)
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

/**
 * Format full date and time in Asia/Kolkata (IST) timezone
 * Example: "20 Nov 2026, 12:27:18 am IST"
 */
export function formatDateTime(date) {
  const d = parseDateUTC(date)
  if (!d) return '—'
  const formatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(d)
  return `${formatted} IST`
}

/**
 * Format in UTC ISO format for SOC technical audit inspection
 * Example: "2026-11-19T18:57:18Z"
 */
export function formatDateTimeUTC(date) {
  const d = parseDateUTC(date)
  if (!d) return '—'
  return d.toISOString()
}

/**
 * Format relative time (e.g. "2 minutes ago", "3 hours ago")
 * Accurately calculates elapsed time from UTC baseline.
 */
export function formatRelativeTime(date) {
  const d = parseDateUTC(date)
  if (!d) return '—'
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
