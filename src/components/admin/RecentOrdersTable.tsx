import type { RecentOrder } from "@/hooks/useDashboardStats";

interface Props {
  orders: RecentOrder[];
}

const statusStyles: Record<string, string> = {
  paid: "bg-primary/10 text-primary",
  created: "bg-yellow-500/10 text-yellow-400",
  failed: "bg-destructive/10 text-destructive",
};

const RecentOrdersTable = ({ orders }: Props) => {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">
          Recent Orders
        </h3>
        <p className="text-muted-foreground text-sm text-center py-8">
          No orders yet. Orders will appear here after payments.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-display text-lg font-semibold text-foreground mb-4">
        Recent Orders
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Project
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Buyer
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Phone
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Amount
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-border last:border-0"
              >
                <td className="px-3 py-3 text-sm text-foreground">
                  {order.projects?.title || "—"}
                </td>
                <td className="px-3 py-3 text-sm text-muted-foreground">
                  {order.buyer_email}
                </td>
                <td className="px-3 py-3 text-sm text-muted-foreground">
                  {order.buyer_phone || "—"}
                </td>
                <td className="px-3 py-3 text-sm font-semibold text-foreground">
                  ₹{Number(order.amount).toLocaleString()}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statusStyles[order.status] || statusStyles.created
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentOrdersTable;
