'use client'

import { GlobalContext } from '@/app/context/Context';
import Breadcrumb from '@/components/Breadcrumb';
import CheckOut from '@/components/CheckOut';
import Footer from '@/components/Footer';
import Loader from '@/components/Loader';
import RenderProducts from '@/components/RenderProducts';
import { useFetchSingleProduct } from '@/components/useFetchSingleProduct';
import { ArrowRight, Minus, Plus, ShoppingCart, Van, XIcon } from 'lucide-react';
import Link from 'next/link';
import React, { useContext, useEffect, useRef, useState } from 'react'
import Image from 'next/image';

function ProductPage({ params }) {
    const { id } = React.use(params)
    const { Cart, setCart } = useContext(GlobalContext)
    const { data: product, isLoading: loading, error } = useFetchSingleProduct(`/api/shop/products/${id}`);
    const category_id = product?.categories?.[0]?.id
    const { data: relatedProducts, isLoading: loading2 } = useFetchSingleProduct(
        category_id ? `/api/shop/products/category/${category_id}` : null,
        { enabled: !!category_id }
    );
    
    const [currentImage, setCurrentImage] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [quantity, setQuantity] = useState(1)
    const modalRef = useRef(null);
    const date = new Date();
    const today = date.getDate()
    const deliveryDate = new Date(date.setDate(date.getDate() + 7));
    const ArriveDay = deliveryDate.getDate();
    const month = deliveryDate.toLocaleString('default', { month: 'long' });
    const year = deliveryDate.getFullYear();
    const [PriceWithDiscount, setPriceWithDiscount] = useState(0)

    useEffect(() => {
        if (product) {
            setCurrentImage(product.images[0])
            setPriceWithDiscount(product.discount_percentage > 0 ? product.price - (product.price * product.discount_percentage / 100) : product.price)
        }
    }, [product])

    // Full size image modal handlers
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                setIsModalOpen(false);
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') setIsModalOpen(false);
        };

        if (isModalOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isModalOpen]);

    function handleAddToCart(product) {
        setCart(prevCart => {
            const newCart = [...prevCart, product];
            localStorage.setItem('Cart', JSON.stringify(newCart));
            return newCart;
        });
    }

    function handleRemoveFromCart(productId) {
        setCart(prevCart => {
            const newCart = prevCart.filter(item => item.id !== productId);
            localStorage.setItem('Cart', JSON.stringify(newCart));
            return newCart;
        });
    }

    if (loading) return <div className='w-full h-dvh flex items-center justify-center text-xl'><Loader/></div>;
    if (error) return <div className='w-full h-dvh flex items-center justify-center text-red-500 text-xl'>Error: {error}</div>;
    if (!product) return <div className='w-full h-dvh flex items-center justify-center text-xl'>Product not found</div>;

    return (
        <>
            <main className='pt-24 lg:pt-30 px-4 lg:px-20 w-full overflow-x-hidden'>
                <Breadcrumb />
                
                {/* Product Details Section */}
                <section className='w-full h-fit mb-12 lg:mb-20 flex flex-col lg:flex-row justify-between items-start gap-8 lg:gap-12 px-4 lg:px-6 py-6 lg:py-8 bg-white border lg:border-2 mt-6 lg:mt-8 border-stroke rounded-xl'>
                    
                    {/* Left Column - Images */}
                    <div className='w-full lg:w-1/2 flex flex-col items-start gap-4'>
                        {/* Main Image */}
                        <div 
                            onClick={() => setIsModalOpen(true)} 
                            className='relative cursor-pointer border w-full h-64 sm:h-80 lg:h-[420px] flex items-center bg-stroke/50 justify-center overflow-hidden border-stroke rounded-lg group'
                        >
                            <Image 
                                src={currentImage || product?.images[0]} 
                                alt={product.name}
                                fill
                                className='object-contain bg-white'
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                priority
                            />
                            <div className='absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center'>
                                <span className='text-white font-medium bg-black/60 px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity'>
                                    Click to view full size
                                </span>
                            </div>
                            
                            {/* Discount Badge */}
                            {product.discount_percentage > 0 && (
                                <div className='discount bg-primary absolute top-2 right-2 px-0.5 rounded-full'>
                                    <p className='text-white text-xs px-2 py-1'>-{product.discount_percentage}%</p>
                                </div>
                            )}
                        </div>

                        {/* Thumbnail Images */}
                        <div className='flex gap-2 lg:gap-4 flex-wrap w-full overflow-x-auto pb-2'>
                            {product.images.map((image, index) => (
                                <button
                                    key={image}
                                    onClick={() => setCurrentImage(image)}
                                    className={`border flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 m-1 lg:h-24 flex items-center justify-center overflow-hidden border-stroke rounded-lg transition-all ${currentImage === image ? 'ring-2 ring-primary' : 'hover:border-primary'}`}
                                >
                                    <Image 
                                        src={image} 
                                        alt={`${product.name} - view ${index + 1}`}
                                        width={96}
                                        height={96}
                                        className='object-contain hover:scale-110 transition-transform duration-300'
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Column - Product Info */}
                    <div className='w-full lg:w-1/2 h-fit flex flex-col items-start gap-3 lg:gap-4'>
                        <h2 className='text-xl lg:text-2xl font-bold'>{product.name}</h2>

                        <p className='text-secondary text-sm lg:text-base'>
                            Category:
                            <span className='ml-2 text-black'>
                                {product.categories.map(cat => cat.name).join(' | ')}
                            </span>
                        </p>

                        {/* Price */}
                        {PriceWithDiscount < product.price ? (
                            <p className="text-gray-600">
                                <span className='line-through text-secondary text-base lg:text-lg'>
                                    {product.price}DA
                                </span>
                                <span className='text-primary text-xl lg:text-2xl font-semibold ml-2'>
                                    {Math.round(PriceWithDiscount)}DA
                                </span>
                            </p>
                        ) : (
                            <p className="text-primary text-xl lg:text-2xl font-semibold">
                                {product.price}DA
                            </p>
                        )}

                        {/* Stock Status */}
                        {product.is_active ? (
                            <p className='bg-[#B2F9B0] text-[#3FD125] px-2.5 py-1 text-sm font-medium rounded-full'>
                                In Stock
                            </p>
                        ) : (
                            <p className='bg-red-300 text-red-600 px-2.5 py-1 text-sm font-medium rounded-full'>
                                Out of Stock
                            </p>
                        )}

                        {/* Description */}
                        <p className='font-semibold text-sm lg:text-base'>Description:</p>
                        <p className='text-gray-600 text-sm lg:text-base leading-relaxed'>
                            {product.description}
                        </p>

                        {/* Delivery Info */}
                        <div className='flex items-start w-full bg-stroke/30 h-fit border lg:border-2 rounded-xl p-3 lg:p-4 gap-3 lg:gap-4 border-stroke'>
                            <Van className='text-primary flex-shrink-0' size={20} />
                            <div>
                                <h4 className='font-semibold text-sm lg:text-base'>Estimated Delivery</h4>
                                <p className='text-secondary text-xs lg:text-sm'>
                                    {month.slice(0, 3)} {today} - {month.slice(0, 3)} {ArriveDay}, {year}
                                </p>
                            </div>
                        </div>

                        {/* Quantity */}
                        <h3 className='text-sm lg:text-base font-medium'>Quantity</h3>
                        <div className='w-full gap-3 lg:gap-6 flex flex-col sm:flex-row items-stretch sm:items-center'>
                            {/* Quantity Selector */}
                            <div className='flex gap-2 lg:gap-3 px-3 lg:px-4 py-2 border border-stroke rounded-full w-fit'>
                                <button 
                                    onClick={() => quantity > 1 && setQuantity(q => q - 1)} 
                                    className='cursor-pointer hover:bg-primary/80 hover:text-white rounded-full p-1 transition-colors'
                                    disabled={quantity <= 1}
                                >
                                    <Minus size={18} />
                                </button>
                                <p className='min-w-[20px] text-center'>{quantity}</p>
                                <button 
                                    onClick={() => setQuantity(q => q + 1)} 
                                    className='cursor-pointer hover:bg-primary/80 hover:text-white rounded-full p-1 transition-colors'
                                >
                                    <Plus size={18} />
                                </button>
                            </div>

                            {/* Add to Cart Button */}
                            {Cart.find(item => item.id === product.id) ? (
                                <button 
                                    onClick={() => handleRemoveFromCart(product.id)} 
                                    className='border flex items-center justify-center gap-2 font-medium cursor-pointer border-stroke py-2.5 rounded-full bg-white w-full sm:flex-1 hover:bg-red-50 transition-colors text-sm lg:text-base'
                                >
                                    <ShoppingCart size={18} />
                                    Remove From Cart
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleAddToCart(product)} 
                                    className='border flex items-center justify-center gap-2 font-medium cursor-pointer border-stroke py-2.5 rounded-full bg-white w-full sm:flex-1 hover:bg-primary/5 transition-colors text-sm lg:text-base'
                                >
                                    <ShoppingCart size={18} />
                                    Add To Cart
                                </button>
                            )}
                        </div>

                        {/* Buy Now Button */}
                        <a 
                            href="#form" 
                            className='w-full bg-primary text-white flex items-center justify-center py-3 rounded-full cursor-pointer hover:bg-red-600 transition-colors text-sm lg:text-base font-medium'
                        >
                            Buy Now
                        </a>

                        {/* Checkout Form */}
                        <div className="w-full">
                            <CheckOut 
                                productPrice={PriceWithDiscount} 
                                Quantity={quantity} 
                                setQuantity={setQuantity} 
                                productId={product.id} 
                                colors={product.colors} 
                            />
                        </div>
                    </div>
                </section>

                {/* Related Products Section */}
                <section className='Related-Products w-full mb-12 lg:mb-16 px-0 lg:px-0'>
                    <div className='w-full flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 lg:mb-12 gap-4'>
                        <h2 className='text-xl lg:text-2xl font-semibold'>Related Products</h2>
                        <Link
                            href={`/products/All?category=${product.categories?.[0]?.name || ''}`}
                            className='text-[#3B65FA] flex items-center gap-1 cursor-pointer hover:underline w-fit text-sm lg:text-base'
                        >
                            View All
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                    <div className='w-full'>
                        <RenderProducts 
                            Products={relatedProducts} 
                            Class={'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'} 
                        />
                    </div>
                </section>

                {/* Fullscreen Image Modal */}
                {isModalOpen && (
                    <div className='fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4'>
                        <div ref={modalRef} className='relative w-full max-w-4xl max-h-full flex items-center justify-center'>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className='absolute -top-12 right-0 lg:-top-4 lg:-right-12 p-2 text-white hover:bg-white/10 rounded-full transition-colors'
                            >
                                <XIcon size={28} />
                            </button>
                            <Image
                                src={currentImage}
                                alt="Full size"
                                width={800}
                                height={800}
                                className='max-w-full max-h-[80vh] lg:max-h-[90vh] object-contain rounded-lg'
                                priority
                            />
                        </div>
                    </div>
                )}
            </main>
        </>
    )
}

export default ProductPage