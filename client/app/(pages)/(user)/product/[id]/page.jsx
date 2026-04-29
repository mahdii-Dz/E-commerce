'use client'

import { GlobalContext } from '@/app/context/Context';
import Breadcrumb from '@/components/Breadcrumb';
import CheckOut from '@/components/CheckOut';
import Footer from '@/components/Footer';
import Loader from '@/components/Loader';
import RenderProducts from '@/components/RenderProducts';
import { useFetchSingleProduct } from '@/components/useFetchSingleProduct';
import ReviewsSection from '@/components/ReviewsSection';
import { ArrowRight, Check, Minus, Percent, Plus, ShoppingCart, Sparkles, Tag, Van, XIcon } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import Image from 'next/image';
import { cn } from '@/lib/utils';

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

    // Determine best offer (lowest price per item)
    const bestOffer = useCallback(() => {
        if (offers.length === 0) return null;
        return offers.reduce((best, current) => {
            const bestPricePerItem = best.price / best.quantity;
            const currentPricePerItem = current.price / current.quantity;
            return currentPricePerItem < bestPricePerItem ? current : best;
        });
    }, [offers]);

    useEffect(() => {
        if (product) {
            setCurrentImage(product.images[0])
            setPriceWithDiscount(product.discount_percentage > 0 ? product.price - (product.price * product.discount_percentage / 100) : product.price)

            // Calculate effective price (after discount)
            const effectivePrice = product.discount_percentage > 0
                ? product.price - (product.price * product.discount_percentage / 100)
                : product.price;

            // Build offers array: always include buy-1 at discounted price (if any), then any admin-defined offers
            const buyOneOffer = {
                quantity: 1,
                price: effectivePrice,
                savedMoney: product.price - effectivePrice
            };
            const productOffers = product.offers && Array.isArray(product.offers) ? product.offers : [];
            const allOffers = [buyOneOffer, ...productOffers];
            setOffers(allOffers);

            // Default select the buy-1 offer
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

    if (loading) return <div className='w-full h-dvh flex items-center justify-center text-xl'><Loader/></div>;
    if (error) return <div className='w-full h-dvh flex items-center justify-center text-red-500 text-xl'>Error: {error?.message || error}</div>;
    if (!product) return <div className='w-full h-dvh flex items-center justify-center text-xl'>Product not found</div>;

    return (
        <>
            <main className='pt-24 lg:pt-30 px-4 lg:px-20 w-full'>
                <Breadcrumb />
                
                {/* Product Details Section */}
                <section className='w-full mb-12 lg:mb-20 flex flex-col lg:flex-row-reverse justify-between items-start gap-8 lg:gap-12 px-4 lg:px-6 py-6 lg:py-8 bg-white border lg:border-2 mt-6 lg:mt-8 border-stroke rounded-xl'>
                    
                    {/* Left Column - Images (top on mobile, left on desktop with sticky) */}
                    <div className='w-full lg:w-1/2 shrink-0 lg:sticky lg:top-24 h-fit'>
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
                                    انقر لعرض الحجم الكامل
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

                    {/* Right Column - Product Info */}
                    <div className='w-full lg:w-1/2 flex flex-col items-start gap-3 lg:gap-4 text-right'>
                        <h2 className='text-xl lg:text-2xl font-bold w-full'>{product.name}</h2>

                        <p className='text-secondary text-sm lg:text-base w-full'>
                            الفئة:
                            <span className='mr-2 text-black'>
                                {product.categories.map(cat => cat.name).join(' | ')}
                            </span>
                        </p>

                        {/* Price */}
                        {PriceWithDiscount < product.price ? (
                            <p className="text-gray-600 w-full">
                                <span className='line-through text-secondary text-base lg:text-lg'>
                                    {product.price} دج
                                </span>
                                <span className='text-primary text-xl lg:text-2xl font-semibold mr-2'>
                                    {Math.round(PriceWithDiscount)} دج
                                </span>
                            </p>
                        ) : (
                            <p className="text-primary text-xl lg:text-2xl font-semibold w-full">
                                {product.price} دج
                            </p>
                        )}

                        {/* Stock Status */}
                        {product.is_active ? (
                            <p className='bg-[#B2F9B0] text-[#3FD125] px-2.5 py-1 text-sm font-medium rounded-full'>
                                في المخزن
                            </p>
                        ) : (
                            <p className='bg-red-300 text-red-600 px-2.5 py-1 text-sm font-medium rounded-full'>
                                نفذ من المخزن
                            </p>
                        )}

                        {/* Description */}
                        <p className='font-semibold text-sm lg:text-base w-full'>الوصف:</p>
                        <p className='text-gray-600 text-sm lg:text-base leading-relaxed w-full'>
                            {product.description}
                        </p>

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
                                    const best = bestOffer();
                                    const isBest = best && best.quantity === offer.quantity && best.price === offer.price;
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
                                            {/* Header: Quantity badge and Best badge */}
                                            <div className='flex items-center justify-between w-full'>
                                                <div className='flex items-center gap-2'>
                                                    <span className='bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1'>
                                                        <Tag size={12} />
                                                        {offer.quantity} قطعة
                                                    </span>
                                                </div>
                                                {isBest && (
                                                    <span className='bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1'>
                                                        <Sparkles size={12} />
                                                        الأفضل
                                                    </span>
                                                )}
                                                {isSelected && (
                                                    <Check className='absolute top-3 left-3 text-primary' size={20} />
                                                )}
                                            </div>

                                            {/* Price section */}
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

                                            {/* Savings info */}
                                            {offer.savedMoney > 0 && (
                                                <div className='flex items-center gap-1.5 text-green-600 text-sm font-medium'>
                                                    <Percent size={14} />
                                                    <span>وفر {offer.savedMoney.toLocaleString()} دج</span>
                                                </div>
                                            )}

                                            {/* Price per item hint */}
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

export default ProductPage