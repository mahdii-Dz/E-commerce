'use client'
import { GlobalContext } from '@/app/context/Context'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import React, { useContext } from 'react'
import RenderProducts from './RenderProducts'

function Main() {
  const { Products, Promotions } = useContext(GlobalContext)
  const NewestProducts = Products.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4)



  return (
    <main className='w-full flex-1 h-auto'>
      <div className='w-full flex items-center h-90 overflow-hidden'>
        <div className='w-3/4 h-full overflow-clip rounded-xl bg-stroke'>
          <img src="/main-banner.jpg" alt="main banner" fetchPriority='high' className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-300" />
        </div>
        <div className='w-1/4 h-90 bg-primary rounded-xl overflow-clip cursor-pointer'>
          {/* Placeholder for future image */}
        </div>
      </div>
      {/* Promotions Products */}
      <section className='mt-10'>
        <div className='flex justify-between items-center'>
          <h1 className='text-2xl font-semibold'>Promotion</h1>
          <Link href="/products/Promotions" className='text-[#3B65FA] flex items-center gap-1 cursor-pointer hover:underline w-fit'>
            View All
            <ArrowRight size={16} />
          </Link>
        </div>
        <RenderProducts Products={Promotions} Class={'mt-8'} />
        {/* Newest Products */}
      </section>
      <section className='mt-10'>
        <div className='flex justify-between items-center'>
          <h1 className='text-2xl font-semibold'>Newest Products</h1>
          <Link href="/products/Newest" className='text-[#3B65FA] flex items-center gap-1 cursor-pointer hover:underline w-fit'>
            View All
            <ArrowRight size={16} />
          </Link>
        </div>
        <RenderProducts Products={NewestProducts} Class={'mt-8'} />
      </section>
    </main>
  )
}

export default Main