import type { Transition, Variants } from 'motion/react'

export const transition = {
  fast: { duration: 0.15, ease: [0.4, 0, 0.2, 1] } satisfies Transition,
  normal: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } satisfies Transition,
  slow: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } satisfies Transition,
  spring: { type: 'spring', stiffness: 380, damping: 36 } satisfies Transition,
  layout: { type: 'spring', stiffness: 420, damping: 42 } satisfies Transition,
} as const

export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

export const slideRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 24 },
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 16 },
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
}
