import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { MonthlySales } from "@/hooks/useDashboardStats";

const chartConfig: ChartConfig = {
  sales: {
    label: "Sales (₹)",
    color: "hsl(145 85% 40%)",
  },
  count: {
    label: "Orders",
    color: "hsl(160 80% 35%)",
  },
};

const monthLabels: Record<string, string> = {
  "01": "Jan",
  "02": "Feb",
  "03": "Mar",
  "04": "Apr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Aug",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dec",
};

interface Props {
  data: MonthlySales[];
}

const MonthlySalesChart = ({ data }: Props) => {
  const chartData = data.map((d) => ({
    ...d,
    label: monthLabels[d.month.split("-")[1]] || d.month,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-display text-lg font-semibold text-foreground mb-4">
        Monthly Sales
      </h3>
      {chartData.every((d) => d.sales === 0) ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
          No sales data yet. Sales will appear here after payments are completed.
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${v}`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="sales"
              fill="var(--color-sales)"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
};

export default MonthlySalesChart;
