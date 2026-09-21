import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { Switch } from '../components/ui/Switch'
import { fadeRise, transition } from '../lib/motion'

const STAYS = [
  'Your local library',
  'Playlists (local & synced)',
  'Downloaded tracks',
  'Queue, history & favourites',
  'Equalizer settings',
]

const HIDES = [
  'Server recommendations',
  'Trending & new releases',
  'Online-only playlists',
  'Server search results',
  'Cast to device',
]

export default function ModeSwitch() {
  const navigate = useNavigate()
  const { setMode } = useModeStore()

  function confirm() {
    setMode('offline')
    navigate('/home')
  }

  return (
    <div className="flex items-center justify-center h-full p-8">
      <motion.div
        className="surf flex flex-col gap-6 p-8 max-w-[520px] w-full"
        variants={fadeRise}
        initial="hidden"
        animate="visible"
        transition={transition.normal}
      >
        <div className="flex flex-col gap-2">
          <div className="offstrip gap-2">
            <span className="dot dot-gold" />
            <span className="text-label-l text-gold">Switching to Offline Mode</span>
          </div>
          <p className="text-body-m text-t2 mt-1">You'll only see music that's on your device. Server content will be hidden, not deleted.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-overline text-acc">What stays</span>
            {STAYS.map(item => (
              <div key={item} className="flex items-center gap-2">
                <Icon name="check" size={14} className="text-acc flex-none" />
                <span className="text-body-m text-t2">{item}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-overline text-t3">What's hidden</span>
            {HIDES.map(item => (
              <div key={item} className="flex items-center gap-2">
                <Icon name="close" size={14} className="text-t4 flex-none" />
                <span className="text-body-m text-t3">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between">
          <span className="text-body-m text-t1">Stay offline until I switch back</span>
          <Switch variant="gold" checked={true} aria-label="Stay offline until manual switch" />
        </label>

        <div className="flex items-center gap-3 justify-end">
          <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          <Button variant="gold" onClick={confirm}>Switch to Offline</Button>
        </div>
      </motion.div>
    </div>
  )
}
