import RoadRibbon from './RoadRibbon'

/**
 * HeroBlock — gradient block with radius 28, overlapping rounded slabs echoing the N,
 * and signature RoadRibbon SVG at the bottom.
 * Enforces .on-brand with pure white greeting & title, and 85% white tagline.
 */
export default function HeroBlock({
  greeting = 'Namaskara 👋',
  title = 'Where are you going?',
  subtitle = 'Our town. Our bus. • Hubballi-Dharwad',
  children,
  className = '',
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] on-brand pt-8 pb-10 px-5 ${className}`}
      style={{ background: 'var(--gradient-brand)', color: 'var(--on-brand)' }}
    >
      {/* Background overlapping rounded slabs echoing the "N" of the logo */}
      <div
        className="absolute -top-12 -right-8 w-44 h-44 rounded-[40px] opacity-15 pointer-events-none transform rotate-12"
        style={{ background: '#0040FF' }}
      />
      <div
        className="absolute -top-6 -right-16 w-48 h-48 rounded-[48px] opacity-20 pointer-events-none transform -rotate-6"
        style={{ background: '#00136E' }}
      />

      {/* Hero content */}
      <div className="relative z-10 space-y-1.5">
        <span
          className="text-xs font-semibold uppercase tracking-wider block"
          style={{ color: 'var(--on-brand)' }}
        >
          {greeting}
        </span>
        <h1
          className="text-2xl md:text-3xl font-extrabold font-heading tracking-tight leading-tight"
          style={{ color: 'var(--on-brand)' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-xs font-medium"
            style={{ color: 'rgba(255, 255, 255, 0.85)' }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {children && <div className="relative z-10 mt-4">{children}</div>}

      {/* Signature smooth RoadRibbon SVG */}
      <RoadRibbon />
    </div>
  )
}
