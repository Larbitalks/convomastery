import { useState, type FormEvent } from 'react'
import { Field, Input, Notice, Select, Textarea } from './ui'
import { api } from '../lib/api'
import { errorMessage, formatDate } from '../lib/format'
import { bandOf } from '../lib/performance'
import { EXAM_TYPES, examPercent, type Exam, type ExamTotals, type ExamType } from '../lib/types'

const typeOf = (t: ExamType) => EXAM_TYPES.find((x) => x.value === t)!
const today = () => new Date().toISOString().slice(0, 10)
const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))

type Draft = { id?: string; type: ExamType; title: string; date: string; score: string; outOf: string; feedback: string }

/** Exam results for one student: unit exams, mid-terms and finals */
export function StudentExams({ studentId, name, exams, totals, onChange }: { studentId: string; name: string; exams: Exam[]; totals: ExamTotals; onChange: () => void }) {
  const blank = (type: ExamType = 'unit'): Draft => ({ type, title: '', date: today(), score: '', outOf: String(totals[type]), feedback: '' })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editTotals, setEditTotals] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!draft) return
    const score = num(draft.score), outOf = num(draft.outOf)
    if (!(outOf > 0)) return setErr('"Out of" must be a number above 0.')
    if (!(score >= 0) || score > outOf) return setErr(`The score must be a number from 0 to ${outOf}.`)
    setBusy(true); setErr(null)
    try {
      await api.saveExam({ id: draft.id, studentId, type: draft.type, title: draft.title.trim(), date: draft.date, score, outOf, feedback: draft.feedback.trim() })
      setDraft(null); onChange()
    } catch (x) { setErr(errorMessage(x)) } finally { setBusy(false) }
  }

  const summary = EXAM_TYPES.map((t) => {
    const list = exams.filter((e) => e.type === t.value)
    return { t, n: list.length, avg: list.length ? Math.round(list.reduce((a, e) => a + examPercent(e), 0) / list.length) : null }
  })
  const pct = draft ? (() => { const s = num(draft.score), o = num(draft.outOf); return o > 0 && s >= 0 && s <= o ? Math.round((s / o) * 100) : null })() : null

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold">Exams</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button className="text-sm font-bold underline" onClick={() => { setEditTotals(!editTotals); setDraft(null) }} aria-expanded={editTotals}>Usual scores</button>
          {!draft && <button className="btn-primary" onClick={() => { setDraft(blank()); setEditTotals(false); setErr(null) }}>Add exam result</button>}
        </div>
      </div>

      {editTotals && <TotalsEditor totals={totals} onDone={() => { setEditTotals(false); onChange() }} />}

      <ul className="mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border-2 border-line bg-line sm:grid-cols-3">
        {summary.map(({ t, n, avg }) => (
          <li key={t.value} className="bg-white px-4 py-3">
            <p className="flex items-center gap-2 text-sm text-inksoft"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />{t.short}{n > 0 && ` (${n})`}</p>
            <p className="font-display text-2xl font-extrabold tabular-nums">{avg === null ? <span className="text-base font-bold text-inksoft">None yet</span> : `${avg}%`}</p>
          </li>
        ))}
      </ul>

      {draft && (
        <form onSubmit={save} className="panel mt-4 grid gap-4 p-4">
          {err && <Notice tone="error">{err}</Notice>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="exType">
              <Select id="exType" value={draft.type} onChange={(e) => {
                const type = e.target.value as ExamType
                // Use the usual score for the new type unless it was changed by hand
                const outOf = draft.outOf === String(totals[draft.type]) ? String(totals[type]) : draft.outOf
                setDraft({ ...draft, type, outOf })
              }}>
                {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </Field>
            <Field label="Date" htmlFor="exDate"><Input id="exDate" type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
          </div>
          <Field label="Title" htmlFor="exTitle" hint="Optional, for example Unit 3: Family or Semester 1">
            <Input id="exTitle" maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </Field>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Score" htmlFor="exScore"><Input id="exScore" inputMode="decimal" required className="!w-28" value={draft.score} onChange={(e) => setDraft({ ...draft, score: e.target.value })} /></Field>
            <span className="pb-3 font-bold">out of</span>
            <Field label="Out of" htmlFor="exOutOf"><Input id="exOutOf" inputMode="decimal" required className="!w-28" value={draft.outOf} onChange={(e) => setDraft({ ...draft, outOf: e.target.value })} /></Field>
            {pct !== null && <span className="pb-3 font-display text-2xl font-extrabold tabular-nums" style={{ color: bandOf(pct).color === '#F2CC8F' ? '#9A6A1F' : bandOf(pct).color }}>{pct}%</span>}
          </div>
          <Field label="Feedback" htmlFor="exFeedback" hint={`Optional. ${name} and their parents can see it on the progress page.`}>
            <Textarea id="exFeedback" rows={2} maxLength={3000} value={draft.feedback} onChange={(e) => setDraft({ ...draft, feedback: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={busy}>{busy ? 'Saving' : draft.id ? 'Save changes' : 'Save result'}</button>
            <button type="button" className="btn-ghost" onClick={() => { setDraft(null); setErr(null) }}>Cancel</button>
          </div>
        </form>
      )}

      {exams.length === 0 ? (
        !draft && <p className="mt-3 text-inksoft">No exam results yet. Add unit exams, mid-terms and finals here. They count towards {name}'s overall performance.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {exams.map((e) => {
            const t = typeOf(e.type)
            const p = examPercent(e)
            const b = bandOf(p)
            return (
              <li key={e.id} className="panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="rounded-full px-2.5 py-0.5 text-[13px] font-bold text-white" style={{ backgroundColor: t.color }}>{t.short}</span>
                    <p className="mt-1.5 font-bold">{e.title || t.label}</p>
                    <p className="text-[14px] text-inksoft">{formatDate(e.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-extrabold tabular-nums">{p}%</p>
                    <p className="text-[14px] tabular-nums text-inksoft">{e.score} / {e.outOf}</p>
                  </div>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-board" aria-hidden="true">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(p, 2)}%`, backgroundColor: b.color }} />
                </div>
                {e.feedback && <p className="mt-2 whitespace-pre-line text-[15px]">{e.feedback}</p>}
                <div className="mt-2 flex gap-3 text-sm font-bold">
                  <button className="underline" onClick={() => { setDraft({ id: e.id, type: e.type, title: e.title, date: e.date, score: String(e.score), outOf: String(e.outOf), feedback: e.feedback }); setErr(null) }}>Edit</button>
                  {confirm === e.id ? (
                    <span>Delete this result? <button className="text-coral underline" onClick={async () => { try { await api.deleteExam(e.id); setConfirm(null); onChange() } catch (x) { setErr(errorMessage(x)) } }}>Delete</button> <button className="underline" onClick={() => setConfirm(null)}>Keep</button></span>
                  ) : <button className="underline" onClick={() => setConfirm(e.id)}>Delete</button>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** The teacher's usual "out of" for each exam type, used to fill in new results */
function TotalsEditor({ totals, onDone }: { totals: ExamTotals; onDone: () => void }) {
  const [form, setForm] = useState<Record<ExamType, string>>({ unit: String(totals.unit), midterm: String(totals.midterm), final: String(totals.final) })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const save = async (e: FormEvent) => {
    e.preventDefault()
    const next = { unit: num(form.unit), midterm: num(form.midterm), final: num(form.final) }
    if (Object.values(next).some((v) => !(v > 0))) return setErr('Each score must be a number above 0.')
    setBusy(true); setErr(null)
    try { await api.saveExamTotals(next); onDone() } catch (x) { setErr(errorMessage(x)) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={save} className="panel mt-3 grid gap-3 p-4">
      <p className="text-[15px]">What is each type of exam usually out of? New results start with these numbers, and you can still change them for any single exam.</p>
      {err && <Notice tone="error">{err}</Notice>}
      <div className="flex flex-wrap gap-4">
        {EXAM_TYPES.map((t) => (
          <Field key={t.value} label={t.label} htmlFor={`tot-${t.value}`}>
            <Input id={`tot-${t.value}`} inputMode="decimal" className="!w-28" value={form[t.value]} onChange={(e) => setForm({ ...form, [t.value]: e.target.value })} />
          </Field>
        ))}
      </div>
      <p className="hint !mt-0">These are used for all your students. Results already saved keep their own scores.</p>
      <button className="btn-primary justify-self-start" disabled={busy}>{busy ? 'Saving' : 'Save usual scores'}</button>
    </form>
  )
}
