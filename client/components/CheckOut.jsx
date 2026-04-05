'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { wilayaDataWithStopDesk as wilayaData } from '@/lib/wilayaDataWithStopDesk';
import { getStopDeskCommunesByWilayaCode } from '@/lib/stopDeskFilter';
import { Minus, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

const submitOrder = async (orderData) => {
    const response = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to place order');
    }

    return response.json();
};

export default function CheckOut({ productPrice, productId, colors = [], selectedOffer = null }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        wilaya: 'Alger',
        baladiya: '',
        delivery: 'domicile',
    });

    // Color quantities: key = color.hex, value = quantity (number)
    const [colorQuantities, setColorQuantities] = useState({});
    const [deliveryPrice, setDeliveryPrice] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [submitError, setSubmitError] = useState(''); // for validation errors
    const successModalRef = useRef(null);

    // Initialize colorQuantities when colors change
    useEffect(() => {
        if (colors && colors.length > 0) {
            const initial = {};
            colors.forEach(c => {
                initial[c.hex] = 0;
            });
            setColorQuantities(initial);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colors]);

    // Reset color quantities when selectedOffer changes
    useEffect(() => {
        if (colors && colors.length > 0) {
            const reset = {};
            colors.forEach(c => {
                reset[c.hex] = 0;
            });
            setColorQuantities(reset);
        }
        setSubmitError('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedOffer, colors]);

    // Click outside to close success modal
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (successModalRef.current && !successModalRef.current.contains(event.target)) {
                setShowSuccess(false);
            }
        };

        if (showSuccess) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showSuccess]);

    // Effective price based on selected offer
    const effectivePrice = useMemo(() => {
        if (!selectedOffer) return productPrice;
        return selectedOffer.price / selectedOffer.quantity;
    }, [selectedOffer, productPrice]);

    // Total allocated quantity across colors
    const totalAllocated = useMemo(() => {
        return Object.values(colorQuantities).reduce((sum, qty) => sum + qty, 0);
    }, [colorQuantities]);

    // Validation error: must match offer quantity exactly
    const quantityError = selectedOffer && totalAllocated !== selectedOffer.quantity
        ? "يجب أن تطابق القيمة المختارة عرض الشراء"
        : '';

    // Compute total price
    const totalPrice = useMemo(() => {
        const itemsTotal = colors.reduce((sum, c) => {
            const qty = colorQuantities[c.hex] || 0;
            return sum + (qty * effectivePrice);
        }, 0);
        return deliveryPrice + itemsTotal;
    }, [colorQuantities, deliveryPrice, colors, effectivePrice]);

    const router = useRouter();

    // Get communes for selected wilaya name
    const allCommunes = useMemo(() => {
        const code = Object.keys(wilayaData).find(key => wilayaData[key].name === formData.wilaya);
        return code ? wilayaData[code]?.municipalities || [] : [];
    }, [formData.wilaya]);

    // Filter communes based on delivery type
    const communes = useMemo(() => {
        if (formData.delivery === 'stopDesk') {
            // For stopDesk, only show communes that have stop desk service
            const code = Object.keys(wilayaData).find(key => wilayaData[key].name === formData.wilaya);
            if (!code) return [];
            return getStopDeskCommunesByWilayaCode(code);
        }
        // For domicile, show all communes
        return allCommunes;
    }, [formData.wilaya, formData.delivery, allCommunes]);

    // Filter wilayas based on delivery type
    const filteredWilayas = useMemo(() => {
        if (formData.delivery === 'stopDesk') {
            // For stopDesk, only show wilayas that have stop desk service
            return Object.entries(wilayaData).filter(([code, data]) => data.hasStopDesk);
        }
        // For domicile, show all wilayas
        return Object.entries(wilayaData);
    }, [formData.delivery]);

    // Reset baladiya if the current wilaya is not in the filtered list
    useEffect(() => {
        const currentWilayaExists = Object.values(wilayaData).some(
            w => w.name === formData.wilaya && (formData.delivery !== 'stopDesk' || w.hasStopDesk)
        );
        if (!currentWilayaExists && formData.wilaya !== '') {
            // Reset to first available wilaya
            const firstWilaya = filteredWilayas[0];
            if (firstWilaya) {
                handleWilayaChange(firstWilaya[1].name);
            } else {
                setFormData(prev => ({ ...prev, wilaya: '', baladiya: '' }));
            }
        }
    }, [formData.delivery, formData.wilaya, filteredWilayas]);

    // Auto-select first commune when wilaya changes
    const handleWilayaChange = (value) => {
        const code = Object.keys(wilayaData).find(key => wilayaData[key].name === value);
        if (!code) return;

        // Use the filtered communes based on delivery type
        const filteredCommunes = formData.delivery === 'stopDesk'
            ? getStopDeskCommunesByWilayaCode(code)
            : (wilayaData[code]?.municipalities || []);

        const newBaladiya = filteredCommunes.length > 0 ? filteredCommunes[0] : '';

        setFormData(prev => ({
            ...prev,
            wilaya: value,
            baladiya: newBaladiya,
            delivery: prev.delivery,
        }));
    };
    // Update delivery price when wilaya name or delivery type changes
    useEffect(() => {
        const code = Object.keys(wilayaData).find(key => wilayaData[key].name === formData.wilaya);
        if (!code) {
            setDeliveryPrice(0);
            return;
        }

        const wilayaInfo = wilayaData[code];

        if (wilayaInfo && typeof wilayaInfo.domicilePrice === 'number' && typeof wilayaInfo.stopDeskPrice === 'number') {
            const newPrice = formData.delivery === 'domicile'
                ? wilayaInfo.domicilePrice
                : wilayaInfo.stopDeskPrice;

            if (newPrice !== deliveryPrice) {
                setDeliveryPrice(newPrice);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.wilaya, formData.delivery]);

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const mutation = useMutation({
        mutationFn: submitOrder,
        onSuccess: () => {
            setShowSuccess(true);
            // Reset color quantities
            if (colors && colors.length > 0) {
                const reset = {};
                colors.forEach(c => { reset[c.hex] = 0; });
                setColorQuantities(reset);
            }
        },
        onError: (error) => {
            alert('Order failed: ' + error.message);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation: if offer selected, total must match exactly
        if (selectedOffer && totalAllocated !== selectedOffer.quantity) {
            setSubmitError(`ءارشلا ضرع ةراتخملا ةيمكلا قباطت نأ بجي (المطلوب: ${selectedOffer.quantity}، الحالي: ${totalAllocated})`);
            return;
        }

        // Build items array from colorQuantities with quantity > 0
        const items = colors
            .filter(c => {
                const qty = colorQuantities[c.hex] || 0;
                return qty > 0;
            })
            .map(c => ({
                product_id: productId,
                quantity: colorQuantities[c.hex],
                price_per_unit: effectivePrice,
                color_name: c.name,
                color_hex: c.hex,
                offer_text: selectedOffer ? `${selectedOffer.quantity} for ${selectedOffer.price} DA` : null
            }));

        // For stopDesk delivery, if no baladiya is selected (no communes available), use wilaya name
        const baladiya = formData.delivery === 'stopDesk' && !formData.baladiya
            ? formData.wilaya
            : formData.baladiya;

        const orderData = {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phoneNumber,
            wilaya: formData.wilaya,
            wilaya_code: Object.keys(wilayaData).find(key => wilayaData[key].name === formData.wilaya),
            baladiya,
            delivery_type: formData.delivery,
            delivery_Price: deliveryPrice,
            items,
        };
        mutation.mutate(orderData);
    };

    const handleCloseModal = () => {
        setShowSuccess(false);
        // Reset color quantities
        if (colors && colors.length > 0) {
            const reset = {};
            colors.forEach(c => { reset[c.hex] = 0; });
            setColorQuantities(reset);
        }
    };

    const handleContinueShopping = () => {
        setShowSuccess(false);
        // Reset color quantities
        if (colors && colors.length > 0) {
            const reset = {};
            colors.forEach(c => { reset[c.hex] = 0; });
            setColorQuantities(reset);
        }
        router.push('/');
    };

    // Order filtered wilayas by numeric code (ascending) for the dropdown
    const orderedFilteredWilayas = useMemo(() => {
        return filteredWilayas.sort(([codeA], [codeB]) => parseInt(codeA, 10) - parseInt(codeB, 10));
    }, [filteredWilayas]);

    if (showSuccess) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div ref={successModalRef} className="flex flex-col w-full max-w-md mx-4 items-center justify-center gap-6 px-6 py-8 bg-white rounded-xl border-2 border-stroke shadow-2xl relative">
                    {/* Close button (X) */}
                    <button
                        type="button"
                        onClick={handleCloseModal}
                        className="absolute top-4 left-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="إغلاق"
                    >
                        <X size={24} className="text-gray-500" />
                    </button>

                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-green-600 mb-2">تم تأكيد الطلب!</h2>
                        <p className="text-gray-600 mb-6">شكراً لك على الشراء. تم تقديم طلبك بنجاح.</p>
                        <button
                            onClick={handleContinueShopping}
                            className="w-[200px] cursor-pointer h-11 bg-primary text-white rounded-xl hover:opacity-90 transition-opacity font-medium text-sm"
                        >
                            الاستمرار في التسوق
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <form
            id='form'
            onSubmit={handleSubmit}
            className="flex flex-col w-full items-center self-center mt-4 justify-center gap-6 lg:px-12 md:px-8 sm:px-4 px-2 py-8 bg-white rounded-xl border-2 border-stroke"
        >
            {/* First & Last Name */}
            <div className="flex w-full items-center gap-6">
                <div className="flex flex-col w-full">
                    <label htmlFor="firstName" className="font-medium text-black text-base mb-2">
                        الاسم الأول *
                    </label>
                    <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="الاسم الأول"
                        className="h-11 text-right"
                        required
                    />
                </div>
                <div className="flex flex-col w-full">
                    <label htmlFor="lastName" className="font-medium text-black text-base mb-2">
                        اللقب *
                    </label>
                    <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="اللقب"
                        className="h-11 text-right"
                        required
                    />
                </div>
            </div>

            {/* Phone Number */}
            <div className="flex flex-col w-full">
                <label htmlFor="phoneNumber" className="font-medium text-black text-base mb-2">
                    رقم الهاتف *
                </label>
                <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="0x xxxxxxxx"
                    className="h-11 text-right"
                    required
                />
            </div>

            {/* Color Quantities */}
            {colors && colors.length > 0 && (
                <div className="flex flex-col w-full">
                    <label className="font-medium text-black text-base mb-3">
                        الكمية لكل لون *
                    </label>

                    {/* Selected Offer Summary */}
                    {selectedOffer && (
                        <div className="mb-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                            <p className="text-primary font-medium text-right">
                                العرض المختار: شراء {selectedOffer.quantity} قطع بسعر {selectedOffer.price} دج
                                {selectedOffer.savedMoney > 0 && ` (وفر ${selectedOffer.savedMoney} دج)`}
                            </p>
                        </div>
                    )}

                    {/* Offer progress indicator */}
                    {selectedOffer && (
                        <div className="mb-3">
                            <p className="text-sm text-gray-600">
                                يجب توزيع {selectedOffer.quantity} قطع (تم تخصيص: {totalAllocated})
                            </p>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${Math.min((totalAllocated / selectedOffer.quantity) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {quantityError && (
                        <p className="text-red-500 text-sm mb-2">{quantityError}</p>
                    )}

                    <div className="flex flex-col gap-3">
                        {colors.map((color) => (
                            <div
                                key={color.hex}
                                className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-full border border-gray-300 shadow-sm flex-shrink-0"
                                        style={{ backgroundColor: `#${color.hex}` }}
                                    />
                                    <div className="flex flex-col items-start text-right">
                                        <span className="font-medium text-sm text-gray-800">
                                            {color.name}
                                        </span>
                                        <span className="text-xs text-gray-500">#{color.hex}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setColorQuantities(prev => ({
                                            ...prev,
                                            [color.hex]: Math.max(0, (prev[color.hex] || 0) - 1)
                                        }))}
                                        className='cursor-pointer hover:bg-primary/80 hover:text-white rounded-full p-1 border border-stroke transition-colors'
                                        disabled={(colorQuantities[color.hex] || 0) <= 0}
                                    >
                                        <Minus size={18} />
                                    </button>
                                    <input
                                        type="number"
                                        min="0"
                                        value={colorQuantities[color.hex] || 0}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            setColorQuantities(prev => ({
                                                ...prev,
                                                [color.hex]: isNaN(val) ? 0 : Math.max(0, val)
                                            }));
                                        }}
                                        className='w-16 text-center border border-stroke rounded-md py-1'
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (totalAllocated < (selectedOffer?.quantity || 1)) {
                                                setColorQuantities(prev => ({
                                                    ...prev,
                                                    [color.hex]: (prev[color.hex] || 0) + 1
                                                }));
                                            }
                                        }}
                                        className='cursor-pointer hover:bg-primary/80 hover:text-white rounded-full p-1 border border-stroke transition-colors'
                                        disabled={totalAllocated >= (selectedOffer?.quantity || 1)}
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Delivery Type */}
            <div className="flex flex-col w-full">
                <label htmlFor="delivery" className="font-medium text-black text-base mb-2">
                    التوصيل *
                </label>
                <Select
                    dir="rtl"
                    value={formData.delivery}
                    onValueChange={(value) => handleInputChange('delivery', value)}
                >
                    <SelectTrigger className="w-full h-11!">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="domicile" className="text-right">توصيل للمنزل</SelectItem>
                        <SelectItem value="stopDesk" className="text-right">استلام من المكتب</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Wilaya */}
            <div className="flex flex-col w-full">
                <label htmlFor="wilaya" className="font-medium text-black text-base mb-2">
                    الولاية *
                </label>
                <Select
                    dir="rtl"
                    value={formData.wilaya}
                    onValueChange={handleWilayaChange}
                >
                    <SelectTrigger className="w-full h-11!">
                        <SelectValue placeholder="اختر الولاية" />
                    </SelectTrigger>
                    <SelectContent>
                        {orderedFilteredWilayas.map(([code, data]) => (
                            <SelectItem
                                key={code}
                                value={data.name}
                                className="text-right"
                            >
                                {String(code).padStart(2, '0')} - {data.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Baladiya */}
            <div className="flex flex-col w-full">
                <label htmlFor="baladiya" className="font-medium text-black text-base mb-2">
                    البلدية *
                </label>
                {formData.delivery === 'stopDesk' && communes.length === 0 && formData.wilaya && (
                    <p className="text-sm text-gray-500 mb-2">
                        لا توجد بلديات مع خدمة استلام من المكتب في هذه الولاية
                    </p>
                )}
                <Select
                    dir="rtl"
                    value={formData.baladiya}
                    onValueChange={(value) => handleInputChange('baladiya', value)}
                    disabled={!communes.length}
                >
                    <SelectTrigger className="w-full h-11!">
                        <SelectValue placeholder={communes.length === 0 ? "لا توجد بلديات متاحة" : "اختر البلدية"} />
                    </SelectTrigger>
                    <SelectContent>
                        {communes.map((commune, index) => (
                            <SelectItem
                                key={`${formData.wilaya}-${index}`}
                                value={commune}
                                className="text-right"
                            >
                                {commune}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {formData.delivery === 'stopDesk' && communes.length === 0 && formData.wilaya && (
                    <p className="text-xs text-gray-400 mt-1">
                        سيتم استخدام اسم الولاية كبلدية للتوصيل
                    </p>
                )}
            </div>

            {/* Price Summary */}
            <div className="w-full flex flex-col items-start gap-2">
                <div className='w-full px-1 md:px-8 lg:px-16 flex justify-between'>
                    <span className="font-medium text-black text-lg">رسوم التوصيل:</span>
                    <p className="font-medium text-primary text-xl">{deliveryPrice} دج</p>
                </div>
                <div className='w-full px-1 md:px-8 lg:px-16 flex justify-between'>
                    <span className="font-medium text-black text-lg">الإجمالي:</span>
                    <span className="font-medium text-primary text-xl">{totalPrice} دج</span>
                </div>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={(colors.length > 0 && Object.values(colorQuantities).every(q => q === 0)) || !!quantityError}
                className={`w-full h-11 rounded-xl transition-opacity font-medium text-sm ${(colors.length > 0 && Object.values(colorQuantities).every(q => q === 0)) || !!quantityError
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary text-white hover:opacity-90 cursor-pointer'
                    }`}
            >
                إتمام الطلب
            </button>
        </form>
    );
}