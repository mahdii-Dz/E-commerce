'use client'
import { createContext, useEffect, useMemo, useState } from 'react'

export const GlobalContext = createContext(null)
function Context({ children }) {
    const [Products, setProducts] = useState([])
    const [Cart, setCart] = useState([])
    const [loading, setLoading] = useState(false)

    const Promotions = useMemo(() => {
        return Products.filter(product => product.discount_percentage > 0)
    }, [Products])

    console.log(Products);
    

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true)
                const response = await fetch('http://localhost:5000/api/shop/get-products')
                const data = await response.json()
                setProducts(data)

            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [setProducts])

    return (
        <GlobalContext.Provider value={{ Products, setProducts, Promotions, Cart, setCart ,loading }}>
            {children}
        </GlobalContext.Provider>
    )
}

export default Context