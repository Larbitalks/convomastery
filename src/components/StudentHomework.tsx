import { useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { errorMessage, formatDate } from '../lib/format'
import { useLoad } from '../lib/hooks'
import type { HomeworkState, Lesson } from '../lib/types'
import { Field, Input, Notice, Select, Spinner, Textarea } from './ui'

export const HOMEWORK_STATES: { value: HomeworkState; label: string; cls: string }[] = [
  { value: 'assigned', label: 'Not yet', cls: 'bg-board' },
  { value: 'done', label: 'Done', cls: 'bg-sage-light text-sage-dark' },
  { value: 'late', label: 'Late', cls: 'bg-sun-light' },
  { value: 'missing', label: 'Missing', cls: 'bg-[#FDECEC] text-[#8E1C20]' },
]

/** Set and track one student's homework, on their profile */
export function StudentHomework({ studentId, classId, name, lessons, onChange }: {
  studentId: string; classId: string; name: string; lessons: Lesson[]; onChange?: () => void
}) {
  const { data, loading, reload, setData } = useLoad(async () => {
    const [all, statuses] = await Promise.all([api.listHomework(), api.listAllHomeworkStatus()])
    return { homework: all.filter((h) => h.studentId === studentId), statuses: statuses.filter((s) => s.studentId === studentId) }
  }, [studentId])
  const blank = { title: '', instructions: '', dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), lessonId: '' }
  const [form, setForm] = useState(blank)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  if (loading || !data) return <Spinner />
  const statusOf = (hid: string) => data.statuses.find((s) => s.homeworkId === hid)
  const today = new Date().toISOString().slice(0, 10)

  const create = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    try {
      await api.saveHomework({ classId, studentId, title: form.title.trim(), instructions: form.instructions.trim(), dueDate: form.dueDate, lessonId: form.lessonId || null })
      setForm(blank); setCreating(false); await reload(); onChange?.()
    } catch (e2) { setErr(errorMessage(e2)) }
  }
  const setStatus = async (homeworkId: string, patch: Partial<{ status: HomeworkState; feedback: string }>) => {
    const cur = statusOf(homeworkId) ?? { homeworkId, studentId, status: 'assigned' as HomeworkState, feedback: '' }
    const next = { ...cur, ...patch }
    setData({ ...data, statuses: [...data.statuses.filter((s) => s.homeworkId !== homeworkId), next] })
    try { await api.setHomeworkStatus(next); onChange?.() } catch (e) { setErr(errorMessage(e)); reload() }
  }
  const remove = async (id: string) => {
    try { await api.deleteHomework(id); setConfirmDelete(null); await reload(); onChange?.() } catch (e) { setErr(errorMessage(e)) }
  }

  return (
    <div className="grid gap-4">
      {err && <Notice tone="error">{err}</Notice>}
      {creating ? (
        <form onSubmit={create} className="panel grid gap-4 p-4">
          <p className="font-bold">New homework for {name}</p>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <Field label="Title" htmlFor="hwTitle"><Input id="hwTitle" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sleep diary" /></Field>
            <Field label="Due" htmlFor="hwDue"><Input id="hwDue" type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
          </div>
          <Field label="Instructions" htmlFor="hwInstr"><Textarea id="hwInstr" rows={3} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="What to do, and how to get ready for the next lesson" /></Field>
          {lessons.length > 0 && (
            <Field label="Linked lesson (optional)" htmlFor="hwLesson">
              <Select id="hwLesson" value={form.lessonId} onChange={(e) => setForm({ ...form, lessonId: e.target.value })}>
                <option value="">None</option>
                {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </Select>
            </Field>
          )}
          <div className="flex gap-2"><button className="btn-primary">Set homework</button><button type="button" className="btn-ghost" onClick={() => setCreating(false)}>Cancel</button></div>
        </form>
      ) : (
        <button className="btn-primary justify-self-start" onClick={() => setCreating(true)}>Set homework for {name}</button>
      )}

      {data.homework.length === 0 ? <p className="text-inksoft">No homework yet.</p> : (
        <ul className="divide-y-2 divide-line rounded-2xl border-2 border-line bg-white">
          {[...data.homework].sort((a, b) => b.dueDate.localeCompare(a.dueDate)).map((h) => {
            const st = statusOf(h.id)
            const state = st?.status ?? 'assigned'
            const lesson = lessons.find((l) => l.id === h.lessonId)
            const overdue = state === 'assigned' && h.dueDate < today
            return (
              <li key={h.id} className="grid gap-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">{h.title}</p>
                    <p className={`text-[15px] ${overdue ? 'font-bold text-[#8E1C20]' : 'text-inksoft'}`}>{overdue ? 'Overdue, was due' : 'Due'} {formatDate(h.dueDate)}{lesson ? `. Lesson: ${lesson.title}` : ''}</p>
                  </div>
                  {confirmDelete === h.id ? (
                    <span className="flex items-center gap-2 text-sm">
                      Delete this homework?
                      <button className="font-bold text-coral underline" onClick={() => remove(h.id)}>Delete</button>
                      <button className="font-bold underline" onClick={() => setConfirmDelete(null)}>Keep</button>
                    </span>
                  ) : <button className="text-sm font-bold underline" onClick={() => setConfirmDelete(h.id)}>Delete</button>}
                </div>
                {h.instructions && <p className="whitespace-pre-line text-[15px]">{h.instructions}</p>}
                <div className="flex flex-wrap gap-1" role="group" aria-label={`Status of ${h.title}`}>
                  {HOMEWORK_STATES.map((o) => (
                    <button key={o.value} type="button" aria-pressed={state === o.value} onClick={() => setStatus(h.id, { status: o.value })}
                      className={`rounded-full border-2 px-3 py-0.5 text-[13px] font-bold ${state === o.value ? `border-ink ${o.cls}` : 'border-line text-inksoft hover:border-ink/40'}`}>{o.label}</button>
                  ))}
                </div>
                <Input aria-label={`Feedback on ${h.title}`} className="!py-1.5 text-[15px]" placeholder="Feedback for the student (optional)" defaultValue={st?.feedback ?? ''}
                  onBlur={(e) => { if (e.target.value !== (st?.feedback ?? '')) setStatus(h.id, { feedback: e.target.value }) }} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
