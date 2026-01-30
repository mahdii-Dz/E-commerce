'use client'
import { GlobalContext } from '@/app/context/Context'
import { ArrowRight, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import React, { useContext, useEffect, useState } from 'react'

function Main() {
  const { Products, setProducts, Promotions, setCart, Cart } = useContext(GlobalContext)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const response = await fetch('http://localhost:5000/api/shop/get-products')
        const data = await response.json()
        setProducts(data)

      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [setProducts])

  function handleAddToCart(product) {
    setCart(prevCart => [...prevCart, product]);
  }
  function handleRemoveFromCart(productId) {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  }


  return (
    <main className='w-full flex-1 h-auto'>
      <div className='w-full flex items-center h-90 overflow-hidden'>
        <div className='w-3/4 h-full overflow-clip rounded-xl bg-stroke'>
          <img src="/main-banner.jpg" alt="main banner" fetchPriority='high' className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-300" />
        </div>
        <div className='w-1/4 h-90 bg-primary rounded-xl overflow-clip cursor-pointer'>
          {/* Placeholder for future content */}
        </div>
      </div>
      <section className='mt-10'>
        <div className='flex justify-between items-center'>
          <h1 className='text-2xl font-semibold'>Promotion</h1>
          <Link href="/shop" className='text-[#3B65FA] flex items-center gap-1 cursor-pointer hover:underline w-fit'>
            View All
            <ArrowRight size={16} />
          </Link>
        </div>
        {
          loading ? (
            <div className='mt-8 w-full flex items-center gap-4'>Loading...</div>
          ) :
            <div className='mt-8 w-full flex items-center gap-4'>
              {
                Promotions.length > 0 ?
                  Promotions.slice(0, 4).map((product) => (
                    <div key={product.id} className="w-1/3 h-110 bg-white rounded-xl border relative border-stroke overflow-hidden ">
                      <div className='discount bg-primary absolute top-2 right-2 px-0.5 rounded-full'>
                        <p className='text-white text-xs px-2 py-1'>
                          -{
                            product.discount_percentage > 0 &&
                            product.discount_percentage
                          }%</p>
                      </div>
                      <div className='w-full h-48 border-b border-stroke cursor-pointer'>
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-contain hover:scale-110 transition-transform duration-300" loading='lazy' />
                      </div>
                      <div className="py-4 px-3 flex flex-col gap-2.5">
                        <div>
                          <p className='text-secondary text-sm'>{
                            product.categories.map(cat => cat.name).join(' | ')}
                          </p>
                          <h2 className="text font-semibold mt-1">{product.name}</h2>
                          <p className='text-sm line-clamp-2 text-secondary'>{product.description}</p>
                        </div>
                        <p className="text-gray-600 text-lg">
                          {
                            product.discount_percentage > 0 ?
                              (
                                <>
                                  <span className=' line-through text-secondary'>
                                    {product.price}DA
                                  </span> | &nbsp;
                                  <span className='text-primary font-semibold'>
                                    {product.price - (product.price * product.discount_percentage / 100)}DA
                                  </span>
                                </>

                              )
                              : (
                                <>${product.price}</>
                              )
                          }
                        </p>
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


      </section>
    </main>
  )
}

export default Main