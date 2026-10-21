import { useState, type FormEvent } from 'react'
import { Field, Input, Notice, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { errorMessage, slugify } from '../../lib/format'
import { useLoad } from '../../lib/hooks'
import type { Category } from '../../lib/types'

function CategoryRow({ c, onChange }: { c: Category; onChange: () => void }) {
  const [edit, setEdit] = useState(false)
  const [name, setName] = useState(c.name)
  const [description, setDescription] = useState(c.description)
  const [err, setErr] = useState<string | null>(null)
  const save = async () => {
    try { await api.saveCategory({ id: c.id, name, slug: slugify(name), description }); setEdit(false); onChange() } catch (e) { setErr(errorMessage(e)) }
  }
  const remove = async () => {
    try { await api.deleteCategory(c.id); onChange() } catch (e) { setErr(errorMessage(e)) }
  }
  return (
    <li className="panel p-4">
      {err && <div className="mb-3"><Notice tone="error">{err}</Notice></div>}
      {edit ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <Field label="Name" htmlFor={`n-${c.id}`}><Input id={`n-${c.id}`} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Description" htmlFor={`d-${c.id}`}><Input id={`d-${c.id}`} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <div className="flex gap-2"><button className="btn-primary" onClick={save}>Save</button><button className="btn-ghost" onClick={() => setEdit(false)}>Cancel</button></div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-bold">{c.name}</p><p className="text-[15px] text-inksoft">{c.description}</p></div>
          <div className="flex gap-2"><button className="btn-ghost" onClick={() => setEdit(true)}>Edit</button><button className="btn-danger" onClick={remove}>Delete</button></div>
        </div>
      )}
    </li>
  )
}

export default function AdminCategories() {
  const { data, loading, reload } = useLoad(() => api.listCategories())
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const add = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    try { await api.saveCategory({ name, slug: slugify(name), description }); setName(''); setDescription(''); reload() } catch (e2) { setErr(errorMessage(e2)) }
  }
  return (
    <div className="grid max-w-3xl gap-6">
      <p className="text-inksoft">Topic areas group lessons in the catalogue filter. Deleting one keeps its lessons, they just lose the label.</p>
      <form onSubmit={add} className="panel grid gap-4 p-5 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
        <Field label="New topic area" htmlFor="newName"><Input id="newName" required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Description" htmlFor="newDesc"><Input id="newDesc" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <button className="btn-primary">Add</button>
      </form>
      {err && <Notice tone="error">{err}</Notice>}
      {loading ? <Spinner /> : <ul className="grid gap-3">{data?.map((c) => <CategoryRow key={c.id} c={c} onChange={reload} />)}</ul>}
    </div>
  )
}
