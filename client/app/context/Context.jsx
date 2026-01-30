'use client'
import { createContext, useMemo, useState } from 'react'

export const GlobalContext = createContext(null)
function Context({ children }) {
    const [Products, setProducts] = useState([])
    const [Cart,setCart] = useState([])

    const Promotions = useMemo(() => {
        return Products.filter(product => product.discount_percentage > 0)
    }, [Products])

    console.log(Cart);
    
    return (
        <GlobalContext.Provider value={{ Products, setProducts, Promotions,Cart,setCart }}>
            {children}
        </GlobalContext.Provider>
    )
}

export default Context