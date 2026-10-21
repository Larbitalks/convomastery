import { Link } from 'react-router-dom'
import { Seo } from '../lib/seo'

export default function NotFound() {
  return (
    <div className="wrap py-24">
      <Seo title="Page not found" noindex />
      <h1 className="text-4xl font-extrabold">This page does not exist</h1>
      <p className="mt-3 text-inksoft">The link may be old or mistyped. Try the lesson catalogue instead.</p>
      <Link to="/lessons" className="btn-primary mt-6">Browse lessons</Link>
    </div>
  )
}
