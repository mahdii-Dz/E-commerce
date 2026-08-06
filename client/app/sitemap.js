import { getProducts } from '@/lib/server-fetch'

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://la-maison-dor.store').replace(/\/+$/, '')

export const revalidate = 3600

export default async function sitemap() {
  const staticRoutes = [
    { path: '/', priority: 1, changeFrequency: 'weekly' },
    { path: '/products/All', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/products/Promotions', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/products/Newest', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/products/TopSold', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/products/BestDeal', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/delivery', priority: 0.5, changeFrequency: 'monthly' },
  ]

  const products = await getProducts()

  return [
    ...staticRoutes.map((route) => ({
      url: `${BASE_URL}${route.path}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...products.map((product) => ({
      url: `${BASE_URL}/product/${product.id}`,
      lastModified: product.created_at ? new Date(product.created_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    })),
  ]
}
