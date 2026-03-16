'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { wilayaData } from '@/lib/wilayaData';
import { Minus, Plus, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

const submitOrder = async (orderData) => {
    const response = await fetch('http://localhost:5000/api/shop/add-order', {
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

export default function CheckOut({ productPrice, Quantity, setQuantity, productId, colors = [] }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        wilaya: 'Alger',
        baladiya: '',
        delivery: 'domicile',
        selectedColor: null, 
    });
    
    const [deliveryPrice, setDeliveryPrice] = useState(0);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const totalPrice = deliveryPrice + (productPrice * Quantity);
    const router = useRouter();

    // Auto-select first color when colors array changes
    useEffect(() => {
        if (colors && colors.length > 0 && !formData.selectedColor) {
            setFormData(prev => ({
                ...prev,
                selectedColor: colors[0]
            }));
        }
    }, [colors]);

    // Get communes for selected wilaya name
    const communes = useMemo(() => {
        const code = Object.keys(wilayaData).find(key => wilayaData[key].name === formData.wilaya);
        return code ? wilayaData[code]?.municipalities || [] : [];
    }, [formData.wilaya]);

    // Auto-select first commune when wilaya changes
    const handleWilayaChange = (value) => {
        const code = Object.keys(wilayaData).find(key => wilayaData[key].name === value);
        if (!code) return;

        const data = wilayaData[code];
        const newCommunes = data?.municipalities || [];
        const newBaladiya = newCommunes.length > 0 ? newCommunes[0] : '';

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
        if (!code) return;

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
            setShowConfirmation(false);
            setShowSuccess(true);
            setQuantity(1);
        },
        onError: (error) => {
            alert('Order failed: ' + error.message);
            setShowConfirmation(false);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setShowConfirmation(true);
    };

    const handleConfirm = () => {
        const orderData = {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phoneNumber,
            wilaya: formData.wilaya,
            baladiya: formData.baladiya,
            delivery_type: formData.delivery,
            product_id: productId,
            delivery_Price: deliveryPrice,
            price_per_unit: productPrice,
            quantity: Quantity,
            color_name: formData.selectedColor?.name,
            color_hex: formData.selectedColor?.hex,
        };
        mutation.mutate(orderData);
    };

    const handleBack = () => {
        setShowConfirmation(false);
    };

    const handleSuccessContinue = () => {
        setTimeout(() => { setShowSuccess(false); }, [500]);
        setQuantity(1);
        router.push('/');
    };

    // Order wilaya entries by numeric code (ascending) for the dropdown
    const orderedWilayas = useMemo(() => {
        return Object.entries(wilayaData)
            .sort(([codeA], [codeB]) => parseInt(codeA, 10) - parseInt(codeB, 10));
    }, []);

    if (showSuccess) {
        return (
            <div className="flex flex-col w-full items-center justify-center gap-6 px-6 py-8 bg-white rounded-xl border-2 border-stroke">
                <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-green-600 mb-2">Order Confirmed!</h2>
                    <p className="text-gray-600 mb-6">Thank you for your purchase. Your order has been successfully placed.</p>
                    <button
                        onClick={handleSuccessContinue}
                        className="w-[200px] cursor-pointer h-11 bg-primary text-white rounded-xl hover:opacity-90 transition-opacity font-medium text-sm"
                    >
                        Continue Shopping
                    </button>
                </div>
            </div>
        );
    }

    if (showConfirmation) {
        return (
            <div className="flex flex-col w-full items-center justify-center gap-6 px-6 py-8 bg-white rounded-xl border-2 border-stroke">
                <div className="text-center w-1/2">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm Your Order</h2>
                    <div className="bg-gray-50 p-4 rounded-lg mb-6 flex flex-col items-start w-full">
                        <p className="font-medium text-gray-700 mb-2">Details:</p>
                        <p className="text-gray-600">Name: {formData.firstName} {formData.lastName}</p>
                        <p className="text-gray-600">Phone: {formData.phoneNumber}</p>
                        <p className="text-gray-600">Wilaya: {formData.wilaya}</p>
                        <p className="text-gray-600">Baladiya: {formData.baladiya}</p>
                        <p className="text-gray-600">Delivery: {formData.delivery === 'domicile' ? 'Domicile' : 'Stop Desk'}</p>

                        {/* Color confirmation with name and hex */}
                        {formData.selectedColor && (
                            <div className="flex items-center gap-3 mt-2 p-2 bg-white rounded-lg border border-gray-200">
                                <div
                                    className="w-8 h-8 rounded-full border border-gray-300 shadow-sm"
                                    style={{ backgroundColor: `#${formData.selectedColor.hex}` }}
                                />
                                <div className="flex flex-col items-start ">
                                    <span className="font-medium text-gray-800">{formData.selectedColor.name}</span>
                                    <span className="text-xs text-gray-500">#{formData.selectedColor.hex}</span>
                                </div>
                            </div>
                        )}

                        <div className="w-full border-t border-gray-200 my-3"></div>
                        <p className="text-gray-600">Product Price: {productPrice}DA</p>
                        <p className="text-gray-600">Delivery Fee: {deliveryPrice}DA</p>
                        <p className="text-gray-600">Quantity: {Quantity}</p>
                        <p className="text-xl font-bold mt-2 text-primary">Total: {totalPrice}DA</p>
                    </div>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={handleBack}
                            className="w-[100px] cursor-pointer h-11 bg-gray-300 text-gray-800 rounded-xl hover:bg-gray-400 transition-opacity font-medium text-sm"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={mutation.isPending}
                            className={`w-[100px] h-11 rounded-xl font-medium text-sm ${mutation.isPending
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                                }`}
                        >
                            {mutation.isPending ? 'Confirming...' : 'Confirm'}
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
            className="flex flex-col w-full items-center self-center mt-4 justify-center gap-6 px-12 py-8 bg-white rounded-xl border-2 border-stroke"
        >
            {/* First & Last Name */}
            <div className="flex w-full items-center gap-6">
                <div className="flex flex-col w-full">
                    <label htmlFor="firstName" className="font-medium text-black text-base mb-2">
                        First Name *
                    </label>
                    <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="First name"
                        className="h-11"
                        required
                    />
                </div>
                <div className="flex flex-col w-full">
                    <label htmlFor="lastName" className="font-medium text-black text-base mb-2">
                        Last Name *
                    </label>
                    <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Last name"
                        className="h-11"
                        required
                    />
                </div>
            </div>

            {/* Phone Number */}
            <div className="flex flex-col w-full">
                <label htmlFor="phoneNumber" className="font-medium text-black text-base mb-2">
                    Phone Number *
                </label>
                <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="0x xxxxxxxx"
                    className="h-11"
                    required
                />
            </div>

            {/* Color Selection - Shows name and hex */}
            {colors && colors.length > 0 && (
                <div className="flex flex-col w-full">
                    <label className="font-medium text-black text-base mb-3">
                        Select Color *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {colors.map((color) => (
                            <button
                                key={color.hex}
                                type="button"
                                onClick={() => handleInputChange('selectedColor', color)}
                                className={`relative flex items-center cursor-pointer gap-3 p-3 rounded-xl border-2 transition-all ${formData.selectedColor?.hex === color.hex
                                        ? 'border-primary bg-red-50'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}
                            >
                                <div
                                    className="w-10 h-10 rounded-full border border-gray-300 shadow-sm flex-shrink-0"
                                    style={{ backgroundColor: `#${color.hex}` }}
                                />
                                <div className="flex flex-col items-start text-left">
                                    <span className={`font-medium text-sm ${formData.selectedColor?.hex === color.hex ? 'text-primary' : 'text-gray-800'
                                        }`}>
                                        {color.name}
                                    </span>
                                    <span className="text-xs text-gray-500">#{color.hex}</span>
                                </div>

                                {/* Checkmark for selected */}
                                {formData.selectedColor?.hex === color.hex && (
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Wilaya */}
            <div className="flex flex-col w-full">
                <label htmlFor="wilaya" className="font-medium text-black text-base mb-2">
                    Wilaya *
                </label>
                <Select
                    value={formData.wilaya}
                    onValueChange={handleWilayaChange}
                >
                    <SelectTrigger className="w-full h-11!">
                        <SelectValue placeholder="Select wilaya" />
                    </SelectTrigger>
                    <SelectContent>
                        {orderedWilayas.map(([code, data]) => (
                            <SelectItem
                                key={code}
                                value={data.name}
                            >
                                {code} - {data.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Baladiya */}
            <div className="flex flex-col w-full">
                <label htmlFor="baladiya" className="font-medium text-black text-base mb-2">
                    Baladiya *
                </label>
                <Select
                    value={formData.baladiya}
                    onValueChange={(value) => handleInputChange('baladiya', value)}
                    disabled={!communes.length}
                >
                    <SelectTrigger className="w-full h-11!">
                        <SelectValue placeholder="Select baladiya" />
                    </SelectTrigger>
                    <SelectContent>
                        {communes.map((commune, index) => (
                            <SelectItem
                                key={`${formData.wilaya}-${index}`}
                                value={commune}
                            >
                                {commune}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Delivery Type */}
            <div className="flex flex-col w-full">
                <label htmlFor="delivery" className="font-medium text-black text-base mb-2">
                    Delivery *
                </label>
                <Select
                    value={formData.delivery}
                    onValueChange={(value) => handleInputChange('delivery', value)}
                >
                    <SelectTrigger className="w-full h-11!">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="domicile">Domicile</SelectItem>
                        <SelectItem value="stopDesk">Stop Desk</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Total Price */}
            <div className="w-full flex flex-col items-start gap-2">
                <div className='w-full px-16 flex justify-between'>
                    <span className="font-medium text-black text-lg">Quantity:</span>
                    <div className='flex gap-3.5 px-2 py-1 border border-stroke rounded-full'>
                        <button type='button' onClick={() => Quantity > 1 && setQuantity(q => q - 1)} className='cursor-pointer hover:bg-primary/80 hover:text-white rounded-full'><Minus /></button>
                        <p>{Quantity}</p>
                        <button type='button' onClick={() => setQuantity(q => q + 1)} className='cursor-pointer hover:bg-primary/80 hover:text-white rounded-full'><Plus /></button>
                    </div>
                </div>
                <div className='w-full px-16 flex justify-between'>
                    <span className="font-medium text-black text-lg">Delivery:</span>
                    <p className="font-medium text-primary text-xl">{deliveryPrice}DA</p>
                </div>
                <div className='w-full px-16 flex justify-between'>
                    <span className="font-medium text-black text-lg">Total:</span>
                    <span className="font-medium text-primary text-xl">{totalPrice}DA</span>
                </div>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={colors.length > 0 && !formData.selectedColor}
                className={`w-full h-11 rounded-xl transition-opacity font-medium text-sm ${colors.length > 0 && !formData.selectedColor
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-primary text-white hover:opacity-90 cursor-pointer'
                    }`}
            >
                Place Order
            </button>
        </form>
    );
}