'use client'

import { GlobalContext } from "@/app/context/Context";
import { Link, ShoppingCart } from "lucide-react";
import { useContext } from "react";

function RenderProducts({ Products, Class }) {
    const { Cart, setCart, loading } = useContext(GlobalContext)

    function handleAddToCart(product) {
        setCart(prevCart => [...prevCart, product]);
    }
    function handleRemoveFromCart(productId) {
        setCart(prevCart => prevCart.filter(item => item.id !== productId));
    }

    return (
        <>
            {
                loading ? (
                    <div className='w-full flex items-center justify-center' > Loading...</div>
                ) :
                    <div className={`w-full grid grid-cols-3 gap-6 ${Class}`}>
                        {
                            Products.length > 0 ?
                                Products.map((product) => (
                                    <div key={product.id} className="w-full h-110 bg-white rounded-xl border relative border-stroke overflow-hidden ">
                                        <div className='discount bg-primary absolute top-2 right-2 px-0.5 rounded-full'>
                                            {
                                                product.discount_percentage > 0 && <p className='text-white text-xs px-2 py-1'>-{product.discount_percentage}%</p>

                                            }
                                        </div>
                                        <div className='w-full h-48 border-b border-stroke cursor-pointer overflow-hidden '>
                                            <a href={`/product/${product.id}`} >
                                                <img src={product.image_url} alt={product.name} className="w-full h-full object-contain hover:scale-110 transition-transform duration-300" loading='lazy' />
                                            </a>
                                        </div>
                                        <div className="py-4 px-3 flex flex-col gap-2.5">
                                            <div>
                                                <p className='text-secondary text-sm'>{
                                                    product.categories.map(cat => cat.name).join(' | ')}
                                                </p>
                                                <h2 className="text font-semibold mt-1">{product.name}</h2>
                                                <p className='text-sm line-clamp-2 text-secondary'>{product.description}</p>
                                            </div>
                                            {
                                                product.discount_percentage > 0 ? (
                                                    <p className="text-gray-600 text-lg">
                                                        <span className=' line-through text-secondary'>
                                                            {product.price}DA
                                                        </span> | &nbsp;
                                                        <span className='text-primary font-semibold'>
                                                            {product.price - (product.price * product.discount_percentage / 100)}DA
                                                        </span>
                                                    </p>
                                                ) : <p className="text-red-400 text-lg font-semibold">
                                                    {product.price}DA
                                                </p>
                                            }
                                            <p className='text-sm'>
                                                In Stock: <span className='font-semibold text-[#38A9FA]'>{product.stock}</span>
                                            </p>
                                            {
                                                Cart.find(item => item.id === product.id) ? (
                                                    <button onClick={() => handleRemoveFromCart(product.id)} className='border flex items-center gap-2 font-medium cursor-pointer border-stroke px-4 py-2 rounded-full bg-white w-fit'>
                                                        <ShoppingCart size={18} />
                                                        Remove From Cart
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleAddToCart(product)} className='border flex items-center gap-2 font-medium cursor-pointer border-stroke px-4 py-2 rounded-full bg-white w-fit'>
                                                        <ShoppingCart size={18} />
                                                        Add To Cart
                                                    </button>
                                                )
                                            }
                                        </div>
                                    </div>
                                ))
                                :
                                <p className='text-center w-full'>No products available.</p>
                        }
                    </div>
            }
        </>

    )
}

export default RenderProducts