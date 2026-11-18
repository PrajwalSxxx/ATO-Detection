/**
 * Central Animation System for Paper & Ink Design System
 * Provides standard Framer Motion variants, easing, and timing presets.
 */

export const EASING = [0.22, 1, 0.36, 1] // smooth out

export const DURATION = {
  micro: 0.12,
  ui: 0.2,
  page: 0.26,
  chart: 0.6,
}

export const SPRING = {
  modal: { type: 'spring', stiffness: 320, damping: 30 },
  drawer: { type: 'spring', stiffness: 320, damping: 30 },
  switch: { type: 'spring', stiffness: 450, damping: 35 },
  subtle: { type: 'spring', stiffness: 280, damping: 25 },
}

// Page route transition
export const pageTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.page, ease: EASING } },
  exit: { opacity: 0, y: -6, transition: { duration: DURATION.ui, ease: EASING } },
}

// Fade in
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DURATION.ui, ease: EASING } },
  exit: { opacity: 0, transition: { duration: DURATION.micro, ease: EASING } },
}

// Fade up
export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.ui, ease: EASING } },
  exit: { opacity: 0, y: -4, transition: { duration: DURATION.micro, ease: EASING } },
}

// Scale in for modals / popovers
export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: SPRING.modal },
  exit: { opacity: 0, scale: 0.96, transition: { duration: DURATION.micro, ease: EASING } },
}

// Slide in from right for drawers
export const slideInRight = {
  initial: { x: '100%' },
  animate: { x: 0, transition: SPRING.drawer },
  exit: { x: '100%', transition: { duration: DURATION.ui, ease: EASING } },
}

// Stagger container
export const staggerContainer = (staggerChildren = 0.04, delayChildren = 0) => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
})

// Stagger child item
export const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.ui, ease: EASING } },
}

// Horizontal shake animation (e.g. invalid OTP, wrong password)
export const shake = {
  animate: {
    x: [0, -6, 6, -4, 4, -2, 2, 0],
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
}

// Sticker lift hover variant (hard shadow shift)
export const stickerLift = {
  rest: { x: 0, y: 0, boxShadow: '0px 0px 0 0 #161616' },
  hover: {
    x: -2,
    y: -2,
    boxShadow: '3px 3px 0 0 #161616',
    transition: { duration: DURATION.micro, ease: EASING },
  },
  tap: {
    x: 0,
    y: 0,
    boxShadow: '1px 1px 0 0 #161616',
    transition: { duration: 0.06 },
  },
}
