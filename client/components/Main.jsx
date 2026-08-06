'use client'
import { GlobalContext } from '@/app/context/Context'
import { ArrowRight, Menu } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import React, { Suspense, useContext } from 'react'
import Image from 'next/image'

const RenderProducts = dynamic(() => import('./RenderProducts'))
const CategoryCarousel = dynamic(() => import('./CategoryCarousel'))

function Main({ Banners, Products = [], Categories = [], onOpenCategorySidebar }) {
  const { Promotions } = useContext(GlobalContext)
  const NewestProducts = Products.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10)
  const CategoriesWithImages = Categories.filter(cat => cat.image_url)

  const sortedBanners = Array.isArray(Banners)
    ? [...Banners].sort((a, b) => a.position - b.position)
    : [];
  const mainBanner = sortedBanners[0]
  const sideBanner = sortedBanners[1]

  const renderSkeleton = (key) => (
    <div
      key={key}
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
  )

  const productsFallback = (Class) => (
    <div className={`w-full grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${Class}`}>
      {[0, 1, 2].map((i) => renderSkeleton(i))}
    </div>
  )

  return (
    <main className='w-full flex-1 min-w-0 h-auto'>
      {/* Shop by Category Button - Mobile only */}
      <button
        onClick={onOpenCategorySidebar}
        className="lg:hidden w-full mb-4 flex items-center justify-center gap-3 bg-white border border-stroke rounded-xl p-4 font-medium hover:bg-primary/5 transition-all"
      >
        <Menu size={20} />
        تسوق حسب الفئة
      </button>

      {/* Banners */}
      <div className='w-full flex flex-col lg:flex-row items-stretch gap-4 overflow-hidden'>
        <div className='w-full lg:flex-1 h-64 lg:h-96 rounded-xl bg-stroke relative overflow-hidden'>
          {mainBanner && mainBanner.url ? (
            mainBanner.linked_product_id ? (
              <Link href={`/product/${mainBanner.linked_product_id}`} className="block w-full h-full">
                <Image 
                  src={mainBanner.url.trim()} 
                  alt="الإعلان الرئيسي" 
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, (min-width: 1024px) calc(100vw - 358px)"
                  className="object-cover hover:scale-110 transition-transform duration-300"
                  quality={85}
                />
              </Link>
            ) : (
              <Image 
                src={mainBanner.url.trim()} 
                alt="الإعلان الرئيسي" 
                fill
                priority
                sizes="(max-width: 1024px) 100vw, (min-width: 1024px) calc(100vw - 358px)"
                className="object-cover cursor-pointer hover:scale-110 transition-transform duration-300"
                quality={85}
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
              لا يوجد إعلان متاح
            </div>
          )}
        </div>
        
        <div className='w-full lg:w-[326px] h-64 lg:h-96 hidden lg:block rounded-xl cursor-pointer relative overflow-hidden'>
          {sideBanner && sideBanner.url ? (
            sideBanner.linked_product_id ? (
              <Link href={`/product/${sideBanner.linked_product_id}`} className="block w-full h-full">
                <Image 
                  src={sideBanner.url.trim()} 
                  alt="إعلان جانبي" 
                  fill
                  sizes="(max-width: 1024px) 100vw, 25vw"
                  className="object-cover hover:scale-110 transition-transform duration-300"
                  quality={85}
                />
              </Link>
            ) : (
              <Image 
                src={sideBanner.url.trim()} 
                alt="إعلان جانبي" 
                fill
                sizes="(max-width: 1024px) 100vw, 25vw"
                className="object-cover hover:scale-110 transition-transform duration-300"
                quality={85}
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary text-white font-semibold text-xl">
              عرض خاص
            </div>
          )}
        </div>
      </div>

      {/* Categories Section */}
      {CategoriesWithImages.length > 0 && (
        <section className='mt-10 px-2.5 lg:px-0'>
          <div className='flex justify-between items-center mb-6'>
            <h1 className='text-xl lg:text-2xl font-semibold'>تسوق حسب الفئة</h1>
          </div>
          <Suspense fallback={<div className="w-full flex gap-4 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-64 lg:w-1/4 h-72 lg:h-80 rounded-2xl bg-neutral-200 animate-pulse" />
            ))}
          </div>}>
            <CategoryCarousel Categories={CategoriesWithImages} />
          </Suspense>
        </section>
      )}

      {/* Products sections... */}
      <section className='mt-10 px-2.5 lg:px-0'>
        <div className='flex justify-between items-center'>
          <h1 className='text-xl lg:text-2xl font-semibold'>تخفيضات</h1>
          <Link href="/products/Promotions" className='text-[#3B65FA] flex items-center gap-1 cursor-pointer hover:underline w-fit text-sm lg:text-base'>
            عرض الكل
            <ArrowRight size={16} className="rotate-180" />
          </Link>
        </div>
        <Suspense fallback={productsFallback('mt-8')}>
          <RenderProducts Products={Promotions && Promotions.slice(0, 10)} Class={'mt-8'} scrollable />
        </Suspense>
      </section>

      <section className='mt-10 px-2.5 lg:px-0'>
        <div className='flex justify-between items-center'>
          <h1 className='text-xl lg:text-2xl font-semibold'>أحدث المنتجات</h1>
          <Link href="/products/Newest" className='text-[#3B65FA] flex items-center gap-1 cursor-pointer hover:underline w-fit text-sm lg:text-base'>
            عرض الكل
            <ArrowRight size={16} className="rotate-180" />
          </Link>
        </div>
        <Suspense fallback={productsFallback('mt-8')}>
          <RenderProducts Products={NewestProducts} Class={'mt-8'} scrollable />
        </Suspense>
      </section>

      <section className='mt-10 px-2.5 lg:px-0 mb-10'>
        <div className='flex justify-between items-center'>
          <h1 className='text-xl lg:text-2xl font-semibold'>جميع المنتجات</h1>
          <Link href="/products/All" className='text-[#3B65FA] flex items-center gap-1 cursor-pointer hover:underline w-fit text-sm lg:text-base'>
            عرض الكل
            <ArrowRight size={16} className="rotate-180" />
          </Link>
        </div>
        <Suspense fallback={productsFallback('mt-8')}>
          <RenderProducts Products={Products.slice(0, 12)} Class={'mt-8'} scrollable />
        </Suspense>
      </section>
    </main>
  )
}

export default Main
