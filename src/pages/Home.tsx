import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LessonCard } from '../components/LessonCard'
import { Spinner } from '../components/ui'
import { api } from '../lib/api'
import { useLoad } from '../lib/hooks'
import { Seo } from '../lib/seo'
import { AGE_GROUPS, LEVELS } from '../lib/types'

const lessonPath = [
  ['Warm-up', 'Three visuals and an open prompt to get students curious.'],
  ['Opening questions', 'Four personal questions so everyone speaks in the first five minutes.'],
  ['Vocabulary', 'Match 8 to 10 key words, then use them in example sentences.'],
  ['Model conversation', 'A two-speaker dialogue that recycles the new words.'],
  ['Topic content', 'Short explanations and examples, each with discussion questions.'],
  ['Apply it', 'Real-life scenarios where students use the ideas.'],
  ['Situations and dilemmas', 'A, B or C choices with no single right answer.'],
  ['Debate', 'Statements, sentence starters and an expression bank.'],
  ['Final task', 'A project or creative task that pulls it all together.'],
]

function QuestionBubble({ items }: { items: { q: string; title: string; slug: string; level: string; age: string }[] }) {
  const [i, setI] = useState(0)
  if (!items.length) return null
  const item = items[i % items.length]
  return (
    <div className="relative">
      <div key={i} className="bubble pop rounded-[28px] border-[3px] border-ink bg-sun p-7 sm:p-9 shadow-[8px_8px_0_#3D405B]">
        <p className="font-display text-[28px] sm:text-[34px] font-bold leading-[1.15]">{item.q}</p>
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 pl-1">
        <p className="text-[15px] text-inksoft">
          From <Link to={`/lessons/${item.slug}`} className="font-bold text-ink underline underline-offset-2">{item.title}</Link>, {item.level}, {item.age.toLowerCase()}
        </p>
        <button className="btn-ghost" onClick={() => setI(i + 1)}>Ask another question</button>
      </div>
    </div>
  )
}

export default function Home() {
  const { data: lessons, loading } = useLoad(() => api.listLessons())

  const questions = useMemo(() => {
    const all = (lessons ?? []).flatMap((l) =>
      l.sampleQuestions.map((q) => ({ q, title: l.title, slug: l.slug, level: l.level, age: l.ageGroup })),
    )
    // interleave so consecutive questions come from different lessons
    const byLesson = (lessons ?? []).map((l) => all.filter((x) => x.slug === l.slug))
    const out: typeof all = []
    for (let r = 0; byLesson.some((b) => b[r]); r++) byLesson.forEach((b) => b[r] && out.push(b[r]))
    return out
  }, [lessons])

  const featured = (lessons ?? []).filter((l) => l.featured).slice(0, 4)
  const free = (lessons ?? []).find((l) => l.priceCents === 0)

  return (
    <>
      <Seo
        title="ConvoMastery"
        description="Ready-to-teach ESL speaking lessons and conversation lesson plans for teens and adults: discussion questions, debates, dilemmas and classroom activities."
      />

      <section className="bg-board">
        <div className="wrap grid items-center gap-12 py-14 md:grid-cols-[1.05fr_1fr] md:py-20">
          <div>
            <h1 className="text-[44px] sm:text-[58px] font-extrabold">Speaking lessons your students actually want to talk about.</h1>
            <p className="mt-5 max-w-xl text-[19px] text-inksoft">
              Ready-to-teach conversational English lessons for teens and adults. Discussion questions, dilemmas and debates, all built on one clear structure, so you spend less time preparing and more time listening.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/lessons" className="btn-primary !px-6 !py-3 text-base">Browse lessons</Link>
              {free && <Link to={`/lessons/${free.slug}`} className="btn-ghost !px-6 !py-3 text-base">Try a free lesson</Link>}
            </div>
          </div>
          {loading ? <Spinner /> : <QuestionBubble items={questions} />}
        </div>
      </section>

      <section className="wrap py-14">
        <h2 className="text-3xl font-extrabold">Find a lesson for your class</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="font-bold">By student age</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AGE_GROUPS.map((a) => <Link key={a} to={`/lessons?age=${encodeURIComponent(a)}`} className="chip border-line hover:border-brand hover:text-brand-dark">{a}</Link>)}
            </div>
          </div>
          <div>
            <p className="font-bold">By level</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LEVELS.map((l) => <Link key={l} to={`/lessons?level=${l}`} className="chip border-line hover:border-brand hover:text-brand-dark">{l}</Link>)}
            </div>
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl font-extrabold">Popular lessons</h2>
          <Link to="/lessons" className="font-bold text-brand-dark underline underline-offset-4">See all lessons</Link>
        </div>
        {loading ? <Spinner /> : (
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((l) => <LessonCard key={l.id} lesson={l} />)}
          </div>
        )}
      </section>

      <section className="wrap mt-24 grid gap-10 md:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-3xl font-extrabold">Every lesson follows the same path</h2>
          <p className="mt-4 text-inksoft">
            Students warm up with easy personal questions, pick up the language they need, then use it to solve problems and argue a point. The structure stays the same from lesson to lesson, so your students always know what comes next and you can teach a new topic with almost no preparation.
          </p>
          <p className="mt-4 text-inksoft">Each lesson is a 22 to 32 slide PowerPoint for a 50 to 75 minute class, online or in the classroom.</p>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-2xl border-2 border-line bg-line">
          {lessonPath.map(([title, text], i) => (
            <li key={title} className="flex gap-4 bg-white px-5 py-3.5">
              <span className="w-6 shrink-0 font-display text-lg font-extrabold text-brand">{i + 1}</span>
              <span><strong>{title}.</strong> <span className="text-inksoft">{text}</span></span>
            </li>
          ))}
        </ol>
      </section>

      <section className="wrap mt-24 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-ink p-8 text-white">
          <h2 className="text-2xl font-extrabold text-white">For teachers and tutors</h2>
          <p className="mt-3 text-white/80">
            Stop rebuilding speaking lessons from scratch. Download a complete, communicative lesson, or teach it straight from the website with a built-in timer, a random name picker and class awards. Keep track of your students and their homework in the same place.
          </p>
        </div>
        <div className="rounded-2xl bg-sage-light p-8">
          <h2 className="text-2xl font-extrabold">For parents</h2>
          <p className="mt-3 text-inksoft">
            Want your child to use their English, not just study grammar? These lessons give you real conversation topics, question by question, so practice at home feels like a chat instead of homework.
          </p>
        </div>
      </section>

      {free && (
        <section className="wrap mt-24">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border-[3px] border-ink bg-sun p-8 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-extrabold">Teach your first lesson free</h2>
              <p className="mt-2 max-w-xl">Create an account and download {free.title}, a complete {free.level} lesson, at no cost.</p>
            </div>
            <Link to={`/lessons/${free.slug}`} className="btn bg-ink text-white hover:bg-ink/90 !px-6 !py-3">Get the free lesson</Link>
          </div>
        </section>
      )}
    </>
  )
}
