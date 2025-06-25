"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChannelData {
  name: string;
  revenue: number;
}

interface SalesByChannelChartProps {
  data: ChannelData[];
}

export function SalesByChannelChart({ data }: SalesByChannelChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No channel data to display.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip
          formatter={(value) => [`$${(value as number).toFixed(2)}`, "Revenue"]}
        />
        <Legend />
        <Bar dataKey="revenue" fill="#82ca9d" name="Revenue" />
      </BarChart>
    </ResponsiveContainer>
  );
}
