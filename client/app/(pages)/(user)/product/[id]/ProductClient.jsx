'use client'

import { GlobalContext } from '@/app/context/Context';
import Breadcrumb from '@/components/Breadcrumb';
import CheckOut from '@/components/CheckOut';
import RenderProducts from '@/components/RenderProducts';
import ReviewsSection from '@/components/ReviewsSection';
import { ArrowRight, Check, Minus, Percent, Plus, ShoppingCart, Sparkles, Tag, Truck, Van, XIcon } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function ProductClient({ product, relatedProducts }) {
    const { Cart, setCart } = useContext(GlobalContext)
    const [currentImage, setCurrentImage] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false);
    const modalRef = useRef(null);
    const date = new Date();
    const today = date.getDate()
    const deliveryDate = new Date(date.setDate(date.getDate() + 2));
    const ArriveDay = deliveryDate.getDate();
    const month = deliveryDate.toLocaleString('default', { month: 'long' });
    const year = deliveryDate.getFullYear();
    const [PriceWithDiscount, setPriceWithDiscount] = useState(0)

    // Offers state
    const [offers, setOffers] = useState([]);
    const [selectedOffer, setSelectedOffer] = useState(null);

    // Find manually marked best offer
    const manualBestOffer = offers.find(o => o.isBestOffer);

    useEffect(() => {
        if (product) {
            setCurrentImage(product.images[0])
            setPriceWithDiscount(product.discount_percentage > 0 ? product.price - (product.price * product.discount_percentage / 100) : product.price)

            const effectivePrice = product.discount_percentage > 0
                ? product.price - (product.price * product.discount_percentage / 100)
                : product.price;

            const buyOneOffer = {
                quantity: 1,
                price: effectivePrice,
                savedMoney: product.price - effectivePrice,
                isBestOffer: false,
                freeDelivery: false,
            };
            const productOffers = product.offers && Array.isArray(product.offers) ? product.offers : [];
            const allOffers = [buyOneOffer, ...productOffers];
            setOffers(allOffers);

            setSelectedOffer(buyOneOffer);
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

    return (
        <>
            <main className='pt-24 lg:pt-30 px-4 lg:px-20 w-full --font-Rubik-sans'>
                <Breadcrumb />
                {/* Product Details Section */}
                <section className='w-full mb-12 lg:mb-20 px-4 lg:px-6 py-6 lg:py-8 mt-0 rounded-xl'>
                    <div className='lg:grid lg:grid-cols-2 lg:gap-12'>
                        {/* TOP CONTENT - title, price, description (left column in RTL) */}
                        <div className='flex flex-col items-start gap-3 lg:gap-4 text-right w-full lg:col-start-2 lg:col-end-3'>
                            <h2 className='text-3xl lg:text-4xl font-bold w-full'>{product.name}</h2>

                            <p className='text-secondary text-sm lg:text-base w-full'>
                                الفئة:
                                <span className='mr-2 text-black'>
                                    {product.categories.map(cat => cat.name).join(' | ')}
                                </span>
                            </p>

                            {/* Price */}
                            {PriceWithDiscount < product.price ? (
                                <div className="text-gray-600 w-full flex items-center justify-between gap-2">
                                    <div>
                                        <span className='text-primary text-2xl lg:text-3xl font-bold '>
                                            {Math.round(PriceWithDiscount)} دج
                                        </span>
                                        <span className='line-through text-secondary text-base lg:text-lg mr-2'>
                                            {product.price} دج
                                        </span>
                                    </div>
                                    {product.discount_percentage > 0 && (
                                        <div className='discount bg-primary flex justify-center items-center size-9 px-0.5 rounded-full'>
                                            <span className='text-white font-bold text-xs px-2 py-1'>{product.discount_percentage}%-</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-primary text-xl lg:text-2xl font-semibold w-full">
                                    {product.price} دج
                                </p>
                            )}

                            {/* Description */}
                            <p className='text-gray-600 text-sm lg:text-base leading-relaxed w-full'>
                                {product.description}
                            </p>

                            {/* Big Description — desktop only (left column) */}
                            {product.big_description && (
                                <div
                                    className='prose-content w-full mt-4 max-lg:hidden'
                                    dir="rtl"
                                    dangerouslySetInnerHTML={{ __html: product.big_description }}
                                />
                            )}
                        </div>

                        {/* IMAGES COLUMN - right after description on mobile, sticky right column on desktop spanning full height */}
                        <div className='w-full lg:sticky lg:top-24 self-start lg:row-start-1 lg:row-end-3 lg:col-start-1 lg:col-end-2 mt-6 lg:mt-0'>
                            {/* Main Image */}
                            <div className='relative w-full bg-stroke/50 border border-stroke rounded-lg overflow-hidden'>
                                <img
                                    src={currentImage || product?.images[0]}
                                    alt={product.name}
                                    className='w-full object-contain bg-white max-h-[500px]'
                                    onClick={() => setIsModalOpen(true)}
                                />
                                <div
                                    onClick={() => setIsModalOpen(true)}
                                    className='absolute inset-0 bg-black/0 hover:bg-black/30 transition-all duration-300 flex items-center justify-center cursor-pointer'
                                >
                                    <span className='text-white font-medium bg-black/60 px-4 py-2 rounded-lg opacity-0 hover:opacity-100 transition-opacity'>
                                        انقر لعرض الحجم الكامل
                                    </span>
                                </div>
                                {product.discount_percentage > 0 && (
                                    <div className='discount bg-primary absolute top-2 right-2 px-0.5 rounded-full'>
                                        <p className='text-white text-xs px-2 py-1'>-{product.discount_percentage}%</p>
                                    </div>
                                )}
                            </div>

                            {/* Thumbnail Images */}
                            <div className='flex gap-2 lg:gap-4 flex-wrap w-full overflow-x-auto pb-2 mt-4'>
                                {product.images.map((image, index) => (
                                    <button
                                        key={image}
                                        onClick={() => setCurrentImage(image)}
                                        className={`border flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 m-1 lg:h-24 flex items-center justify-center overflow-hidden border-stroke rounded-lg transition-all ${currentImage === image ? 'ring-2 ring-primary' : 'hover:border-primary'}`}
                                    >
                                        <Image
                                            src={image}
                                            alt={`${product.name} - عرض ${index + 1}`}
                                            width={96}
                                            height={96}
                                            className='object-contain hover:scale-110 transition-transform duration-300'
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Big Description — mobile only (after images) */}
                        {product.big_description && (
                            <div
                                className='prose-content w-full mt-4 lg:hidden'
                                dir="rtl"
                                dangerouslySetInnerHTML={{ __html: product.big_description }}
                            />
                        )}

                        {/* BOTTOM CONTENT - delivery, cart, offers, checkout (left column in RTL) */}
                        <div className='flex flex-col items-start gap-3 lg:gap-4 text-right w-full mt-6 lg:mt-0 lg:col-start-2 lg:col-end-3'>
                            {/* Delivery Info */}
                            <div className='flex items-start w-full bg-stroke/30 h-fit border lg:border-2 rounded-xl p-3 lg:p-4 gap-3 lg:gap-4 border-stroke'>
                                <Van className='text-primary flex-shrink-0' size={20} />
                                <div>
                                    <h4 className='font-semibold text-sm lg:text-base'>التوصيل المتوقع</h4>
                                    <p className='text-secondary text-xs lg:text-sm '>
                                        {today} - {ArriveDay} {month}
                                    </p>
                                </div>
                            </div>

                            {/* Add to Cart Button */}
                            {Cart.find(item => item.id === product.id) ? (
                                <button
                                    onClick={() => handleRemoveFromCart(product.id)}
                                    className='border flex items-center justify-center gap-2 font-medium cursor-pointer border-stroke py-2.5 rounded-full bg-white w-full hover:bg-red-50 transition-colors text-sm lg:text-base'
                                >
                                    <ShoppingCart size={18} />
                                    إزالة من السلة
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleAddToCart(product)}
                                    className='border flex items-center justify-center gap-2 font-medium cursor-pointer border-stroke py-2.5 rounded-full bg-white w-full hover:bg-primary/5 transition-colors text-sm lg:text-base'
                                >
                                    <ShoppingCart size={18} />
                                    أضف إلى السلة
                                </button>
                            )}

                            {/* Offers Selection Section */}
                            <div className='w-full flex flex-col gap-4 mt-4'>
                                <h3 className='font-semibold text-lg text-black'>العروض:</h3>
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                                    {offers.map((offer, idx) => {
                                        const isSelected = selectedOffer?.quantity === offer.quantity && selectedOffer?.price === offer.price;
                                        const regularTotal = offer.quantity * product.price;
                                        const showCrossedOriginal = offer.price < regularTotal;
                                        const pricePerItem = (offer.price / offer.quantity).toFixed(2);

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedOffer(offer)}
                                                className={cn(
                                                    "relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-right",
                                                    isSelected
                                                        ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                                                        : "border-gray-200 hover:border-primary/30 bg-white"
                                                )}
                                            >
                                                <div className='flex items-center justify-between w-full flex-wrap gap-2'>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1'>
                                                            <Tag size={12} />
                                                            {offer.quantity} قطعة
                                                        </span>
                                                    </div>
                                                    <div className='flex items-center gap-1.5'>
                                                        {offer.isBestOffer && (
                                                            <span className='bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1'>
                                                                <Sparkles size={12} />
                                                                أفضل عرض
                                                            </span>
                                                        )}
                                                        {offer.freeDelivery && (
                                                            <span className='bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1'>
                                                                <Truck size={12} />
                                                                توصيل مجاني
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isSelected && (
                                                        <Check className='absolute top-3 left-3 text-primary' size={20} />
                                                    )}
                                                </div>

                                                <div className='flex items-baseline gap-2 mt-1'>
                                                    {showCrossedOriginal && (
                                                        <span className='text-sm text-gray-400 line-through'>
                                                            {regularTotal.toLocaleString()} دج
                                                        </span>
                                                    )}
                                                    <span className={cn(
                                                        "text-xl font-bold",
                                                        isSelected ? "text-primary" : "text-gray-800"
                                                    )}>
                                                        {offer.price.toLocaleString()} دج
                                                    </span>
                                                </div>

                                                {offer.savedMoney > 0 && (
                                                    <div className='flex items-center gap-1.5 text-green-600 text-sm font-medium'>
                                                        <Percent size={14} />
                                                        <span>وفر {offer.savedMoney.toLocaleString()} دج</span>
                                                    </div>
                                                )}

                                                <div className='text-xs text-gray-500 mt-1'>
                                                    {'≈ ' + pricePerItem} دج للقطعة
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Checkout Form */}
                            <div className="w-full">
                                <CheckOut
                                    productPrice={PriceWithDiscount}
                                    productId={product.id}
                                    colors={product.colors}
                                    selectedOffer={selectedOffer}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Reviews Section */}
                <section className='reviews-section w-full mb-12 lg:mb-16 px-0 lg:px-0 '>
                    <ReviewsSection productId={product.id} />
                </section>

                {/* Related Products Section */}
                <section className='Related-Products w-full mb-12 lg:mb-16 px-0 lg:px-0'>
                    <div className='w-full flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 lg:mb-12 gap-4'>
                        <h2 className='text-xl lg:text-2xl font-semibold'>منتجات ذات صلة</h2>
                        <Link
                            href={`/products/All?category=${product.categories?.[0]?.name || ''}`}
                            className='text-[#3B65FA] flex items-center gap-1 cursor-pointer hover:underline w-fit text-sm lg:text-base'
                        >
                            عرض الكل
                            <ArrowRight size={16} className="rotate-180" />
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
