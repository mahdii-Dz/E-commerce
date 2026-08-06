'use client'

import Breadcrumb from '@/components/Breadcrumb'
import { Facebook, Instagram, Mail, MessageCircle, Phone } from 'lucide-react'

function TikTokIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  )
}

const phoneNumbers = [
  { display: '0541355919', href: 'tel:+213541355919' },
  { display: '0667765367', href: 'tel:+213667765367' },
  { display: '0784141782', href: 'tel:+213784141782' },
]

const socialLinks = [
  { label: 'فيسبوك', href: 'https://www.facebook.com/people/Mafrouchat-La-Maison-dOr-%D9%85%D9%81%D8%B1%D9%88%D8%B4%D8%A7%D8%AA-%D8%A7%D9%84%D8%A8%D9%8A%D8%AA-%D8%A7%D9%84%D8%B0%D9%87%D8%A8%D9%8A/61583222131705/', icon: <Facebook size={22} />, color: 'text-blue-600' },
  { label: 'إنستغرام', href: 'https://www.instagram.com/mafrouchat_la_maison_dor_off', icon: <Instagram size={22} />, color: 'text-pink-600' },
  { label: 'تيك توك', href: 'https://www.tiktok.com/@mafrouchat_la_maison_dor', icon: <TikTokIcon size={22} />, color: 'text-black' },
]

function ContactPage() {
  return (
    <div className='w-full h-auto min-h-screen px-2.5 sm:px-6 lg:px-20 overflow-x-hidden'>
      <section className='w-full h-auto'>
        <Breadcrumb />

        {/* Header */}
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6 lg:mt-8 mb-8 lg:mb-14'>
          <h2 className='text-2xl sm:text-3xl lg:text-4xl font-bold'>اتصل بنا</h2>
        </div>

        {/* Contact Cards */}
        <div className='w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12 lg:mb-16'>
          {/* Phone Numbers */}
          <div className='bg-white border border-stroke rounded-xl p-6 lg:p-8 flex flex-col'>
            <div className='w-12 h-12 bg-stroke/50 rounded-full flex items-center justify-center mb-5'>
              <Phone size={22} className='text-primary' />
            </div>
            <h3 className='text-lg lg:text-xl font-semibold mb-4'>أرقام الهاتف</h3>
            <ul className='flex flex-col gap-2.5'>
              {phoneNumbers.map((phone) => (
                <li key={phone.href}>
                  <a
                    href={phone.href}
                    dir='ltr'
                    className='text-secondary text-sm lg:text-base hover:text-primary transition-colors'
                  >
                    {phone.display}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* WhatsApp */}
          <div className='bg-white border border-stroke rounded-xl p-6 lg:p-8 flex flex-col'>
            <div className='w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-5'>
              <MessageCircle size={22} className='text-green-600' />
            </div>
            <h3 className='text-lg lg:text-xl font-semibold mb-2'>الواتساب</h3>
            <p className='text-secondary text-sm lg:text-base mb-5' dir='ltr'>0541355919</p>
            <a
              href='https://wa.me/213541355919'
              target='_blank'
              rel='noopener noreferrer'
              className='mt-auto bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-full font-medium transition-colors text-sm lg:text-base w-fit'
            >
              راسلنا على الواتساب
            </a>
          </div>

          {/* Email */}
          <div className='bg-white border border-stroke rounded-xl p-6 lg:p-8 flex flex-col'>
            <div className='w-12 h-12 bg-stroke/50 rounded-full flex items-center justify-center mb-5'>
              <Mail size={22} className='text-primary' />
            </div>
            <h3 className='text-lg lg:text-xl font-semibold mb-2'>البريد الإلكتروني</h3>
            <a
              href='mailto:mafrouchat.la.maison.dor@gmail.com'
              dir='ltr'
              className='text-secondary text-sm lg:text-base hover:text-primary transition-colors break-all mt-auto'
            >
              mafrouchat.la.maison.dor@gmail.com
            </a>
          </div>

          {/* Social Media */}
          <div className='bg-white border border-stroke rounded-xl p-6 lg:p-8 flex flex-col'>
            <div className='w-12 h-12 bg-stroke/50 rounded-full flex items-center justify-center mb-5'>
              <span className='text-primary font-bold text-lg'>@</span>
            </div>
            <h3 className='text-lg lg:text-xl font-semibold mb-4'>مواقع التواصل الاجتماعي</h3>
            <ul className='flex flex-col gap-3'>
              {socialLinks.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-3 text-secondary text-sm lg:text-base hover:text-primary transition-colors'
                  >
                    <span className={`w-9 h-9 border border-stroke rounded-full flex items-center justify-center ${social.color}`}>
                      {social.icon}
                    </span>
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ContactPage
