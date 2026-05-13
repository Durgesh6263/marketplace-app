import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { db } from "@/integrations/firebase/client";
import { collection, query, getDocs, onSnapshot, orderBy } from "firebase/firestore";

export interface MonthlySales {
  month: string;
  sales: number;
  count: number;
}

export interface RecentOrder {
  id: string;
  project_id: string;
  buyer_email: string;
  buyer_name: string;
  buyer_phone: string;
  amount: number;
  status: string;
  created_at: string;
  projects: { title: string } | null;
}

export interface DashboardStats {
  totalProjects: number;
  totalSalesAmount: number;
  totalPaidOrders: number;
  totalDownloads: number;
  activeUsers: number;
  monthlySales: MonthlySales[];
  recentOrders: RecentOrder[];
}

export const useDashboardStats = () => {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      // In a real production app, this would be a Cloud Function.
      // For this migration, we fetch and calculate client-side for admins.
      const projectsSnap = await getDocs(collection(db, "projects"));
      const ordersSnap = await getDocs(collection(db, "orders"));
      const usersSnap = await getDocs(collection(db, "user_roles"));

      let totalSalesAmount = 0;
      let totalPaidOrders = 0;
      let totalDownloads = 0;
      const recentOrders: RecentOrder[] = [];
      const monthlySalesMap: Record<string, MonthlySales> = {};

      projectsSnap.forEach(doc => {
        totalDownloads += (doc.data().total_sales || 0);
      });

      ordersSnap.forEach(doc => {
        const data = doc.data();
        if (data.status === "paid" || data.status === "completed") {
          totalPaidOrders++;
          totalSalesAmount += (data.amount || 0);

          const date = new Date(data.created_at?.toDate ? data.created_at.toDate() : data.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlySalesMap[monthKey]) {
            monthlySalesMap[monthKey] = { month: monthKey, sales: 0, count: 0 };
          }
          monthlySalesMap[monthKey].sales += (data.amount || 0);
          monthlySalesMap[monthKey].count++;
        }

        if (recentOrders.length < 5) {
          recentOrders.push({
            id: doc.id,
            project_id: data.project_id,
            buyer_email: data.buyer_email,
            buyer_name: data.buyer_name,
            buyer_phone: data.buyer_phone,
            amount: data.amount,
            status: data.status,
            created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at,
            projects: { title: data.project_title || "Unknown Project" }
          });
        }
      });

      const monthlySales = Object.values(monthlySalesMap).sort((a, b) => a.month.localeCompare(b.month));
      recentOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return {
        totalProjects: projectsSnap.size,
        totalSalesAmount,
        totalPaidOrders,
        totalDownloads,
        activeUsers: usersSnap.size,
        monthlySales,
        recentOrders
      };
    },
    refetchInterval: 30000,
  });
};

export const useDashboardRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, "orders"), () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    });
    
    const unsubProjects = onSnapshot(collection(db, "projects"), () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    });

    return () => {
      unsubOrders();
      unsubProjects();
    };
  }, [queryClient]);
};
