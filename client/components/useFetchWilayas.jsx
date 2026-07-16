'use client';

import { useFetchSingleProduct } from "./useFetchSingleProduct";

export function usePublicWilayas() {
  return useFetchSingleProduct('/api/shop/public-wilayas', {
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useAdminWilayas() {
  return useFetchSingleProduct('/api/shop/delivery/wilayas', {
    staleTime: 60 * 1000,
    retry: 2,
  });
}

export function useDeliveryStats() {
  return useFetchSingleProduct('/api/shop/delivery/stats', {
    staleTime: 60 * 1000,
    retry: 2,
  });
}

export function useWilayaBaladiyas(code) {
  return useFetchSingleProduct(code ? `/api/shop/delivery/wilayas/${code}` : null, {
    staleTime: 60 * 1000,
    retry: 1,
  });
}
