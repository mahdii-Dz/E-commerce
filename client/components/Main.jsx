'use client'
import { GlobalContext } from '@/app/context/Context'
import { ArrowRight, Menu } from 'lucide-react'
import Link from 'next/link'
import React, { useContext } from 'react'
import RenderProducts from './RenderProducts'
import Image from 'next/image'

function Main({ Banners, Products = [], onOpenCategorySidebar }) {
  const { Promotions } = useContext(GlobalContext)
  const NewestProducts = Products.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4)

  const sortedBanners = Array.isArray(Banners)
    ? [...Banners].sort((a, b) => a.position - b.position)
    : [];
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

      {/* Products sections... */}
      <section className='mt-10 px-4 lg:px-0'>
        <div className='flex justify-between items-center'>
          <h1 className='text-xl lg:text-2xl font-semibold'>تخفيضات</h1>
          <Link href="/products/Promotions" className='text-[#3B65FA] flex items-center gap-1 cursor-pointer hover:underline w-fit text-sm lg:text-base'>
            عرض الكل
            <ArrowRight size={16} className="rotate-180" />
          </Link>
        </div>
        <RenderProducts Products={Promotions && Promotions.slice(0, 3)} Class={'mt-8'} />
      </section>

      <section className='mt-10 px-4 lg:px-0'>
        <div className='flex justify-between items-center'>
          <h1 className='text-xl lg:text-2xl font-semibold'>أحدث المنتجات</h1>
          <Link href="/products/Newest" className='text-[#3B65FA] flex items-center gap-1 cursor-pointer hover:underline w-fit text-sm lg:text-base'>
            عرض الكل
            <ArrowRight size={16} className="rotate-180" />
          </Link>
        </div>
        <RenderProducts Products={NewestProducts.slice(0, 3)} Class={'mt-8'} />
      </section>

      <section className='mt-10 px-4 lg:px-0 mb-10'>
        <div className='flex justify-between items-center'>
          <h1 className='text-xl lg:text-2xl font-semibold'>جميع المنتجات</h1>
          <Link href="/products/All" className='text-[#3B65FA] flex items-center gap-1 cursor-pointer hover:underline w-fit text-sm lg:text-base'>
            عرض الكل
            <ArrowRight size={16} className="rotate-180" />
          </Link>
        </div>
        <RenderProducts Products={Products.slice(0, 12)} Class={'mt-8'} />
      </section>
    </main>
  )
}

export default Main
