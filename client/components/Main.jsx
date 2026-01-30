'use client'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

function Main() {
  const [Products, setProducts] = useState([])

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('http://localhost:5000/api/shop/get-products')
        const data = await response.json()
        setProducts(data)
        console.log(data);

      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchData()
  }, [])


  return (
    <main className='w-full flex-1 h-dvh'>
      <div className='w-full flex items-center h-90 overflow-hidden'>
        <div className='w-3/4 h-full overflow-clip rounded-xl bg-stroke'>
          <img src="/main-banner.jpg" alt="main banner" className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-300" />
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
        <div className='mt-8 w-full flex flex-wrap items-center gap-4'>
          {
            Products.length > 0 ?
              Products.map((product) => (
                <div key={product.id} className="w-1/4 h-96.5 bg-white rounded-lg border relative border-stroke overflow-hidden cursor-pointer">
                  <div className='discount bg-primary absolute top-2 right-2 px-0.5 rounded-full'>
                    <p className='text-white text-xs px-2 py-1'>
                      -{
                        // product.discount_percentage > 0 &&
                      product.discount_percentage
                      }%</p>
                  </div>
                  <div className='w-full h-43.5 border-b border-stroke'>
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" loading='lazy' />
                  </div>
                  <div className="py-4 px-3 flex flex-col gap-3">
                    <p className='text-secondary text-sm'>{
                      product.categories.map(cat => cat.name).join(' | ')}</p>
                    <h2 className="text-sm font-semibold">{product.name}</h2>
                    <p className="text-gray-600">${product.price}</p>
                  </div>
                </div>
              ))
              :
              <p className='text-center w-full'>No products available.</p>
          }
        </div>
      </section>
    </main>
  )
}

export default Main