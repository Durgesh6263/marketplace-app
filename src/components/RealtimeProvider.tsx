import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { collection, onSnapshot } from "firebase/firestore";
import { useProjectsRealtime } from "@/hooks/useProjects";
import { useBrandingRealtime, useBrandingSync, useBranding } from "@/hooks/useBranding";

const useSellerRequestsRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "seller_requests"), () => {
      queryClient.invalidateQueries({ queryKey: ["seller-requests"] });
    });

    return () => unsub();
  }, [queryClient]);
};

const useOrdersRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
    });

    return () => unsub();
  }, [queryClient]);
};

const useContactSubmissionsRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "contact_submissions"), () => {
      queryClient.invalidateQueries({ queryKey: ["contact-submissions"] });
    });

    return () => unsub();
  }, [queryClient]);
};

const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: branding } = useBranding();

  useProjectsRealtime();
  useSellerRequestsRealtime();
  useOrdersRealtime();
  useContactSubmissionsRealtime();
  useBrandingRealtime();
  useBrandingSync(branding?.favicon_url, branding?.site_name);

  return <>{children}</>;
};

export default RealtimeProvider;
