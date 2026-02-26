"use client";

import { useMemo } from "react";
import { Pie, PieChart, Legend, Cell, ResponsiveContainer } from "recharts";

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
} from "@/components/ui/chart";

const COLOR_PALETTE = [
    "#FA3145", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
    "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1",
    "#14b8a6", "#d946ef",
];

function getConsistentColor(str) {
    if (!str || typeof str !== 'string') return COLOR_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}

export function ChartPieDonut({
    chartData = [],
    isLoading = false,
    error = null,
    dataKey = "total_quantity_sold",
    nameKey = "category_name",
    title = "Category Distribution",
    description = "Sales by category"
}) {
    const processedData = useMemo(() => {
        if (!Array.isArray(chartData) || chartData.length === 0) return [];

        // Filter valid items and convert values to numbers
        const validData = chartData
            .filter(item => item && item[nameKey] != null)
            .map(item => ({
                ...item,
                [nameKey]: String(item[nameKey]),
                // Ensure numeric value, default to 0
                [dataKey]: Number(item[dataKey]) || 0,
                fill: getConsistentColor(String(item[nameKey])),
            }))
            .filter(item => item[dataKey] > 0); // Remove zero values

        // Sort descending
        return validData.sort((a, b) => b[dataKey] - a[dataKey]);
    }, [chartData, dataKey, nameKey]);

    const chartConfig = useMemo(() => {
        const config = { [dataKey]: { label: "Total" } };
        processedData.forEach((item) => {
            config[item[nameKey]] = {
                label: item[nameKey],
                color: item.fill,
            };
        });
        return config;
    }, [processedData, dataKey]);

    // Loading state
    if (isLoading) {
        return (
            <Card className="flex flex-col h-100 w-full">
                <CardHeader className="items-center pb-0">
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card className="flex flex-col h-100 w-full">
                <CardHeader className="items-center pb-0">
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                    <p className="text-red-500">Error: {error}</p>
                </CardContent>
            </Card>
        );
    }

    // Empty or invalid data state
    if (processedData.length === 0) {
        return (
            <Card className="flex flex-col h-100 w-full">
                <CardHeader className="items-center pb-0">
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center flex-col gap-2">
                    <p className="text-gray-500">No valid data available</p>
                    <p className="text-xs text-gray-400">Received: {chartData?.length || 0} items</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="flex flex-col h-75 w-1/2 gap-0!">
            <CardHeader className="items-center pb-0">
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0 flex items-center justify-center w-full">
                <ChartContainer config={chartConfig} className="h-50 w-[calc(100%-2rem)]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const data = payload[0].payload;
                                    const total = processedData.reduce((sum, item) => sum + item[dataKey], 0);
                                    const percent = total > 0 ? ((data[dataKey] / total) * 100).toFixed(1) : "0.0";

                                    return (
                                        <div className="bg-white p-3 border rounded-lg shadow-lg">
                                            <p className="font-semibold text-gray-900">{data[nameKey]}</p>
                                            <p className="text-2xl font-bold" style={{ color: data.fill }}>
                                                {data[dataKey].toLocaleString()}
                                            </p>
                                            <p className="text-sm text-gray-500">{percent}% of total</p>
                                        </div>
                                    );
                                }}
                            />
                            <Legend
                                verticalAlign="middle"
                                align="left"
                                layout="vertical"
                                iconType="circle"
                                wrapperStyle={{
                                    paddingLeft: '50px',   
                                    paddingRight: '200px',
                                }}
                            />
                            <Pie
                                data={processedData}
                                dataKey={dataKey}
                                nameKey={nameKey}
                                innerRadius={55}
                                outerRadius={90}
                                paddingAngle={2}
                                cx="35%"
                                cy="50%"
                                isAnimationActive={true}
                            >
                                {processedData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}-${entry[nameKey]}`}
                                        fill={entry.fill}
                                        stroke="white"
                                        strokeWidth={2}
                                    />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}