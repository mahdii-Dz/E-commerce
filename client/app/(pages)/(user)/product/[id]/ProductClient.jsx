'use client'

import { GlobalContext } from '@/app/context/Context';
import Breadcrumb from '@/components/Breadcrumb';
import CheckOut from '@/components/CheckOut';
import RenderProducts from '@/components/RenderProducts';
import ReviewsSection from '@/components/ReviewsSection';
import { ArrowRight, Check, Percent, ShoppingCart, Sparkles, Tag, Truck, Van, XIcon } from 'lucide-react';
import Link from 'next/link';
import React, { useContext, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils';
import 'swiper/css';
import 'swiper/css/thumbs';
import 'swiper/css/free-mode';
import 'swiper/css/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Thumbs, FreeMode, Navigation } from 'swiper/modules';

export default function ProductClient({ product, relatedProducts }) {
    const { Cart, setCart } = useContext(GlobalContext)
    const [thumbsSwiper, setThumbsSwiper] = useState(null);
    const mainSwiperRef = useRef(null);
    const [fullscreenIndex, setFullscreenIndex] = useState(0);
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
    const fullscreenRef = useRef(null);
    const date = new Date();
    const today = date.getDate()
    const deliveryDate = new Date(date.setDate(date.getDate() + 2));
    const ArriveDay = deliveryDate.getDate();
    const month = deliveryDate.toLocaleString('default', { month: 'long' });
    const year = deliveryDate.getFullYear();
    const [mounted, setMounted] = useState(false)
    const [selectedColor, setSelectedColor] = useState(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Offers state
    const [offers, setOffers] = useState([]);
    const [selectedOffer, setSelectedOffer] = useState(null);
    const offersRef = useRef(null);
    const checkoutRef = useRef(null);
    const isInitialSelection = useRef(true);

    // Find manually marked best offer
    const manualBestOffer = offers.find(o => o.isBestOffer);

    useEffect(() => {
        if (product) {
            const buyOneOffer = {
                quantity: 1,
                price: product.price,
                savedMoney: 0,
                isBestOffer: false,
                freeDelivery: false,
            };
            const productOffers = product.offers && Array.isArray(product.offers) ? product.offers : [];
            const allOffers = [buyOneOffer, ...productOffers];
            setOffers(allOffers);

            setSelectedOffer(buyOneOffer);
            setTimeout(() => { isInitialSelection.current = false; }, 0);
        }
    }, [product])

    const scrollToCheckout = () => {
        const el = checkoutRef.current;
        if (el) {
            const top = el.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    };

    const handleSelectOffer = (offer) => {
        setSelectedOffer(offer);
        if (!isInitialSelection.current) {
            setTimeout(scrollToCheckout, 500);
        }
    };

    // Fullscreen modal handlers
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (fullscreenRef.current && !fullscreenRef.current.contains(e.target)) {
                setIsFullscreenOpen(false);
            }
        };
        const handleEscape = (e) => {
            if (e.key === 'Escape') setIsFullscreenOpen(false);
        };
        if (isFullscreenOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isFullscreenOpen]);

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
            <main className='pt-24 lg:pt-30 px-4 lg:px-20 pb-16 lg:pb-0 w-full --font-Rubik-sans'>
                <style>{`
                  .product-swiper .swiper-button-next,
                  .product-swiper .swiper-button-prev {
                    color: #EEC910;
                  }
                  .fullscreen-swiper .swiper-button-next,
                  .fullscreen-swiper .swiper-button-prev {
                    color: #EEC910;
                  }
                `}</style>
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
                            {product.compare_price > product.price ? (
                                <div className="text-gray-600 w-full flex items-center justify-between gap-2">
                                    <div>
                                        <span className='text-primary text-2xl lg:text-3xl font-bold '>
                                            {Math.round(product.price)} دج
                                        </span>
                                        <span className='line-through text-secondary text-base lg:text-lg mr-2'>
                                            {product.compare_price} دج
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

                        {/* IMAGES COLUMN */}
                        <div className='w-full lg:sticky lg:top-24 self-start lg:row-start-1 lg:row-end-3 lg:col-start-1 lg:col-end-2 mt-6 lg:mt-0'>
                            {/* Main Swiper */}
                            <div className='relative w-full bg-stroke/50 border border-stroke rounded-lg overflow-hidden'>
                                <Swiper
                                    spaceBetween={0}
                                    slidesPerView={1}
                                    onSwiper={(swiper) => { mainSwiperRef.current = swiper; }}
                                    autoplay={{
                                        delay: 5000,
                                        disableOnInteraction: false,
                                    }}
                                    navigation
                                    modules={[Autoplay, Thumbs, FreeMode, Navigation]}
                                    thumbs={{
                                        swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null,
                                    }}
                                    className='w-full product-swiper'
                                    onClick={(swiper) => {
                                        setFullscreenIndex(swiper.activeIndex);
                                        setIsFullscreenOpen(true);
                                    }}
                                >
                                    {product.images.map((image, index) => (
                                        <SwiperSlide key={index}>
                                            <img
                                                src={image?.url || image}
                                                alt={`${product.name} - ${index + 1}`}
                                                className='w-full object-cover bg-white cursor-pointer h-[400px] lg:h-[600px]'
                                                decoding="async"
                                                loading={index === 0 ? "eager" : "lazy"}
                                                fetchPriority={index === 0 ? "high" : "low"}
                                                onError={(e) => { e.target.src = '/placeholder.png'; }}
                                            />
                                        </SwiperSlide>
                                    ))}
                                </Swiper>

                                <div
                                    onClick={() => {
                                        setFullscreenIndex(thumbsSwiper?.activeIndex || 0);
                                        setIsFullscreenOpen(true);
                                    }}
                                    className='absolute inset-0 bg-black/0 hover:bg-black/30 transition-all duration-300 flex items-center justify-center cursor-pointer'
                                >
                                    <span className='text-white font-medium bg-black/60 px-4 py-2 rounded-lg opacity-0 hover:opacity-100 transition-opacity'>
                                        انقر لعرض الحجم الكامل
                                    </span>
                                </div>

                                {product.discount_percentage > 0 && (
                                    <div className='discount bg-primary absolute top-2 right-2 px-0.5 rounded-full z-10'>
                                        <p className='text-white text-xs px-2 py-1'>{product.discount_percentage}%-</p>
                                    </div>
                                )}
                            </div>

                            {/* Thumbnail Swiper */}
                            <Swiper
                                onSwiper={setThumbsSwiper}
                                spaceBetween={8}
                                slidesPerView="auto"
                                watchSlidesProgress={true}
                                modules={[Thumbs]}
                                className='mt-4 overflow-hidden'
                                freeMode={false}
                            >
                                {product.images.map((image, index) => (
                                    <SwiperSlide key={index} className='!w-20 lg:!w-24' onClick={() => mainSwiperRef.current?.slideTo(index)}>
                                        <img
                                            src={image?.url || image}
                                            alt={`${product.name} - عرض ${index + 1}`}
                                            className='w-full h-20 lg:h-24 object-cover rounded-lg border border-stroke cursor-pointer hover:scale-110 transition-transform duration-300 bg-white'
                                            loading="lazy"
                                            decoding="async"
                                            onError={(e) => { e.target.src = '/placeholder.png'; }}
                                        />
                                    </SwiperSlide>
                                ))}
                            </Swiper>
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
                            {/* Color Selection Section */}
                            {product.colors?.length > 0 && (
                                <div className="w-full flex flex-col gap-3">
                                    <h3 className='font-semibold text-lg text-black'>الالوان المتوفرة:</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {product.colors.map((color) => (
                                            <button
                                                key={color.hex}
                                                onClick={() => {
                                                    setSelectedColor(color.hex);
                                                    const idx = product.images.findIndex(
                                                        img => (img?.url || img) === color.image
                                                    );
                                                    if (idx !== -1) {
                                                        mainSwiperRef.current?.slideTo(idx);
                                                        thumbsSwiper?.slideTo(idx);
                                                    }
                                                }}
                                                className={cn(
                                                    "flex flex-col w-30 relative items-center gap-3 p-2 rounded-xl border-2 transition-all cursor-pointer",
                                                    selectedColor === color.hex
                                                        ? "border-primary bg-primary/5"
                                                        : "border-gray-200 hover:border-primary/30"
                                                )}
                                            >
                                                <img
                                                    src={color.image}
                                                    alt={color.name}
                                                    className="size-20 rounded-lg object-cover border border-gray-200"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                                <span
                                                        className="w-8 h-4 absolute bottom-13 rounded-full border border-gray-300"
                                                        style={{ backgroundColor: `#${color.hex}` }}
                                                    />
                                                <div className="flex items-center gap-2">
                                                    
                                                    <span className="text-sm font-medium text-gray-800">{color.name}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Offers Selection Section */}
                            <div ref={offersRef} className='w-full flex flex-col gap-4 mt-4'>
                                <h3 className='font-semibold text-lg text-black'>اختر عرض:</h3>
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                                    {offers.map((offer, idx) => {
                                        const isSelected = selectedOffer?.quantity === offer.quantity && selectedOffer?.price === offer.price;
                                        const regularTotal = offer.quantity * product.price;
                                        const showCrossedOriginal = offer.price < regularTotal;
                                        const pricePerItem = (offer.price / offer.quantity).toFixed(2);

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleSelectOffer(offer)}
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
                                                        <span>وفر {offer.savedMoney.toLocaleString()} دج 
                                                            {
                                                                offer.freeDelivery && " + 600 دج توصيل مجاني "
                                                            }
                                                        </span>
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
                            <div ref={checkoutRef} className="w-full">
                                <CheckOut
                                    productPrice={product.price}
                                    productId={product.id}
                                    productName={product.name}
                                    colors={product.colors}
                                    selectedOffer={selectedOffer}
                                />
                            </div>

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
                            {mounted && Cart.find(item => item.id === product.id) ? (
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

                            {/* Landing Page Image */}
                            {product.landing_page_image && (
                                <div className="w-full mt-4">
                                    <img
                                        src={product.landing_page_image}
                                        alt={`${product.name} - Landing`}
                                        className="w-full object-cover rounded-lg"
                                    />
                                </div>
                            )}
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
                {isFullscreenOpen && (
                    <div className='fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4'>
                        <div ref={fullscreenRef} className='relative w-full max-w-6xl max-h-full'>
                            <button
                                onClick={() => setIsFullscreenOpen(false)}
                                className='absolute -top-12 right-0 lg:-top-4 lg:-right-12 p-2 text-white hover:bg-white/10 rounded-full transition-colors z-10'
                            >
                                <XIcon size={28} />
                            </button>
                            <Swiper
                                initialSlide={fullscreenIndex}
                                spaceBetween={0}
                                slidesPerView={1}
                                navigation
                                modules={[Navigation]}
                                className='w-full fullscreen-swiper'
                            >
                                {product.images.map((image, index) => (
                                    <SwiperSlide key={index}>
                                        <div className='flex items-center justify-center' style={{ height: '80vh' }}>
                                            <img
                                                src={image?.url || image}
                                                alt={`${product.name} - ${index + 1}`}
                                                className='max-w-full max-h-full object-contain'
                                                decoding="async"
                                                fetchPriority="high"
                                                onError={(e) => { e.target.src = '/placeholder.png'; }}
                                            />
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    </div>
                )}
            </main>

            {/* Mobile Buy Now Button */}
            <div className='lg:hidden flex fixed bottom-2 right-0 left-0 z-40 p-2 justify-center items-center'>
                <button
                    onClick={() => {
                    const el = offersRef.current;
                    if (el) {
                        const top = el.getBoundingClientRect().top + window.scrollY - 100;
                        window.scrollTo({ top, behavior: 'smooth' });
                    }
                }}
                    className='lg:hidden  w-full z-40 bg-[#dfbc0d] text-white text-center font-bold py-3.5 text-base shadow-2xl rounded-xl'
                >
                    اشتري الآن
                </button>
            </div>
        </>
    )
}
