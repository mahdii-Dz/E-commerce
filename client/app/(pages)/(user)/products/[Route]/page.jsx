import { notFound } from 'next/navigation';
import ProductsClient from './ProductsClient';
import { getCategories, getFilteredProducts } from '@/lib/server-fetch';

const ROUTE_LABELS = {
  All: 'جميع المنتجات',
  Promotions: 'منتجات عليها تخفيض',
  Newest: 'منتجات جديدة',
  TopSold: 'الأكثر مبيعًا',
  BestDeal: 'أفضل العروض',
};

const SPECIAL_ROUTES = ['All', 'Newest', 'Promotions', 'TopSold', 'BestDeal'];

export const revalidate = 60;

export async function generateMetadata({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const routeLabel = ROUTE_LABELS[resolvedParams.Route] || 'المنتجات';
  const category = resolvedSearchParams.category;
  const price = resolvedSearchParams.price;
  
  let title = routeLabel;
  if (category) title = `${category} - ${title}`;
  if (price) title = `${price} - ${title}`;
  
  return {
    title,
    description: `تصفح ${title} في متجرنا`,
  };
}

function parsePriceRange(price) {
  if (!price || price === 'AllPrices') return { minPrice: null, maxPrice: null };
  const [min, max] = price.split('-').map(Number);
  return { minPrice: min, maxPrice: max };
}

function getRouteParams(route, searchParams) {
  const params = {
    category: null,
    minPrice: null,
    maxPrice: null,
    minDiscount: null,
    sort: 'Newest',
  };

  switch (route) {
    case 'All':
      break;
    case 'Newest':
      params.sort = 'Newest';
      break;
    case 'Promotions':
      params.minDiscount = 1;
      break;
    case 'TopSold':
      params.sort = 'TopSold';
      break;
    case 'BestDeal':
      params.minPrice = 0;
      params.maxPrice = 2500;
      break;
    default:
      params.category = route;
  }

  if (searchParams.category) params.category = searchParams.category;
  if (searchParams.price) {
    const { minPrice, maxPrice } = parsePriceRange(searchParams.price);
    if (minPrice !== null) params.minPrice = minPrice;
    if (maxPrice !== null) params.maxPrice = maxPrice;
  }
  if (searchParams.sort) params.sort = searchParams.sort;

  return params;
}

function getInitialFilter(route, searchParams) {
  const filter = {
    category: 'AllCategories',
    price: 'AllPrices',
    sort: 'Newest',
    type: 'AllTypes',
  };

  switch (route) {
    case 'Promotions':
      filter.type = 'Promotions';
      break;
    case 'BestDeal':
      filter.price = '0-2500';
      break;
    case 'TopSold':
      filter.sort = 'TopSold';
      break;
    case 'Newest':
      filter.sort = 'Newest';
      break;
    default:
      if (!SPECIAL_ROUTES.includes(route)) {
        filter.category = route;
      }
  }

  if (searchParams.category) filter.category = searchParams.category;
  if (searchParams.price) filter.price = searchParams.price;
  if (searchParams.sort) filter.sort = searchParams.sort;

  return filter;
}

export default async function ProductsPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  try {
    const routeParams = getRouteParams(resolvedParams.Route, resolvedSearchParams);

    const [categories, productsData] = await Promise.all([
      getCategories(),
      getFilteredProducts({
        category: routeParams.category,
        minPrice: routeParams.minPrice,
        maxPrice: routeParams.maxPrice,
        minDiscount: routeParams.minDiscount,
        sort: routeParams.sort,
        page: parseInt(resolvedSearchParams.page || '1', 10),
        limit: 12,
      }),
    ]);

    const routeLabel = ROUTE_LABELS[resolvedParams.Route] || 'المنتجات';
    const initialFilter = getInitialFilter(resolvedParams.Route, resolvedSearchParams);

    return <ProductsClient 
      categories={categories} 
      productsData={productsData}
      route={resolvedParams.Route}
      routeLabel={routeLabel}
      initialFilter={initialFilter}
      searchParams={resolvedSearchParams}
    />;
  } catch (error) {
    console.error('Products page error:', error);
    notFound();
  }
}
