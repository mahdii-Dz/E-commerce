'use client'

import { GlobalContext } from "@/app/context/Context";
import { useContext } from "react";
import ProductCard from "./ProductCard";

function RenderProducts({ Products, Class, isCart = false }) {
  const { Cart, setCart, loading } = useContext(GlobalContext);

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