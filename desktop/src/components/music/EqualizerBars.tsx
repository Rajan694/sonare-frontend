import React from 'react';
import { useReducedMotion } from 'motion/react';

interface EqualizerBarsProps {
  playing?: boolean;
}

/*
 * The bars move with a CSS animation of transform: scaleY (sonare.css, .eqbars-live). It runs on
 * the compositor: animating `height` from JS (as this did with motion) laid out the whole page on
 * every frame for as long as a song played, about a quarter of the main thread on Home.
 */
const EqualizerBars = ({ playing = true }: EqualizerBarsProps) => {
  const reduceMotion = useReducedMotion();

  // Paused (or reduced motion): the bars hold still at a fixed shape.
  if (reduceMotion || !playing) {
    return (
      <span className="eqbars" aria-label={playing ? 'Now playing' : 'Paused'}>
        <i className="h-[10px]" />
        <i className="h-[6px]" />
        <i className="h-[14px]" />
      </span>
    );
  }

  return (
    <span className="eqbars eqbars-live" aria-label="Now playing">
      <i />
      <i />
      <i />
    </span>
  );
};
export default EqualizerBars;
