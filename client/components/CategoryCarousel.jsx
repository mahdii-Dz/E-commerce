'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'

function CategoryCard({ cat }) {
  return (
    <Link
      href={`/products/All?category=${cat.name}`}
      className="group relative w-64 lg:w-full h-72 lg:h-80 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100 block"
    >
      <Image
        src={cat.image_url}
        alt={cat.name}
        fill
        sizes="(max-width: 1024px) 256px, 25vw"
        className="object-cover group-hover:scale-110 transition-transform duration-300"
        quality={85}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col items-center gap-3">
        <h3 className="text-white font-semibold text-lg drop-shadow text-center line-clamp-1">
          {cat.name}
        </h3>
        <span className="flex items-center gap-1 px-5 py-2.5 rounded-full bg-[#D4AF37] text-white text-sm font-medium group-hover:bg-[#c19e30] transition-colors">
          تسوق المنتجات
          <ArrowRight size={14} className="rotate-180" />
        </span>
      </div>
    </Link>
  )
}

function CategoryCarousel({ Categories }) {
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  return (
    <>
      <style>{`
        .category-carousel {
          overflow: hidden;
        }
        .category-carousel .swiper-wrapper {
          display: flex;
        }
        .category-carousel .swiper-slide {
          flex-shrink: 0;
          min-width: 0;
          width: auto;
        }
        @media (min-width: 1024px) {
          .category-carousel .swiper-slide {
            width: calc(25% - 18px);
          }
        }
        .category-carousel .swiper-pagination {
          position: relative;
          margin-top: 16px;
        }
        .category-carousel .swiper-pagination-bullet {
          width: 8px;
          height: 8px;
          background: #d1d5db;
          opacity: 1;
          transition: all 0.2s;
        }
        .category-carousel .swiper-pagination-bullet-active {
          width: 24px;
          border-radius: 4px;
          background: #D4AF37;
        }
        .category-carousel .swiper-button-disabled {
          opacity: 0.25 !important;
          cursor: default;
          pointer-events: none;
        }
        .category-carousel .swiper-button-disabled:hover {
          transform: none !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important;
        }
      `}</style>
      <Swiper
        slidesPerView={'auto'}
        spaceBetween={16}
        breakpoints={{
          1024: { slidesPerView: 4, spaceBetween: 24 },
        }}
        onBeforeInit={(swiper) => {
          swiper.params.navigation.prevEl = prevRef.current;
          swiper.params.navigation.nextEl = nextRef.current;
          swiper.navigation.init();
          swiper.navigation.update();
        }}
        pagination={{ clickable: true }}
        modules={[Navigation, Pagination]}
        className='category-carousel w-full pb-10'
      >
        {Categories.map((cat) => (
          <SwiperSlide key={cat.id}>
            <CategoryCard cat={cat} />
          </SwiperSlide>
        ))}
        <button
          ref={nextRef}
          className="absolute top-1/2 -translate-y-1/2 left-2 z-10 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all"
        >
          <ChevronLeft size={24} className="text-[#D4AF37]" />
        </button>
        <button
          ref={prevRef}
          className="absolute top-1/2 -translate-y-1/2 right-2 z-10 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all"
        >
          <ChevronRight size={24} className="text-[#D4AF37]" />
        </button>
      </Swiper>
    </>
  )
}

export default CategoryCarousel
