'use client'
import { GlobalContext } from '@/app/context/Context'
import { Search, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { useContext, useEffect, useState } from 'react'

function NavBar() {
  const { Cart } = useContext(GlobalContext);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // This runs only on the client, after hydration
    //eslint-disable-next-line
    setIsHydrated(true);
  }, []);

  // During SSR/hydration, show 0 or nothing to match server output
  const cartCount = isHydrated ? Cart.length : 0;

  return (
    <nav className='w-full h-22 px-20 fixed left-0 top-0 border-b-2 border-b-stroke z-50 bg-white flex items-center justify-between'>
      <Link href="/" className='logo cursor-pointer'>
        <h1 className='text-4xl font-bold'>LOGO</h1>
      </Link>
      <div className='search flex justify-between items-center rounded-2xl border border-stroke pr-4 w-2/4'>
        <input type="search" placeholder='Search Products...' className='h-12.5 p-4 outline-none w-full ' />
        <Search />
      </div>
      <Link href="/cart" className='relative cursor-pointer'>
        <ShoppingCart />
        {cartCount > 0 && (
          <div className='w-fit py px-1 rounded-full bg-primary text-white text-xs flex items-center justify-center text-center absolute -top-1 -right-1.5'>
            {cartCount}
          </div>
        )}
      </Link>
    </nav>
  );
}

export default NavBar;