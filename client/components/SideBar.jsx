'use client'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

function SideBar() {
    const [category, setCategory] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchCategories() {
            try {
                const res = await fetch('http://localhost:5000/api/shop/get-categories')
                if (!res.ok) throw new Error('Failed to fetch')

                const data = await res.json()
                setCategory(data)
            } catch (err) {
                console.error('Error:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchCategories()
    }, [])

    return (
        <aside className='bg-white border border-stroke w-1/5 rounded-xl p-6 flex flex-col justify-between items-start h-fit'>
            <div className='w-full'>
                <h2 className='text-lg font-semibold'>Featured</h2>
                <div className='w-full mt-5.5 ml-4'>
                    <Link href='/products/Newest' ><div className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'><Image src={'/star.png'} width={20} height={20} alt='star' /> New</div></Link>
                    <Link href='/products/Promotions' ><div className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'><Image src={'/loudspeaker.png'} className='-rotate-30' width={20} height={20} alt='loudspeaker' />Promotion</div></Link>
                    <Link href='/products/TopSold' ><div className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'><Image src={'/rank.png'} width={20} height={20} alt='rank' />Top Sold</div></Link>
                    <Link href='/products/BestDeal' ><div className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'><Image src={'/best-price.png'} width={20} height={20} alt='best-price' />Best Deal</div></Link>
                </div>
            </div>

            <div className='w-full mt-10'>
                <h2 className='text-lg font-semibold'>Categories</h2>
                <div className='w-full mt-5.5 ml-4'>
                    {loading ? (
                        <div>Loading...</div>
                    ) : category.length > 0 ? (
                        category.map((cat) => (
                            <Link key={cat.id} href={`/products/All?category=${cat.name}`}>
                                <div
                                    className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'
                                >
                                    {cat.name}
                                </div>
                            </Link>
                        ))
                    ) : (
                        <li>No categories</li>
                    )}
                </div>
            </div>
            <div className='w-full h-px bg-stroke mt-5 '></div>
            <div className='w-full mt-5'>
                <h2 className='text-lg font-semibold'>Quick Links</h2>
                <div className='w-full mt-5.5 ml-4'>
                    <Link href='/products/All' >
                        <div className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'><Image src={'/online-shopping.png'} width={20} height={20} alt='loudspeaker' />All products</div>
                    </Link>
                    <Link href='/contact' >
                        <div className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'><Image src={'/phone-call.png'} width={20} height={20} alt='rank' />Contact us</div>
                    </Link>
                </div>
            </div>
        </aside>
    )
}

export default SideBar