import { useQuery } from '@tanstack/react-query';

export const useFetchSingleProduct = (url, options = {}) => {
    const fetcher = async () => {
        await new Promise(resolve => setTimeout(resolve, 2500));
        try {
            const response = await fetch(url);

            // Handle HTTP errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to fetch: ${response.status}`);
            }

            // Handle empty responses
            const text = await response.text();
            return text ? JSON.parse(text) : {};
        } catch (error) {
            throw error;
        }
    };

    return useQuery({
        queryKey: ['api', url],
        queryFn: fetcher,
        staleTime: 5 * 60 * 1000,
        retry: 2,
        ...options,
    });
};