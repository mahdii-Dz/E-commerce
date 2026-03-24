'use client'

import { GlobalContext } from '@/app/context/Context'
import { Search, ShoppingCart, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useContext, useState, useCallback, useEffect } from 'react'

function NavBar({ onOpenCategorySidebar }) {
  const { Cart } = useContext(GlobalContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Start with null to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cartCount = Cart.length;

  const handleOpenCategory = useCallback(() => {
    setIsMobileMenuOpen(false);
    onOpenCategorySidebar?.();
  }, [onOpenCategorySidebar]);

  const handleCloseMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleToggleMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const handleToggleSearch = useCallback(() => {
    setIsSearchOpen(prev => !prev);
  }, []);

  return (
    <>
      <nav className='w-full max-w-full h-16 lg:h-22 px-4 lg:px-20 fixed left-0 top-0 border-b-2 border-b-stroke z-50 bg-white flex items-center justify-between overflow-hidden'>
        {/* Mobile Menu Button */}
        <button 
          onClick={handleToggleMenu}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Logo */}
        <Link href="/" className='logo cursor-pointer flex-shrink-0 min-w-0'>
          <h1 className='text-2xl lg:text-4xl font-bold truncate'>LOGO</h1>
        </Link>

        {/* Desktop Search */}
        <div className='hidden lg:flex search justify-between items-center rounded-2xl border border-stroke pr-4 w-2/4 max-w-2xl'>
          <input 
            type="search" 
            placeholder='Search Products...' 
            className='h-12.5 p-4 outline-none w-full bg-transparent min-w-0' 
          />
          <Search className="cursor-pointer hover:text-primary transition-colors flex-shrink-0" />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
          <button 
            onClick={handleToggleSearch}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle search"
          >
            <Search size={24} />
          </button>

          <Link href="/cart" className='relative cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0'>
            <ShoppingCart size={24} />
            {/* Only show badge after client-side hydration */}
            {mounted && cartCount > 0 && (
              <div className='min-w-[18px] h-[18px] rounded-full bg-primary text-white text-xs flex items-center justify-center absolute -top-0.5 -right-0.5 px-1'>
                {cartCount > 99 ? '99+' : cartCount}
              </div>
            )}
          </Link>
        </div>
      </nav>

      {/* Mobile Search Overlay */}
      {isSearchOpen && (
        <div className="lg:hidden fixed top-16 left-0 right-0 max-w-full bg-white border-b border-stroke p-4 z-40">
          <div className='flex justify-between items-center rounded-xl border border-stroke pr-4 max-w-full'>
            <input 
              type="search" 
              placeholder='Search Products...' 
              className='h-12 p-4 outline-none w-full bg-transparent min-w-0' 
              autoFocus
            />
            <Search className="cursor-pointer text-gray-500 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 top-16"
          onClick={handleCloseMenu}
        />
      )}

      {/* Mobile Nav Menu Sidebar */}
      <div className={`
        lg:hidden fixed top-16 left-0 h-[calc(100vh-64px)] w-64 max-w-full bg-white border-r border-stroke z-50 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 space-y-2 max-w-full">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Menu</p>
          
          <Link 
            href="/" 
            onClick={handleCloseMenu}
            className="block p-3 rounded-xl hover:bg-primary/10 hover:text-primary font-medium transition-colors"
          >
            Home
          </Link>
          <Link 
            href="/products/All" 
            onClick={handleCloseMenu}
            className="block p-3 rounded-xl hover:bg-primary/10 hover:text-primary font-medium transition-colors"
          >
            All Products
          </Link>
          <Link 
            href="/products/Promotions" 
            onClick={handleCloseMenu}
            className="block p-3 rounded-xl hover:bg-primary/10 hover:text-primary font-medium transition-colors"
          >
            Promotions
          </Link>
          <Link 
            href="/contact" 
            onClick={handleCloseMenu}
            className="block p-3 rounded-xl hover:bg-primary/10 hover:text-primary font-medium transition-colors"
          >
            Contact Us
          </Link>
          
          <div className="h-px bg-stroke my-4"></div>
          
          <button 
            onClick={handleOpenCategory}
            className="w-full text-left p-3 rounded-xl hover:bg-primary/10 hover:text-primary font-medium transition-colors flex items-center gap-2"
          >
            <Menu size={18} />
            Shop by Category
          </button>
          
          <div className="h-px bg-stroke my-4"></div>
          
          <Link 
            href="/cart" 
            onClick={handleCloseMenu}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary/10 hover:text-primary font-medium transition-colors"
          >
            <ShoppingCart size={20} />
            Cart ({mounted ? cartCount : 0})
          </Link>
        </div>
      </div>
    </>
  );
}

export default NavBar;