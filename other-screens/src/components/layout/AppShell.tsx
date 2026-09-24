import React, { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomPlayer from './BottomPlayer'
import TrackMenu from '../music/TrackMenu'
import { Toast } from '../ui/Toast'
import { useToasts, dismissToast } from '../../store/toastStore'
import { fadeRise, transition } from '../../lib/motion'
import { bindAccountGateNavigator } from '../../data/accountGate'

function isTyping(el: EventTarget | null) {
  return el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}

export default function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const toasts = useToasts()
  // FLOWS D09: the full-screen player drops the sidebar, top bar and bottom bar.
  const immersive = location.pathname === '/now-playing'

  // Lets the account gate send a guest to /signin from anywhere.
  useEffect(() => bindAccountGateNavigator(navigate), [navigate])

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

  return (
    <div className="flex flex-col bg-bg text-t1 font-sans antialiased w-screen h-screen min-w-[1100px] min-h-[640px] overflow-hidden">
      <div className="flex grow overflow-hidden">
        {!immersive && <Sidebar />}
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
      <div className="fixed right-6 bottom-[104px] z-50 flex flex-col gap-2 items-end" role="status" aria-live="polite">
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
    </div>
  )
}
