import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { db } from "@/integrations/firebase/client";
import { collection, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore";

export interface SellerMonthlySales {
  month: string;
  earnings: number;
  salesCount: number;
}

export interface SellerProject {
  id: string;
  title: string;
  short_description: string;
  description: string;
  price: number;
  category: string;
  thumbnail: string;
  projectImages: string[];
  demo_video_url: string;
  download_url: string;
  source_code_zip?: string;
  project_report_pdf?: string;
  installation_guide_pdf?: string;
  version?: string;
  status: string;
  seller_id: string;
  seller_name: string;
  is_published: boolean;
  total_sales: number;
  rating: number;
  total_ratings: number;
  created_at: any;
  updated_at: any;
}

export interface SellerSale {
  id: string;
  project_id: string;
  project_title: string;
  buyer_email: string;
  buyer_name: string;
  amount: number; // project price
  seller_earning: number; // 40%
  platform_earning: number; // 60%
  status: string;
  created_at: string;
}

export interface SellerStats {
  totalProjects: number;
  approvedProjects: number;
  pendingProjects: number;
  rejectedProjects: number;
  totalUnitsSold: number;
  totalEarnings: number;
  monthlySales: SellerMonthlySales[];
  recentSales: SellerSale[];
}

export const useSellerStats = (sellerId: string) => {
  return useQuery<SellerStats>({
    queryKey: ["seller-stats", sellerId],
    queryFn: async () => {
      if (!sellerId) {
        return {
          totalProjects: 0,
          approvedProjects: 0,
          pendingProjects: 0,
          rejectedProjects: 0,
          totalUnitsSold: 0,
          totalEarnings: 0,
          monthlySales: [],
          recentSales: []
        };
      }

      // 1. Fetch projects by seller
      const projectsQuery = query(
        collection(db, "projects"),
        where("seller_id", "==", sellerId)
      );
      const projectsSnap = await getDocs(projectsQuery);
      
      const projects: SellerProject[] = [];
      let approvedCount = 0;
      let pendingCount = 0;
      let rejectedCount = 0;

      projectsSnap.forEach((doc) => {
        const data = doc.data() as SellerProject;
        projects.push({ ...data, id: doc.id });
        
        const status = (data.status || "Draft").toLowerCase();
        if (status === "approved") {
          approvedCount++;
        } else if (status === "submitted" || status === "under review") {
          pendingCount++;
        } else if (status === "rejected") {
          rejectedCount++;
        }
      });

      // 2. Fetch paid orders containing products of this seller
      const salesQuery = query(
        collection(db, "orders"),
        where("seller_id", "==", sellerId),
        where("status", "==", "paid")
      );
      const salesSnap = await getDocs(salesQuery);

      let totalUnitsSold = 0;
      let totalEarnings = 0;
      const recentSales: SellerSale[] = [];
      const monthlySalesMap: Record<string, SellerMonthlySales> = {};

      salesSnap.forEach((doc) => {
        const data = doc.data();
        totalUnitsSold++;
        
        // Earning calculation (40% commission split)
        // If the order document already has seller_earning, use it, else calculate client-side for retro-compatibility
        const amount = data.amount || 0;
        const sellerEarning = data.seller_earning !== undefined ? data.seller_earning : (amount * 0.4);
        const platformEarning = data.platform_earning !== undefined ? data.platform_earning : (amount * 0.6);
        
        totalEarnings += sellerEarning;

        const orderDateStr = data.created_at?.toDate 
          ? data.created_at.toDate().toISOString() 
          : (data.created_at || new Date().toISOString());

        const date = new Date(orderDateStr);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlySalesMap[monthKey]) {
          monthlySalesMap[monthKey] = { month: monthKey, earnings: 0, salesCount: 0 };
        }
        monthlySalesMap[monthKey].earnings += sellerEarning;
        monthlySalesMap[monthKey].salesCount++;

        recentSales.push({
          id: doc.id,
          project_id: data.project_id,
          project_title: data.project_title || "Unknown Project",
          buyer_email: data.buyer_email || "",
          buyer_name: data.buyer_name || "Anonymous",
          amount: amount,
          seller_earning: sellerEarning,
          platform_earning: platformEarning,
          status: data.status,
          created_at: orderDateStr
        });
      });

      // Sort monthly sales chronologically
      const monthlySales = Object.values(monthlySalesMap).sort((a, b) => a.month.localeCompare(b.month));
      
      // Sort recent sales by date desc
      recentSales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return {
        totalProjects: projectsSnap.size,
        approvedProjects: approvedCount,
        pendingProjects: pendingCount,
        rejectedProjects: rejectedCount,
        totalUnitsSold,
        totalEarnings,
        monthlySales,
        recentSales
      };
    },
    enabled: !!sellerId,
    refetchInterval: 30000,
  });
};

export const useSellerRealtime = (sellerId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sellerId) return;

    const projectsQuery = query(
      collection(db, "projects"),
      where("seller_id", "==", sellerId)
    );
    const unsubProjects = onSnapshot(projectsQuery, () => {
      queryClient.invalidateQueries({ queryKey: ["seller-stats", sellerId] });
      queryClient.invalidateQueries({ queryKey: ["seller-projects", sellerId] });
    });

    const salesQuery = query(
      collection(db, "orders"),
      where("seller_id", "==", sellerId),
      where("status", "==", "paid")
    );
    const unsubSales = onSnapshot(salesQuery, () => {
      queryClient.invalidateQueries({ queryKey: ["seller-stats", sellerId] });
    });

    const notifQuery = query(
      collection(db, "seller_notifications"),
      where("seller_id", "==", sellerId)
    );
    const unsubNotifs = onSnapshot(notifQuery, () => {
      queryClient.invalidateQueries({ queryKey: ["seller-notifications", sellerId] });
    });

    return () => {
      unsubProjects();
      unsubSales();
      unsubNotifs();
    };
  }, [sellerId, queryClient]);
};
