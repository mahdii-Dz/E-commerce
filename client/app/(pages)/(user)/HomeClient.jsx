'use client'

import { useState } from 'react';
import Footer from "@/components/Footer";
import Main from "@/components/Main";
import SideBar from "@/components/SideBar";
import NavBar from "@/components/NavBar";

export default function HomeClient({ banners, categories }) {
  const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(false);
  const isLoadingCategories = categories === null;

  const openCategorySidebar = () => setIsCategorySidebarOpen(true);
  const closeCategorySidebar = () => setIsCategorySidebarOpen(false);

  return (
    <>
      <NavBar onOpenCategorySidebar={openCategorySidebar} />
      
      <div className="pt-24 lg:pt-32">
        <div className="flex flex-col lg:flex-row gap-6 px-4 lg:px-20">
          
          <SideBar 
            category={categories || []} 
            isLoadingCategories={isLoadingCategories}
            isOpen={isCategorySidebarOpen}
            onClose={closeCategorySidebar}
            />
          <Main 
            Banners={banners.banners || []} 
            onOpenCategorySidebar={openCategorySidebar}
          />
        </div>
      </div>
    </>
  );
}