import HomeClient from "../app/(pages)/(user)/HomeClient";

async function getCategories() {
  const res = await fetch(`${process.env.BACKEND_URL}/api/shop/get-categories`, {
    next: { revalidate: 3600 } 
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch categories');
  }
  
  return res.json();
}

export default async function CategoriesLoader({ banners }) {
  const categories = await getCategories();
  
  return <HomeClient banners={banners} categories={categories} />;
}