'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

async function fetchHeader() {
  const res = await fetch('/api/shop/header')
  if (!res.ok) throw new Error('Failed to fetch header')
  return res.json()
}

export default function ShopHeaderBanner() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data } = useQuery({
    queryKey: ['shop-header'],
    queryFn: fetchHeader,
    staleTime: 300000,
    enabled: mounted,
  })

  if (!mounted) return null
  if (!data || !data.isActive || !data.content) return null

  return (
    <div
      style={{ backgroundColor: data.backgroundColor || '#000000' }}
      className="w-full text-white text-center px-4 py-3"
    >
      <div
        className="max-w-7xl mx-auto [&_*]:text-white"
        dangerouslySetInnerHTML={{ __html: data.content }}
      />
    </div>
  )
}
