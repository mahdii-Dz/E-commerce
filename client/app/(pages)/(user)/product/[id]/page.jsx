import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';
import { getProduct, getFilteredProducts, getProducts } from '@/lib/server-fetch';

export async function generateStaticParams() {
  try {
    const products = await getProducts();
    return products.map((product) => ({
      id: product.id.toString(),
    }));
  } catch (error) {
    console.error('Failed to generate static params:', error);
    return [];
  }
}

export const revalidate = 300; // ISR - regenerate every 5 minutes

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  try {
    const product = await getProduct(resolvedParams.id);
    return {
      title: product.name,
      description: product.description?.substring(0, 160),
      openGraph: {
        title: product.name,
        description: product.description?.substring(0, 160),
        images: product.images?.[0] ? [product.images[0]] : [],
      },
    };
  } catch {
    return { title: 'Product Not Found' };
  }
}

export default async function ProductPage({ params }) {
  const resolvedParams = await params;
  try {
    const product = await getProduct(resolvedParams.id);
    
    if (!product) {
      notFound();
    }

    const category_id = product.categories?.[0]?.id;
    
    let relatedProducts = [];
    if (category_id) {
      try {
        const result = await getFilteredProducts({ 
          category: product.categories[0]?.name,
          limit: 8 
        });
        relatedProducts = result.products || result || [];
      } catch (e) {
        console.error('Failed to fetch related products:', e);
      }
    }

    return <ProductClient product={product} relatedProducts={relatedProducts} />;
  } catch (error) {
    console.error('Product page error:', error);
    notFound();
  }
}