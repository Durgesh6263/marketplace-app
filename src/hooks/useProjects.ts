import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { db } from "@/integrations/firebase/client";
import { collection, query, where, orderBy, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";
import type { Project } from "@/data/mockProjects";

interface DBProject {
  title: string;
  short_description: string;
  description: string;
  price: number;
  category: string;
  thumbnail: string;
  screenshots: string[];
  demo_video_url: string;
  features: string[];
  tech_stack: string[];
  rating: number;
  total_sales: number;
  is_published: boolean;
  created_at: any;
}

const mapToProject = (id: string, p: DBProject): Project => ({
  id,
  title: p.title,
  shortDescription: p.short_description,
  description: p.description,
  price: p.price,
  category: p.category,
  thumbnail: p.thumbnail || "",
  screenshots: p.screenshots || [],
  demoVideoUrl: p.demo_video_url || undefined,
  features: p.features || [],
  techStack: p.tech_stack || [],
  rating: p.rating || 0,
  totalSales: p.total_sales || 0,
  createdAt: p.created_at?.toDate ? p.created_at.toDate().toISOString() : (p.created_at || new Date().toISOString()),
});

export const useProjectsRealtime = () => {
  const queryClient = useQueryClient();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialLoad.current = false;
    }, 2000);

    const q = query(collection(db, "projects"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data() as DBProject;
        
        if (change.type === "added") {
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          queryClient.invalidateQueries({ queryKey: ["project"] });
          if (!isInitialLoad.current && data.is_published) {
            toast({
              title: "🚀 New project just added!",
              description: data.title || "A new project is now available.",
            });
          }
        }
        if (change.type === "modified") {
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          queryClient.invalidateQueries({ queryKey: ["project"] });
          if (!isInitialLoad.current && data.is_published) {
            toast({
              title: "✏️ Project updated",
              description: `"${data.title || "A project"}" has been updated.`,
            });
          }
        }
        if (change.type === "removed") {
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          queryClient.invalidateQueries({ queryKey: ["project"] });
          if (!isInitialLoad.current) {
            toast({
              title: "🗑️ Project removed",
              description: "A project has been removed from the marketplace.",
            });
          }
        }
      });
    }, (error) => {
      console.error("Error with realtime projects:", error);
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [queryClient]);
};

export const useProjects = () => {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<Project[]> => {
      const q = query(
        collection(db, "projects"),
        where("is_published", "==", true),
        orderBy("created_at", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => mapToProject(doc.id, doc.data() as DBProject));
    },
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: ["project", id],
    queryFn: async (): Promise<Project | null> => {
      const docRef = doc(db, "projects", id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;
      
      const data = docSnap.data() as DBProject;
      if (!data.is_published) return null;
      
      return mapToProject(docSnap.id, data);
    },
    enabled: !!id,
  });
};
