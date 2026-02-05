'use client';
import { GlobalContext } from '@/app/context/Context';
import Breadcrumb from '@/components/Breadcrumb';
import Footer from '@/components/Footer';
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

export default function ProductFilterPage({ params, searchParams }) {
    const { Products, } = useContext(GlobalContext)
    const [filteredProducts, setFilteredProducts] = useState([])
    const [visibleProducts, setVisibleProducts] = useState([]);
    const [filter, setFilter] = useState({
        category: 'AllCategories',
        price: 'AllPrices',
        sort: 'Newest',
        type: 'AllTypes'
    })
    const [routerFilter, setRouterFilter] = useState('All Products')
    const [categories, setCategories] = useState([])

    // Pagination state
    const productsPerPage = 12;
    const [loadedPages, setLoadedPages] = useState(1);
    // Ref for the sentinel (trigger element at bottom)
    const sentinelRef = useRef(null);


    useEffect(() => {
        async function fetchFilter() {
            const { Route } = await params
            const { category } = await searchParams
            if (category) {
                setFilter({ ...filter, category: category })
            }
            setRouterFilter(Route)
            if (Route === 'Promotions') {
                setFilter({ ...filter, type: 'Promotions' })
            }
            if (Route === 'BestDeal') {
                setFilter({ ...filter, price: '0-2500' })
            }
            const data = await fetch('http://localhost:5000/api/shop/get-categories');
            const categories = await data.json();
            setCategories(categories);
        }
        fetchFilter()
    }, [params])

    useEffect(() => {

        function applyFilters() {
            if (!Array.isArray(Products)) {
                setFilteredProducts([]);
                return;
            }
            let updatedProducts = [...Products];
            if (filter.category !== 'AllCategories') {
                updatedProducts = updatedProducts.filter((Products) => Products.categories.map(category => category.name).includes(filter.category));
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
                updatedProducts = updatedProducts.filter((product) => product.type === filter.type || product.discount_percentage > 0)
            }
            if (filter.sort === 'Newest') {
                const sortedProducts = updatedProducts.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                updatedProducts = sortedProducts;
            } else if (filter.sort === 'Oldest') {
                const sortedProducts = updatedProducts.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                updatedProducts = sortedProducts;
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
            { threshold: 1.0 } // Trigger when 100% of sentinel is visible
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
            ...filter,
            category: 'AllCategories',
            price: 'AllPrices',
            sort: 'Newest',
        })
    }


    return (
        <div className="mt-30 px-20 w-full h-auto">
            <Breadcrumb />
            <div className='flex justify-between items-center'>
                <div>
                    <h1 className="mt-6 text-2xl font-bold">{routerFilter} Products</h1>
                    <p className='text-secondary mt-1'>
                        {
                            filteredProducts.length === 0
                                ? 'No products found'
                                : `Showing ${visibleProducts.length} of ${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''}`
                        }
                    </p>
                </div>
                <button onClick={() => ResetFilter()} className='px-9 py-2 rounded-lg cursor-pointer border-[1.5px] border-primary hover:bg-primary hover:text-white'>
                    Reset all filters
                </button>
            </div>
            <div className='w-full h-auto flex mt-6 gap-6'>
                <aside className='bg-white border border-stroke w-1/4 rounded-xl p-6 flex flex-col justify-between items-start h-fit'>
                    <div className='w-full'>
                        <h2 className='text-lg font-semibold'>Filters</h2>
                        <div className='w-full mt-4'>
                            <h3 className='mb-3'>Category</h3>
                            <Select value={filter.category} onValueChange={(value) => setFilter({ ...filter, category: value })}>
                                <SelectTrigger className="w-full !h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value='AllCategories'>All Categories</SelectItem>
                                        {
                                            categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                            ))
                                        }
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='w-full mt-4'>
                            <h3 className='mb-3'>Price Range</h3>
                            <Select value={filter.price} onValueChange={(value) => setFilter({ ...filter, price: value })}>
                                <SelectTrigger className="w-full !h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value='AllPrices'>All Prices</SelectItem>
                                        <SelectItem value='0-2500'>0 - 2500</SelectItem>
                                        <SelectItem value='2500-5000'>2500 - 5000</SelectItem>
                                        <SelectItem value='5000-10000'>5000 - 10,000</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='w-full mt-4'>
                            <h3 className='mb-3'>Sort By</h3>
                            <Select value={filter.sort} onValueChange={(value) => setFilter({ ...filter, sort: value })}>
                                <SelectTrigger className="w-full !h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value='Newest'>Newest First</SelectItem>
                                        <SelectItem value='Oldest'>Oldest First</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                    </div>
                </aside>
                <div className='w-3/4'>
                    <RenderProducts Products={visibleProducts} />

                    {/* 🕵️ Sentinel element for infinite scroll */}
                    {visibleProducts.length < filteredProducts.length && (
                        <div
                            ref={sentinelRef}
                            className="h-10 w-full flex items-center justify-center"
                        >
                            <span className="text-gray-500">Loading...</span>
                        </div>
                    )}
                </div>
            </div>
                {
                    (visibleProducts.length === filteredProducts.length && filteredProducts.length !== 0) && (
                        <div className='w-full flex items-center justify-center mt-8 text-secondary'>
                            <p className='text-center'>You&apos;ve seen it all! No more products to show.<br />
                            Showing all {visibleProducts.length} products</p>
                        </div>
                    )
                }
            <Footer />
        </div>
    );
}