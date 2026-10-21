import { Link, useSearchParams } from 'react-router-dom'
import { Seo } from '../lib/seo'

export default function CheckoutSuccess() {
  const [params] = useSearchParams()
  const slug = params.get('lesson')
  return (
    <div className="wrap py-20">
      <Seo title="Payment complete" noindex />
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-4xl font-extrabold">Payment complete</h1>
        <p className="mt-4 text-inksoft">Thank you. A confirmation email is on its way, and the lesson is in your library. If it is not there yet, refresh the page in a few seconds.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/library" className="btn-primary">Go to my library</Link>
          {slug && <Link to={`/lessons/${slug}`} className="btn-ghost">Back to the lesson</Link>}
        </div>
      </div>
    </div>
  )
}
