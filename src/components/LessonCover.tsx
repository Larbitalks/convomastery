import type { Lesson } from '../lib/types'

export function LessonCover({ lesson, size = 'md' }: { lesson: Pick<Lesson, 'title' | 'coverColor' | 'coverImageUrl' | 'level' | 'ageGroup'>; size?: 'md' | 'lg' }) {
  if (lesson.coverImageUrl) {
    return <img src={lesson.coverImageUrl} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" loading="lazy" />
  }
  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl p-5 text-white"
      style={{ backgroundColor: lesson.coverColor }}
      aria-hidden="true"
    >
      <svg className="absolute -right-6 -bottom-8 h-40 w-40 opacity-20" viewBox="0 0 64 64" fill="currentColor">
        <path d="M8 10h48a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H26l-12 10v-10H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" />
      </svg>
      <div className="flex gap-2 text-[13px] font-bold">
        <span className="rounded-md bg-white/20 px-2 py-0.5">{lesson.level}</span>
        <span className="rounded-md bg-white/20 px-2 py-0.5">{lesson.ageGroup}</span>
      </div>
      <p className={`absolute bottom-5 left-5 right-12 font-display font-extrabold leading-[1.02] ${size === 'lg' ? 'text-5xl' : 'text-3xl'}`}>
        {lesson.title}
      </p>
    </div>
  )
}
