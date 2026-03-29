'use client';

import { GlobalContext } from '@/app/context/Context';
import Breadcrumb from '@/components/Breadcrumb';
import Footer from '@/components/Footer';
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
import { useFetchAllProducts } from '@/components/useFetchAllProducts';
import { useContext, useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

export default function ProductFilterPage({ params, searchParams }) {
    const { data: categories, isLoading: loading, error } = useFetchAllProducts('/api/shop/categories')
    const { Products } = useContext(GlobalContext)
    const [filteredProducts, setFilteredProducts] = useState([])
    const [visibleProducts, setVisibleProducts] = useState([]);
    const [filter, setFilter] = useState({
        category: 'AllCategories',
        price: 'AllPrices',
        sort: 'Newest',
        type: 'AllTypes'
    })
    const [routerFilter, setRouterFilter] = useState('All Products')
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    // Pagination state
    const productsPerPage = 12;
    const [loadedPages, setLoadedPages] = useState(1);
    const sentinelRef = useRef(null);

    useEffect(() => {
        async function fetchFilter() {
            const { Route } = await params
            const { category } = await searchParams
            if (category) {
                setFilter(prev => ({ ...prev, category: category }))
            }
            setRouterFilter(Route)
            if (Route === 'Promotions') {
                setFilter(prev => ({ ...prev, type: 'Promotions' }))
            }
            if (Route === 'BestDeal') {
                setFilter(prev => ({ ...prev, price: '0-2500' }))
            }
        }
        fetchFilter()
    }, [params, searchParams])

    useEffect(() => {
        function applyFilters() {
            if (!Array.isArray(Products)) {
                setFilteredProducts([]);
                return;
            }
            let updatedProducts = [...Products];
            
            if (filter.category !== 'AllCategories') {
                updatedProducts = updatedProducts.filter((product) => 
                    product.categories?.map(category => category.name).includes(filter.category)
                );
            }
            
            if (filter.price !== 'AllPrices') {
                const [min, max] = filter.price.split('-').map(Number);
                updatedProducts = updatedProducts.filter((product) => {
                    const finalPrice = product.discount_percentage > 0
                        ? product.price - (product.price * product.discount_percentage / 100)
                        : product.price;
                    return finalPrice >= min && finalPrice <= max;
                })
            }
            
            if (filter.type !== 'AllTypes') {
                updatedProducts = updatedProducts.filter((product) => 
                    product.type === filter.type || product.discount_percentage > 0
                )
            }
            
            if (filter.sort === 'Newest') {
                updatedProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else if (filter.sort === 'Oldest') {
                updatedProducts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            }
            
            setFilteredProducts(updatedProducts);
            setVisibleProducts(updatedProducts.slice(0, productsPerPage));
            setLoadedPages(1);
        }
        applyFilters();
    }, [filter, Products]);

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
        })
    }

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
                <Select dir="rtl" value={filter.category} onValueChange={(value) => setFilter({ ...filter, category: value })}>
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
                <Select dir="rtl" value={filter.price} onValueChange={(value) => setFilter({ ...filter, price: value })}>
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
                <Select dir="rtl" value={filter.sort} onValueChange={(value) => setFilter({ ...filter, sort: value })}>
                    <SelectTrigger className="w-full h-10!">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem value='Newest' className="text-right">الأحدث أولاً</SelectItem>
                            <SelectItem value='Oldest' className="text-right">الأقدم أولاً</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>

            <button 
                onClick={() => {
                    ResetFilter();
                    setIsMobileFilterOpen(false);
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
                    <h1 className="text-xl lg:text-2xl font-bold capitalize">{routerFilter === 'All' ? 'جميع المنتجات' : routerFilter === 'Promotions' ? 'منتجات عليها تخفيض' : routerFilter === 'Newest' ? 'منتجات جديدة' : routerFilter === 'TopSold' ? 'الأكثر مبيعًا' : routerFilter === "BestDeal" ? 'أفضل العروض' : ''}</h1>
                    <p className='text-secondary mt-1 text-sm'>
                        {filteredProducts.length === 0
                            ? 'لم يتم العثور على منتجات'
                            : `عرض ${visibleProducts.length} من ${filteredProducts.length} منتج${filteredProducts.length !== 1 ? 'ات' : ''}`
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
                        onClick={ResetFilter}
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
                    <RenderProducts Products={visibleProducts} />

                    {/* Infinite Scroll Sentinel */}
                    {visibleProducts.length < filteredProducts.length && (
                        <div
                            ref={sentinelRef}
                            className="h-20 w-full flex items-center justify-center mt-8"
                        >
                            <Loader />
                        </div>
                    )}
                </div>
            </div>

            {/* End Message */}
            {(visibleProducts.length === filteredProducts.length && filteredProducts.length !== 0) && (
                <div className='w-full flex items-center justify-center mt-8 mb-8 text-secondary px-4'>
                    <p className='text-center text-sm'>
                        لقد رأيت كل شيء! لا توجد منتجات أخرى لعرضها.<br />
                        عرض جميع المنتجات ({visibleProducts.length})
                    </p>
                </div>
            )}

        </div>
    );
}