const ORBS = [
  { top: '4%', left: '8%', size: '22rem', color: 'rgba(157,80,187,0.20)', duration: '24s', delay: '0s', dx: '3.5rem', dy: '-2rem' },
  { top: '18%', left: '78%', size: '18rem', color: 'rgba(43,58,138,0.22)', duration: '30s', delay: '-6s', dx: '-3rem', dy: '2.5rem' },
  { top: '62%', left: '4%', size: '20rem', color: 'rgba(94,58,143,0.18)', duration: '27s', delay: '-12s', dx: '2.5rem', dy: '3rem' },
  { top: '78%', left: '70%', size: '16rem', color: 'rgba(157,80,187,0.16)', duration: '22s', delay: '-4s', dx: '-2.5rem', dy: '-2.5rem' },
]

// Fixed, blurred, drifting background lights — sits behind every page (mounted
// once in Layout) to give the aurora backdrop life instead of a static glow.
export default function AuroraOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {ORBS.map((o, i) => (
        <div
          key={i}
          className="orb-drift absolute rounded-full blur-3xl"
          style={{
            top: o.top,
            left: o.left,
            width: o.size,
            height: o.size,
            background: o.color,
            animationDuration: o.duration,
            animationDelay: o.delay,
            '--drift-x': o.dx,
            '--drift-y': o.dy,
          }}
        />
      ))}
    </div>
  )
}
