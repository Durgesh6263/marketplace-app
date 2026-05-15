import { UnitSoldBreakdown } from "@/hooks/useDashboardStats";
import { format } from "date-fns";
import { Package } from "lucide-react";

interface Props {
  data: UnitSoldBreakdown[];
}

const TopSellingProjects = ({ data }: Props) => {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Top Selling Projects
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Performance breakdown of all purchased items
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-muted-foreground">
              <th className="px-6 py-3 text-left font-medium">Project</th>
              <th className="px-6 py-3 text-right font-medium">Units Sold</th>
              <th className="px-6 py-3 text-right font-medium">Revenue</th>
              <th className="px-6 py-3 text-right font-medium">Last Purchase</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                  No sales data available yet.
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.project_id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-secondary flex items-center justify-center">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.project_title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="font-medium text-foreground max-w-[200px] truncate">
                        {item.project_title}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center justify-center bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
                      {item.units}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-foreground">
                    ₹{item.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-muted-foreground whitespace-nowrap">
                    {item.last_purchase_date
                      ? format(new Date(item.last_purchase_date), "MMM d, yyyy")
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopSellingProjects;
