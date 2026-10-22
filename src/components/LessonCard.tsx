import { Link } from 'react-router-dom'
import { formatPrice } from '../lib/format'
import type { Lesson } from '../lib/types'
import { LessonCover } from './LessonCover'

export function LessonCard({ lesson, owned }: { lesson: Lesson; owned?: boolean }) {
  return (
    <Link to={`/lessons/${lesson.slug}`} className="group block rounded-2xl focus-visible:outline-offset-4">
      <LessonCover lesson={lesson} />
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold group-hover:underline decoration-2 underline-offset-4">{lesson.title}</h3>
          <p className="mt-0.5 text-[15px] text-inksoft">{lesson.summary}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${owned ? 'bg-sage-light text-sage-dark' : lesson.priceCents === 0 ? 'bg-sun text-ink' : 'bg-board text-ink'}`}>
          {owned ? 'Owned' : formatPrice(lesson.priceCents, lesson.currency)}
        </span>
      </div>
    </Link>
  )
}
