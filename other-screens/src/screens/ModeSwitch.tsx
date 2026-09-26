import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { updateSettings, useSettings } from '../data/settings'
import { useLocalLibrary } from '../data/local'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { Switch } from '../components/ui/Switch'
import { Segmented } from '../components/ui/Segmented'
import { fadeRise, transition } from '../lib/motion'

export default function ModeSwitch() {
  const navigate = useNavigate()
  const { setMode } = useModeStore()
  const settings = useSettings()
  const [stay, setStay] = useState(settings.stayOffline)
  const local = useLocalLibrary()

  const totalTracks = local.folders.filter(f => f.included).reduce((n, f) => n + f.trackCount, 0)
  const totalFolders = local.folders.length

  function confirm() {
    updateSettings({ stayOffline: stay })
    setMode('offline')
    navigate('/home', { replace: true })
  }

  return (
    <div className="@container flex items-center justify-center h-full p-4 @[480px]:p-8 overflow-y-auto">
      <motion.div
        className="surf2 flex flex-col gap-6 p-6 @[480px]:p-8 max-w-[560px] w-full rounded-2xl border border-ln2 shadow-2xl"
        variants={fadeRise}
        initial="hidden"
        animate="visible"
        transition={transition.normal}
      >
        <div className="flex flex-col items-center text-center gap-3">
          <Segmented
            options={[
              { id: 'online', label: 'Online', icon: 'cloud' },
              { id: 'offline', label: 'Offline', icon: 'smartphone' },
            ]}
            value="offline"
            onChange={() => {}}
            color="gold"
          />
          <span className="text-h1 text-t1 font-bold">Switch to Offline Mode?</span>
          <p className="text-body-m text-t2 max-w-[440px]">
            Sonare will use only the music stored on this device. Nothing will be requested from the server until you switch back.
          </p>
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
          {/* Stays available */}
          <div className="inset flex flex-col p-4 gap-3 rounded-xl bg-s0 border border-ln">
            <span className="text-overline text-gold font-semibold tracking-wider">Stays available</span>
            <div className="flex items-center gap-2.5">
              <span className="src src-local flex items-center justify-center w-5 h-5 rounded flex-none">
                <Icon name="smartphone" size={13} />
              </span>
              <span className="text-body-s text-t1 leading-snug">
                {totalTracks > 0 ? `${totalTracks.toLocaleString()} songs on device` : 'Songs stored on device'}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="src src-local flex items-center justify-center w-5 h-5 rounded flex-none">
                <Icon name="folder" size={13} />
              </span>
              <span className="text-body-s text-t1 leading-snug">
                {totalFolders > 0 ? `${totalFolders} music folders & local lists` : 'Music folders and local playlists'}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="src src-local flex items-center justify-center w-5 h-5 rounded flex-none">
                <Icon name="heart" size={13} />
              </span>
              <span className="text-body-s text-t1 leading-snug">
                Favourites, history & equalizer
              </span>
            </div>
          </div>

          {/* Hidden while offline */}
          <div className="inset flex flex-col p-4 gap-3 rounded-xl bg-s0 border border-ln">
            <span className="text-overline text-t3 font-semibold tracking-wider">Hidden while offline</span>
            <div className="flex items-center gap-2.5">
              <span className="src flex items-center justify-center w-5 h-5 rounded bg-s3 text-t4 flex-none">
                <Icon name="cloud" size={13} />
              </span>
              <span className="text-body-s text-t3 leading-snug">
                Server library & recommendations
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="src flex items-center justify-center w-5 h-5 rounded bg-s3 text-t4 flex-none">
                <Icon name="search" size={13} />
              </span>
              <span className="text-body-s text-t3 leading-snug">
                Online search & trending
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="src flex items-center justify-center w-5 h-5 rounded bg-s3 text-t4 flex-none">
                <Icon name="music" size={13} />
              </span>
              <span className="text-body-s text-t3 leading-snug">
                Online-only playlists & streams
              </span>
            </div>
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 p-3 surf rounded-xl cursor-pointer">
          <div className="flex flex-col gap-0.5">
            <span className="text-body-m text-t1 font-medium">Stay offline until I switch back</span>
            <span className="text-body-s text-t3">Ignore the network even when Wi-Fi returns</span>
          </div>
          <Switch variant="gold" checked={stay} onCheckedChange={setStay} aria-label="Stay offline until manual switch" />
        </label>

        <div className="flex items-center gap-3 justify-end pt-1">
          <Button variant="out" onClick={() => navigate(-1)}>Cancel</Button>
          <Button variant="gold" onClick={confirm}>Go offline</Button>
        </div>
      </motion.div>
    </div>
  )
}
