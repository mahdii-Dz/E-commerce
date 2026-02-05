'use client'
import Breadcrumb from '@/components/Breadcrumb';
import React, { useContext, useEffect, useState } from 'react'

function ProductPage({ params }) {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProduct() {
            const { id } = await params
            fetch(`http://localhost:5000/api/shop/get-product/${id}`)
                .then(res => res.json())
                .then(setProduct)
                .finally(() => setLoading(false));
        }
        fetchProduct()
    }, [params]);
    console.log(product);



    if (loading) return <div className='text-xl mt-32'>Loading...</div>;
    return (
        <section className='mt-32'>
            <Breadcrumb/>
            <div >
                <img src={product.image_url} alt={product.name} width={400} height={400} />
            </div>
        </section>
    )
}

export default ProductPage