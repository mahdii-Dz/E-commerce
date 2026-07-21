'use client'

import { useContext } from 'react';
import Main from "@/components/Main";
import SideBar from "@/components/SideBar";
import { GlobalContext } from "@/app/context/Context";

export default function HomeClient({ banners = [], products = [], categories }) {
  const { isCategorySidebarOpen, closeCategorySidebar, openCategorySidebar } = useContext(GlobalContext);
  const isLoadingCategories = categories === null;

  return (
    <>
      <div>
        <div className="flex flex-col lg:flex-row gap-6 px-4 lg:px-20">
          <SideBar
            category={categories || []}
            isLoadingCategories={isLoadingCategories}
            isOpen={isCategorySidebarOpen}
            onClose={closeCategorySidebar}
            />
          <Main
            Banners={banners}
            Products={products}
            onOpenCategorySidebar={openCategorySidebar}
          />
        </div>
      </div>
    </>
  );
}
