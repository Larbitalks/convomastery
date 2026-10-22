import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LessonCard } from '../components/LessonCard'
import { Input, Notice, Select, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useLoad } from '../lib/hooks'
import { Seo } from '../lib/seo'
import { ACTIVITY_TYPES, AGE_GROUPS, LEVELS } from '../lib/types'

function ChipGroup({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 font-bold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o
          return (
            <button key={o} type="button" aria-pressed={active} onClick={() => onChange(active ? '' : o)}
              className={`chip ${active ? 'border-brand bg-brand text-white' : 'border-line hover:border-ink/40'}`}>
              {o}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function Lessons() {
  const [params, setParams] = useSearchParams()
  const { session } = useAuth()
  const { data, loading, error } = useLoad(async () => {
    const [lessons, categories, purchases] = await Promise.all([api.listLessons(), api.listCategories(), api.listMyPurchases()])
    return { lessons, categories, owned: new Set(purchases.map((p) => p.lessonId)) }
  }, [session?.userId])

  const f = {
    q: params.get('q') ?? '',
    level: params.get('level') ?? '',
    age: params.get('age') ?? '',
    category: params.get('category') ?? '',
    activity: params.get('activity') ?? '',
    price: params.get('price') ?? '',
    sort: params.get('sort') ?? 'newest',
  }
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    setParams(next, { replace: true })
  }
  const activeCount = ['q', 'level', 'age', 'category', 'activity', 'price'].filter((k) => params.get(k)).length

  const results = useMemo(() => {
    if (!data) return []
    const q = f.q.trim().toLowerCase()
    const list = data.lessons.filter((l) =>
      (!q || [l.title, l.summary, ...l.topics, ...l.sampleQuestions].join(' ').toLowerCase().includes(q)) &&
      (!f.level || l.level === f.level) &&
      (!f.age || l.ageGroup === f.age) &&
      (!f.category || data.categories.find((c) => c.id === l.categoryId)?.slug === f.category) &&
      (!f.activity || l.activityTypes.includes(f.activity)) &&
      (!f.price || (f.price === 'Free' ? l.priceCents === 0 : l.priceCents > 0)),
    )
    if (f.sort === 'price') list.sort((a, b) => a.priceCents - b.priceCents)
    else if (f.sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title))
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return list
  }, [data, f.q, f.level, f.age, f.category, f.activity, f.price, f.sort])

  return (
    <div className="wrap py-12">
      <Seo title="ESL speaking lessons and conversation lesson plans" description="Browse conversational English lessons by level, age group and activity: ESL discussion questions, debate topics, dilemmas and speaking activities for teens and adults." />
      <h1 className="text-4xl sm:text-5xl font-extrabold">Speaking lessons</h1>
      <p className="mt-3 max-w-2xl text-inksoft">Filter by level, age and activity to find the right conversation lesson for your next class.</p>

      {error && <div className="mt-6"><Notice tone="error">{error}</Notice></div>}

      <div className="mt-10 grid gap-10 lg:grid-cols-[280px_1fr]">
        <aside className="grid content-start gap-6" aria-label="Filters">
          <div>
            <label htmlFor="search" className="label">Search</label>
            <Input id="search" type="search" placeholder="Topic, word or question" value={f.q} onChange={(e) => set('q', e.target.value)} />
          </div>
          <ChipGroup label="Level" options={LEVELS} value={f.level} onChange={(v) => set('level', v)} />
          <ChipGroup label="Students" options={AGE_GROUPS} value={f.age} onChange={(v) => set('age', v)} />
          <ChipGroup label="Activity" options={ACTIVITY_TYPES} value={f.activity} onChange={(v) => set('activity', v)} />
          {data && data.categories.length > 0 && (
            <div>
              <label htmlFor="category" className="label">Topic area</label>
              <Select id="category" value={f.category} onChange={(e) => set('category', e.target.value)}>
                <option value="">All topic areas</option>
                {data.categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </Select>
            </div>
          )}
          <ChipGroup label="Price" options={['Free', 'Paid']} value={f.price} onChange={(v) => set('price', v)} />
          {activeCount > 0 && <button className="btn-ghost justify-self-start" onClick={() => setParams({}, { replace: true })}>Clear filters</button>}
        </aside>

        <section aria-live="polite">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold">{loading ? 'Loading lessons' : `${results.length} ${results.length === 1 ? 'lesson' : 'lessons'}`}</p>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-[15px] text-inksoft">Sort by</label>
              <Select id="sort" className="!w-auto !py-2" value={f.sort} onChange={(e) => set('sort', e.target.value === 'newest' ? '' : e.target.value)}>
                <option value="newest">Newest</option>
                <option value="price">Price, low to high</option>
                <option value="title">Title, A to Z</option>
              </Select>
            </div>
          </div>
          {loading ? <Spinner /> : results.length === 0 ? (
            <div className="panel p-8">
              <h2 className="text-xl font-bold">No lessons match these filters</h2>
              <p className="mt-2 text-inksoft">Remove a filter to see more lessons, or tell us what topic you need and we will consider it for a future lesson.</p>
              <div className="mt-4 flex gap-2">
                <button className="btn-ghost" onClick={() => setParams({}, { replace: true })}>Clear filters</button>
              </div>
            </div>
          ) : (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((l) => <LessonCard key={l.id} lesson={l} owned={data?.owned.has(l.id)} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
