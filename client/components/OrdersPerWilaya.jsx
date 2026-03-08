import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import Loader from './Loader';

function OrdersPerWilaya({ data, isLoading, error }) {

    if (isLoading) {
        return (
            <Card className="flex flex-col h-75 w-full">
                <CardHeader className="items-center pb-0">
                    <CardTitle>Wilaya Distribution</CardTitle>
                    <CardDescription>Statistics of orders per wilaya</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                    <Loader />
                </CardContent>
            </Card>
        );
    }
    // Error state
    if (error) {
        return (
            <Card className="flex flex-col h-75 w-full">
                <CardHeader className="items-center pb-0">
                    <CardTitle>Wilaya Distribution</CardTitle>
                    <CardDescription>Statistics of orders per wilaya</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                    <p className="text-red-500">Error: {error}</p>
                </CardContent>
            </Card>
        );
    }


    return (
        <Card className="flex flex-col w-full h-75 gap-0!">
            <CardHeader className="items-center pb-0">
                <CardTitle>Wilaya Distribution</CardTitle>
                <CardDescription>Statistics of orders per wilaya</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex h-[calc(100%-2.5rem)] items-center justify-center">
                {
                    data && data.length > 0 ? (
                        <ul className="w-full h-full gap-x-4 flex flex-col flex-wrap px-4 mt-2">
                            {data.map((item, index) => (
                                <li key={index} className="flex w-1/2 justify-between py-2 px-1">
                                    <span className="font-medium">{item.wilaya}</span>
                                    <span className="text-primary font-medium">{item.totalOrders}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-600">No data available</p>
                    )
                }
            </CardContent>
        </Card>
    )
}

export default OrdersPerWilaya