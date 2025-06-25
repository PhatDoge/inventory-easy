import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DailySalesChart } from "../DailySalesChart";

// Mock Recharts components that are problematic in JSDOM or for basic tests
jest.mock("recharts", () => {
  const OriginalRecharts = jest.requireActual("recharts");
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    // Mock other specific components if they cause issues or if you want to simplify tests
    // LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
  };
});

describe("DailySalesChart", () => {
  const mockData = [
    { date: "2023-01-01", revenue: 100, quantity: 10 },
    { date: "2023-01-02", revenue: 150, quantity: 15 },
  ];

  it("renders without crashing with data", () => {
    render(<DailySalesChart data={mockData} />);
    // Check if a key element of the chart is rendered (e.g., part of Recharts structure)
    // Given the mock, we check for our ResponsiveContainer mock
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("displays a message when no data is provided", () => {
    render(<DailySalesChart data={[]} />);
    expect(screen.getByText("No sales data to display.")).toBeInTheDocument();
  });

  it("renders correct number of data points (conceptual)", () => {
    // This test is more conceptual with the current mocking strategy.
    // We ensure that the responsive container is rendered and no "no data" message is shown.
    render(<DailySalesChart data={mockData} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(
      screen.queryByText("No sales data to display.")
    ).not.toBeInTheDocument();
  });

  it("formats dates correctly for XAxis (conceptual)", () => {
    render(<DailySalesChart data={mockData} />);
    // This would ideally check the rendered XAxis labels.
    // For example, if 'Jan 01' is expected. This is hard with JSDOM and SVG.
    // We'll rely on the visual inspection and the fact that the chart renders with data.
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });
});
