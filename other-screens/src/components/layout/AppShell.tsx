import React, { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import WebTopbar from './WebTopbar'
import TabletTopbar from './TabletTopbar'
import IconRail from './IconRail'
import BottomPlayer from './BottomPlayer'
import MiniPlayer from './MiniPlayer'
import MobileTabBar from './MobileTabBar'
import TrackMenu from '../music/TrackMenu'
import { Toast } from '../ui/Toast'
import TooltipLayer from '../ui/Tooltip'
import { useToasts, dismissToast } from '../../store/toastStore'
import { fadeRise, transition } from '../../lib/motion'
import { bindAccountGateNavigator } from '../../data/accountGate'
import { usePlayerShortcuts } from './usePlayerShortcuts'
import { useLayout } from '../../lib/layout'
import { cn } from '../../lib/utils'

function isTyping(el: EventTarget | null) {
  return el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}

export default function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const toasts = useToasts()
  const layout = useLayout()

  // FLOWS D09/M09: the full-screen player drops all chrome.
  const immersive = location.pathname === '/now-playing'

  // Lets the account gate send a guest to /signin from anywhere.
  useEffect(() => bindAccountGateNavigator(navigate), [navigate])

  // Space, ← → and ↑ ↓ drive the player from every screen.
  usePlayerShortcuts()

  // FLOWS §3: Ctrl Q toggles the queue, Esc leaves the full-screen player.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q') {
        e.preventDefault()
        if (location.pathname === '/queue') navigate(-1)
        else navigate('/queue')
      } else if (e.key === 'Escape' && !isTyping(e.target) && ['/now-playing', '/lyrics', '/equalizer'].includes(location.pathname)) {
        // A direct visit has no in-app history to go back to.
        if (window.history.state?.idx > 0) navigate(-1)
        else navigate('/home')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [location.pathname, navigate])

  const toastContainer = (
    <div
      className={cn(
        'fixed right-4 sm:right-6 z-50 flex flex-col gap-2 items-end pointer-events-none [&>*]:pointer-events-auto',
        layout === 'phone' ? 'bottom-[136px]' : 'bottom-[104px]'
      )}
      role="status"
      aria-live="polite"
    >
      {toasts.map(t => (
        <Toast
          key={t.id}
          show
          title={t.title}
          description={t.description}
          icon={t.icon}
          variant={t.variant}
          onClose={() => dismissToast(t.id)}
        />
      ))}
    </div>
  )

  // 1. Desktop Shell (Neutralino window)
  if (layout === 'desktop') {
    return (
      <div className="flex flex-col bg-bg text-t1 font-sans antialiased w-screen h-screen min-w-[1100px] min-h-[640px] overflow-hidden">
        <div className="flex grow overflow-hidden">
          {!immersive && <Sidebar variant="desktop" />}
          <div className="flex flex-col grow overflow-hidden min-w-0">
            {!immersive && <Topbar />}
            <div className="flex flex-col grow overflow-hidden relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  variants={fadeRise}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={transition.normal}
                  className="flex flex-col grow overflow-auto h-full"
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
        {!immersive && <BottomPlayer />}
        <TrackMenu />
        <TooltipLayer />
        {toastContainer}
      </div>
    )
  }

  // 2. Tablet Shell (768px - 1099px)
  if (layout === 'tablet') {
    return (
      <div className="flex flex-col bg-bg text-t1 font-sans antialiased w-screen h-screen overflow-hidden min-w-0">
        {!immersive && <TabletTopbar />}
        <div className="flex grow overflow-hidden min-w-0">
          {!immersive && <IconRail />}
          <div className="flex flex-col grow overflow-hidden min-w-0 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                variants={fadeRise}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={transition.normal}
                className="flex flex-col grow overflow-auto h-full min-w-0"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        {!immersive && <BottomPlayer />}
        <TrackMenu />
        <TooltipLayer />
        {toastContainer}
      </div>
    )
  }

  // 3. Phone Shell (< 768px)
  if (layout === 'phone') {
    return (
      <div className="flex flex-col bg-bg text-t1 font-sans antialiased w-screen h-screen overflow-hidden min-w-0">
        <div className="flex flex-col grow overflow-hidden min-w-0 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={fadeRise}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition.normal}
              className="flex flex-col grow overflow-auto h-full min-w-0"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
        {!immersive && (
          <>
            <MiniPlayer />
            <MobileTabBar />
          </>
        )}
        <TrackMenu />
        <TooltipLayer />
        {toastContainer}
      </div>
    )
  }

  // 4. Web Shell (>= 1100px browser)
  return (
    <div className="flex flex-col bg-bg text-t1 font-sans antialiased w-screen h-screen overflow-hidden min-w-0">
      {!immersive && <WebTopbar />}
      <div className="flex grow overflow-hidden min-w-0">
        {!immersive && <Sidebar variant="web" />}
        <div className="flex flex-col grow overflow-hidden min-w-0 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={fadeRise}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition.normal}
              className="flex flex-col grow overflow-auto h-full min-w-0"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      {!immersive && <BottomPlayer />}
      <TrackMenu />
      <TooltipLayer />
      {toastContainer}
    </div>
  )
}
