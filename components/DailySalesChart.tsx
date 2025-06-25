"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DailySaleData {
  date: string;
  revenue: number;
  quantity: number;
}

interface DailySalesChartProps {
  data: DailySaleData[];
}

export function DailySalesChart({ data }: DailySalesChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No sales data to display.</p>
      </div>
    );
  }

  const formattedData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={formattedData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis yAxisId="left" stroke="#8884d8" />
        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
        <Tooltip
          formatter={(value, name) => {
            if (name === "Revenue") {
              return [`$${(value as number).toFixed(2)}`, name];
            }
            if (name === "Quantity") {
              return [(value as number).toString(), name];
            }
            return [value, name];
          }}
        />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="#8884d8"
          activeDot={{ r: 8 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="quantity"
          name="Quantity"
          stroke="#82ca9d"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
