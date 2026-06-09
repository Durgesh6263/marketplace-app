import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { db } from "@/integrations/firebase/client";
import { collection, query, getDocs, onSnapshot, orderBy } from "firebase/firestore";

export interface MonthlySales {
  month: string;
  sales: number;
  count: number;
}

export interface UnitSoldBreakdown {
  project_id: string;
  project_title: string;
  image_url: string;
  units: number;
  revenue: number;
  last_purchase_date: string | null;
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
  unitsSoldBreakdown: UnitSoldBreakdown[];
  totalUsers: number;
  totalBuyers: number;
  totalSellers: number;
  pendingProjects: number;
  approvedProjects: number;
  rejectedProjects: number;
  totalOrders: number;
  totalRevenue: number;
  platformRevenue: number;
  totalSellerCommissions: number;
  paidCommissions: number;
  pendingCommissions: number;
  activeSellers: number;
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
      const payoutsSnap = await getDocs(collection(db, "seller_payouts"));

      let totalSalesAmount = 0;
      let totalPaidOrders = 0;
      let totalDownloads = 0;
      let pendingProjectsCount = 0;
      let approvedProjectsCount = 0;
      let rejectedProjectsCount = 0;
      let buyersCount = 0;
      let sellersCount = 0;
      
      const recentOrders: RecentOrder[] = [];
      const monthlySalesMap: Record<string, MonthlySales> = {};
      const unitsBreakdownMap: Record<string, UnitSoldBreakdown> = {};

      const activeSellersSet = new Set<string>();

      projectsSnap.forEach(doc => {
        const data = doc.data();
        totalDownloads += (data.total_sales || 0);
        
        // Count project status breakdown
        const status = (data.status || (data.is_published ? "Approved" : "Draft")).toLowerCase();
        if (status === "approved") {
          approvedProjectsCount++;
          if (data.seller_id) {
            activeSellersSet.add(data.seller_id);
          }
        } else if (status === "submitted" || status === "under review") {
          pendingProjectsCount++;
        } else if (status === "rejected") {
          rejectedProjectsCount++;
        }

        unitsBreakdownMap[doc.id] = { 
          project_id: doc.id,
          project_title: data.title || "Unknown", 
          image_url: data.thumbnail_url || "",
          units: 0, 
          revenue: 0,
          last_purchase_date: null
        };
      });

      // Count user roles
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.role === "seller") {
          sellersCount++;
        } else if (data.role === "user" || !data.role) {
          buyersCount++;
        }
      });

      let totalPlatformProfit = 0;
      let totalSellerEarnings = 0;

      ordersSnap.forEach(doc => {
        const data = doc.data();
        if (data.status === "paid" || data.status === "completed") {
          totalPaidOrders++;
          totalSalesAmount += (data.amount || 0);

          // Calculate commission splits: 40% seller, 60% platform
          const platformShare = data.platform_earning !== undefined ? data.platform_earning : ((data.amount || 0) * 0.6);
          const sellerShare = data.seller_earning !== undefined ? data.seller_earning : ((data.amount || 0) * 0.4);
          
          totalPlatformProfit += platformShare;
          totalSellerEarnings += sellerShare;

          if (data.seller_id) {
            activeSellersSet.add(data.seller_id);
          }

          if (data.project_id && unitsBreakdownMap[data.project_id]) {
            unitsBreakdownMap[data.project_id].units++;
            unitsBreakdownMap[data.project_id].revenue += (data.amount || 0);
            
            const orderDateStr = data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at;
            if (!unitsBreakdownMap[data.project_id].last_purchase_date || new Date(orderDateStr) > new Date(unitsBreakdownMap[data.project_id].last_purchase_date!)) {
              unitsBreakdownMap[data.project_id].last_purchase_date = orderDateStr;
            }
          }

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

      // Sum paid payouts
      let paidCommissions = 0;
      payoutsSnap.forEach(doc => {
        const data = doc.data();
        if (data.status === "paid") {
          paidCommissions += (data.amount || 0);
        }
      });

      const monthlySales = Object.values(monthlySalesMap).sort((a, b) => a.month.localeCompare(b.month));
      recentOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const unitsSoldBreakdown = Object.values(unitsBreakdownMap)
        .filter(u => u.units > 0)
        .sort((a, b) => b.units - a.units);

      return {
        totalProjects: projectsSnap.size,
        totalSalesAmount,
        totalPaidOrders,
        totalDownloads,
        activeUsers: usersSnap.size,
        monthlySales,
        recentOrders,
        unitsSoldBreakdown,
        totalUsers: usersSnap.size,
        totalBuyers: buyersCount,
        totalSellers: sellersCount,
        pendingProjects: pendingProjectsCount,
        approvedProjects: approvedProjectsCount,
        rejectedProjects: rejectedProjectsCount,
        totalOrders: ordersSnap.size,
        totalRevenue: totalSalesAmount,
        platformRevenue: totalPlatformProfit,
        totalSellerCommissions: totalSellerEarnings,
        paidCommissions,
        pendingCommissions: Math.max(0, totalSellerEarnings - paidCommissions),
        activeSellers: activeSellersSet.size,
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

    const unsubPayouts = onSnapshot(collection(db, "seller_payouts"), () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    });

    return () => {
      unsubOrders();
      unsubProjects();
      unsubPayouts();
    };
  }, [queryClient]);
};
