'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Breadcrumb from '@/components/Breadcrumb';
import Loader from '@/components/Loader';
import RenderProducts from '@/components/RenderProducts';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useContext, useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

export default function ProductsClient({ 
  categories, 
  productsData, 
  route, 
  routeLabel, 
  initialFilter, 
  searchParams 
}) {
  const router = useRouter();
  const searchParamsClient = useSearchParams();
  const [filter, setFilter] = useState(initialFilter);
  const [routerFilter, setRouterFilter] = useState(routeLabel);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [page, setPage] = useState(parseInt(searchParamsClient.get('page') || '1', 10));

  // Pagination state
  const productsPerPage = 12;
  const [visibleProducts, setVisibleProducts] = useState([]);
  const [loadedPages, setLoadedPages] = useState(1);
  const [allLoadedProducts, setAllLoadedProducts] = useState([]);
  const sentinelRef = useRef(null);

  // Server-side data from props (initial load)
  const initialProducts = productsData?.products || productsData || [];
  const totalPages = productsData?.totalPages || 1;
  const totalProducts = productsData?.total || initialProducts.length;

  // Accumulate products as pages are fetched
  useEffect(() => {
    if (page === 1) {
      setAllLoadedProducts(initialProducts);
    }
  }, [initialProducts, page]);

  // Fetch additional pages client-side
  const { data: pageData, isLoading: isLoadingPage } = useQuery({
    queryKey: ['products', filter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter.category !== 'AllCategories') params.set('category', filter.category);
      if (filter.price !== 'AllPrices') {
        const [min, max] = filter.price.split('-').map(Number);
        params.set('minPrice', min.toString());
        params.set('maxPrice', max.toString());
      }
      if (filter.sort !== 'Newest') params.set('sort', filter.sort);
      params.set('page', page.toString());
      params.set('limit', productsPerPage.toString());
      
      const res = await fetch(`/api/shop/products?${params}`);
      return res.json();
    },
    enabled: page > 1,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  // Append newly fetched page data
  useEffect(() => {
    if (page > 1 && pageData?.products) {
      setAllLoadedProducts(prev => [...prev, ...pageData.products]);
    }
  }, [page, pageData]);

  // Apply client-side filter for 'type' (Promotions) since backend doesn't support it yet
  const filteredProducts = filter.type === 'Promotions' 
    ? allLoadedProducts.filter(p => p.discount_percentage > 0)
    : allLoadedProducts;

  useEffect(() => {
    setVisibleProducts(filteredProducts.slice(0, productsPerPage));
    setLoadedPages(1);
  }, [filteredProducts, page]);

  useEffect(() => {
    setRouterFilter(routeLabel);
  }, [routeLabel]);

  const loadMoreProducts = () => {
    const nextPage = loadedPages + 1;
    const newVisibleCount = nextPage * productsPerPage;
    const newVisible = filteredProducts.slice(0, newVisibleCount);
    setVisibleProducts(newVisible);
    setLoadedPages(nextPage);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleProducts.length < filteredProducts.length) {
          loadMoreProducts();
        }
      },
      { threshold: 1.0 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, [visibleProducts.length, filteredProducts.length]);

  function ResetFilter() {
    setFilter({
      category: 'AllCategories',
      price: 'AllPrices',
      sort: 'Newest',
      type: 'AllTypes'
    });
  }

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParamsClient);
    if (value === 'AllCategories' || value === 'AllPrices' || value === 'Newest') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set('page', '1');
    setFilter(prev => ({ ...prev, [key]: value }));
    router.replace(`/products/${route}?${params}`, { scroll: false });
  };

  const goToPage = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter sidebar content (reusable for desktop and mobile)
  const FilterContent = () => (
    <div className='w-full text-right'>
      <div className='flex justify-between items-center lg:mb-0 mb-4'>
        <h2 className='text-lg font-semibold'>الفلاتر</h2>
        <button 
          onClick={() => setIsMobileFilterOpen(false)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className='w-full mt-4'>
        <h3 className='mb-3 text-sm font-medium'>الفئة</h3>
        <Select dir="rtl" value={filter.category} onValueChange={(value) => updateFilter('category', value)}>
          <SelectTrigger className="w-full h-10!">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value='AllCategories' className="text-right">جميع الفئات</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.name} className="text-right">{cat.name}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className='w-full mt-4'>
        <h3 className='mb-3 text-sm font-medium'>نطاق السعر</h3>
        <Select dir="rtl" value={filter.price} onValueChange={(value) => updateFilter('price', value)}>
          <SelectTrigger className="w-full h-10!">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value='AllPrices' className="text-right">جميع الأسعار</SelectItem>
              <SelectItem value='0-2500' className="text-right">0 - 2500</SelectItem>
              <SelectItem value='2500-5000' className="text-right">2500 - 5000</SelectItem>
              <SelectItem value='5000-10000' className="text-right">5000 - 10,000</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className='w-full mt-4'>
        <h3 className='mb-3 text-sm font-medium'>ترتيب حسب</h3>
        <Select dir="rtl" value={filter.sort} onValueChange={(value) => updateFilter('sort', value)}>
          <SelectTrigger className="w-full h-10!">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value='Newest' className="text-right">الأحدث أولاً</SelectItem>
              <SelectItem value='Oldest' className="text-right">الأقدم أولاً</SelectItem>
              <SelectItem value='TopSold' className="text-right">الأكثر مبيعاً</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <button 
        onClick={() => {
          ResetFilter();
          const params = new URLSearchParams(searchParamsClient);
          params.delete('category');
          params.delete('price');
          params.delete('sort');
          params.delete('page');
          router.replace(`/products/${route}${params.toString() ? `?${params}` : ''}`, { scroll: false });
        }}
        className='w-full mt-6 px-4 py-2 rounded-lg cursor-pointer border-[1.5px] border-primary hover:bg-primary hover:text-white transition-colors text-sm lg:hidden'
      >
        إعادة ضبط جميع الفلاتر
      </button>
    </div>
  );

  return (
    <div className="pt-24 lg:pt-30 px-4 lg:px-20 w-full h-auto min-h-screen overflow-x-hidden">
      <Breadcrumb />
      
      {/* Header Section */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6'>
        <div className="text-right">
          <h1 className="text-xl lg:text-2xl font-bold capitalize">{routerFilter}</h1>
          <p className='text-secondary mt-1 text-sm'>
            {filteredProducts.length === 0
              ? 'لم يتم العثور على منتجات'
              : `عرض ${visibleProducts.length} من ${totalProducts} منتج${totalProducts !== 1 ? 'ات' : ''}`
            }
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Mobile Filter Toggle */}
          <button 
            onClick={() => setIsMobileFilterOpen(true)}
            className='lg:hidden flex items-center gap-2 px-4 py-2 rounded-lg border border-stroke hover:bg-gray-50 transition-colors'
          >
            <SlidersHorizontal size={18} />
            الفلاتر
          </button>
          
          <button 
            onClick={() => {
              ResetFilter();
              const params = new URLSearchParams(searchParamsClient);
              params.delete('category');
              params.delete('price');
              params.delete('sort');
              params.delete('page');
              router.replace(`/products/${route}${params.toString() ? `?${params}` : ''}`, { scroll: false });
            }}
            className='hidden sm:block px-6 lg:px-9 py-2 rounded-lg cursor-pointer border-[1.5px] border-primary hover:bg-primary hover:text-white transition-colors text-sm whitespace-nowrap'
          >
            إعادة ضبط جميع الفلاتر
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className='w-full h-auto flex flex-col lg:flex-row mt-6 gap-6'>
        {/* Desktop Sidebar */}
        <aside className='hidden lg:block bg-white border border-stroke w-1/4 rounded-xl p-6 h-fit sticky top-32'>
          <FilterContent />
        </aside>

        {/* Mobile Filter Overlay */}
        {isMobileFilterOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsMobileFilterOpen(false)}
          />
        )}

        {/* Mobile Filter Sidebar */}
        <aside className={`
          lg:hidden fixed top-0 right-0 h-full w-72 bg-white border-l border-stroke z-50 p-6 transform transition-transform duration-300 ease-in-out
          ${isMobileFilterOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
          <FilterContent />
        </aside>

        {/* Products Grid */}
        <div className='w-full lg:w-3/4'>
          {(isLoadingPage && page > 1) || (!productsData && page === 1) ? (
            <div className="w-full grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col bg-neutral-200 w-full h-80 sm:h-96 animate-pulse rounded-xl p-3 sm:p-4 gap-3 sm:gap-4"
                >
                  <div className="bg-neutral-300/50 w-full h-32 sm:h-40 animate-pulse rounded-md"></div>
                  <div className="flex flex-col gap-2">
                    <div className="bg-neutral-300/50 w-full h-3 sm:h-4 animate-pulse rounded-md"></div>
                    <div className="bg-neutral-300/50 w-4/5 h-3 sm:h-4 animate-pulse rounded-md"></div>
                    <div className="bg-neutral-300/50 w-full h-3 sm:h-4 animate-pulse rounded-md"></div>
                    <div className="bg-neutral-300/50 w-2/4 h-3 sm:h-4 animate-pulse rounded-md"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <RenderProducts Products={visibleProducts} />
          )}

          {/* Infinite Scroll Sentinel (for client-side pagination) */}
          {((page === 1 && visibleProducts.length < filteredProducts.length) || 
            (page > 1 && pageData && visibleProducts.length < (page * productsPerPage))) && (
            <div
              ref={sentinelRef}
              className="h-20 w-full flex items-center justify-center mt-8"
            >
              <Loader />
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border border-stroke rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                السابق
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                صفحة {page} من {totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="px-4 py-2 border border-stroke rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>
          )}

          {/* End Message */}
          {(visibleProducts.length === filteredProducts.length && filteredProducts.length !== 0 && page === 1) && (
            <div className='w-full flex items-center justify-center mt-8 mb-8 text-secondary px-4'>
              <p className='text-center text-sm'>
                لقد رأيت كل شيء! لا توجد منتجات أخرى لعرضها.<br />
                عرض جميع المنتجات ({visibleProducts.length})
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}