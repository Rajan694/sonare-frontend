import { useState, useEffect } from 'react'
import { isNeutralino } from '../neutralino'

export type Layout = 'desktop' | 'web' | 'tablet' | 'phone'

function getLayout(): Layout {
  // Desktop shell whenever running inside the Neutralino native window
  if (isNeutralino() && typeof window !== 'undefined' && window.NL_MODE === 'window') {
    return 'desktop'
  }
  if (typeof window === 'undefined') {
    return 'web'
  }
  const width = window.innerWidth
  if (width >= 1100) return 'web'
  if (width >= 768) return 'tablet'
  return 'phone'
}

export function useLayout(): Layout {
  const [layout, setLayout] = useState<Layout>(getLayout)

  useEffect(() => {
    // If inside Neutralino window, always keep desktop
    if (isNeutralino() && window.NL_MODE === 'window') {
      return
    }

    const mqlWeb = window.matchMedia('(min-width: 1100px)')
    const mqlTablet = window.matchMedia('(min-width: 768px) and (max-width: 1099.98px)')

    const update = () => {
      setLayout(getLayout())
    }

    mqlWeb.addEventListener('change', update)
    mqlTablet.addEventListener('change', update)
    window.addEventListener('resize', update)

    update()

    return () => {
      mqlWeb.removeEventListener('change', update)
      mqlTablet.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return layout
}
