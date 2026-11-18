/**
 * Risk level → Editorial color classes (Paper & Ink tokens)
 */
export const RISK_COLORS = {
  LOW: {
    text: 'text-[#2F7D5B]',
    bg: 'bg-[#E6F1EA]',
    border: 'border-[#2F7D5B]/40',
    hex: '#2F7D5B',
    tint: '#E6F1EA',
    label: 'Low',
  },
  MEDIUM: {
    text: 'text-[#B7791F]',
    bg: 'bg-[#F8EFD9]',
    border: 'border-[#B7791F]/40',
    hex: '#B7791F',
    tint: '#F8EFD9',
    label: 'Medium',
  },
  HIGH: {
    text: 'text-[#B3382C]',
    bg: 'bg-[#F6E2DE]',
    border: 'border-[#B3382C]/40',
    hex: '#B3382C',
    tint: '#F6E2DE',
    label: 'High',
  },
  CRITICAL: {
    text: 'text-[#8F1D14]',
    bg: 'bg-[#F1D4CF]',
    border: 'border-[#8F1D14]/40',
    hex: '#8F1D14',
    tint: '#F1D4CF',
    label: 'Critical',
  },
}

/**
 * Decision → colors
 */
export const DECISION_COLORS = {
  ALLOW: {
    text: 'text-[#2F7D5B]',
    bg: 'bg-[#E6F1EA]',
    border: 'border-[#2F7D5B]/40',
    hex: '#2F7D5B',
    label: 'Allow',
  },
  REQUIRE_MFA: {
    text: 'text-[#B7791F]',
    bg: 'bg-[#F8EFD9]',
    border: 'border-[#B7791F]/40',
    hex: '#B7791F',
    label: 'Require MFA',
  },
  BLOCK: {
    text: 'text-[#B3382C]',
    bg: 'bg-[#F6E2DE]',
    border: 'border-[#B3382C]/40',
    hex: '#B3382C',
    label: 'Block',
  },
}

/**
 * Alert severity → colors
 */
export const SEVERITY_COLORS = {
  low: {
    text: 'text-ink-2',
    bg: 'bg-paper-sunken',
    hex: '#4A4A47',
  },
  medium: {
    text: 'text-[#B7791F]',
    bg: 'bg-[#F8EFD9]',
    hex: '#B7791F',
  },
  high: {
    text: 'text-[#B3382C]',
    bg: 'bg-[#F6E2DE]',
    hex: '#B3382C',
  },
  critical: {
    text: 'text-[#8F1D14]',
    bg: 'bg-[#F1D4CF]',
    hex: '#8F1D14',
  },
}

/**
 * Get risk color by numeric score
 */
export function getRiskColorByScore(score) {
  if (score <= 30) return RISK_COLORS.LOW
  if (score <= 70) return RISK_COLORS.MEDIUM
  return RISK_COLORS.HIGH
}

/**
 * Get risk level string from numeric score
 */
export function getRiskLevelFromScore(score) {
  if (score <= 30) return 'LOW'
  if (score <= 70) return 'MEDIUM'
  return 'HIGH'
}
