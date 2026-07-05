'use client'
import { createContext, useMemo, useState } from 'react'

export const GlobalContext = createContext(null)

export function ContextProvider({ children, initialPromotions = [] }) {
    const [Cart, setCart] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('Cart');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const Promotions = useMemo(() => initialPromotions, [initialPromotions]);

    return (
        <GlobalContext.Provider value={{ Promotions, Cart, setCart }}>
            {children}
        </GlobalContext.Provider>
    )
}

export default ContextProvider