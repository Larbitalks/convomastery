export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-[22px] font-extrabold tracking-tight text-ink ${className}`}>
      <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
        <path d="M8 10h48a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H26l-12 10v-10H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill="#E07A5F" stroke="#3D405B" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="20" cy="28" r="4" fill="#3D405B" /><circle cx="32" cy="28" r="4" fill="#3D405B" /><circle cx="44" cy="28" r="4" fill="#3D405B" />
      </svg>
      ConvoMastery
    </span>
  )
}
