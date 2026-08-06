'use client'

import Breadcrumb from '@/components/Breadcrumb'
import { usePublicStats } from '@/components/useFetchWilayas'
import {
  BedDouble,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  RefreshCcw,
  ShoppingBag,
  Sparkles,
  Truck,
  Wallet,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const MIN_DELIVERED_ORDERS = 1241

const featureCards = [
  {
    icon: <BedDouble size={24} className='text-primary' />,
    title: 'مفروشات عصرية وكلاسيكية',
    description: 'تشكيلة متنوعة من المفروشات تناسب جميع الأذواق وتتماشى مع مختلف الديكورات',
  },
  {
    icon: <Sparkles size={24} className='text-primary' />,
    title: 'جودة عالية بأسعار مناسبة',
    description: 'نختار لك منتجاتنا بعناية لنجمع بين الجودة الفائقة والأسعار التي تناسب الجميع',
  },
  {
    icon: <Truck size={24} className='text-primary' />,
    title: 'التوصيل متوفر لجميع الولايات',
    description: 'نوصل طلبك إلى باب منزلك أينما كنت في الجزائر',
  },
]

const trustBadges = [
  {
    icon: <Wallet size={24} className='text-primary' />,
    title: 'الدفع عند الاستلام',
    description: 'اطلب براحة بال وادفع فقط عند وصول طلبك',
  },
  {
    icon: <MessageCircle size={24} className='text-primary' />,
    title: 'خدمة العملاء عبر الواتساب',
    description: 'فريقنا جاهز للإجابة عن استفساراتك في أي وقت',
  },
  {
    icon: <RefreshCcw size={24} className='text-primary' />,
    title: 'التبادل والاسترجاع',
    description: 'مرونة كاملة لاستبدال المنتجات التي لا تناسبك',
  },
]

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US')
}

