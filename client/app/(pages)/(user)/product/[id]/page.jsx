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

function ProductPage({ params }) {
    const { id } = React.use(params)
    const { Cart, setCart } = useContext(GlobalContext)
    const { data: product, isLoading: loading, error } = useFetchSingleProduct(`http://localhost:5000/api/shop/get-product/${id}`);
    const category_id = product?.categories[0]?.id
    const { data: relatedProducts, isLoading: loading2, error: error2 } = useFetchSingleProduct(`http://localhost:5000/api/shop/get-products/category/${category_id}`);
    
    
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product])


    //full size image
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
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isModalOpen]);

    function handleAddToCart(product) {
        setCart(prevCart => {
            const newCart = [...prevCart, product];
            // Save the updated cart to localStorage
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
    if (error) return <div className='w-full h-dvh flex items-center justify-center text-red-500 text-xl'>error:{error}</div>;
    if (!product) return <div className='w-full h-dvh flex items-center justify-center text-xl'>Product not found</div>;
    return (
        <>

            <main className='mt-30 px-20'>
                <Breadcrumb />
                <section className='w-full h-fit mb-20 flex justify-between items-start px-6 py-8 bg-white border-2 mt-8 border-stroke rounded-xl'>
                    <div className='w-1/2 flex flex-col items-start gap-4 md:sticky top-24'>
                        <div onClick={() => setIsModalOpen(true)} className='relative cursor-pointer border w-[calc(100%-50px)] h-105 flex items-center bg-stroke/50 justify-center overflow-hidden border-stroke rounded-lg group'>
                            <img className='bg-white h-full' src={currentImage ? currentImage : product?.images[0]} alt={product.name} />
                            <div className='absolute inset-0 bg-black/30 bg-opacity-0 group-hover:bg-opacity-50 transition-opacity duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100'>
                                <span className='text-white font-medium bg-black/60 px-4 py-2 rounded-lg'>
                                    Click to view full size
                                </span>
                            </div>
                            <div className='discount bg-primary absolute top-2 right-2 px-0.5 rounded-full'>
                                {
                                    product.discount_percentage > 0 && <p className='text-white text-xs px-2 py-1'>-{product.discount_percentage}%</p>

                                }
                            </div>
                        </div>
                        <div className='flex gap-4 flex-wrap'>
                            {
                                product.images.map((image, index) => (
                                    <div onClick={() => setCurrentImage(image)} key={image} className={`border w-24 h-24 cursor-pointer flex items-center justify-center overflow-hidden border-stroke rounded-lg ${currentImage === image ? 'ring-2 ring-primary' : ''
                                        }`}>
                                        <img className='bg-white object-contain hover:scale-110 transition-transform duration-300' src={image} alt={`${product.name} - view ${index + 1}`} />
                                    </div>
                                ))
                            }

                        </div>
                    </div>
                    <div className='w-1/2 h-fit flex flex-col items-start gap-4'>
                        <h2 className='text-2xl font-bold'>{product.name}</h2>

                        <p className='text-secondary '>Category:
                            <span className='ml-2 text-black'>
                                {product.categories.map(cat => cat.name).join(' | ')}
                            </span>
                        </p>
                        {
                            PriceWithDiscount < product.price ? (
                                <p className="text-gray-600 text-lg">
                                    <span className=' line-through text-secondary'>
                                        {product.price}DA
                                    </span> &nbsp;
                                    <span className='text-primary text-2xl font-semibold'>
                                        {PriceWithDiscount}DA
                                    </span>
                                </p>
                            ) : <p className="text-red-400 text-lg font-semibold">
                                {product.price}DA
                            </p>
                        }
                        {
                            product.is_active ? (
                                <p className='bg-[#B2F9B0] text-[#3FD125] px-2.5 py font-medium rounded-full'>In Stock</p>
                            ) : (
                                <p className='bg-red-300 text-red-600 px-2.5 py font-medium rounded-full'>Out of Stock</p>
                            )
                        }
                        <p className='font-semibold'>Description:</p>
                        <p className='text-gray-600'>{product.description}</p>
                        <div className='flex items-start justify-start w-full bg-stroke/30 h-fit border-2 rounded-xl p-4 gap-4 border-stroke'>
                            <div><Van className='text-primary' /></div>
                            <div>
                                <h4 className='font-semibold'>Estimated Delivery</h4>
                                <p className='text-secondary text-sm'>
                                    {month.slice(0, 3)} {today} - {month.slice(0, 3)} {ArriveDay}, {year}
                                </p>
                            </div>
                        </div>
                        <h3 className=''>Quantity</h3>
                        <div className='w-full gap-6 flex items-center'>
                            <div className='flex gap-3.5 px-4 py-2.5 border border-stroke rounded-full'>
                                <button onClick={() => quantity > 1 && setQuantity(q => q - 1)} className='cursor-pointer hover:bg-primary/80 hover:text-white rounded-full'><Minus /></button>
                                <p>{quantity}</p>
                                <button onClick={() => setQuantity(q => q + 1)} className='cursor-pointer hover:bg-primary/80 hover:text-white rounded-full'><Plus /></button>
                            </div>
                            {
                                Cart.find(item => item.id === product.id) ? (
                                    <button onClick={() => handleRemoveFromCart(product.id)} className='border flex items-center justify-center gap-2 font-medium cursor-pointer border-stroke py-2.5 rounded-full bg-white w-full'>
                                        <ShoppingCart size={18} />
                                        Remove From Cart
                                    </button>
                                ) : (
                                    <button onClick={() => handleAddToCart(product)} className='border flex items-center justify-center gap-2 font-medium cursor-pointer border-stroke py-2.5 rounded-full bg-white w-full'>
                                        <ShoppingCart size={18} />
                                        Add To Cart
                                    </button>
                                )
                            }
                        </div>
                        <a href="#form" className='w-full bg-primary text-white flex items-center justify-center py-3 rounded-full cursor-pointer hover:bg-red-600'>
                            Buy Now
                        </a>

                        <CheckOut productPrice={PriceWithDiscount} Quantity={quantity} setQuantity={setQuantity} productId={product.id} colors={product.colors} />
                    </div>
                </section>
                <section className='Related-Products w-full mb-16'>
                    <div className='w-full flex items-center justify-between mb-12'>
                        <h2 className='text-2xl font-semibold'>Related Products</h2>
                        <Link href={`/products/All?category=${product.categories[0].name}`} className='text-[#3B65FA] flex items-center gap-1 cursor-pointer hover:underline w-fit'>
                            View All
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                    <div className='w-full'>
                        <RenderProducts Products={relatedProducts && relatedProducts} Class={'grid-cols-4!'} />
                    </div>
                </section>
                {/* Fullscreen Modal */}
                {isModalOpen && (
                    <div className='fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4'>
                        <div ref={modalRef} className='relative max-w-4xl max-h-full'>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className='absolute -top-5 cursor-pointer -right-20 size-6 text-white text-2xl font-bold hover:text-gray-300'
                            >
                                <XIcon />
                            </button>
                            <img
                                src={currentImage}
                                alt="Full size"
                                className='max-w-full max-h-[90vh] object-contain rounded-lg'
                            />
                        </div>
                    </div>
                )}
            </main>
            <Footer />
        </>
    )
}

export default ProductPage