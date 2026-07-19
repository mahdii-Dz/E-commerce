'use client'
import { ChartBarDefault } from '@/components/BarChart';
import { ChartPieDonut } from '@/components/DonutChart';
import OrdersPerWilaya from '@/components/OrdersPerWilaya';
import { useFetchSingleProduct } from '@/components/useFetchSingleProduct'
import React from 'react'

function Dashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useFetchSingleProduct('/api/shop/stats')
  const { totalProducts, totalSoldProducts, totalOrders, totalDeliveredOrders, dailyTotals, CategoryStats, wilayaStats } = stats || {};

  return (
    <main className='w-full pt-6 px-4 sm:px-6 lg:px-9 flex flex-col gap-6 pb-16'>
      <h1 className='text-3xl font-bold'>لوحة التحكم</h1>
      <div className='flex flex-col md:flex-row items-stretch gap-6 md:gap-9'>
        <div className='bg-white border-2 w-full md:flex-1 border-stroke flex flex-col items-start gap-1 rounded-xl py-4 px-5.5'>
          <p className='text-sm font-medium text-secondary'>إجمالي المنتجات</p>
          {
            totalProducts != null && totalProducts !== undefined ? (
              <h2 className='text-[28px] font-semibold text-primary'>{totalProducts}</h2>
            ) : (
              <p className='text-sm font-medium text-primary h-10.5 pt-4 '>جار التحميل...</p>
            )
          }
        </div>
        <div className='bg-white border-2 w-full md:flex-1 border-stroke flex flex-col items-start gap-1 rounded-xl py-4 px-5.5'>
          <p className='text-sm font-medium text-secondary'>إجمالي المنتجات المباعة</p>
          {
            totalSoldProducts != null && totalSoldProducts !== undefined ? (
              <h2 className='text-[28px] font-semibold text-primary'>{totalSoldProducts}</h2>
            ) : (
              <p className='text-sm font-medium text-primary h-10.5 pt-4 '>جار التحميل...</p>
            )
          }
        </div>
        <div className='bg-white border-2 w-full md:flex-1 border-stroke flex flex-col items-start gap-1 rounded-xl py-4 px-5.5'>
          <p className='text-sm font-medium text-secondary'>إجمالي الطلبات</p>
          {
            totalOrders != null && totalOrders !== undefined ? (
              <h2 className='text-[28px] font-semibold text-primary'>{totalOrders}</h2>
            ) : (
              <p className='text-sm font-medium text-primary h-10.5 pt-4 '>loading...</p>
            )
          }
        </div>
        <div className='bg-white border-2 w-full md:flex-1 border-stroke flex flex-col items-start gap-1 rounded-xl py-4 px-5.5'>
          <p className='text-sm font-medium text-secondary'>إجمالي الطلبات تم توصيلها</p>
          {
            totalDeliveredOrders != null && totalDeliveredOrders !== undefined ? (
              <h2 className='text-[28px] font-semibold text-primary'>{totalDeliveredOrders}</h2>
            ) : (
              <p className='text-sm font-medium text-primary h-10.5 pt-4 '>جار التحميل...</p>
            )
          }
        </div>
      </div>
      <ChartBarDefault chartData={dailyTotals} isLoading={statsLoading} error={statsError} />
      <div className='flex flex-col lg:flex-row w-full gap-6'>
        <div className='w-full lg:w-1/2'>
          <ChartPieDonut chartData={CategoryStats} isLoading={statsLoading} error={statsError} />
        </div>
        <div className='w-full lg:w-1/2'>
          <OrdersPerWilaya data={wilayaStats} isLoading={statsLoading} error={statsError} />
        </div>
      </div>
    </main>
  )
}

export default Dashboard