'use client'

import { GlobalContext } from "@/app/context/Context";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useContext } from "react";

function RenderProducts({ Products, Class, isCart = false }) {
    const { Cart, setCart, loading } = useContext(GlobalContext)

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

    // Determine grid columns based on Class prop and screen size
    const getGridClasses = () => {
        if (Class?.includes('grid-cols-4')) {
            // For 4-column layouts: 1 mobile, 2 tablet, 3 laptop, 4 desktop
            return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
        }
        // Default 3-column: 1 mobile, 2 tablet, 3 desktop
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    };

    // Determine skeleton count based on responsive columns
    const getSkeletonCount = () => {
        if (Class?.includes('grid-cols-4')) return 4;
        return 3;
    };

    return (
        <>
            {loading ? (
                <div className={`w-full grid gap-4 sm:gap-6 ${getGridClasses()} ${Class}`}>
                    {Array.from({ length: getSkeletonCount() }).map((_, index) => (
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
                <div className={`w-full grid gap-4 sm:gap-6 ${getGridClasses()} ${Class}`}>
                    {Products && Products.length > 0 ? (
                        Products.map((product) => (
                            <div 
                                key={product.id} 
                                className="w-full h-auto bg-white rounded-xl border relative border-stroke overflow-hidden flex flex-col"
                            >
                                {/* Discount Badge */}
                                {product.discount_percentage > 0 && (
                                    <div className='discount bg-primary absolute top-2 right-2 px-0.5 rounded-full z-10'>
                                        <p className='text-white text-xs px-2 py-1'>-{product.discount_percentage}%</p>
                                    </div>
                                )}

                                {/* Product Image */}
                                <div className='w-full h-40 sm:h-48 border-b border-stroke cursor-pointer overflow-hidden bg-gray-50'>
                                    <Link href={`/product/${product.id}`}>
                                        <img 
                                            src={product.image_url || product.thumbnail} 
                                            alt={product.name} 
                                            className="w-full h-full object-contain hover:scale-110 transition-transform duration-300" 
                                            loading='lazy' 
                                        />
                                    </Link>
                                </div>

                                {/* Product Info */}
                                <div className="py-3 sm:py-4 px-2 sm:px-3 flex flex-col gap-2 flex-1">
                                    <div className="flex-1">
                                        <p className='text-secondary text-xs sm:text-sm'>
                                            {product.categories?.map(cat => cat.name).join(' | ')}
                                        </p>
                                        <h2 className="text-sm sm:text-base font-semibold mt-1 line-clamp-1">{product.name}</h2>
                                        <p className='text-xs sm:text-sm line-clamp-2 text-secondary'>{product.description}</p>
                                    </div>

                                    {/* Price */}
                                    {product.discount_percentage > 0 ? (
                                        <p className="text-gray-600 text-base sm:text-lg">
                                            <span className='line-through text-secondary text-sm'>
                                                {product.price}DA
                                            </span>
                                            <span className="hidden sm:inline"> | </span>
                                            <br className="sm:hidden" />
                                            <span className='text-primary font-semibold'>
                                                {Math.round(product.price - (product.price * product.discount_percentage / 100))}DA
                                            </span>
                                        </p>
                                    ) : (
                                        <p className="text-red-400 text-base sm:text-lg font-semibold">
                                            {product.price}DA
                                        </p>
                                    )}

                                    {/* Stock */}
                                    <p className='text-xs sm:text-sm'>
                                        In Stock: <span className='font-semibold text-[#38A9FA]'>{product.stock}</span>
                                    </p>

                                    {/* Action Buttons */}
                                    {isCart ? (
                                        <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-auto">
                                            <button 
                                                onClick={() => handleRemoveFromCart(product.id)} 
                                                className='border flex items-center justify-center gap-2 font-medium cursor-pointer border-stroke px-3 sm:px-4 py-2 rounded-full bg-white text-sm'
                                            >
                                                Remove
                                            </button>
                                            <Link 
                                                href={`/product/${product.id}`} 
                                                className="w-full flex items-center justify-center gap-2 font-medium cursor-pointer text-white py-2 rounded-full bg-primary text-sm"
                                            >
                                                Buy Now
                                            </Link>
                                        </div>
                                    ) : Cart.find(item => item.id === product.id) ? (
                                        <button 
                                            onClick={() => handleRemoveFromCart(product.id)} 
                                            className='border flex items-center justify-center gap-2 font-medium cursor-pointer border-stroke px-3 sm:px-4 py-2 rounded-full bg-white w-full sm:w-fit text-sm mt-auto'
                                        >
                                            <ShoppingCart size={16} className="sm:w-[18px] sm:h-[18px]" />
                                            <span className="hidden sm:inline">Remove From Cart</span>
                                            <span className="sm:hidden">Remove</span>
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleAddToCart(product)} 
                                            className='border flex items-center justify-center gap-2 font-medium cursor-pointer border-stroke px-3 sm:px-4 py-2 rounded-full bg-white w-full sm:w-fit text-sm mt-auto hover:bg-gray-50 transition-colors'
                                        >
                                            <ShoppingCart size={16} className="sm:w-[18px] sm:h-[18px]" />
                                            <span className="hidden sm:inline">Add To Cart</span>
                                            <span className="sm:hidden">Add</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className={`w-full flex items-center justify-center py-12 col-span-full text-gray-500`}>
                            No products available.
                        </div>
                    )}
                </div>
            )}
        </>
    )
}

export default RenderProducts