function AboutPage() {
  const { data: stats, isLoading, isError, refetch } = usePublicStats()

  const deliveredOrders = MIN_DELIVERED_ORDERS + (Number(stats?.totalDeliveredOrders) || 0)
  const wilayasCount = stats?.wilayasCount || 58
  const totalProducts = stats?.totalProducts || 0

  const statItems = [
    {
      icon: <MapPin size={24} className='text-primary' />,
      label: 'ولاية مغطاة',
      value: formatNumber(wilayasCount),
    },
    {
      icon: <Package size={24} className='text-primary' />,
      label: 'منتج',
      value: formatNumber(totalProducts),
    },
    {
      icon: <CheckCircle2 size={24} className='text-primary' />,
      label: 'طلبية تم توصيلها',
      value: formatNumber(deliveredOrders),
    },
  ]

  return (
    <div className='w-full h-auto min-h-screen px-2.5 sm:px-6 lg:px-20 overflow-x-hidden'>
      <section className='w-full h-auto'>
        <Breadcrumb />

        {/* Header */}
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6 lg:mt-8 mb-8 lg:mb-14'>
          <h2 className='text-2xl sm:text-3xl lg:text-4xl font-bold'>من نحن</h2>
        </div>

        {/* Hero / Story */}
        <div className='w-full bg-white border border-stroke rounded-xl p-6 lg:p-12 mb-8 lg:mb-14'>
          <span className='inline-block bg-primary/10 text-primary text-xs lg:text-sm font-semibold px-4 py-1.5 rounded-full mb-5 lg:mb-6'>
            قصة متجرنا
          </span>
          <div className='flex items-center gap-4 mb-1'>
            <Image src='/logo.png' alt='شعار مفروشات البيت الذهبي' width={64} height={64} className='flex-shrink-0' />
            <div className='flex flex-col'>
              <h3 className='text-2xl sm:text-3xl lg:text-4xl font-bold'>مفروشات البيت الذهبي</h3>
              <p className='text-secondary text-sm lg:text-base font-medium'>
                La Maison D&apos;or
              </p>
            </div>

          </div>

          <p className='text-secondary text-sm lg:text-base leading-7 lg:leading-8 max-w-3xl'>
            مفروشات البيت الذهبي متجرك الموثوق لكل ما يخص المفروشات المنزلية. منذ انطلاقتنا،
            حرصنا على تقديم تشكيلة واسعة من المفروشات العصرية والكلاسيكية التي تجمع بين الذوق
            الرفيع والجودة العالية، بأسعار تناسب الجميع. نؤمن أن بيتك يستحق الأفضل، لذلك نختار
            لك منتجاتنا بعناية فائقة لتضفي على منزلك راحة ودفئًا لا يضاهى، مع خدمة توصيل تغطي
            جميع ولايات الوطن وخدمة عملاء ترافقك في كل خطوة.
          </p>
        </div>

        {/* Feature Cards */}
        <div className='w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8 lg:mb-14'>
          {featureCards.map((card) => (
            <div key={card.title} className='bg-white border border-stroke rounded-xl p-6 lg:p-8 flex flex-col'>
              <div className='w-12 h-12 bg-stroke/50 rounded-full flex items-center justify-center mb-5'>
                {card.icon}
              </div>
              <h3 className='text-lg lg:text-xl font-semibold mb-2'>{card.title}</h3>
              <p className='text-secondary text-sm lg:text-base'>{card.description}</p>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className='w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8 lg:mb-14'>
          {trustBadges.map((badge) => (
            <div key={badge.title} className='bg-white border border-stroke rounded-xl p-6 lg:p-8 flex flex-col'>
              <div className='w-12 h-12 bg-stroke/50 rounded-full flex items-center justify-center mb-5'>
                {badge.icon}
              </div>
              <h3 className='text-lg lg:text-xl font-semibold mb-2'>{badge.title}</h3>
              <p className='text-secondary text-sm lg:text-base'>{badge.description}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className='w-full mb-8 lg:mb-14'>
          {isLoading ? (
            <div className='w-full flex flex-col items-center justify-center py-16 lg:py-20 bg-white border border-stroke rounded-xl'>
              <Loader2 size={32} className='animate-spin text-primary mb-4' />
              <p className='text-secondary text-sm lg:text-base'>جارٍ تحميل الإحصائيات...</p>
            </div>
          ) : isError ? (
            <div className='w-full flex flex-col items-center justify-center py-16 lg:py-20 bg-white border border-stroke rounded-xl'>
              <h3 className='text-xl lg:text-2xl font-semibold mb-2'>تعذر تحميل الإحصائيات</h3>
              <p className='text-secondary text-sm lg:text-base mb-5'>
                حدث خطأ أثناء جلب البيانات، يرجى المحاولة لاحقًا
              </p>
              <button
                onClick={() => refetch()}
                className='bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-full font-medium transition-colors text-sm lg:text-base'
              >
                إعادة المحاولة
              </button>
            </div>
          ) : (
            <div className='w-full grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6'>
              {statItems.map((stat) => (
                <div
                  key={stat.label}
                  className='bg-white border border-stroke rounded-xl p-6 lg:p-8 flex flex-col items-center text-center'
                >
                  <div className='w-12 h-12 bg-stroke/50 rounded-full flex items-center justify-center mb-4'>
                    {stat.icon}
                  </div>
                  <p className='text-3xl lg:text-4xl font-bold text-primary mb-2'>{stat.value}</p>
                  <p className='text-secondary text-sm lg:text-base font-medium'>{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className='w-full bg-primary rounded-xl p-8 lg:p-14 flex flex-col lg:flex-row justify-between items-center gap-8 lg:gap-10'>
          <div className='text-center lg:text-right'>
            <h3 className='text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2'>
              جاهز لتجديد بيتك؟
            </h3>
            <p className='text-white/85 text-sm lg:text-base'>
              تصفح تشكيلتنا الواسعة واطلب الآن، التوصيل متوفر لجميع الولايات
            </p>
          </div>
          <div className='flex flex-col sm:flex-row gap-3 lg:gap-4 w-full sm:w-auto'>
            <Link
              href='/products/All'
              className='flex items-center justify-center gap-2 bg-white text-primary hover:bg-white/90 px-8 py-3 rounded-full font-semibold transition-colors text-sm lg:text-base w-full sm:w-auto'
            >
              تسوق الآن
              <ShoppingBag size={18} />
            </Link>
            <Link
              href='/contact'
              className='flex items-center justify-center gap-2 border border-white/60 text-white hover:bg-white/10 px-8 py-3 rounded-full font-semibold transition-colors text-sm lg:text-base w-full sm:w-auto'
            >
              اتصل بنا
              <Phone size={18} />
            </Link>
          </div>
        </div>

        {/* WhatsApp */}
        <div className='w-full flex flex-col sm:flex-row justify-between items-center gap-4 bg-green-50 border border-green-200 rounded-xl p-6 lg:p-8 mt-6 lg:mt-8'>
          <div className='flex items-center gap-4'>
            <div className='w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0'>
              <MessageCircle size={22} className='text-green-600' />
            </div>
            <div>
              <h3 className='text-lg lg:text-xl font-semibold mb-1'>عندك سؤال؟</h3>
              <p className='text-secondary text-sm lg:text-base'>
                راسلنا على الواتساب وسنرد عليك في أقرب وقت
              </p>
            </div>
          </div>
          <a
            href='https://wa.me/213541355919'
            target='_blank'
            rel='noopener noreferrer'
            className='bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full font-medium transition-colors text-sm lg:text-base w-full sm:w-auto text-center'
          >
            راسلنا على الواتساب
          </a>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
