import { Search, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

function NavBar() {

    return (
        <nav className='w-full h-22 px-20 fixed left-0 top-0 border-b-2 border-b-stroke z-50 bg-white flex items-center justify-between'>
            <div className='logo'>
                <h1 className='text-4xl font-bold'>LOGO</h1>
            </div>
            <div className='search flex justify-between items-center rounded-2xl border border-stroke pr-4 w-2/4'>
                <input type="search" placeholder='Search Products...' className='h-12.5 p-4 outline-none w-full ' />
                <Search />
            </div>
            <Link href="/cart" className='relative cursor-pointer'>
                <ShoppingCart />
                <div className='w-fit py px-1 rounded-full bg-primary text-white text-xs flex items-center justify-center text-center absolute -top-1 -right-1.5'>
                    0
                </div>
            </Link>
        </nav>
    )
}

export default NavBar