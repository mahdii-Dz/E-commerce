'use client'

import { GlobalContext } from "@/app/context/Context";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useContext, useRef, useSyncExternalStore } from "react";
import ProductCard from "./ProductCard";
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';

const DESKTOP_QUERY = '(min-width: 1024px)';

const subscribeToDesktopQuery = (callback) => {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
};

const getDesktopSnapshot = () => window.matchMedia(DESKTOP_QUERY).matches;
const getDesktopServerSnapshot = () => true;

function RenderProducts({ Products, Class, isCart = false, scrollable = false }) {
  const { Cart, setCart, loading } = useContext(GlobalContext);
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const isDesktop = useSyncExternalStore(subscribeToDesktopQuery, getDesktopSnapshot, getDesktopServerSnapshot);

  const hasManyProducts = Array.isArray(Products) && Products.length > 3;
  const useCarousel = scrollable && (!isDesktop || hasManyProducts);

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
  );

  if (useCarousel) {
    return (
      <>
        <style>{`
          .products-swiper {
            overflow: hidden;
          }
          .products-swiper .swiper-wrapper {
            display: flex;
          }
          .products-swiper .swiper-slide {
            flex-shrink: 0;
            width: 100%;
            min-width: 0;
          }
          .products-swiper .swiper-pagination {
            position: relative;
            margin-top: 16px;
          }
          .products-swiper .swiper-pagination-bullet {
            width: 8px;
            height: 8px;
            background: #d1d5db;
            opacity: 1;
            transition: all 0.2s;
          }
          .products-swiper .swiper-pagination-bullet-active {
            width: 24px;
            border-radius: 4px;
            background: #D4AF37;
          }
          .products-swiper .swiper-button-disabled {
            opacity: 0.25 !important;
            cursor: default;
            pointer-events: none;
          }
          .products-swiper .swiper-button-disabled:hover {
            transform: none !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important;
          }
        `}</style>
        <div className={`w-full ${Class || ''}`}>
          <Swiper
            slidesPerView={1}
            spaceBetween={16}
            breakpoints={{
              640: { slidesPerView: 2, spaceBetween: 16 },
              1024: { slidesPerView: 3, spaceBetween: 24 },
            }}
            onBeforeInit={(swiper) => {
              swiper.params.navigation.prevEl = prevRef.current;
              swiper.params.navigation.nextEl = nextRef.current;
              swiper.navigation.init();
              swiper.navigation.update();
            }}
            pagination={{ clickable: true }}
            modules={[Navigation, Pagination]}
            className='products-swiper w-full pb-10'
          >
            {loading ? (
              Array.from({ length: getSkeletonCount() }).map((_, index) => (
                <SwiperSlide key={index}>
                  {renderSkeleton(index)}
                </SwiperSlide>
              ))
            ) : Products && Products.length > 0 ? (
              Products.map((product) => (
                <SwiperSlide key={product.id}>
                  <ProductCard
                    product={product}
                    isCart={isCart}
                    Cart={Cart}
                    setCart={setCart}
                  />
                </SwiperSlide>
              ))
            ) : (
              <div className="w-full flex items-center justify-center py-12 text-gray-500">
                لا توجد منتجات متاحة.
              </div>
            )}
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
        </div>
      </>
    );
  }

  return (
    <>
      {loading ? (
        <div className={`w-full grid gap-4 sm:gap-6 ${getGridClasses()} ${Class}`}>
          {Array.from({ length: getSkeletonCount() }).map((_, index) => renderSkeleton(index))}
        </div>
      ) : (
        <div className={`w-full grid gap-4 sm:gap-6 ${getGridClasses()} ${Class}`}>
          {Products && Products.length > 0 ? (
            Products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                isCart={isCart}
                Cart={Cart}
                setCart={setCart}
              />
            ))
          ) : (
            <div className={`w-full flex items-center justify-center py-12 col-span-full text-gray-500`}>
              لا توجد منتجات متاحة.
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default RenderProducts
