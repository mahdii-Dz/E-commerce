'use client'

import { useState, useEffect } from 'react'

export default function ShopHeaderBanner() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHeader = async () => {
      try {
        const res = await fetch('/api/shop/header')
        const data = await res.json()
        if (data && data.content && data.isActive !== false) {
          setConfig(data)
        }
      } catch (err) {
        console.error('Failed to fetch shop header:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchHeader()
  }, [])

  if (loading) return null
  if (!config || !config.isActive || !config.content) return null

  return (
    <div
      style={{ backgroundColor: config.backgroundColor || '#000000' }}
      className="w-full text-white text-center px-4 py-3"
    >
      <div
        className="max-w-7xl mx-auto [&_*]:text-white"
        dangerouslySetInnerHTML={{ __html: config.content }}
      />
    </div>
  )
}
