
import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';

// Add routes here to disable fetching
const DISABLED_ROUTES = ['/admin/dashboard', '/product/','/admin/add-product','/admin/edit-product','/admin/orders','/admin/extra'];

export const useFetchAllProducts = (url, options = {}) => {
  const pathname = usePathname();
  
  const isDisabled = DISABLED_ROUTES.some(route => 
    pathname?.startsWith(route) || pathname === route
  );

  return useQuery({
    queryKey: ['products', url],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Fetch failed');
      return res.json();
    },
    enabled: !isDisabled,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};