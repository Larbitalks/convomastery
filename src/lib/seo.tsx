import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { config } from './config'

interface Props {
  title: string
  description?: string
  image?: string | null
  noindex?: boolean
  jsonLd?: object
}

const DEFAULT_DESCRIPTION =
  'Conversational English lesson plans for ESL teachers and tutors: discussion questions, debates, dilemmas and speaking activities for teens and adults, ready to teach.'

export function Seo({ title, description = DEFAULT_DESCRIPTION, image, noindex, jsonLd }: Props) {
  const { pathname } = useLocation()
  const fullTitle = title === config.siteName ? title : `${title} | ${config.siteName}`
  const url = config.siteUrl ? config.siteUrl + pathname : undefined
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {url && <link rel="canonical" href={url} />}
      {noindex && <meta name="robots" content="noindex" />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={config.siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  )
}
