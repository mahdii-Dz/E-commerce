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

function getOgImage(image) {
  const url = image?.url || image;
  if (!url || typeof url !== 'string') return '';
  // Apply Cloudinary transformations for optimal social sharing (1200x630, auto quality/format)
  return url.replace('/upload/', '/upload/w_1200,h_630,c_fill,g_auto,f_auto,q_auto/');
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  try {
    const product = await getProduct(resolvedParams.id);
    const ogImage = product.images?.[0] ? getOgImage(product.images[0]) : '';
    return {
      title: product.name,
      description: product.description?.substring(0, 160),
      openGraph: {
        title: product.name,
        description: product.description?.substring(0, 160),
        type: 'website',
        images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: product.name,
        description: product.description?.substring(0, 160),
        images: ogImage ? [ogImage] : [],
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