import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LessonCover } from '../../components/LessonCover'
import { Field, Input, Notice, Select, Spinner, Textarea } from '../../components/ui'
import { api } from '../../lib/api'
import { errorMessage, slugify } from '../../lib/format'
import { useLoad } from '../../lib/hooks'
import { shrinkImage, withTimeout } from '../../lib/imageUtil'
import { ACTIVITY_TYPES, AGE_GROUPS, LESSON_LEVELS, activitiesIn, type AgeGroup, type LessonInput, type Level } from '../../lib/types'

const COVER_COLORS = ['#3D405B', '#46725D', '#7A5C8C', '#9A6A1F', '#2F5D62', '#5B6C8F', '#6B7F3A', '#8A5A44']

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
    return { lesson: lessons.find((l) => l.id === id) ?? null, categories, lessons }
  }, [id])
  const [extraCats, setExtraCats] = useState<{ id: string; name: string }[]>([])
  const [newCat, setNewCat] = useState<string | null>(null)
  const [newActivity, setNewActivity] = useState('')

  const [form, setForm] = useState<LessonInput>(blank)
  const [slugTouched, setSlugTouched] = useState(false)
  const [price, setPrice] = useState('4.99')
  const [topics, setTopics] = useState('')
  const [questions, setQuestions] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [progress, setProgress] = useState('')

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
        const list = Array.from(files)
        const pdf = list.find((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
        if (list.some((f) => /\.(pptx?|key)$/i.test(f.name))) {
          throw new Error('Save the PowerPoint as a PDF first (File, Save As, PDF), then upload the PDF here.')
        }
        let images: File[]
        if (pdf) {
          setProgress('Reading the PDF')
          const { pdfToSlideImages } = await import('../../lib/pdfSlides')
          images = await pdfToSlideImages(pdf, (d, t) => setProgress(`Converting page ${d} of ${t}`))
        } else {
          // Keep image slides in the order PowerPoint names them: Slide1, Slide2 ... Slide10
          images = list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        }
        setProgress(`Uploading ${images.length} slides`)
        const paths = await withTimeout(api.uploadSlideImages(slug, images), 60 + images.length * 20, 'Uploading the slides')
        setForm((f) => ({ ...f, slideImages: paths, slideCount: paths.length }))
        setMsg({ tone: 'success', text: `${paths.length} slides ready. Click Save lesson to keep them.` })
      } else if (kind === 'file') {
        const slug = form.slug || slugify(form.title) || 'lesson'
        const file = files[0]
        setProgress('Uploading the lesson file')
        const { path, name } = await withTimeout(api.uploadLessonFile(slug, file), 240, 'Uploading the lesson file')
        setForm((f) => ({ ...f, filePath: path, fileName: name }))
        // A PDF lesson file also becomes the teaching slides, unless slides were already added
        if (/\.pdf$/i.test(file.name) && form.slideImages.length === 0) {
          const { pdfToSlideImages } = await import('../../lib/pdfSlides')
          const images = await pdfToSlideImages(file, (d, t) => setProgress(`Making teaching slides: page ${d} of ${t}`))
          setProgress(`Uploading ${images.length} slides`)
          const paths = await withTimeout(api.uploadSlideImages(slug, images), 60 + images.length * 20, 'Uploading the teaching slides')
          setForm((f) => ({ ...f, slideImages: paths, slideCount: paths.length }))
          setMsg({ tone: 'success', text: `Lesson file added, and its ${paths.length} pages are ready as teaching slides. Click Save lesson to keep them.` })
        } else {
          setMsg({ tone: 'success', text: 'Lesson file added. Click Save lesson to keep it.' })
        }
      } else if (kind === 'cover') {
        setProgress('Uploading cover image')
        const url = await withTimeout(api.uploadImage(await shrinkImage(files[0])), 90, 'Uploading the cover image')
        set('coverImageUrl', url)
      } else {
        const list = Array.from(files).slice(0, 6)
        const urls: string[] = []
        for (const [n, f] of list.entries()) {
          setProgress(`Uploading image ${n + 1} of ${list.length}`)
          urls.push(await withTimeout(api.uploadImage(await shrinkImage(f)), 90, 'Uploading a preview image'))
        }
        setForm((f) => ({ ...f, previewImages: [...f.previewImages, ...urls].slice(0, 6) }))
      }
    } catch (e) {
      console.error('Upload failed', e)
      setMsg({ tone: 'error', text: errorMessage(e) })
    } finally {
      setBusy(null)
      setProgress('')
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
              <Select id="level" value={form.level} onChange={(e) => set('level', e.target.value as Level)}>{LESSON_LEVELS.map((l) => <option key={l}>{l}</option>)}</Select>
            </Field>
            <Field label="Students" htmlFor="age">
              <Select id="age" value={form.ageGroup} onChange={(e) => set('ageGroup', e.target.value as AgeGroup)}>{AGE_GROUPS.map((a) => <option key={a}>{a}</option>)}</Select>
            </Field>
            <Field label="Topic area" htmlFor="category">
              {newCat === null ? (
                <Select id="category" value={form.categoryId ?? ''} onChange={(e) => { if (e.target.value === '__new') setNewCat(''); else set('categoryId', e.target.value || null) }}>
                  <option value="">None</option>
                  {[...(data?.categories ?? []), ...extraCats].sort((a, b) => a.name.localeCompare(b.name)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="__new">+ Add a new topic area</option>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input id="category" autoFocus placeholder="New topic area" value={newCat} onChange={(e) => setNewCat(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setNewCat(null) }} />
                  <button type="button" className="btn-primary !px-3" disabled={!newCat.trim()} onClick={async () => {
                    try {
                      const c = await api.saveCategory({ name: newCat.trim(), slug: slugify(newCat.trim()), description: '' })
                      setExtraCats((x) => [...x, c]); set('categoryId', c.id); setNewCat(null)
                    } catch (e) { setMsg({ tone: 'error', text: errorMessage(e) }) }
                  }}>Add</button>
                  <button type="button" className="text-sm font-bold underline" onClick={() => setNewCat(null)}>Cancel</button>
                </div>
              )}
            </Field>
          </div>
          <Field label="Topics" htmlFor="topics" hint="Comma separated, for example: Sleep, Health, Habits. Used in search.">
            <Input id="topics" value={topics} onChange={(e) => setTopics(e.target.value)} />
          </Field>
          <fieldset>
            <legend className="label">Activities included</legend>
            <div className="flex flex-wrap gap-2">
              {[...ACTIVITY_TYPES, ...activitiesIn(data?.lessons ?? []).filter((a) => !(ACTIVITY_TYPES as readonly string[]).includes(a)), ...form.activityTypes.filter((a) => !(ACTIVITY_TYPES as readonly string[]).includes(a) && !activitiesIn(data?.lessons ?? []).includes(a))].map((a) => {
                const on = form.activityTypes.includes(a)
                return (
                  <button type="button" key={a} aria-pressed={on} onClick={() => set('activityTypes', on ? form.activityTypes.filter((x) => x !== a) : [...form.activityTypes, a])}
                    className={`chip ${on ? 'border-brand bg-brand text-white' : 'border-line'}`}>{a}</button>
                )
              })}
            </div>
            <div className="mt-3 flex max-w-md gap-2">
              <Input aria-label="Add your own activity" placeholder="Add your own activity, e.g. Tongue twisters" value={newActivity} maxLength={40}
                onChange={(e) => setNewActivity(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const a = newActivity.trim(); if (a && !form.activityTypes.includes(a)) set('activityTypes', [...form.activityTypes, a]); setNewActivity('') } }} />
              <button type="button" className="btn-ghost shrink-0" disabled={!newActivity.trim()}
                onClick={() => { const a = newActivity.trim(); if (a && !form.activityTypes.includes(a)) set('activityTypes', [...form.activityTypes, a]); setNewActivity('') }}>Add</button>
            </div>
            <p className="hint">Your own activities appear in the catalogue filter once a published lesson uses them.</p>
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
            <input id="lessonFile" type="file" disabled={busy !== null} accept=".pptx,.ppt,.pdf,.zip,.key" className="text-[15px]" onChange={(e) => upload('file', e.target.files)} />
            {busy === 'file' && <p className="hint font-bold text-ink" role="status">{progress || 'Uploading file'}</p>}
            <p className="hint">PowerPoint, PDF or zip. Only buyers can download it. If you upload a PDF, its pages also become the teaching slides.</p>
          </div>
          <div>
            <p className="label">Slides for teaching on the website</p>
            <p className="mb-2 text-[15px]">{form.slideImages.length ? <><strong>{form.slideImages.length} slides</strong> uploaded. Buyers can teach this lesson from the website.</> : <span className="text-inksoft">No slides yet. Buyers see the sample questions as simple slides instead.</span>}</p>
            <input id="slideFiles" type="file" accept="application/pdf,.pdf,image/png,image/jpeg,image/webp,.ppt,.pptx" multiple className="text-[15px]" disabled={busy !== null} onChange={(e) => { upload('slides', e.target.files); e.target.value = '' }} />
            {busy === 'slides' && <p className="hint font-bold text-ink" role="status">{progress || 'Working'}</p>}
            <p className="hint">Easiest: in PowerPoint choose File, Save As, then PDF, and upload that one PDF. Each page becomes a slide. You can also upload slide images. Uploading again replaces the current slides.</p>
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
            <input type="file" accept="image/*" multiple className="text-[15px]" disabled={busy !== null} onChange={(e) => { upload('preview', e.target.files); e.target.value = '' }} />
            {busy === 'preview' && <p className="hint font-bold text-ink" role="status">{progress || 'Uploading images'}</p>}
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
            <input type="file" accept="image/*" className="text-[14px] w-full" disabled={busy !== null} onChange={(e) => { upload('cover', e.target.files); e.target.value = '' }} />
            {busy === 'cover' && <p className="hint font-bold text-ink" role="status">{progress || 'Uploading'}</p>}
            {form.coverImageUrl && <button type="button" className="mt-2 text-sm font-bold underline" onClick={() => set('coverImageUrl', null)}>Remove cover image</button>}
          </div>
        </div>
        <div className="panel grid gap-3 p-5">
          <label className="flex items-center gap-3 font-bold"><input type="checkbox" className="h-5 w-5 accent-brand" checked={form.published} onChange={(e) => set('published', e.target.checked)} />Published</label>
          <p className="hint -mt-2">Drafts are hidden from the catalogue.</p>
          <label className="flex items-center gap-3 font-bold"><input type="checkbox" className="h-5 w-5 accent-brand" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />Show on home page</label>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          <button className="btn-primary mt-2 !py-3" disabled={busy !== null}>{busy === 'save' ? 'Saving' : busy ? 'Wait for the upload to finish' : 'Save lesson'}</button>
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
