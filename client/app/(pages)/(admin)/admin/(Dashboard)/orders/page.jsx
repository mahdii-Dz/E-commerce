'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Check, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useEffect } from 'react';

const ITEMS_PER_PAGE = 10;

const FILTER_TYPES = ["All", "domicile", "stopDesk"];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterPopup, setShowFilterPopup] = useState(false);

  // Loading states for individual order actions
  const [processingOrders, setProcessingOrders] = useState({
    accepting: new Set(),
    rejecting: new Set()
  });

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Filter states
  const [filters, setFilters] = useState({
    deliveryType: "All",
    minPrice: "",
    maxPrice: "",
    wilaya: "",
    baladiya: "",
  });

  // Show toast helper
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/shop/orders');
        setOrders(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Apply filters
  const filteredOrders = useMemo(() => {
    let result = orders || [];

    // Search filter
    if (searchQuery) {
      result = result.filter(order =>
        order.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.phone?.includes(searchQuery) ||
        order.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.order_id?.toString().includes(searchQuery)
      );
    }

    // Delivery type filter
    if (filters.deliveryType !== "All") {
      result = result.filter(order => order.delivery_type?.toLowerCase().includes(filters.deliveryType.toLowerCase()));
    }

    // Price filter
    if (filters.minPrice !== "") {
      result = result.filter(order => {
        const price = Array.isArray(order.items) ? order.totalPrice : order.fullPrice;
        return price >= Number(filters.minPrice);
      });
    }
    if (filters.maxPrice !== "") {
      result = result.filter(order => {
        const price = Array.isArray(order.items) ? order.totalPrice : order.fullPrice;
        return price <= Number(filters.maxPrice);
      });
    }

    // Location filters
    if (filters.wilaya !== "") {
      result = result.filter(order => order.wilaya?.toLowerCase().includes(filters.wilaya.toLowerCase()));
    }
    if (filters.baladiya !== "") {
      result = result.filter(order => order.baladiya?.toLowerCase().includes(filters.baladiya.toLowerCase()));
    }

    return result;
  }, [orders, searchQuery, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

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
      deliveryType: "All",
      minPrice: "",
      maxPrice: "",
      wilaya: "",
      baladiya: "",
    });
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setShowFilterPopup(false);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filters.deliveryType !== "All" ||
    filters.minPrice !== "" ||
    filters.maxPrice !== "" ||
    filters.wilaya !== "" ||
    filters.baladiya !== "";

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // Helper to set loading state for a specific order
  const setOrderProcessing = (orderId, action, isProcessing) => {
    setProcessingOrders(prev => {
      const newSet = new Set(prev[action]);
      if (isProcessing) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return { ...prev, [action]: newSet };
    });
  };

  const handleAccept = async (orderId) => {
    // Prevent double-click
    if (processingOrders.accepting.has(orderId) || processingOrders.rejecting.has(orderId)) {
      return;
    }

    const orderToAccept = orders.find(order => order.order_id === orderId);

    setOrderProcessing(orderId, 'accepting', true);

    try {
      const sendToEroTrakc = await axios.post('/api/admin/Delivery', {
        nom_client: orderToAccept.fullname,
        telephone: orderToAccept.phone,
        commune: orderToAccept.baladiya,
        code_wilaya: orderToAccept.wilaya_code,
        address: orderToAccept.address,
        produit: orderToAccept.product_name,
        quantite: orderToAccept.quantity,
        montant: parseInt(orderToAccept.fullPrice) + parseInt(orderToAccept.delivery_Price),
        boutique: 'E-Commerce Shop',
        delivery_type: orderToAccept.delivery_type === 'domicile' ? 0 : 1
      });

      if (sendToEroTrakc.status === 200) {
        const response = await axios.put(`/api/shop/orders/accept/${orderId}`);
        if (response.status === 200) {
          showToast(`Order #${orderId} accepted and sent to delivery successfully`, 'success');
        } else {
          showToast(`Order #${orderId} sent to delivery but failed to be accept in the database`, 'error');
        }
      } else if(sendToEroTrakc.data.success === false || sendToEroTrakc.data.error) {
        showToast(`Order #${orderId} failed to be sent to delivery & error is : ${sendToEroTrakc.data.error}`, 'error');
      }

      // Refresh orders after action
      const refreshResponse = await axios.get('/api/shop/orders');
      setOrders(refreshResponse.data);
    } catch (error) {
      console.error('Error accepting order:', error);
      showToast(error.response?.data?.error || 'Failed to accept order', 'error');
    } finally {
      setOrderProcessing(orderId, 'accepting', false);
    }
  };

  const handleReject = async (orderId) => {
    // Prevent double-click
    if (processingOrders.accepting.has(orderId) || processingOrders.rejecting.has(orderId)) {
      return;
    }

    setOrderProcessing(orderId, 'rejecting', true);

    try {
      const response = await axios.put(`/api/shop/orders/reject/${orderId}`);
      showToast(`Order #${orderId} rejected successfully`, 'success');
      // Refresh orders after action
      const refreshResponse = await axios.get('/api/shop/orders');
      setOrders(refreshResponse.data);
    } catch (error) {
      console.error('Error rejecting order:', error);
      showToast(error.response?.data?.message || 'Failed to reject order', 'error');
    } finally {
      setOrderProcessing(orderId, 'rejecting', false);
    }
  };

  if (loading) {
    return (
      <div className="w-full ml-64 pt-6 px-9 pb-16 flex items-center justify-center h-96">
        <p className="text-gray-500">Loading orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full ml-64 pt-6 px-9 pb-16 flex items-center justify-center h-96">
        <p className="text-[#FA3145]">{error}</p>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="w-full ml-64 pt-6 px-9 pb-16 flex items-center justify-center h-96">
        <p className="text-gray-500">No orders available</p>
      </div>
    );
  }

  return (
    <div className="w-full ml-64 pt-6 px-9 pb-16 relative">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-lg shadow-lg transition-all duration-300 transform translate-y-0 ${toast.type === 'success'
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
          }`}>
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
            <span className="font-medium">{toast.message}</span>
            <button
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
              className="ml-2 hover:opacity-80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-black tracking-tight">
          All Orders
        </h1>
      </header>

      <div className="bg-white border-2 border-stroke rounded-xl p-6 w-full">
        {/* Search & Filter Bar */}
        <div className="flex items-center justify-between gap-4 mb-6 w-full">
          <div className="relative w-8/10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search orders..."
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
                  <h3 className="font-semibold text-gray-900">Filter Orders</h3>
                  <button
                    onClick={() => setShowFilterPopup(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={18} className="text-gray-500" />
                  </button>
                </div>

                {/* Delivery Type Filter */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Type</label>
                  <select
                    value={filters.deliveryType}
                    onChange={(e) => handleFilterChange("deliveryType", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FA3145]"
                  >
                    {FILTER_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Price Range</label>
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

                {/* Location Filters */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Wilaya</label>
                  <input
                    type="text"
                    placeholder="Enter wilaya..."
                    value={filters.wilaya}
                    onChange={(e) => handleFilterChange("wilaya", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FA3145]"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Baladiya</label>
                  <input
                    type="text"
                    placeholder="Enter baladiya..."
                    value={filters.baladiya}
                    onChange={(e) => handleFilterChange("baladiya", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FA3145]"
                  />
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
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">ID</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Full Name</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Phone</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Location</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Delivery</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Products</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Color</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Qty</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Total</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentOrders.map((order) => {
                const isAccepting = processingOrders.accepting.has(order.order_id);
                const isRejecting = processingOrders.rejecting.has(order.order_id);
                const isProcessing = isAccepting || isRejecting;

                return (
                  <tr key={order.order_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      #{order.order_id}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-gray-900">{order.fullname}</span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{order.phone}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      <span className="text-xs font-medium">{order.address}</span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      <span className="text-xs">
                        {order.delivery_type},
                        <span className="text-[#FA3145] font-medium">
                          {order.delivery_Price}
                        </span>{" "}
                        DA
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      <span className="truncate max-w-[150px] block">
                        {Array.isArray(order.items)
                          ? order.items.map(item => item.product_name).join(', ')
                          : order.product_name}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {order.color_hex ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full border border-gray-300 shadow-sm"
                            style={{ backgroundColor: `#${order.color_hex}` }}
                            title={`#${order.color_hex}`}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-800">
                              {order.color_name || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {Array.isArray(order.items)
                        ? order.items.reduce((sum, item) => sum + item.quantity, 0)
                        : order.quantity}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-gray-900">
                      {Array.isArray(order.items) ? order.totalPrice : order.fullPrice} DA
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Accept Button with Loading State */}
                        <button
                          className={`w-8 h-8 flex justify-center items-center rounded-full border-2 transition-all duration-200 ${
                            isAccepting
                              ? "border-green-400 bg-green-50 cursor-wait"
                              : isProcessing
                              ? "border-gray-300 bg-gray-100 cursor-not-allowed opacity-50"
                              : "border-[#42fa31] hover:bg-green-50 cursor-pointer"
                          }`}
                          onClick={() => handleAccept(order.order_id)}
                          disabled={isProcessing}
                          title={isAccepting ? "Processing..." : "Accept Order"}
                        >
                          {isAccepting ? (
                            <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 text-[#42fa31]" strokeWidth={3} />
                          )}
                        </button>

                        {/* Reject Button with Loading State */}
                        <button
                          className={`w-8 h-8 flex justify-center items-center rounded-full border-2 transition-all duration-200 ${
                            isRejecting
                              ? "border-red-400 bg-red-50 cursor-wait"
                              : isProcessing
                              ? "border-gray-300 bg-gray-100 cursor-not-allowed opacity-50"
                              : "border-[#FA3145] hover:bg-red-50 cursor-pointer"
                          }`}
                          onClick={() => handleReject(order.order_id)}
                          disabled={isProcessing}
                          title={isRejecting ? "Processing..." : "Reject Order"}
                        >
                          {isRejecting ? (
                            <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                          ) : (
                            <X className="w-4 h-4 text-[#FA3145]" strokeWidth={3} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <footer className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            Showing {filteredOrders.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} Orders
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
              {getPageNumbers().map((page, index) => (
                <div key={index}>
                  {page === '...' ? (
                    <span className="w-8 h-8 flex items-center justify-center text-gray-600">...</span>
                  ) : (
                    <button
                      onClick={() => goToPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                        ? "bg-[#FA3145] text-white"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                      {page}
                    </button>
                  )}
                </div>
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