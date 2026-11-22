/**
 * Skeleton — shimmer placeholder using sky-100 + animate-pulse.
 */
export default function Skeleton({ className = '', height, width }) {
  return (
    <div
      className={`animate-pulse bg-sky-100 rounded-[12px] ${className}`}
      aria-hidden="true"
      style={{
        height: height ?? undefined,
        width: width ?? undefined,
      }}
    />
  )
}
