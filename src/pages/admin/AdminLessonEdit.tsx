import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LessonCover } from '../../components/LessonCover'
import { Field, Input, Notice, Select, Spinner, Textarea } from '../../components/ui'
import { api } from '../../lib/api'
import { errorMessage, slugify } from '../../lib/format'
import { useLoad } from '../../lib/hooks'
import { ACTIVITY_TYPES, AGE_GROUPS, LEVELS, type AgeGroup, type LessonInput, type Level } from '../../lib/types'

const COVER_COLORS = ['#0E7C7B', '#3D4FA8', '#7A4FB5', '#B5651D', '#C2410C', '#1B2A4A', '#B91C1C', '#2563A8', '#0F766E']

const blank: LessonInput = {
  slug: '', title: '', summary: '', description: '', level: 'B1', ageGroup: 'Teens', categoryId: null,
  topics: [], activityTypes: ['Discussion questions'], sampleQuestions: [], priceCents: 499, currency: 'USD',
  slideCount: 24, durationMinutes: 60, coverColor: COVER_COLORS[0], coverImageUrl: null, previewImages: [], slideImages: [],
  filePath: null, fileName: null, published: false, featured: false,
}

export default function AdminLessonEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const { data, loading } = useLoad(async () => {
    const [lessons, categories] = await Promise.all([api.listLessons({ includeUnpublished: true }), api.listCategories()])
    return { lesson: lessons.find((l) => l.id === id) ?? null, categories }
  }, [id])

  const [form, setForm] = useState<LessonInput>(blank)
  const [slugTouched, setSlugTouched] = useState(false)
  const [price, setPrice] = useState('4.99')
  const [topics, setTopics] = useState('')
  const [questions, setQuestions] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (data?.lesson) {
      const { createdAt: _c, ...rest } = data.lesson
      setForm(rest)
      setPrice((data.lesson.priceCents / 100).toFixed(2))
      setTopics(data.lesson.topics.join(', '))
      setQuestions(data.lesson.sampleQuestions.join('\n'))
      setSlugTouched(true)
    }
  }, [data?.lesson])

  if (loading) return <Spinner />
  if (!isNew && !data?.lesson) return <Notice tone="error">This lesson no longer exists. <Link to="/admin" className="underline">Back to lessons</Link></Notice>

  const set = <K extends keyof LessonInput>(k: K, v: LessonInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const upload = async (kind: 'cover' | 'preview' | 'file' | 'slides', files: FileList | null) => {
    if (!files?.length) return
    setMsg(null)
    setBusy(kind)
    try {
      if (kind === 'slides') {
        const slug = form.slug || slugify(form.title) || 'lesson'
        // Keep slides in the order PowerPoint names them: Slide1, Slide2 ... Slide10
        const sorted = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        const paths = await api.uploadSlideImages(slug, sorted)
        setForm((f) => ({ ...f, slideImages: paths, slideCount: paths.length }))
      } else if (kind === 'file') {
        const slug = form.slug || slugify(form.title) || 'lesson'
        const { path, name } = await api.uploadLessonFile(slug, files[0])
        setForm((f) => ({ ...f, filePath: path, fileName: name }))
      } else if (kind === 'cover') {
        const url = await api.uploadImage(files[0])
        set('coverImageUrl', url)
      } else {
        const urls = await Promise.all(Array.from(files).slice(0, 6).map((f) => api.uploadImage(f)))
        setForm((f) => ({ ...f, previewImages: [...f.previewImages, ...urls].slice(0, 6) }))
      }
    } catch (e) {
      setMsg({ tone: 'error', text: errorMessage(e) })
    } finally {
      setBusy(null)
    }
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setMsg(null)
    const cents = Math.round(parseFloat(price || '0') * 100)
    if (Number.isNaN(cents) || cents < 0) { setMsg({ tone: 'error', text: 'Enter the price as a number, for example 4.99. Use 0 for a free lesson.' }); return }
    if (form.published && !form.filePath) { setMsg({ tone: 'error', text: 'Upload the lesson file before publishing, so buyers have something to download.' }); return }
    const input: LessonInput = {
      ...form,
      slug: slugify(form.slug || form.title),
      priceCents: cents,
      topics: topics.split(',').map((t) => t.trim()).filter(Boolean),
      sampleQuestions: questions.split('\n').map((q) => q.trim()).filter(Boolean),
    }
    setBusy('save')
    try {
      const saved = await api.saveLesson(input)
      setMsg({ tone: 'success', text: saved.published ? 'Saved and published.' : 'Saved as a draft.' })
      if (isNew) navigate(`/admin/lessons/${saved.id}`, { replace: true })
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) })
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!form.id) return
    setBusy('delete')
    try { await api.deleteLesson(form.id); navigate('/admin', { replace: true }) } catch (e) { setMsg({ tone: 'error', text: errorMessage(e) }); setBusy(null) }
  }

  return (
    <form onSubmit={save} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="grid content-start gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-extrabold">{isNew ? 'Add a lesson' : `Edit ${data?.lesson?.title}`}</h2>
          {!isNew && <Link to={`/lessons/${form.slug}`} className="font-bold underline underline-offset-4">View lesson page</Link>}
        </div>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

        <section className="panel grid gap-5 p-6">
          <h3 className="text-lg font-bold">Basics</h3>
          <Field label="Title" htmlFor="title">
            <Input id="title" required value={form.title} onChange={(e) => { set('title', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)) }} />
          </Field>
          <Field label="Web address" htmlFor="slug" hint={`The lesson page will be at /lessons/${form.slug || 'your-lesson'}`}>
            <Input id="slug" required value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value) }} />
          </Field>
          <Field label="Short summary" htmlFor="summary" hint="One sentence shown on lesson cards and in search results.">
            <Input id="summary" required maxLength={160} value={form.summary} onChange={(e) => set('summary', e.target.value)} />
          </Field>
          <Field label="Full description" htmlFor="description" hint="Leave a blank line between paragraphs. A block of several lines shows as a bulleted list.">
            <Textarea id="description" rows={10} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Field label="Sample discussion questions" htmlFor="questions" hint="One per line. Shown on the lesson page and rotated on the home page.">
            <Textarea id="questions" rows={4} value={questions} onChange={(e) => setQuestions(e.target.value)} />
          </Field>
        </section>

        <section className="panel grid gap-5 p-6">
          <h3 className="text-lg font-bold">Filters</h3>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Level" htmlFor="level">
              <Select id="level" value={form.level} onChange={(e) => set('level', e.target.value as Level)}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</Select>
            </Field>
            <Field label="Students" htmlFor="age">
              <Select id="age" value={form.ageGroup} onChange={(e) => set('ageGroup', e.target.value as AgeGroup)}>{AGE_GROUPS.map((a) => <option key={a}>{a}</option>)}</Select>
            </Field>
            <Field label="Topic area" htmlFor="category">
              <Select id="category" value={form.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value || null)}>
                <option value="">None</option>
                {data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Topics" htmlFor="topics" hint="Comma separated, for example: Sleep, Health, Habits. Used in search.">
            <Input id="topics" value={topics} onChange={(e) => setTopics(e.target.value)} />
          </Field>
          <fieldset>
            <legend className="label">Activities included</legend>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_TYPES.map((a) => {
                const on = form.activityTypes.includes(a)
                return (
                  <button type="button" key={a} aria-pressed={on} onClick={() => set('activityTypes', on ? form.activityTypes.filter((x) => x !== a) : [...form.activityTypes, a])}
                    className={`chip ${on ? 'border-teal bg-teal text-white' : 'border-line'}`}>{a}</button>
                )
              })}
            </div>
          </fieldset>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Price (USD)" htmlFor="price" hint="0 makes it free.">
              <Input id="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Field label="Slides" htmlFor="slides"><Input id="slides" type="number" min={1} value={form.slideCount} onChange={(e) => set('slideCount', Number(e.target.value))} /></Field>
            <Field label="Minutes" htmlFor="minutes"><Input id="minutes" type="number" min={10} step={5} value={form.durationMinutes} onChange={(e) => set('durationMinutes', Number(e.target.value))} /></Field>
          </div>
        </section>

        <section className="panel grid gap-5 p-6">
          <h3 className="text-lg font-bold">Files and images</h3>
          <div>
            <p className="label">Lesson file</p>
            <p className="mb-2 text-[15px]">{form.fileName ? <>Current file: <strong>{form.fileName}</strong></> : <span className="text-inksoft">No file uploaded yet.</span>}</p>
            <input id="lessonFile" type="file" accept=".pptx,.ppt,.pdf,.zip,.key" className="text-[15px]" onChange={(e) => upload('file', e.target.files)} />
            {busy === 'file' && <p className="hint">Uploading file</p>}
            <p className="hint">PowerPoint, PDF or zip. Only buyers can download it.</p>
          </div>
          <div>
            <p className="label">Slides for teaching on the website</p>
            <p className="mb-2 text-[15px]">{form.slideImages.length ? <><strong>{form.slideImages.length} slides</strong> uploaded. Buyers can teach this lesson from the website.</> : <span className="text-inksoft">No slides yet. Buyers see the sample questions as simple slides instead.</span>}</p>
            <input id="slideFiles" type="file" accept="image/png,image/jpeg,image/webp" multiple className="text-[15px]" onChange={(e) => upload('slides', e.target.files)} />
            {busy === 'slides' && <p className="hint">Uploading slides</p>}
            <p className="hint">In PowerPoint choose File, Export, then PNG and "All slides". Select every image in the folder it creates. Uploading again replaces the current slides.</p>
            {form.slideImages.length > 0 && <button type="button" className="mt-2 text-sm font-bold underline" onClick={() => set('slideImages', [])}>Remove all slides</button>}
          </div>
          <div>
            <p className="label">Preview images</p>
            {form.previewImages.length > 0 && (
              <ul className="mb-3 grid grid-cols-3 gap-3">
                {form.previewImages.map((src) => (
                  <li key={src} className="relative">
                    <img src={src} alt="" className="aspect-[4/3] w-full rounded-lg border-2 border-line object-cover" />
                    <button type="button" className="absolute right-1 top-1 rounded-md bg-white px-2 text-sm font-bold" onClick={() => set('previewImages', form.previewImages.filter((x) => x !== src))}>Remove</button>
                  </li>
                ))}
              </ul>
            )}
            <input type="file" accept="image/*" multiple className="text-[15px]" onChange={(e) => upload('preview', e.target.files)} />
            {busy === 'preview' && <p className="hint">Uploading images</p>}
            <p className="hint">Up to 6 screenshots of slides. Anyone can see these.</p>
          </div>
        </section>
      </div>

      <aside className="grid content-start gap-5 lg:sticky lg:top-6 self-start">
        <div className="panel grid gap-4 p-5">
          <LessonCover lesson={{ ...form, title: form.title || 'Lesson title' }} />
          <div>
            <p className="label">Cover colour</p>
            <div className="flex flex-wrap gap-2">
              {COVER_COLORS.map((c) => (
                <button type="button" key={c} aria-label={`Cover colour ${c}`} aria-pressed={form.coverColor === c}
                  className={`h-8 w-8 rounded-full border-[3px] ${form.coverColor === c ? 'border-sun' : 'border-white'} ring-2 ring-line`}
                  style={{ backgroundColor: c }} onClick={() => set('coverColor', c)} />
              ))}
            </div>
          </div>
          <div>
            <p className="label">Or upload a cover image</p>
            <input type="file" accept="image/*" className="text-[14px] w-full" onChange={(e) => upload('cover', e.target.files)} />
            {form.coverImageUrl && <button type="button" className="mt-2 text-sm font-bold underline" onClick={() => set('coverImageUrl', null)}>Remove cover image</button>}
          </div>
        </div>
        <div className="panel grid gap-3 p-5">
          <label className="flex items-center gap-3 font-bold"><input type="checkbox" className="h-5 w-5 accent-teal" checked={form.published} onChange={(e) => set('published', e.target.checked)} />Published</label>
          <p className="hint -mt-2">Drafts are hidden from the catalogue.</p>
          <label className="flex items-center gap-3 font-bold"><input type="checkbox" className="h-5 w-5 accent-teal" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />Show on home page</label>
          <button className="btn-primary mt-2 !py-3" disabled={busy !== null}>{busy === 'save' ? 'Saving' : 'Save lesson'}</button>
          <Link to="/admin" className="btn-ghost">Back to lessons</Link>
        </div>
        {!isNew && (
          <div className="panel grid gap-3 p-5">
            {confirmDelete ? (
              <>
                <p className="text-[15px]">Delete this lesson for good? Buyers lose access to it.</p>
                <div className="flex gap-2">
                  <button type="button" className="btn-danger" onClick={remove} disabled={busy === 'delete'}>Delete lesson</button>
                  <button type="button" className="btn-ghost" onClick={() => setConfirmDelete(false)}>Keep it</button>
                </div>
                <p className="hint">To hide it but keep buyers' access, untick Published instead.</p>
              </>
            ) : (
              <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>Delete lesson</button>
            )}
          </div>
        )}
      </aside>
    </form>
  )
}
