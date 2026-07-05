import { Suspense } from "react";
import HomeClient from "./HomeClient";
import CategoriesLoader from "@/components/CategoriesLoader";
import { getProducts, getBanners } from '@/lib/server-fetch';

async function getHomeData() {
  const [bannersData, products] = await Promise.all([
    getBanners(),
    getProducts(),
  ]);

  const banners = bannersData?.banners || (Array.isArray(bannersData) ? bannersData : []);

  return { banners, products };
}

export default async function Home() {
  const { banners, products } = await getHomeData();

  return (
    <div className="w-full h-auto ">
    <Suspense fallback={<HomeClient banners={banners} products={products} categories={null} />}>
      <CategoriesLoader banners={banners} products={products} />
    </Suspense>
    </div>
  );
}
