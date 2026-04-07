import ProductDashboard from '@/components/ProductDashboard'
import React from 'react'

function page() {
  return (
    <main className='w-full pt-6 px-9 flex flex-col gap-6 pb-16'>
      <ProductDashboard />
    </main>
  )
}

export default page