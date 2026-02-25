'use client'
import { useFetchAllProducts } from '@/components/useFetchAllProducts'
import { createContext, useMemo, useState } from 'react'

export const GlobalContext = createContext(null)
function Context({ children }) {
    const { data: Products, isLoading: loading, error } = useFetchAllProducts('http://localhost:5000/api/shop/get-products')
    const [Cart, setCart] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('Cart');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    console.log(Products);
    
    const Promotions = useMemo(() => {
        if (!Products) return [];
        return Products.filter(product => product.discount_percentage > 0);
    }, [Products]);



    return (
        <GlobalContext.Provider value={{ Products, Promotions, Cart, setCart, loading, error }}>
            {children}
        </GlobalContext.Provider>
    )
}

export default Context