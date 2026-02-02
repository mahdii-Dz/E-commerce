import { Package, TicketPercent, Van, Wallet } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import GoTop from './GoTop'

function Footer() {

  return (
    <footer className='flex flex-col items-center px-39 pb-3 w-full h-auto bg-white border-t border-stroke mt-32 '>
        <div className='w-full flex border-b border-stroke justify-center items-center py-11'>
            <div className='flex gap-4 items-center pr-16 border-r-2 border-stroke py-6'>
                <Package size={32} className='text-primary' />
                <h3>Hight Quality Products</h3>
            </div>
            <div className='flex gap-4 items-center pr-16 border-r-2 border-stroke py-6 px-16'>
                <Wallet size={32} className='text-primary' />
                <h3>Affordable Prices</h3>
            </div>
            <div className='flex gap-4 items-center pr-16 border-r-2 border-stroke py-6 px-16'>
                <Van size={32} className='text-primary' />
                <h3>Fast Delivery</h3>
            </div>
            <div className='flex gap-4 items-center pl-16'>
                <TicketPercent size={32} className='text-primary' />
                <h3>Daily Mega Discounts</h3>
            </div>
        </div>
        <div className='w-full flex justify-between items-start mt-18'>
            <h1 className='text-4xl font-bold'>LOGO</h1>
            <div>
                <h4 className='text-2xl font-semibold mb-4'>Ain Djasser, Batna</h4>
                <p className='border-b-2 text-sm w-fit border-primary mb-2'>(+213) 546-435-362</p>
                <p className='border-b-2 text-sm w-fit border-primary'>mahdi.contact@Gmail.com</p>
            </div>
            <ul className='flex flex-col gap-2 text-sm'>
                <li className='hover:underline'><Link href="/">Home</Link></li>
                <li className='hover:underline'><Link href="/about">About</Link></li>
                <li className='hover:underline'><Link href="/delivery">Delivery</Link></li>
                <li className='hover:underline'><Link href="/contact">Contact</Link></li>
            </ul>
            <ul className='flex flex-col gap-2 text-sm'>
                <li className='hover:underline'><a target='_blank' href="https://www.facebook.com">Facebook</a></li>
                <li className='hover:underline'><a target='_blank' href="https://www.instagram.com">Instagram</a></li>
                <li className='hover:underline'><a target='_blank' href="https://www.tiktok.com">Tiktok</a></li>
            </ul>
            <GoTop/>
        </div>
        <div className='mt-40 text-secondary'>
            <p>© 2026 mahdi hadjidj. All rights reserved.</p>
        </div>
    </footer>
  )
}

export default Footer
