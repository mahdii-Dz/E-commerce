'use client'

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useContext, useEffect, useState } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { GlobalContext } from "@/app/context/Context";
import { getProduct } from '@/lib/server-fetch';

export default function ProductCard({ product, isCart, Cart, setCart }) {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleAddToCart(product) {
    setCart(prevCart => {
      const newCart = [...prevCart, product];
      localStorage.setItem('Cart', JSON.stringify(newCart));
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ ecommerce: null });
      window.dataLayer.push({
        event: 'add_to_cart',
        ecommerce: {
          currency: 'DZD',
          value: product.price,
          items: [{
            item_id: product.id,
            item_name: product.name,
            price: product.price,
            quantity: 1,
            item_category: product.categories?.[0]?.name || '',
          }]
        }
      });
      return newCart;
    });
  }

  function handleRemoveFromCart(productId) {
    setCart(prevCart => {
      const newCart = prevCart.filter(item => item.id !== productId);
      localStorage.setItem('Cart', JSON.stringify(newCart));
      return newCart;
    });
  }

  const prefetchProduct = () => {
    queryClient.prefetchQuery({
      queryKey: ['product', product.id],
      queryFn: () => getProduct(product.id),
    });
  };

  const isInCart = mounted && Cart.find(item => item.id === product.id);

  return (
    <div 
      key={product.id} 
      className="w-full h-auto bg-white rounded-xl border relative border-stroke overflow-hidden flex flex-col"
    >
      {/* Discount Badge */}
      {product.discount_percentage > 0 && (
        <div className='discount bg-primary absolute top-2 right-2 px-0.5 rounded-full z-10'>
          <p className='text-white text-xs px-2 py-1'>{product.discount_percentage}%-</p>
        </div>
      )}

      {/* Product Image */}
      <div className='w-full h-60 border-b border-stroke cursor-pointer overflow-hidden bg-gray-50 relative'>
        <Link 
          href={`/product/${product.id}`}
          onMouseEnter={prefetchProduct}
        >
          <Image
            src={product.image_url || product.thumbnail}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
        </Link>
      </div>

      {/* Product Info */}
      <div className="py-3 sm:py-4 px-2 sm:px-3 flex flex-col gap-2 flex-1">
        <div className="flex-1">
          <p className='text-secondary text-xs sm:text-sm'>
            {product.categories?.map(cat => cat.name).join(' | ')}
          </p>
          <h2 className="text-sm sm:text-base font-semibold mt-1 line-clamp-1">{product.name}</h2>
          <p className='text-xs sm:text-sm line-clamp-2 text-secondary'>{product.description}</p>
        </div>

        {/* Price */}
        {product.compare_price > product.price ? (
          <p className="text-gray-600 text-base sm:text-lg">
            <span className='line-through text-secondary text-sm'>
              {product.compare_price}DA
            </span>
            <span className="hidden sm:inline"> | </span>
            <br className="sm:hidden" />
            <span className='text-primary font-semibold'>
              {product.price}DA
            </span>
          </p>
        ) : (
          <p className="text-red-400 text-base sm:text-lg font-semibold">
            {product.price}DA
          </p>
        )}

        {/* Action Buttons */}
        {isCart ? (
          <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-auto">
            <button 
              onClick={() => handleRemoveFromCart(product.id)} 
              className='border flex items-center justify-center gap-2 font-medium cursor-pointer border-stroke px-3 sm:px-4 py-2 rounded-full bg-white text-sm'
            >
              إزالة
            </button>
            <Link 
              href={`/product/${product.id}`} 
              className="w-full flex items-center justify-center gap-2 font-medium cursor-pointer text-white py-2 rounded-full bg-primary text-sm"
            >
              اشتر الآن
            </Link>
          </div>
        ) : isInCart ? (
          <button 
            onClick={() => handleRemoveFromCart(product.id)} 
            className='border flex items-center justify-center gap-2 font-medium cursor-pointer border-stroke px-3 sm:px-4 py-2 rounded-full bg-white w-full sm:w-fit text-sm mt-auto'
          >
            <ShoppingCart size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="hidden sm:inline">إزالة من السلة</span>
            <span className="sm:hidden">إزالة</span>
          </button>
        ) : (
          <button 
            onClick={() => handleAddToCart(product)} 
            className='border flex items-center justify-center gap-2 font-medium cursor-pointer border-stroke px-3 sm:px-4 py-2 rounded-full bg-white w-full sm:w-fit text-sm mt-auto hover:bg-gray-50 transition-colors'
          >
            <ShoppingCart size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="hidden sm:inline">أضف إلى السلة</span>
            <span className="sm:hidden">إضافة</span>
          </button>
        )}
      </div>
    </div>
  );
}
