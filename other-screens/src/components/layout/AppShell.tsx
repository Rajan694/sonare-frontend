import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomPlayer from './BottomPlayer'
import { fadeRise, transition } from '../../lib/motion'

export default function AppShell() {
  const location = useLocation()

  return (
    <div className="flex flex-col bg-bg text-t1 font-sans antialiased w-[1440px] h-[900px] overflow-hidden">
      <div className="flex grow overflow-hidden">
        <Sidebar />
        <div className="flex flex-col grow overflow-hidden min-w-0">
          <Topbar />
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
      <BottomPlayer />
    </div>
  )
}
