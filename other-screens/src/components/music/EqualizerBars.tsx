import React, { useMemo } from 'react'
import { motion, useReducedMotion } from 'motion/react'

interface EqualizerBarsProps {
  playing?: boolean
}

export default function EqualizerBars({ playing = true }: EqualizerBarsProps) {
  const reduceMotion = useReducedMotion()

  const bars = useMemo(() => [
    { delay: 0, heights: [14, 6, 12, 4, 10] },
    { delay: 0.15, heights: [6, 12, 4, 14, 8] },
    { delay: 0.3, heights: [10, 4, 14, 6, 12] },
  ], [])

  if (reduceMotion || !playing) {
    return (
      <span className="eqbars" aria-label="Now playing">
        <i className="h-[10px]" />
        <i className="h-[6px]" />
        <i className="h-[14px]" />
      </span>
    )
  }

  return (
    <span className="eqbars" aria-label="Now playing">
      {bars.map((bar, i) => (
        <motion.i
          key={i}
          animate={{ height: bar.heights.map(h => `${h}px`) }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: bar.delay,
            ease: 'easeInOut',
          }}
          style={{ height: `${bar.heights[0]}px` }}
        />
      ))}
    </span>
  )
}
