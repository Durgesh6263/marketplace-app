import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { db } from "@/integrations/firebase/client";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

export interface SiteBranding {
  id: string;
  site_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  support_email: string;
  contact_phone: string;
  updated_at: string;
}

const DEFAULT_BRANDING: SiteBranding = {
  id: "default",
  site_name: "The Last Minute Project",
  logo_url: null,
  favicon_url: null,
  support_email: "omjatale62@gmail.com",
  contact_phone: "+91 6263097104",
  updated_at: new Date().toISOString(),
};

export const useBranding = () => {
  return useQuery<SiteBranding>({
    queryKey: ["site-branding"],
    queryFn: async () => {
      const docRef = doc(db, "site_branding", "default");
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return DEFAULT_BRANDING;
      return { id: docSnap.id, ...docSnap.data() } as SiteBranding;
    },
    staleTime: 60000,
  });
};

export const useBrandingRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "site_branding", "default"), () => {
      queryClient.invalidateQueries({ queryKey: ["site-branding"] });
    });

    return () => {
      unsub();
    };
  }, [queryClient]);
};

/** Update favicon in DOM when branding changes */
export const useFaviconSync = (faviconUrl: string | null | undefined) => {
  useEffect(() => {
    if (!faviconUrl) return;
    const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (link) {
      link.href = faviconUrl;
    } else {
      const newLink = document.createElement("link");
      newLink.rel = "icon";
      newLink.href = faviconUrl;
      document.head.appendChild(newLink);
    }
  }, [faviconUrl]);
};
