'use client'
import { createContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

export const GlobalContext = createContext(null)

export function ContextProvider({ children }) {
    const [Cart, setCart] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('Cart');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(false);

    const openCategorySidebar = () => setIsCategorySidebarOpen(true);
    const closeCategorySidebar = () => setIsCategorySidebarOpen(false);

    const { data: Promotions = [] } = useQuery({
        queryKey: ['promotions'],
        queryFn: async () => {
            const res = await fetch('/api/shop/products?limit=100');
            const data = await res.json();
            const products = Array.isArray(data) ? data : (data.products || []);
            return products.filter(p => p.discount_percentage > 0);
        },
        staleTime: 60 * 1000,
        refetchInterval: 60 * 1000,
    });

    return (
        <GlobalContext.Provider value={{ Promotions, Cart, setCart, isCategorySidebarOpen, openCategorySidebar, closeCategorySidebar }}>
            {children}
        </GlobalContext.Provider>
    )
}

export default ContextProvider