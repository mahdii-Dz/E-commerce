'use client'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'

function SideBar({ category, isLoadingCategories, isOpen, onClose }) {
    const sidebarContent = (
        <>
            {/* Featured Section */}
            <div className='w-full'>
                <h2 className='text-lg font-semibold'>المميز</h2>
                <div className='w-full mt-5.5 mr-4'>
                    <Link href='/products/Newest' onClick={onClose}>
                        <div className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'>
                            <Image src={'/star.png'} width={20} height={20} alt='star' />
                            جديد
                        </div>
                    </Link>
                    <Link href='/products/Promotions' onClick={onClose}>
                        <div className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'>
                            <Image src={'/loudspeaker.png'} className='rotate-30' width={20} height={20} alt='loudspeaker' />
                            تخفيضات
                        </div>
                    </Link>
                    <Link href='/products/TopSold' onClick={onClose}>
                        <div className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'>
                            <Image src={'/rank.png'} width={20} height={20} alt='rank' />
                            الأكثر مبيعاً
                        </div>
                    </Link>
                    <Link href='/products/BestDeal' onClick={onClose}>
                        <div className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'>
                            <Image src={'/best-price.png'} width={20} height={20} alt='best-price' />
                            أفضل عرض
                        </div>
                    </Link>
                </div>
            </div>

            {/* Categories Section */}
            <div className='w-full mt-10'>
                <h2 className='text-lg font-semibold'>الفئات</h2>
                <div className='w-full mt-5.5 mr-4'>
                    {isLoadingCategories ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className='p-3 rounded-xl w-full animate-pulse'>
                                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                                </div>
                            ))}
                        </div>
                    ) : category?.length > 0 ? (
                        category.map((cat) => (
                            <Link key={cat.id} href={`/products/All?category=${cat.name}`} onClick={onClose}>
                                <div className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'>
                                    <span className="truncate">{cat.name}</span>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="p-3 text-gray-500">لا توجد فئات متاحة</div>
                    )}
                </div>
            </div>

            <div className='w-full h-px bg-stroke mt-5'></div>

            {/* Quick Links */}
            <div className='w-full mt-5'>
                <h2 className='text-lg font-semibold'>روابط سريعة</h2>
                <div className='w-full mt-5.5 mr-4'>
                    <Link href='/products/All' onClick={onClose}>
                        <div className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'>
                            <Image src={'/online-shopping.png'} width={20} height={20} alt='shopping' />
                            جميع المنتجات
                        </div>
                    </Link>
                    <Link href='/contact' onClick={onClose}>
                        <div className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'>
                            <Image src={'/phone-call.png'} width={20} height={20} alt='phone' />
                            اتصل بنا
                        </div>
                    </Link>
                </div>
            </div>
        </>
    )

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className='hidden lg:flex bg-white border border-stroke w-1/5 rounded-xl p-6 flex-col justify-between items-start h-fit '>
                {sidebarContent}
            </aside>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-50"
                    onClick={onClose}
                    role="presentation"
                />
            )}

            {/* Mobile Sidebar */}
            <div className={`
                lg:hidden fixed top-0 right-0 h-full w-72 bg-white border-l border-stroke z-50 p-6 flex-col justify-between items-start overflow-y-auto
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                <button
                    onClick={onClose}
                    className="absolute top-4 left-4 p-2 hover:bg-gray-100 rounded-lg"
                    aria-label="Close sidebar"
                >
                    <X size={24} />
                </button>
                <div className="mt-12">
                    {sidebarContent}
                </div>
            </div>
        </>
    )
}

export default SideBar