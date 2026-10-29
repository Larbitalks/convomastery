import { Link } from 'react-router-dom'
import { Seo } from '../lib/seo'

export default function About() {
  return (
    <div className="wrap py-12">
      <Seo title="About" description="ConvoMastery is written by Larbi Amzil, an online English teacher who builds communicative speaking lessons for kids, teens and adults." />
      <div className="grid gap-12 md:grid-cols-[1.3fr_1fr]">
        <div className="max-w-[66ch]">
          <h1 className="text-4xl sm:text-5xl font-extrabold">Made by a teacher, tested in real lessons</h1>
          <div className="mt-6 grid gap-4 text-[18px] text-inksoft">
            <p>Hi, I'm Larbi Amzil. I teach English to kids from 6 years old, teenagers and adults, from beginner level up to IELTS. Most of my teaching is online and one-to-one, and I also teach in public schools. Every lesson on ConvoMastery started as something I built for my own students.</p>
            <p>Too many ESL materials are grammar exercises with a speaking question tacked on at the end. My students needed the opposite: lessons where talking is the main event, with just enough vocabulary and structure to help them say what they really think.</p>
            <p>So every lesson follows the same path, from easy personal questions to dilemmas and debates. Students know what to expect, teachers can pick up any lesson and teach it, and the conversation does the rest.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/lessons" className="btn-primary">Browse lessons</Link>
            <Link to="/contact" className="btn-ghost">Get in touch</Link>
          </div>
        </div>
        <div className="grid content-start gap-6">
        <figure className="mx-auto w-full max-w-[20rem] md:mx-0">
          <img src={`${import.meta.env.BASE_URL}about/larbi.webp`} alt="Larbi Amzil" width={378} height={528} className="aspect-[378/528] w-full rounded-3xl object-cover shadow-md ring-4 ring-white" />
          <figcaption className="mt-2 text-center text-[14px] font-bold text-inksoft">Larbi Amzil, English teacher</figcaption>
        </figure>
        <aside className="self-start rounded-2xl bg-board p-7">
          <h2 className="text-xl font-extrabold">What makes these lessons different</h2>
          <ul className="mt-4 grid gap-3">
            <li><strong>Communication first.</strong> <span className="text-inksoft">Most of the lesson is students speaking.</span></li>
            <li><strong>Built for kids and teens too.</strong> <span className="text-inksoft">Topics and tasks that keep young learners and teenagers talking, not just adults.</span></li>
            <li><strong>Scaffolded.</strong> <span className="text-inksoft">Sentence starters and expression banks for every debate.</span></li>
          </ul>
        </aside>
        </div>
      </div>
    </div>
  )
}
