'use client';

import { useState, useEffect } from 'react';

export function useWilayaData() {
  const [wilayaData, setWilayaData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const res = await fetch('/api/shop/public-wilayas');
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data)) {
          const lookup = {};
          data.forEach(w => {
            lookup[w.code] = {
              name: w.name,
              domicilePrice: Number(w.home_delivery_price) || 0,
              stopDeskPrice: Number(w.stopdesk_delivery_price) || 0,
              municipalities: (w.municipalities || []).map(m => m.name),
              hasStopDesk: Boolean(w.has_stopdesk),
            };
          });
          setWilayaData(lookup);
        }
      } catch (err) {
        console.error('Failed to fetch wilayas:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const sortedEntries = Object.entries(wilayaData).sort(([a], [b]) => parseInt(a) - parseInt(b));

  return { wilayaData, sortedEntries, loading };
}
