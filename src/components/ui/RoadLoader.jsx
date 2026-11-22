/**
 * RoadLoader — animated road strip with sliding dashes and amber bus dot.
 * Replaces all spinners. Sizes: sm | md | lg
 */

const sizeMap = {
  sm: { width: 120, height: 32, busSize: 8, dashH: 2 },
  md: { width: 180, height: 48, busSize: 12, dashH: 2 },
  lg: { width: 240, height: 64, busSize: 16, dashH: 3 },
}

const keyframes = `
@keyframes road-dash {
  0%   { background-position: 0 center; }
  100% { background-position: 56px center; }
}
@keyframes road-bus {
  0%   { left: 8%; }
  100% { left: 85%; }
}
`

export default function RoadLoader({ size = 'md' }) {
  const { width, height, busSize, dashH } = sizeMap[size] ?? sizeMap.md

  return (
    <>
      <style>{keyframes}</style>
      <div
        role="status"
        aria-label="Loading"
        style={{
          position: 'relative',
          width,
          height,
          backgroundColor: 'var(--ink-950)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
        }}
      >
        {/* Sliding dashes */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: dashH,
            transform: 'translateY(-50%)',
            backgroundImage: `repeating-linear-gradient(90deg, #fff 0px, #fff 20px, transparent 20px, transparent 36px)`,
            backgroundSize: '56px 100%',
            animation: 'road-dash 0.5s linear infinite',
          }}
        />

        {/* Amber bus dot */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            width: busSize,
            height: busSize,
            borderRadius: '50%',
            backgroundColor: 'var(--amber-500)',
            boxShadow: '0 0 8px rgba(255,180,0,0.8)',
            animation: 'road-bus 1.4s ease-in-out infinite alternate',
          }}
        />
      </div>
    </>
  )
}
