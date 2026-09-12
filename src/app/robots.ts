import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.leadwise.io'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/login', '/signup', '/awaiting-approval'],
        disallow: [
          '/api/',
          '/dashboard',
          '/organisations',
          '/contacts',
          '/pipeline',
          '/activities',
          '/followups',
          '/calendar',
          '/templates',
          '/team',
          '/analytics',
          '/reports',
          '/settings',
          '/profile',
          '/eod',
          '/import',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
