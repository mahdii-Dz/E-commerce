import { Suspense } from "react";
import HomeClient from "./HomeClient";
import CategoriesLoader from "@/components/CategoriesLoader";

async function getBanners() {
  const res = await fetch(`${process.env.BACKEND_URL}/api/shop/get-banners`, {
    next: { revalidate: 3600 } 
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch banners');
  }
  
  return res.json();
}

export default async function Home() {
  const banners = await getBanners();

  return (
    <div className="w-full h-auto ">
    <Suspense fallback={<HomeClient banners={banners} categories={null} />}>
      <CategoriesLoader banners={banners} />
    </Suspense>
    </div>
  );
}