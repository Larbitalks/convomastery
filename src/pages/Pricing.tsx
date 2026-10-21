import { Link } from 'react-router-dom'
import { Seo } from '../lib/seo'

const faqs = [
  ['What do I get when I buy a lesson?', 'A complete PowerPoint lesson file you can download straight away and again any time from your library. It opens in PowerPoint, Keynote or Google Slides.'],
  ['Can I teach the lessons online?', 'Yes. The lessons are designed for screen sharing in one-to-one online classes as well as projecting in a classroom.'],
  ['Can I teach straight from the website?', 'Yes. Every lesson you own opens in a full-screen presenter with a timer, a random student picker and awards for your class. Your classes, students and homework are free to use with your account.'],
  ['Can I book a lesson or a training session?', 'Yes. Open Bookings in your dashboard to see the available times for one-to-one lessons, trial lessons and teacher training.'],
  ['Do I need an account?', 'Yes, a free account. It keeps your purchases in one place so you never lose a file.'],
  ['How do I pay?', 'Pay securely by card at checkout. You receive a confirmation email after every purchase.'],
  ['I need a topic you do not have yet.', 'Tell us through the contact page. Requests from teachers decide which lessons we write next.'],
]

export default function Pricing() {
  return (
    <div className="wrap py-12">
      <Seo title="Pricing" description="Simple pricing for ready-to-teach ESL speaking lessons. Pay per lesson, download instantly, and start with a free lesson." />
      <h1 className="text-4xl sm:text-5xl font-extrabold">Simple pricing</h1>
      <p className="mt-3 max-w-2xl text-inksoft">Buy only the lessons you need. No subscription, no expiry date.</p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border-[3px] border-ink bg-sun p-8">
          <h2 className="text-2xl font-extrabold">Free sample lesson</h2>
          <p className="mt-1 font-display text-4xl font-extrabold">$0</p>
          <ul className="mt-5 grid gap-2">
            <li>One complete lesson, every section included</li>
            <li>See exactly how the lessons work before you buy</li>
            <li>Needs a free account</li>
          </ul>
          <Link to="/lessons?price=Free" className="btn bg-ink text-white hover:bg-ink/90 mt-6">Get the free lesson</Link>
        </div>
        <div className="panel p-8">
          <h2 className="text-2xl font-extrabold">Single lessons</h2>
          <p className="mt-1 font-display text-4xl font-extrabold">From $3.99</p>
          <ul className="mt-5 grid gap-2 text-inksoft">
            <li>Each lesson priced individually</li>
            <li>Instant download after payment</li>
            <li>Download again any time from your library</li>
          </ul>
          <Link to="/lessons" className="btn-primary mt-6">Browse lessons</Link>
        </div>
      </div>

      <section className="mt-20 max-w-3xl">
        <h2 className="text-3xl font-extrabold">Questions</h2>
        <div className="mt-6 divide-y-2 divide-line border-y-2 border-line">
          {faqs.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="cursor-pointer list-none font-bold text-lg flex justify-between gap-4">
                {q}<span className="text-teal group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
              </summary>
              <p className="mt-2 text-inksoft">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
