'use client'
import { createContext, useMemo, useState, useEffect } from 'react'

export const GlobalContext = createContext(null)

export function ContextProvider({ children, initialPromotions = [] }) {
    const [Cart, setCart] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('Cart');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const [Promotions, setPromotions] = useState(initialPromotions);

    useEffect(() => {
        if (Promotions.length === 0) {
            fetch('/api/shop/products?limit=100')
                .then(res => res.json())
                .then(data => {
                    const products = Array.isArray(data) ? data : (data.products || []);
                    setPromotions(products.filter(p => p.discount_percentage > 0));
                })
                .catch(() => {});
        }
    }, []);

    return (
        <GlobalContext.Provider value={{ Promotions, Cart, setCart }}>
            {children}
        </GlobalContext.Provider>
    )
}

export default ContextProvider