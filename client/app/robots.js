const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://la-maison-dor.store').replace(/\/+$/, '')

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/cart', '/monitoring', '/_next'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
