'use client'
import { GlobalContext } from '@/app/context/Context';
import Breadcrumb from '@/components/Breadcrumb'
import Footer from '@/components/Footer';
import RenderProducts from '@/components/RenderProducts'
import { useContext, useEffect, useState } from 'react'

function CartPage() {
  const { Cart } = useContext(GlobalContext)


  return (
    <div className='w-full h-auto pt-30'>
      <section className='w-full h-auto px-20'>
        <Breadcrumb />
        <h2 className='text-4xl font-bold mt-8 mb-14'>My Cart</h2>
        <div className='w-full mb-16'>
          <RenderProducts Products={Cart ? Cart : CartProducts} Class={'grid-cols-4!'} isCart={true} />
        </div>
      </section>
      <Footer />
    </div>
  )
}

export default CartPage