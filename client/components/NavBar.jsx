'use client'

import { GlobalContext } from '@/app/context/Context'
import { Search, ShoppingCart, Menu, X, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useContext, useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import ShopHeaderBanner from './ShopHeaderBanner'

function NavBar() {
  const { Cart, openCategorySidebar } = useContext(GlobalContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const router = useRouter();
  const navRef = useRef(null);
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const searchTimerRef = useRef(null);

  useLayoutEffect(() => {
    if (navRef.current) {
      document.documentElement.style.setProperty('--navbar-offset', navRef.current.getBoundingClientRect().height + 'px');
    }
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      if (h > 0) document.documentElement.style.setProperty('--navbar-offset', h + 'px');
    });
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);
  // Start with null to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cartCount = Cart.length;

  const handleOpenCategory = useCallback(() => {
    setIsMobileMenuOpen(false);
    openCategorySidebar?.();
  }, [openCategorySidebar]);

  const handleCloseMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleToggleMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const handleToggleSearch = useCallback(() => {
    setIsSearchOpen(prev => !prev);
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    if (!showSearchDropdown) return;
    const handleClick = (e) => {
      if (desktopSearchRef.current?.contains(e.target)) return;
      if (mobileSearchRef.current?.contains(e.target)) return;
      setShowSearchDropdown(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showSearchDropdown]);

  // Debounced search
  useEffect(() => {
    if (!showSearchDropdown) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const query = searchQuery.trim();
        const endpoint = query
          ? `/api/shop/products?search=${encodeURIComponent(query)}&limit=10`
          : '/api/shop/products?sort=Newest&limit=10';
        const res = await fetch(endpoint);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : (data.products || []));
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, showSearchDropdown]);

  const handleSearchSelect = (product) => {
    router.push(`/product/${product.id}`);
    setShowSearchDropdown(false);
    setSearchQuery('');
  };

  const handleSearchEnter = async () => {
    const query = searchQuery.trim();
    if (!query) return;
    try {
      const res = await fetch(`/api/shop/products?search=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      const products = Array.isArray(data) ? data : (data.products || []);
      if (products.length > 0) {
        router.push(`/product/${products[0].id}`);
        setShowSearchDropdown(false);
        setSearchQuery('');
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const SearchDropdown = ({ products, onSelect }) => {
    if (!products || products.length === 0) return null;
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden max-h-96 overflow-y-auto">
        {products.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-right cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-100">
              {(p.image_url || p.images?.[0]?.url) ? (
                <Image src={p.image_url || p.images?.[0]?.url} alt={p.name} width={40} height={40} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={16} /></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
              <p className="text-xs text-gray-500">{p.price} دج</p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      <nav ref={navRef} className='w-full max-w-full fixed left-0 top-0 border-b-2 border-b-stroke z-50 bg-white'>
        <ShopHeaderBanner />
        <div className='h-16 lg:h-22 px-4 lg:px-20 flex items-center justify-between'>
        {/* Mobile Menu Button */}
        <button 
          onClick={handleToggleMenu}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Logo */}
        <Link href="/" className='logo cursor-pointer flex-shrink-0 min-w-0 flex items-center gap-2'>
          <Image src='/Logo.png' alt='Logo' width={40} height={40} />
          <h3 className='text-xl lg:text-xl font-semibold truncate'>La Maison D'or</h3>
        </Link>

        {/* Desktop Search */}
        <div ref={desktopSearchRef} className='hidden lg:flex items-center rounded-xl border border-stroke w-2/4 max-w-2xl focus-within:ring-2 focus-within:ring-[#FA3145]/20 focus-within:border-[#FA3145] relative'>
          
          <Search className="cursor-pointer hover:text-primary transition-colors shrink-0 mr-2" />
          <Input
            type="search"
            placeholder="ابحث عن المنتجات..."
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            className="border-none outline-none shadow-none bg-transparent h-12.5 text-right focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchEnter();
              }
            }}
          />
          <button
            onClick={() => {
              setShowSearchDropdown(false);
              setSearchQuery('');
            }}
            className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors mr-2 ml-1 cursor-pointer"
          >
            <X size={18} className="text-gray-500" />
          </button>
          {showSearchDropdown && (
            <SearchDropdown products={searchResults} onSelect={handleSearchSelect} />
          )}
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
        </div>
      </nav>

      {/* Mobile Search Overlay */}
      {isSearchOpen && (
        <div ref={mobileSearchRef} className="lg:hidden fixed top-[var(--navbar-offset)] left-0 right-0 max-w-full bg-white border-b border-stroke p-4 z-50">
          <div className='flex items-center rounded-xl border border-stroke max-w-full focus-within:ring-2 focus-within:ring-[#FA3145]/20 focus-within:border-[#FA3145] relative'>
            
            <Search className="cursor-pointer text-gray-500 flex-shrink-0 mr-2" />
            <Input
              type="search"
              placeholder="ابحث عن المنتجات..."
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              className="border-none shadow-none bg-transparent h-12 text-right focus-visible:ring-0"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchEnter();
                  setIsSearchOpen(false);
                }
              }}
            />
            <button
              onClick={() => {
                setIsSearchOpen(false);
                setShowSearchDropdown(false);
                setSearchQuery('');
              }}
              className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors mr-2 cursor-pointer"
            >
              <X size={18} className="text-gray-500" />
            </button>
            {showSearchDropdown && (
              <SearchDropdown products={searchResults} onSelect={(p) => { handleSearchSelect(p); setIsSearchOpen(false); }} />
            )}
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
        lg:hidden fixed top-16 right-0 h-[calc(100vh-64px)] w-64 max-w-full bg-white border-l border-stroke z-50 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="p-6 space-y-2 max-w-full">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">القائمة</p>
          
          <Link 
            href="/" 
            onClick={handleCloseMenu}
            className="block p-3 rounded-xl hover:bg-primary/10 hover:text-primary font-medium transition-colors"
          >
            الرئيسية
          </Link>
          <Link 
            href="/products/All" 
            onClick={handleCloseMenu}
            className="block p-3 rounded-xl hover:bg-primary/10 hover:text-primary font-medium transition-colors"
          >
            جميع المنتجات
          </Link>
          <Link 
            href="/products/Promotions" 
            onClick={handleCloseMenu}
            className="block p-3 rounded-xl hover:bg-primary/10 hover:text-primary font-medium transition-colors"
          >
            التخفيضات
          </Link>
          <Link 
            href="/contact" 
            onClick={handleCloseMenu}
            className="block p-3 rounded-xl hover:bg-primary/10 hover:text-primary font-medium transition-colors"
          >
            اتصل بنا
          </Link>
          
          <div className="h-px bg-stroke my-4"></div>
          
          <button 
            onClick={handleOpenCategory}
            className="w-full text-right p-3 rounded-xl hover:bg-primary/10 hover:text-primary font-medium transition-colors flex items-center gap-2"
          >
            <Menu size={18} />
            تسوق حسب الفئة
          </button>
          
          <div className="h-px bg-stroke my-4"></div>
          
          <Link 
            href="/cart" 
            onClick={handleCloseMenu}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary/10 hover:text-primary font-medium transition-colors"
          >
            <ShoppingCart size={20} />
            السلة ({mounted ? cartCount : 0})
          </Link>
        </div>
      </div>
    </>
  );
}

export default NavBar;