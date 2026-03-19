"use client";

import { useContext, useState, useMemo } from "react";
import { Plus, Search, Filter, Edit, ChevronLeft, ChevronRight, X } from "lucide-react";
import { GlobalContext } from "@/app/context/Context";
import Link from "next/link";

const getBadgeStyle = (type) => {
  switch (type) {
    case "New": return "bg-blue-100 text-blue-700";
    case "Top Sold": return "bg-green-100 text-green-700";
    case "Promotions": return "bg-purple-100 text-purple-700";
    case "Best Deal": return "bg-orange-100 text-orange-700";
    default: return "bg-gray-100 text-gray-700";
  }
};

const ITEMS_PER_PAGE = 10;

const FILTER_TYPES = ["All", "New", "Top Sold", "Promotions", "Best Deal"];

export default function ProductDashboard() {
  const { Products } = useContext(GlobalContext);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterPopup, setShowFilterPopup] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    type: "All",
    minPrice: "",
    maxPrice: "",
    minStock: "",
    maxStock: "",
    minDiscount: "",
    maxDiscount: "",
  });

  // Apply filters
  const filteredProducts = useMemo(() => {
    let result = Products || [];

    // Search filter
    if (searchQuery) {
      result = result.filter(product =>
        product.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (filters.type !== "All") {
      result = result.filter(product => product.type === filters.type);
    }

    // Price filter
    if (filters.minPrice !== "") {
      result = result.filter(product => product.price >= Number(filters.minPrice));
    }
    if (filters.maxPrice !== "") {
      result = result.filter(product => product.price <= Number(filters.maxPrice));
    }

    // Stock filter
    if (filters.minStock !== "") {
      result = result.filter(product => product.stock >= Number(filters.minStock));
    }
    if (filters.maxStock !== "") {
      result = result.filter(product => product.stock <= Number(filters.maxStock));
    }

    // Discount filter
    if (filters.minDiscount !== "") {
      result = result.filter(product => product.discount_percentage >= Number(filters.minDiscount));
    }
    if (filters.maxDiscount !== "") {
      result = result.filter(product => product.discount_percentage <= Number(filters.maxDiscount));
    }

    return result;
  }, [Products, searchQuery, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      type: "All",
      minPrice: "",
      maxPrice: "",
      minStock: "",
      maxStock: "",
      minDiscount: "",
      maxDiscount: "",
    });
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setShowFilterPopup(false);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filters.type !== "All" ||
    filters.minPrice !== "" ||
    filters.maxPrice !== "" ||
    filters.minStock !== "" ||
    filters.maxStock !== "" ||
    filters.minDiscount !== "" ||
    filters.maxDiscount !== "";

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProducts(currentProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setSelectedProducts([]);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  if (!Products || Products.length === 0) {
    return (
      <div className="w-full flex flex-col  justify-start h-full">
        <header className="flex items-center justify-between mb-11">
        <h1 className="text-3xl font-semibold text-black tracking-tight">
          All Products
        </h1>

        <Link href="/admin/add-product" className="flex items-center gap-2.5 px-6 py-2.5 cursor-pointer bg-[#FA3145] hover:bg-[#e02a3b] text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#FA3145] focus:ring-offset-2">
          <Plus size={20} />
          <span>Add Product</span>
        </Link>
      </header>
      <div className="flex w-full h-50 justify-center items-center">
        <p className="text-gray-500">No products available</p>
      </div>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      {/* Header */}
      <header className="flex items-center justify-between mb-11">
        <h1 className="text-3xl font-semibold text-black tracking-tight">
          All Products
        </h1>

        <Link href="/admin/add-product" className="flex items-center gap-2.5 px-6 py-2.5 cursor-pointer bg-[#FA3145] hover:bg-[#e02a3b] text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#FA3145] focus:ring-offset-2">
          <Plus size={20} />
          <span>Add Product</span>
        </Link>
      </header>

      <div className="bg-white border-2 border-stroke rounded-xl p-6 w-full">
        {/* Search & Filter Bar */}
        <div className="flex items-center justify-between gap-4 mb-6 w-full">
          <div className="relative w-8/10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search Products..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FA3145] focus:border-transparent"
            />
          </div>

          <div className="relative w-2/10">
            <button
              onClick={() => setShowFilterPopup(!showFilterPopup)}
              className={`flex items-center justify-center w-full gap-2 cursor-pointer px-4 py-2.5 border rounded-lg transition-colors ${hasActiveFilters
                  ? "border-[#FA3145] bg-red-50 text-[#FA3145]"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
            >
              <Filter size={20} />
              <span>Filter{hasActiveFilters && " (Active)"}</span>
            </button>

            {/* Filter Popup */}
            {showFilterPopup && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Filter Products</h3>
                  <button
                    onClick={() => setShowFilterPopup(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={18} className="text-gray-500" />
                  </button>
                </div>

                {/* Type Filter */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange("type", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FA3145]"
                  >
                    {FILTER_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                      className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FA3145]"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                      className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FA3145]"
                    />
                  </div>
                </div>

                {/* Stock Range */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock Range</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minStock}
                      onChange={(e) => handleFilterChange("minStock", e.target.value)}
                      className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FA3145]"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxStock}
                      onChange={(e) => handleFilterChange("maxStock", e.target.value)}
                      className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FA3145]"
                    />
                  </div>
                </div>

                {/* Discount Range */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discount % Range</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min %"
                      value={filters.minDiscount}
                      onChange={(e) => handleFilterChange("minDiscount", e.target.value)}
                      className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FA3145]"
                    />
                    <input
                      type="number"
                      placeholder="Max %"
                      value={filters.maxDiscount}
                      onChange={(e) => handleFilterChange("maxDiscount", e.target.value)}
                      className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FA3145]"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={clearFilters}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={applyFilters}
                    className="flex-1 px-4 py-2 bg-[#FA3145] hover:bg-[#e02a3b] text-white rounded-lg transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 text-left w-12">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 accent-[#FA3145] focus:ring-[#FA3145] cursor-pointer"
                    onChange={toggleSelectAll}
                    checked={selectedProducts.length === currentProducts.length && currentProducts.length > 0}
                  />
                </th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">ID</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Photo</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Price</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Stock</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Discount</th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 accent-[#FA3145] focus:ring-[#FA3145] cursor-pointer"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleSelect(product.id)}
                    />
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">
                    #{product.id}
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                      {product.thumbnail ? (
                        <img src={product.thumbnail} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-gray-400 text-xs">IMG</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-medium text-gray-900">{product.name}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getBadgeStyle(product.type)}`}>
                      {product.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">{product.price}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{product.stock}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{product.discount_percentage}%</td>
                  <td className="px-4 py-4 text-right">
                    <Link href={`/admin/edit-product/${product.id}`} className="p-2 text-gray-400 hover:text-[#FA3145] hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                      <Edit size={20} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <footer className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            Showing {filteredProducts.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} Products
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="inline-flex cursor-pointer items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
              <span>Back</span>
            </button>

            <div className="flex gap-1">
              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                      ? "bg-[#FA3145] text-white"
                      : "text-gray-600 hover:bg-gray-100"
                    }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="inline-flex cursor-pointer items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      </div>

      {/* Click outside to close popup */}
      {showFilterPopup && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowFilterPopup(false)}
        />
      )}
    </div>
  );
}