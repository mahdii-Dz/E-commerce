'use client'

import Breadcrumb from '@/components/Breadcrumb'
import { usePublicWilayasLight } from '@/components/useFetchWilayas'
import { Loader2 } from 'lucide-react'

function DeliveryPage() {
  const { data: wilayas, isLoading, isError } = usePublicWilayasLight()

  return (
    <div className='w-full h-auto min-h-screen px-2.5 sm:px-6 lg:px-20 overflow-x-hidden'>
      <section className='w-full h-auto'>
        <Breadcrumb />

        {/* Header */}
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6 lg:mt-8 mb-8 lg:mb-14'>
          <h2 className='text-2xl sm:text-3xl lg:text-4xl font-bold'>التوصيل</h2>
        </div>

        {/* Table */}
        <div className='w-full mb-12 lg:mb-16'>
          {isLoading ? (
            <div className='w-full flex flex-col items-center justify-center py-16 lg:py-24 bg-white border border-stroke rounded-xl'>
              <Loader2 size={32} className='animate-spin text-primary mb-4' />
              <p className='text-secondary text-sm lg:text-base'>جارٍ تحميل ولايات التوصيل...</p>
            </div>
          ) : isError || !Array.isArray(wilayas) ? (
            <div className='w-full flex flex-col items-center justify-center py-16 lg:py-24 bg-white border border-stroke rounded-xl'>
              <h3 className='text-xl lg:text-2xl font-semibold mb-2'>تعذر تحميل البيانات</h3>
              <p className='text-secondary text-sm lg:text-base text-center px-4'>
                حدث خطأ أثناء جلب ولايات التوصيل، يرجى المحاولة لاحقًا
              </p>
            </div>
          ) : wilayas.length === 0 ? (
            <div className='w-full flex flex-col items-center justify-center py-16 lg:py-24 bg-white border border-stroke rounded-xl'>
              <h3 className='text-xl lg:text-2xl font-semibold mb-2'>لا توجد ولايات متاحة</h3>
            </div>
          ) : (
            <div className='bg-white border border-stroke rounded-xl overflow-hidden overflow-x-auto'>
              <table className='w-full min-w-[600px]'>
                <thead>
                  <tr className='bg-stroke/40 border-b border-stroke'>
                    <th className='text-right px-6 py-4 text-sm font-semibold'>الولاية</th>
                    <th className='text-right px-6 py-4 text-sm font-semibold'>سعر التوصيل للمنزل</th>
                    <th className='text-right px-6 py-4 text-sm font-semibold'>سعر التوصيل إلى نقطة الاستلام</th>
                  </tr>
                </thead>
                <tbody>
                  {wilayas.map((w, idx) => (
                    <tr
                      key={w.code}
                      className={`border-b border-stroke hover:bg-primary/5 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-stroke/20'}`}
                    >
                      <td className='px-6 py-4 lg:py-5'>
                        <span dir='rtl' className='inline-block text-base font-medium'>
                          {w.code} - {w.name}
                        </span>
                      </td>
                      <td className='px-6 py-4 lg:py-5 text-sm lg:text-base text-secondary'>
                        {w.home_delivery_price} د.ج
                      </td>
                      <td className='px-6 py-4 lg:py-5 text-sm lg:text-base text-secondary'>
                        {w.stopdesk_delivery_price} د.ج
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default DeliveryPage
