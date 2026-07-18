export const PERMISSION_LABELS = {
  dashboard: 'لوحة التحكم',
  products: 'المنتجات',
  orders: 'الطلبات',
  delivery: 'التوصيل',
  extras: 'الإضافات',
  reviews: 'التقييمات',
  'shop-workers': 'موظفي المتجر',
}

export const AVAILABLE_PERMISSIONS = Object.keys(PERMISSION_LABELS).filter(k => k !== 'shop-workers')

const ROUTE_TO_PERMISSION = [
  { prefix: '/admin/dashboard', key: 'dashboard' },
  { prefix: '/admin/all-products', key: 'products' },
  { prefix: '/admin/add-product', key: 'products' },
  { prefix: '/admin/edit-product', key: 'products' },
  { prefix: '/admin/orders', key: 'orders' },
  { prefix: '/admin/lefted-orders', key: 'orders' },
  { prefix: '/admin/color-analytics', key: 'orders' },
  { prefix: '/admin/add-order', key: 'orders' },
  { prefix: '/admin/delivery', key: 'delivery' },
  { prefix: '/admin/extra', key: 'extras' },
  { prefix: '/admin/reviews', key: 'reviews' },
  { prefix: '/admin/shop-workers', key: 'shop-workers' },
]

const PERMISSION_FIRST_PAGE = {
  dashboard: '/admin/dashboard',
  products: '/admin/all-products',
  orders: '/admin/orders',
  delivery: '/admin/delivery',
  extras: '/admin/extra',
  reviews: '/admin/reviews',
  'shop-workers': '/admin/shop-workers',
}

export function getFirstPermittedPage(permissions, role) {
  if (role === 'owner' || permissions.includes('*')) return '/admin/dashboard'

  for (const key of Object.keys(PERMISSION_FIRST_PAGE)) {
    if (permissions.includes(key)) {
      return PERMISSION_FIRST_PAGE[key]
    }
  }

  return '/admin'
}

export function getRoutePermissionKey(pathname) {
  for (const { prefix, key } of ROUTE_TO_PERMISSION) {
    if (pathname.startsWith(prefix)) return key
  }
  return null
}

export function hasPermission(permissions, role, pathname) {
  if (role === 'owner' || permissions.includes('*')) return true

  const key = getRoutePermissionKey(pathname)
  if (!key) return false

  return permissions.includes(key)
}
