'use client'
import { ChartBarDefault } from '@/components/BarChart';
import { ChartPieDonut } from '@/components/DonutChart';
import { useFetchSingleProduct } from '@/components/useFetchSingleProduct'
import React from 'react'

function Dashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useFetchSingleProduct('http://localhost:5000/api/shop/get-stats')
  const { totalProducts, totalSoldProducts, totalOrders , dailyTotals, CategoryStats } = stats || {};


  return (
    <main className='w-full pt-6 px-9 flex flex-col gap-6 pb-16 ml-64'>
      <h1 className='text-3xl font-bold'>Dashboard</h1>
      <div className='flex items-center gap-9'>
        <div className='bg-white border-2 w-1/6 border-stroke flex flex-col items-start gap-1 rounded-xl py-4 px-5.5'>
          <p className='text-sm font-medium text-secondary'>Total products</p>
          {
            totalProducts != null && totalProducts !== undefined ? (
              <h2 className='text-[28px] font-semibold text-primary'>{totalProducts}</h2>
            ) : (
              <p className='text-sm font-medium text-primary h-10.5 pt-4 '>loading...</p>
            )
          }
        </div>
        <div className='bg-white border-2 w-1/6 border-stroke flex flex-col items-start gap-1 rounded-xl py-4 px-5.5'>
          <p className='text-sm font-medium text-secondary'>Total Sold Products</p>
          {
            totalSoldProducts != null && totalSoldProducts !== undefined ? (
              <h2 className='text-[28px] font-semibold text-primary'>{totalSoldProducts}</h2>
            ) : (
              <p className='text-sm font-medium text-primary h-10.5 pt-4 '>loading...</p>
            )
          }
        </div>
        <div className='bg-white border-2 w-1/6 border-stroke flex flex-col items-start gap-1 rounded-xl py-4 px-5.5'>
          <p className='text-sm font-medium text-secondary'>Total Orders</p>
          {
            totalOrders != null && totalOrders !== undefined ? (
              <h2 className='text-[28px] font-semibold text-primary'>{totalOrders}</h2>
            ) : (
              <p className='text-sm font-medium text-primary h-10.5 pt-4 '>loading...</p>
            )
          }
        </div>
      </div>
      <ChartBarDefault chartData={dailyTotals} isLoading={statsLoading} error={statsError} />
      <div className='flex'>
        <ChartPieDonut chartData={CategoryStats} isLoading={statsLoading} error={statsError} />
      </div>
    </main>
  )
}

export default Dashboard