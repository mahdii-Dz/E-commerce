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
import { useContext, useEffect, useState } from 'react';

export default function ProductFilterPage({ params,searchParams }) {
    const { Products, } = useContext(GlobalContext)
    const [filteredProducts, setFilteredProducts] = useState([])
    const [filter, setFilter] = useState({
        category: 'AllCategories',
        price: 'AllPrices',
        sort: 'Newest',
        type: 'AllTypes'
    })
    const [routerFilter, setRouterFilter] = useState('All Products')
    const [categories, setCategories] = useState([])
    const [currentPage, setCurrentPage] = useState([])
    const Product_per_page = 12;
    const TotalPages = Math.ceil(filteredProducts.length / Product_per_page);
    const startIndex = (currentPage - 1) * Product_per_page;
    const paginatedData = filteredProducts.slice(startIndex, startIndex + Product_per_page);

    // useEffect(() => {
    //     setCurrentPage(1);
    // }, [filter]);

    useEffect(() => {
        async function fetchFilter() {
            const { Route } = await params
            const {category} = await searchParams
            if (category){
                setFilter({...filter,category:category})
            }
            setRouterFilter(Route)
            if(Route === 'Promotions'){
                setFilter({...filter,type:'Promotions'})
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
            if(filter.type !== 'AllTypes'){
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
        }
        applyFilters();
    }, [filter, Products]);


    return (
        <div className="p-6 mt-24 px-20 w-full h-auto">
            <Breadcrumb />
            <div>
                <h1 className="mt-6 text-2xl font-bold">{routerFilter} Products</h1>
                <p className='text-secondary mt-1'>
                    {
                        filteredProducts.length === 0 ? 'No products found' :
                            filteredProducts.length < 12 ? `Showing ${filteredProducts.length} of ${filteredProducts.length} product` :
                                `Showing ${(startIndex + 1) * 12} of {filteredProducts.length} product`
                    }
                </p>
            </div>
            <div className='w-full h-auto flex mt-6 gap-6'>
                <aside className='bg-white border border-stroke w-1/5 rounded-xl p-6 flex flex-col justify-between items-start h-fit'>
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
                <RenderProducts Products={filteredProducts} />
            </div>
            <Footer />
        </div>
    );
}