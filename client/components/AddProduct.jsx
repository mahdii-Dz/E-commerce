"use client";

import { useState } from "react";
import { ArrowLeft, Trash2, Plus, Minus, Percent, ChevronDown } from "lucide-react";
import Link from "next/link";

export default function AddProductPage() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    discount: "",
    quantity: 30,
    type: "Best Deal",
  });

  const [images, setImages] = useState([
    null, // main large image
    null, null, null, null, null, // grid images
  ]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const adjustQuantity = (delta) => {
    setFormData(prev => ({
      ...prev,
      quantity: Math.max(0, prev.quantity + delta)
    }));
  };

  const handleImageUpload = (index) => {
    // Trigger file input or handle upload
    console.log("Upload image at index:", index);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header with back and delete buttons */}
      <header className="flex items-center justify-between mb-14">
        <Link href="/admin/products">
          <button className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} className="text-black" />
          </button>
        </Link>

        <button className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors group">
          <Trash2 size={20} className="text-[#FA3145] group-hover:scale-110 transition-transform" />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex flex-col gap-10">
        {/* Image Upload Section */}
        <div className="flex gap-6">
          {/* Main Large Image */}
          <div 
            onClick={() => handleImageUpload(0)}
            className="w-[494px] h-[415px] bg-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors overflow-hidden"
          >
            {images[0] ? (
              <img src={images[0]} alt="Main" className="w-full h-full object-cover" />
            ) : (
              <div className="w-40 h-40 opacity-50">
                <svg viewBox="0 0 166 166" fill="none" className="w-full h-full text-gray-400">
                  <path d="M131.417 20.75H34.5833C26.9434 20.75 20.75 26.9434 20.75 34.5833V131.417C20.75 139.057 26.9434 145.25 34.5833 145.25H131.417C139.057 145.25 145.25 139.057 145.25 131.417V34.5833C145.25 26.9434 139.057 20.75 131.417 20.75Z" stroke="currentColor" strokeWidth="13.8333" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M62.2503 76.0833C69.8903 76.0833 76.0837 69.8899 76.0837 62.25C76.0837 54.6101 69.8903 48.4167 62.2503 48.4167C54.6104 48.4167 48.417 54.6101 48.417 62.25C48.417 69.8899 54.6104 76.0833 62.2503 76.0833Z" stroke="currentColor" strokeWidth="13.8333" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M145.25 103.75L123.905 82.4052C121.311 79.8118 117.793 78.355 114.125 78.355C110.457 78.355 106.939 79.8118 104.345 82.4052L41.5 145.25" stroke="currentColor" strokeWidth="13.8333" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>

          {/* Image Grid */}
          <div className="flex-1 grid grid-cols-3 gap-4 w-[480px]">
            {[0, 1, 2, 3, 4].map((index) => (
              <div
                key={index}
                onClick={() => handleImageUpload(index + 1)}
                className={`w-[108px] h-[108px] bg-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors overflow-hidden ${index === 4 ? 'col-start-1 row-start-2' : ''}`}
              >
                {images[index + 1] ? (
                  <img src={images[index + 1]} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                ) : index === 3 ? (
                  // Plus icon for last slot
                  <div className="w-20 h-20 p-2">
                    <svg viewBox="0 0 83 83" fill="none" className="w-full h-full text-gray-400">
                      <path d="M17.292 41.5H65.7087" stroke="currentColor" strokeWidth="6.91667" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M41.5 17.2917V65.7083" stroke="currentColor" strokeWidth="6.91667" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Form Section */}
        <div className="flex flex-col gap-6 w-[915px]">
          {/* Title */}
          <div className="flex flex-col gap-3 w-[671px]">
            <label className="text-lg font-semibold text-black">Title:</label>
            <div className="relative">
              <textarea
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Product title..."
                className="w-full p-5 bg-white border border-gray-200 rounded-xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FA3145] resize-none"
                rows={3}
              />
              {/* Character count indicator (decorative lines) */}
              <div className="absolute bottom-3 right-3 flex gap-1">
                <div className="w-5 h-px bg-gray-400 rotate-45"></div>
                <div className="w-3.5 h-px bg-gray-400 rotate-45"></div>
                <div className="w-2 h-px bg-gray-400 rotate-45"></div>
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div className="flex flex-col gap-3 w-[178px]">
            <label className="text-lg font-semibold text-black">Quantity</label>
            <div className="relative flex items-center h-[50px] px-5 bg-white border border-gray-200 rounded-xl">
              <span className="text-base text-gray-800">{formData.quantity}</span>
              <div className="absolute right-4 flex items-center gap-2">
                <button 
                  onClick={() => adjustQuantity(-1)}
                  className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
                >
                  <Minus size={16} />
                </button>
                <button 
                  onClick={() => adjustQuantity(1)}
                  className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-3 w-[671px]">
            <label className="text-lg font-semibold text-black">Description:</label>
            <div className="relative">
              <textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Lorem ipsum dolor sit amet..."
                className="w-full p-5 bg-white border border-gray-200 rounded-xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FA3145] resize-none"
                rows={5}
              />
              <div className="absolute bottom-3 right-3 flex gap-1">
                <div className="w-5 h-px bg-gray-400 rotate-45"></div>
                <div className="w-3.5 h-px bg-gray-400 rotate-45"></div>
                <div className="w-2 h-px bg-gray-400 rotate-45"></div>
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-3 w-[671px]">
            <label className="text-lg font-semibold text-black">Category:</label>
            <div className="flex items-center gap-2.5 px-5 py-4 bg-white border border-gray-200 rounded-xl">
              <input
                type="text"
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                placeholder="Category name"
                className="flex-1 text-base text-gray-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Price & Discount Row */}
          <div className="flex items-center gap-6 w-[671px]">
            {/* Price */}
            <div className="flex flex-col gap-3 flex-1">
              <label className="text-lg font-semibold text-black">Price</label>
              <div className="flex items-center gap-2.5 px-5 py-4 bg-white border border-gray-200 rounded-xl">
                <span className="text-base text-[#FA3145] font-medium">
                  {formData.price ? `${formData.price}DA` : "Price in DA"}
                </span>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  className="w-full text-base text-gray-800 focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Discount */}
            <div className="flex flex-col gap-3 w-[246px]">
              <label className="text-lg font-semibold text-black text-center">Discount</label>
              <div className="flex items-center justify-between gap-2.5 px-5 py-4 bg-white border border-gray-200 rounded-xl">
                <span className="text-base text-gray-800">{formData.discount || "0"}</span>
                <Percent size={20} className="text-gray-600" />
              </div>
            </div>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-3 w-[671px]">
            <label className="text-lg font-semibold text-black">Type:</label>
            <div className="flex items-center justify-between gap-2.5 px-5 py-4 bg-white border border-gray-200 rounded-xl cursor-pointer">
              <span className="text-base text-gray-800">{formData.type}</span>
              <ChevronDown size={20} className="text-black" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-5">
            <Link href="/admin/products">
              <button className="px-12 py-3 bg-white border border-gray-200 rounded-lg text-base font-medium text-black hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </Link>
            <button className="px-12 py-3 bg-[#FA3145] hover:bg-[#e02a3b] rounded-lg text-base font-medium text-white transition-colors">
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}