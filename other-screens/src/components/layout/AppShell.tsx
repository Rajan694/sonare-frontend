import React, { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import TabletTopbar from './TabletTopbar'
import IconRail from './IconRail'
import BottomPlayer from './BottomPlayer'
import MiniPlayer from './MiniPlayer'
import MobileTabBar from './MobileTabBar'
import QueuePanel from './QueuePanel'
import TrackMenu from '../music/TrackMenu'
import { Toast } from '../ui/Toast'
import TooltipLayer from '../ui/Tooltip'
import { useToasts, dismissToast } from '../../store/toastStore'
import { fadeRise, transition } from '../../lib/motion'
import { bindAccountGateNavigator } from '../../data/accountGate'
import { usePlayerShortcuts } from './usePlayerShortcuts'
import { useLayout } from '../../lib/layout'
import { useAppDispatch, useAppSelector } from '../../store'
import { closeQueue, toggleQueue, toggleSidebar } from '../../store/uiSlice'
import { cn } from '../../lib/utils'

function isTyping(el: EventTarget | null) {
  return el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}

export default function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const toasts = useToasts()
  const layout = useLayout()
  const dispatch = useAppDispatch()
  const queueOpen = useAppSelector(s => s.ui.queueOpen)

  // FLOWS D09/M09: the full-screen player drops all chrome.
  const immersive = location.pathname === '/now-playing'
  // Ctrl B only means something where the full sidebar is on screen.
  const sidebarShown = (layout === 'desktop' || layout === 'web') && !immersive

  // Lets the account gate send a guest to /signin from anywhere.
  useEffect(() => bindAccountGateNavigator(navigate), [navigate])

  // Space, ← → and ↑ ↓ drive the player from every screen.
  usePlayerShortcuts()

  // FLOWS §3: Ctrl Q toggles the queue, Esc leaves the full-screen player / closes queue.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q') {
        e.preventDefault()
        dispatch(toggleQueue())
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && sidebarShown && !isTyping(e.target)) {
        e.preventDefault()
        dispatch(toggleSidebar())
      } else if (e.key === 'Escape' && !isTyping(e.target)) {
        if (queueOpen) {
          e.preventDefault()
          dispatch(closeQueue())
        } else if (['/now-playing', '/lyrics', '/equalizer'].includes(location.pathname)) {
          // A direct visit has no in-app history to go back to.
          if (window.history.state?.idx > 0) navigate(-1)
          else navigate('/home')
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [location.pathname, navigate, queueOpen, dispatch, sidebarShown])

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

  const sideQueuePanel = (
    <AnimatePresence>
      {queueOpen && (
        <motion.div
          key="queue-panel"
          initial={{ x: 340, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 340, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="flex-none h-full overflow-hidden"
        >
          <QueuePanel onClose={() => dispatch(closeQueue())} />
        </motion.div>
      )}
    </AnimatePresence>
  )

  // 1. Desktop shell: the Neutralino window, and browsers >= 1100px (there is no
  // separate large-screen web design, so the web build reuses D01-D16).
  if (layout === 'desktop' || layout === 'web') {
    return (
      <div className="flex flex-col bg-bg text-t1 font-sans antialiased w-screen h-screen min-w-[1100px] min-h-[640px] overflow-hidden">
        <div className="flex grow overflow-hidden">
          {!immersive && <Sidebar />}
          <div className="flex flex-col grow overflow-hidden min-w-0">
            {!immersive && <Topbar />}
            <div className="flex grow overflow-hidden relative">
              <div className="flex flex-col grow overflow-hidden relative min-w-0">
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
              {!immersive && sideQueuePanel}
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
          <div className="flex grow overflow-hidden min-w-0 relative">
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
            {!immersive && sideQueuePanel}
          </div>
        </div>
        {!immersive && <BottomPlayer />}
        <TrackMenu />
        <TooltipLayer />
        {toastContainer}
      </div>
    )
  }

  // 3. Phone shell (< 768px)
  return (
    <div className="flex flex-col bg-bg text-t1 font-sans antialiased w-screen h-screen overflow-hidden min-w-0 relative">
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

      {/* Mobile Full-Screen Sheet for Queue */}
      <AnimatePresence>
        {queueOpen && (
          <motion.div
            key="mobile-queue-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-0 z-50 bg-bg flex flex-col"
          >
            <QueuePanel onClose={() => dispatch(closeQueue())} isMobileSheet />
          </motion.div>
        )}
      </AnimatePresence>

      <TrackMenu />
      <TooltipLayer />
      {toastContainer}
    </div>
  )
}
