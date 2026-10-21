import { Link } from 'react-router-dom'
import { Seo } from '../lib/seo'

export default function About() {
  return (
    <div className="wrap py-12">
      <Seo title="About" description="ConvoMastery is written by Larbi Amzil, an online English teacher who builds communicative speaking lessons for teens and adults." />
      <div className="grid gap-12 md:grid-cols-[1.3fr_1fr]">
        <div className="max-w-[66ch]">
          <h1 className="text-4xl sm:text-5xl font-extrabold">Made by a teacher, tested in real lessons</h1>
          <div className="mt-6 grid gap-4 text-[18px] text-inksoft">
            <p>Hi, I'm Larbi Amzil. I teach English online, mostly one-to-one, to teenagers and adults from beginner level up to IELTS. Every lesson on ConvoMastery started as something I built for my own students.</p>
            <p>Too many ESL materials are grammar exercises with a speaking question tacked on at the end. My students needed the opposite: lessons where talking is the main event, with just enough vocabulary and structure to help them say what they really think.</p>
            <p>So every lesson follows the same path, from easy personal questions to dilemmas and debates. Students know what to expect, teachers can pick up any lesson and teach it, and the conversation does the rest.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/lessons" className="btn-primary">Browse lessons</Link>
            <Link to="/contact" className="btn-ghost">Get in touch</Link>
          </div>
        </div>
        <aside className="self-start rounded-2xl bg-board p-7">
          <h2 className="text-xl font-extrabold">What makes these lessons different</h2>
          <ul className="mt-4 grid gap-3">
            <li><strong>Communication first.</strong> <span className="text-inksoft">Most of the lesson is students speaking.</span></li>
            <li><strong>Built for teenagers too.</strong> <span className="text-inksoft">Topics and tasks that keep 11 to 14 year olds talking.</span></li>
            <li><strong>Scaffolded.</strong> <span className="text-inksoft">Sentence starters and expression banks for every debate.</span></li>
            <li><strong>Ready to teach.</strong> <span className="text-inksoft">Open the file and start. No extra printing or prep.</span></li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
