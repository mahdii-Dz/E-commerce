'use client'
import Image from 'next/image'
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
                <ul className='w-full mt-5.5 ml-4'>
                    <li className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'><Image src={'/star.png'} width={20} height={20} alt='star' /> New</li>
                    <li className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'><Image src={'/loudspeaker.png'} className='-rotate-30' width={20} height={20} alt='loudspeaker' />Promotion</li>
                    <li className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'><Image src={'/rank.png'} width={20} height={20} alt='rank' />Top Sold</li>
                    <li className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'><Image src={'/best-price.png'} width={20} height={20} alt='best-price' />Best Deal</li>
                </ul>
            </div>

            <div className='w-full mt-10'>
                <h2 className='text-lg font-semibold'>Categories</h2>
                <ul className='w-full mt-5.5 ml-4'>
                    {loading ? (
                        <li>Loading...</li>
                    ) : category.length > 0 ? (
                        category.map((cat) => (
                            <li
                                key={cat.id}
                                className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'
                            >
                                {cat.name}
                            </li>
                        ))
                    ) : (
                        <li>No categories</li>
                    )}
                </ul>
            </div>
            <div className='w-full h-px bg-stroke mt-5 '></div>
            <div className='w-full mt-5'>
                <h2 className='text-lg font-semibold'>Quick Links</h2>
                <ul className='w-full mt-5.5 ml-4'>
                    <li className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'><Image src={'/online-shopping.png'} width={20} height={20} alt='loudspeaker' />All products</li>
                    <li className='flex items-center gap-3 font-medium p-3 cursor-pointer rounded-xl w-full hover:bg-primary/10 hover:text-primary'><Image src={'/phone-call.png'} width={20} height={20} alt='rank' />Contact us</li>
                </ul>
            </div>
        </aside>
    )
}

export default SideBar