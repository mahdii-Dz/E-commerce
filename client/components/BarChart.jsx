"use client";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import Loader from "./Loader";

const chartConfig = {
    total: {
        label: "Total Orders",
        color: "#FA3145",
    },
};

function fillMissingDays(data, daysToShow = 30) {
    if (!data || data.length === 0) return [];

    const sorted = [...data].sort((a, b) => new Date(a.day) - new Date(b.day));
    const lastDate = new Date(sorted[sorted.length - 1].day);
    const startDate = new Date(lastDate);
    startDate.setDate(startDate.getDate() - daysToShow + 1);

    const dataMap = new Map(sorted.map(d => [d.day, d.total]));

    const result = [];
    for (let i = 0; i < daysToShow; i++) {
        const current = new Date(startDate);
        current.setDate(startDate.getDate() + i);
        const dayStr = current.toISOString().split('T')[0];
        
        result.push({
            day: dayStr,
            total: dataMap.get(dayStr) || 0
        });
    }

    return result;
}

export function ChartBarDefault({ chartData, isLoading, error, daysToShow = 30 }) {
    const filledData = useMemo(() => {
        return fillMissingDays(chartData, daysToShow);
    }, [chartData, daysToShow]);

    // Generate ticks for every day to show all labels
    const ticks = useMemo(() => {
        return filledData.map(d => d.day);
    }, [filledData]);

    if (isLoading) {
        return (
            <Card className="flex items-center justify-center h-[300px]">
                <Loader/>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="flex items-center justify-center h-[300px]">
                <p className="text-red-500">Error: {error}</p>
            </Card>
        );
    }

    return (
        <Card className="w-full h-90">
            <CardHeader>
                <CardTitle>Total Orders</CardTitle>
                <CardDescription>Last {daysToShow} Days Overview</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-72 w-full">
                    <BarChart 
                        accessibilityLayer 
                        data={filledData}
                        margin={{ right: 10, left: 0 }}
                    >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="day"
                            ticks={ticks}           // Show all day ticks
                            tickLine={false}
                            axisLine={false}
                            angle={-45}             // Rotate labels 45 degrees
                            textAnchor="end"        // Align at end of label
                            height={60}             // More space for rotated labels
                            interval={0}            // Force show ALL labels (0 = no skip)
                            tick={{ fontSize: 10 }}  // Smaller font to fit
                            tickFormatter={(value) => {
                                const date = new Date(value);
                                return date.getDate(); // Just show day number (11, 12, 13...)
                            }}
                        />
                        <ChartTooltip
                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-white p-2 border rounded shadow">
                                        <p className="text-sm text-gray-600">
                                            {new Date(data.day).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </p>
                                        <p className="text-lg font-bold text-[#FA3145]">
                                            {data.total} orders
                                        </p>
                                    </div>
                                );
                            }}
                        />
                        <Bar
                            dataKey="total"
                            fill="#FA3145"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={20}
                        />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}