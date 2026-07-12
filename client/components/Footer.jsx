import { Package, TicketPercent, Van, Wallet } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import GoTop from './GoTop'
import Image from 'next/image'

function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className='flex flex-col items-center px-4 sm:px-6 lg:px-20 xl:px-39 pb-3 w-full h-auto bg-white border-t border-stroke mt-16 lg:mt-32 overflow-x-hidden'>
      {/* Features Section */}
      <div className='w-full flex flex-col lg:flex-row border-b border-stroke justify-center items-center py-6 lg:py-11 gap-4 lg:gap-0'>
        {/* Feature 1 */}
        <div className='flex gap-3 lg:gap-4 items-center w-full lg:w-auto justify-center lg:justify-start lg:pl-16 lg:border-l-2 lg:border-stroke py-3 lg:py-6'>
          <Package size={28} className='text-primary flex-shrink-0' />
          <h3 className='text-sm lg:text-base font-medium'>منتجات عالية الجودة</h3>
        </div>
        
        {/* Feature 2 */}
        <div className='flex gap-3 lg:gap-4 items-center w-full lg:w-auto justify-center lg:justify-start lg:px-16 lg:border-l-2 lg:border-stroke py-3 lg:py-6'>
          <Wallet size={28} className='text-primary flex-shrink-0' />
          <h3 className='text-sm lg:text-base font-medium'>أسعار معقولة</h3>
        </div>
        
        {/* Feature 3 */}
        <div className='flex gap-3 lg:gap-4 items-center w-full lg:w-auto justify-center lg:justify-start lg:px-16 lg:border-l-2 lg:border-stroke py-3 lg:py-6'>
          <Van size={28} className='text-primary flex-shrink-0' />
          <h3 className='text-sm lg:text-base font-medium'>توصيل سريع</h3>
        </div>
        
        {/* Feature 4 */}
        <div className='flex gap-3 lg:gap-4 items-center w-full lg:w-auto justify-center lg:justify-start lg:pr-16 py-3 lg:py-6'>
          <TicketPercent size={28} className='text-primary flex-shrink-0' />
          <h3 className='text-sm lg:text-base font-medium'>خصومات هائلة يومية</h3>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className='w-full flex flex-col lg:flex-row justify-between items-center lg:items-start mt-8 lg:mt-18 gap-8 lg:gap-4 text-center lg:text-right'>
        {/* Logo */}
        <div className='flex flex-col items-center lg:items-start gap-2 '>
          <Image src="/logo.png" alt="Logo" width={75} height={75} />
          <h1 className='text-3xl lg:text-4xl font-bold order-1'>La Maison D'or</h1>
        </div>
        
        {/* Contact Info */}
        <div className='order-2 lg:order-2'>
          <h4 className='text-lg lg:text-2xl font-semibold mb-2 lg:mb-4'>عين جاسر، باتنة</h4>
          <p className='border-b-2 text-sm w-fit border-primary mb-2 mx-auto lg:mx-0 hover:text-primary transition-colors'>
            <a href="tel:+213546435362">(+213) 546-435-362</a>
          </p>
          <p className='border-b-2 text-sm w-fit border-primary mx-auto lg:mx-0 hover:text-primary transition-colors'>
            <a href="mailto:support.contact@gmail.com">support.contact@Gmail.com</a>
          </p>
        </div>

        {/* Quick Links */}
        <ul className='flex flex-col gap-2 text-sm order-3'>
          <li className='hover:underline hover:text-primary transition-colors'>
            <Link href="/">الرئيسية</Link>
          </li>
          <li className='hover:underline hover:text-primary transition-colors'>
            <Link href="/about">من نحن</Link>
          </li>
          <li className='hover:underline hover:text-primary transition-colors'>
            <Link href="/delivery">التوصيل</Link>
          </li>
          <li className='hover:underline hover:text-primary transition-colors'>
            <Link href="/contact">اتصل بنا</Link>
          </li>
        </ul>

        {/* Social Links */}
        <ul className='flex flex-col gap-2 text-sm order-4'>
          <li className='hover:underline hover:text-primary transition-colors'>
            <a target='_blank' rel="noopener noreferrer" href="https://www.facebook.com/people/Mafrouchat-La-Maison-dOr-%D9%85%D9%81%D8%B1%D9%88%D8%B4%D8%A7%D8%AA-%D8%A7%D9%84%D8%A8%D9%8A%D8%AA-%D8%A7%D9%84%D8%B0%D9%87%D8%A8%D9%8A/61583222131705/">فيسبوك</a>
          </li>
          <li className='hover:underline hover:text-primary transition-colors'>
            <a target='_blank' rel="noopener noreferrer" href="https://www.instagram.com/mafrouchat_la_maison_dor_off">إنستغرام</a>
          </li>
          <li className='hover:underline hover:text-primary transition-colors'>
            <a target='_blank' rel="noopener noreferrer" href="https://www.tiktok.com/@mafrouchat_la_maison_dor">تيك توك</a>
          </li>
          <li className='hover:underline hover:text-primary transition-colors'>
            <a target='_blank' rel="noopener noreferrer" href="https://wa.me/213541355919">واتس اب</a>
          </li>
        </ul>

        {/* Go Top Button */}
        <div className='order-5 lg:order-5'>
          <GoTop />
        </div>
      </div>

      {/* Copyright */}
      <div className='mt-10 lg:mt-40 text-secondary text-sm text-center'>
        <p>© {currentYear} La Maison D'or. جميع الحقوق محفوظة.</p>
      </div>
    </footer>
  )
}

export default Footer