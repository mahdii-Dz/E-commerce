import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';

export const useFetchAllProducts = (url, options = {}) => {
  const pathname = usePathname();
  const shouldFetch = !pathname?.startsWith('/product/') && pathname !== '/admin/dashboard';
  

  const fetcher = async () => {
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch: ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : [];
  };

  return useQuery({
    queryKey: ['api', url],
    queryFn: fetcher,
    enabled: shouldFetch, 
    staleTime: 5 * 60 * 1000,
    retry: 2,
    ...options,
  });
};