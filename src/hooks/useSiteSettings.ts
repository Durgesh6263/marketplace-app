import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { db } from "@/integrations/firebase/client";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

export interface SiteSettings {
  general: {
    website_name: string;
    tagline: string;
    description: string;
    contact_email: string;
    contact_phone: string;
    address: string;
  };
  logo: {
    logo_url: string | null;
    favicon_url: string | null;
  };
  branding: {
    primary_color: string;
    secondary_color: string;
    button_color: string;
    theme_mode: string;
  };
  homepage: {
    hero_title: string;
    hero_subtitle: string;
    cta_text: string;
    features_title: string;
    features_description: string;
    seller_commission_pct: number;
    seller_benefits: string[];
  };
  social: {
    linkedin: string;
    instagram: string;
    facebook: string;
    youtube: string;
    twitter: string;
  };
  seo: {
    meta_title: string;
    meta_description: string;
    keywords: string;
  };
}

export const DEFAULT_SETTINGS: SiteSettings = {
  general: {
    website_name: "The Last Minute Project",
    tagline: "Your ultimate marketplace for computer science projects.",
    description: "Buy and sell high-quality, verified computer science projects.",
    contact_email: "support@lastminuteproject.com",
    contact_phone: "+91 0000000000",
    address: "India",
  },
  logo: {
    logo_url: null,
    favicon_url: null,
  },
  branding: {
    primary_color: "142.1 76.2% 36.3%", // Default green
    secondary_color: "240 4.8% 95.9%",
    button_color: "142.1 76.2% 36.3%",
    theme_mode: "dark",
  },
  homepage: {
    hero_title: "Ship Your Next Project Faster",
    hero_subtitle: "Access hundreds of ready-to-use, verified computer science projects with complete source code and documentation.",
    cta_text: "Browse Projects",
    features_title: "Why Choose ProjectExchange",
    features_description: "Everything you need to secure your final year grade, without the sleepless nights.",
    seller_commission_pct: 60,
    seller_benefits: ["Set your own prices", "Reach thousands of students", "Earn 60% per sale"],
  },
  social: {
    linkedin: "",
    instagram: "",
    facebook: "",
    youtube: "",
    twitter: "",
  },
  seo: {
    meta_title: "The Last Minute Project - CS Marketplace",
    meta_description: "Buy and sell computer science projects easily.",
    keywords: "computer science, projects, final year projects, source code",
  },
};

export const useSiteSettings = () => {
  return useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const docRef = doc(db, "site_settings", "default");
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return DEFAULT_SETTINGS;
      
      const data = docSnap.data();
      // Deep merge with defaults to avoid missing keys
      return {
        general: { ...DEFAULT_SETTINGS.general, ...(data.general || {}) },
        logo: { ...DEFAULT_SETTINGS.logo, ...(data.logo || {}) },
        branding: { ...DEFAULT_SETTINGS.branding, ...(data.branding || {}) },
        homepage: { ...DEFAULT_SETTINGS.homepage, ...(data.homepage || {}) },
        social: { ...DEFAULT_SETTINGS.social, ...(data.social || {}) },
        seo: { ...DEFAULT_SETTINGS.seo, ...(data.seo || {}) },
      } as SiteSettings;
    },
    staleTime: 60000,
  });
};

export const useSiteSettingsRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "site_settings", "default"), () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    });

    return () => {
      unsub();
    };
  }, [queryClient]);
};

/** Sync settings to DOM elements (SEO, CSS Vars, Favicon) */
export const useSiteSettingsSync = (settings: SiteSettings | undefined) => {
  useEffect(() => {
    if (!settings) return;

    // Set Title
    document.title = settings.seo.meta_title || settings.general.website_name;

    // Set Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', settings.seo.meta_description || settings.general.description);

    // Set Keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', settings.seo.keywords);

    // Set Favicon
    if (settings.logo.favicon_url) {
      let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = settings.logo.favicon_url;
    }

    // Apply CSS Variables
    const root = document.documentElement;
    if (settings.branding.primary_color) {
      root.style.setProperty('--primary', settings.branding.primary_color);
    }
    if (settings.branding.secondary_color) {
      root.style.setProperty('--secondary', settings.branding.secondary_color);
    }
  }, [settings]);
};
