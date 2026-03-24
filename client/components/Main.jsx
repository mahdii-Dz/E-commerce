'use client'
import { GlobalContext } from '@/app/context/Context'
import { ArrowRight, Menu } from 'lucide-react'
import Link from 'next/link'
import React, { useContext } from 'react'
import RenderProducts from './RenderProducts'
import Image from 'next/image'

function Main({ Banners, onOpenCategorySidebar }) {
  const { Products, Promotions } = useContext(GlobalContext)
  const NewestProducts = Products && Products.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4)

  const sortedBanners = Banners?.sort((a, b) => a.position - b.position) || []
  const mainBanner = sortedBanners[0]
  const sideBanner = sortedBanners[1]

  return (
    <main className='w-full flex-1 h-auto'>
      {/* Shop by Category Button - Mobile only */}
      <button
        onClick={onOpenCategorySidebar}
        className="lg:hidden w-full mb-4 flex items-center justify-center gap-3 bg-white border border-stroke rounded-xl p-4 font-medium hover:bg-primary/5 transition-all"
      >
        <Menu size={20} />
        Shop by Category
      </button>

      {/* Banners */}
      <div className='w-full flex flex-col lg:flex-row items-center gap-4 lg:h-90 overflow-hidden'>
        <div className='w-full lg:w-3/4 h-64 lg:h-full overflow-clip rounded-xl bg-stroke relative'>
          {mainBanner ? (
            <Image 
              src={mainBanner.url.trim()} 
              alt="Main banner" 
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 75vw"
              className="object-cover cursor-pointer hover:scale-110 transition-transform duration-300" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
              No banner available
            </div>
          )}
        </div>
        
        <div className='w-full lg:w-1/4 h-64 lg:h-90 hidden lg:block rounded-xl overflow-clip cursor-pointer relative'>
          {sideBanner ? (
            <Image 
              src={sideBanner.url.trim()} 
              alt="Side banner" 
              fill
              sizes="(max-width: 1024px) 100vw, 25vw"
              className="object-cover hover:scale-110 transition-transform duration-300" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary text-white font-semibold text-xl">
              Special Offer
            </div>
          )}
        </div>
      </div>

      {/* Products sections... */}
      <section className='mt-10 px-4 lg:px-0'>
        <div className='flex justify-between items-center'>
          <h1 className='text-xl lg:text-2xl font-semibold'>Promotion</h1>
          <Link href="/products/Promotions" className='text-[#3B65FA] flex items-center gap-1 cursor-pointer hover:underline w-fit text-sm lg:text-base'>
            View All
            <ArrowRight size={16} />
          </Link>
        </div>
        <RenderProducts Products={Promotions && Promotions.slice(0, 3)} Class={'mt-8'} />
      </section>

      <section className='mt-10 px-4 lg:px-0'>
        <div className='flex justify-between items-center'>
          <h1 className='text-xl lg:text-2xl font-semibold'>Newest Products</h1>
          <Link href="/products/Newest" className='text-[#3B65FA] flex items-center gap-1 cursor-pointer hover:underline w-fit text-sm lg:text-base'>
            View All
            <ArrowRight size={16} />
          </Link>
        </div>
        <RenderProducts Products={NewestProducts && NewestProducts.slice(0, 3)} Class={'mt-8'} />
      </section>

      <section className='mt-10 px-4 lg:px-0 mb-10'>
        <div className='flex justify-between items-center'>
          <h1 className='text-xl lg:text-2xl font-semibold'>All Products</h1>
          <Link href="/products/All" className='text-[#3B65FA] flex items-center gap-1 cursor-pointer hover:underline w-fit text-sm lg:text-base'>
            View All
            <ArrowRight size={16} />
          </Link>
        </div>
        <RenderProducts Products={Products && Products.slice(0, 12)} Class={'mt-8'} />
      </section>
    </main>
  )
}

export default Main