'use client'
import { GlobalContext } from '@/app/context/Context';
import Breadcrumb from '@/components/Breadcrumb';
import { GlobeLock, Minus, Plus, ShoppingCart, Van, XIcon } from 'lucide-react';
import React, { useContext, useEffect, useRef, useState } from 'react'

function ProductPage({ params }) {
    const { Cart, setCart } = useContext(GlobalContext)
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
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


    useEffect(() => {
        async function fetchProduct() {
            try {
                const { id } = await params
                const response = await fetch(`http://localhost:5000/api/shop/get-product/${id}`)
                const data = await response.json()
                setProduct(data)
                setCurrentImage(data.images[0])
            } catch (err) {
                console.log('error:', err);
            } finally {
                setLoading(false)
            }
        }
        fetchProduct()
    }, [params]);


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
        setCart(prevCart => [...prevCart, product]);
    }
    function handleRemoveFromCart(productId) {
        setCart(prevCart => prevCart.filter(item => item.id !== productId));
    }


    if (loading) return <div className='w-full h-dvh flex items-center justify-center text-xl'>Loading...</div>;
    if (!product) return <div className='w-full h-dvh flex items-center justify-center text-xl'>Product not found</div>;
    return (
        <main className='mt-30 px-20'>
            <Breadcrumb />
            <section className='w-full h-fit mb-20 flex justify-between items-start px-6 py-8 bg-white border-2 mt-8 border-stroke rounded-xl'>
                <div className='w-1/2 flex flex-col items-start gap-4'>
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
                    <div className='flex gap-4'>
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
                    <p className='text-secondary '>Category:
                        <span className='ml-2 text-black'>
                            {product.categories.map(cat => cat.name).join(' | ')}
                        </span>
                    </p>
                    {
                        product.discount_percentage > 0 ? (
                            <p className="text-gray-600 text-lg">
                                <span className=' line-through text-secondary'>
                                    {product.price}DA
                                </span> &nbsp;
                                <span className='text-primary text-2xl font-semibold'>
                                    {product.price - (product.price * product.discount_percentage / 100)}DA
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
                                {month.slice(0,3)} {today} - {month.slice(0,3)} {ArriveDay}, {year}
                            </p>
                        </div>
                    </div>
                    <button className='w-full bg-primary text-white flex items-center justify-center py-3 rounded-full cursor-pointer hover:bg-red-600'>
                        Buy Now
                    </button>
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
                            <XIcon/>
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
    )
}

export default ProductPage