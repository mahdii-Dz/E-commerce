const BACKEND_URL = process.env.BACKEND_URL;
const INTERNAL_SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASS;

function buildHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (INTERNAL_SECRET) {
    headers['Authorization'] = `Bearer ${INTERNAL_SECRET}`;
  }

  return headers;
}

async function fetchWithFallback(url, fallback, options = {}) {
  if (!BACKEND_URL) {
    console.warn('⚠️ BACKEND_URL not configured, using fallback');
    return fallback;
  }

  try {
    const res = await fetch(url, {
      headers: buildHeaders(),
      ...options,
    });

    if (!res.ok) {
      console.warn(`⚠️ Backend returned ${res.status} for ${url}, using fallback`);
      return fallback;
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.warn(`⚠️ Backend fetch failed for ${url}: ${error.message}, using fallback`);
    return fallback;
  }
}

export async function getProducts() {
  const data = await fetchWithFallback(
    `${BACKEND_URL}/api/shop/get-products?limit=100`,
    [],
    { next: { revalidate: 300 } }
  );
  return Array.isArray(data) ? data : (data.products || []);
}

export async function getProduct(id) {
  const data = await fetchWithFallback(
    `${BACKEND_URL}/api/shop/get-product/${id}`,
    null,
    { next: { revalidate: 3600 } }
  );
  return data;
}

export async function getCategories() {
  const data = await fetchWithFallback(
    `${BACKEND_URL}/api/shop/get-categories`,
    [],
    { next: { revalidate: 3600 } }
  );
  return Array.isArray(data) ? data : (data.categories || []);
}

export async function getPromotions() {
  const data = await fetchWithFallback(
    `${BACKEND_URL}/api/shop/get-products?limit=100`,
    [],
    { next: { revalidate: 300 } }
  );
  const products = Array.isArray(data) ? data : (data.products || []);
  return products.filter(product => product.discount_percentage > 0);
}

export async function getBanners() {
  const data = await fetchWithFallback(
    `${BACKEND_URL}/api/shop/get-banners`,
    { success: true, banners: [] },
    { next: { revalidate: 3600 } }
  );
  return data;
}

export async function getFilteredProducts({ category, minPrice, maxPrice, minDiscount, sort, page = 1, limit = 12 }) {
  const params = new URLSearchParams();
  
  if (category && category !== 'AllCategories') {
    params.set('category', category);
  }
  if (minPrice !== null && minPrice !== undefined) {
    params.set('minPrice', minPrice);
  }
  if (maxPrice !== null && maxPrice !== undefined) {
    params.set('maxPrice', maxPrice);
  }
  if (minDiscount) {
    params.set('minDiscount', minDiscount);
  }
  if (sort && sort !== 'Newest') {
    params.set('sort', sort);
  }
  params.set('page', page.toString());
  params.set('limit', limit.toString());

  const fallback = { products: [], total: 0, page, totalPages: 1 };
  const data = await fetchWithFallback(
    `${BACKEND_URL}/api/shop/get-products?${params}`,
    fallback,
    { next: { revalidate: 60 } }
  );

  return Array.isArray(data)
    ? { products: data, total: data.length, page, totalPages: 1 }
    : data;
}
