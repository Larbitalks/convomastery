import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LessonCover } from '../components/LessonCover'
import { Notice, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { errorMessage, formatDate } from '../lib/format'
import { useLoad } from '../lib/hooks'
import { Seo } from '../lib/seo'
import { downloadLesson } from './LessonDetail'

export default function Library() {
  const { profile } = useAuth()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { data, loading } = useLoad(async () => {
    const [purchases, lessons] = await Promise.all([api.listMyPurchases(), api.listLessons({ includeUnpublished: true })])
    return purchases
      .map((p) => ({ purchase: p, lesson: lessons.find((l) => l.id === p.lessonId) }))
      .filter((x) => x.lesson)
      .sort((a, b) => b.purchase.createdAt.localeCompare(a.purchase.createdAt))
  })

  return (
    <div>
      <Seo title="My library" noindex />
      <h1 className="text-3xl font-extrabold">My library</h1>
      <p className="mt-3 text-inksoft">{profile?.fullName ? `${profile.fullName.split(' ')[0]}, your` : 'Your'} lessons are here to download any time.</p>
      {error && <div className="mt-6"><Notice tone="error">{error}</Notice></div>}
      {loading ? <Spinner /> : !data?.length ? (
        <div className="panel mt-8 p-8">
          <h2 className="text-xl font-bold">Your library is empty</h2>
          <p className="mt-2 text-inksoft">Start with the free sample lesson, or browse the catalogue for your next class.</p>
          <Link to="/lessons" className="btn-primary mt-5">Browse lessons</Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4">
          {data.map(({ purchase, lesson }) => lesson && (
            <li key={purchase.id} className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <Link to={`/lessons/${lesson.slug}`} className="w-full sm:w-40 shrink-0"><LessonCover lesson={lesson} /></Link>
              <div className="flex-1">
                <h2 className="text-xl font-bold"><Link to={`/lessons/${lesson.slug}`} className="hover:underline underline-offset-4">{lesson.title}</Link></h2>
                <p className="text-[15px] text-inksoft">{lesson.level}, {lesson.ageGroup.toLowerCase()}, {lesson.slideCount} slides. Added {formatDate(purchase.createdAt)}.</p>
              </div>
              <Link to={`/teach/${lesson.slug}`} className="btn-sun">Teach</Link>
              <button className="btn-primary" disabled={busyId === lesson.id} onClick={async () => {
                setError(null); setBusyId(lesson.id)
                try { await downloadLesson(lesson) } catch (e) { setError(errorMessage(e)) } finally { setBusyId(null) }
              }}>{busyId === lesson.id ? 'Preparing' : 'Download'}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
