import { useEffect, useRef, useState } from 'react'

const REDUCED_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Animates from 0 to `target` once on mount, easing out. Skipped entirely
// under prefers-reduced-motion (returns the target immediately).
export function useCountUp(target, duration = 650) {
  const [display, setDisplay] = useState(REDUCED_MOTION ? target : 0)
  const startRef = useRef(null)

  useEffect(() => {
    if (REDUCED_MOTION) { setDisplay(target); return }
    startRef.current = null
    let frame
    function tick(t) {
      if (startRef.current === null) startRef.current = t
      const elapsed = t - startRef.current
      const p = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - p, 4) // ease-out-quart
      setDisplay(target * eased)
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return display
}
