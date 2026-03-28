'use client'

import { GlobalContext } from '@/app/context/Context';
import Breadcrumb from '@/components/Breadcrumb'
import Footer from '@/components/Footer';
import RenderProducts from '@/components/RenderProducts'
import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useContext } from 'react'

function CartPage() {
  const { Cart } = useContext(GlobalContext)

  const isEmpty = !Cart || Cart.length === 0;

  return (
    <div className='w-full h-auto min-h-screen pt-24 lg:pt-30 px-4 sm:px-6 lg:px-20 overflow-x-hidden'>
      <section className='w-full h-auto'>
        <Breadcrumb />
        
        {/* Header */}
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6 lg:mt-8 mb-8 lg:mb-14'>
          <h2 className='text-2xl sm:text-3xl lg:text-4xl font-bold'>سلتي</h2>
          
          {!isEmpty && (
            <p className='text-secondary text-sm lg:text-base'>
              {Cart.length} {Cart.length === 1 ? 'عنصر' : 'عناصر'} في السلة
            </p>
          )}
        </div>

        {/* Cart Content */}
        <div className='w-full mb-12 lg:mb-16'>
          {isEmpty ? (
            /* Empty Cart State */
            <div className='w-full flex flex-col items-center justify-center py-16 lg:py-24 bg-white border border-stroke rounded-xl'>
              <div className='w-20 h-20 lg:w-24 lg:h-24 bg-stroke/50 rounded-full flex items-center justify-center mb-6'>
                <ShoppingCart size={32} className='text-secondary lg:w-10 lg:h-10' />
              </div>
              <h3 className='text-xl lg:text-2xl font-semibold mb-2'>سلة التسوق فارغة</h3>
              <p className='text-secondary text-sm lg:text-base mb-6 text-center px-4'>
                يبدو أنك لم تضف أي شيء إلى سلتك بعد
              </p>
              <Link 
                href="/products/All"
                className='bg-primary text-white px-6 lg:px-8 py-2.5 lg:py-3 rounded-full font-medium hover:bg-primary/90 transition-colors text-sm lg:text-base'
              >
                ابدأ التسوق
              </Link>
            </div>
          ) : (
            /* Cart Products Grid */
            <RenderProducts 
              Products={Cart} 
              Class={'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} 
              isCart={true} 
            />
          )}
        </div>
       
      </section>
      
    </div>
  )
}

export default CartPage