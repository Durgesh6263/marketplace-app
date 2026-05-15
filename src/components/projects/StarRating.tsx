import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { db } from "@/integrations/firebase/client";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface StarRatingProps {
  projectId: string;
  currentRating: number;
  totalRatings?: number;
}

const getSessionId = (): string => {
  const key = "rating_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
};

const StarRating = ({ projectId, currentRating, totalRatings }: StarRatingProps) => {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ratingCount, setRatingCount] = useState(totalRatings ?? 0);

  const sessionId = getSessionId();

  useEffect(() => {
    const checkExisting = async () => {
      const docRef = doc(db, "project_ratings", `${projectId}_${sessionId}`);
      const q = query(collection(db, "project_ratings"), where("project_id", "==", projectId), where("session_id", "==", sessionId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setUserRating(snap.docs[0].data().rating);
      }
    };

    checkExisting();
  }, [projectId, sessionId]);

  const submitRating = async (rating: number) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      await setDoc(doc(db, "project_ratings", `${projectId}_${sessionId}`), {
        project_id: projectId,
        session_id: sessionId,
        rating
      });

      setUserRating(rating);
      toast({
        title: "⭐ Thanks for rating!",
        description: `You gave this project ${rating} star${rating > 1 ? "s" : ""}.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Could not submit rating. Try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredStar || userRating || Math.floor(currentRating);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <motion.button
              key={star}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              disabled={submitting}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => submitRating(star)}
              className="p-0.5 transition-colors disabled:opacity-50"
              aria-label={`Rate ${star} stars`}
            >
              <Star
                className={`h-5 w-5 transition-colors ${
                  star <= displayRating
                    ? "fill-primary text-primary"
                    : "text-muted-foreground/40"
                }`}
              />
            </motion.button>
          ))}
        </div>
        <span className="text-sm font-medium text-foreground">{currentRating}</span>
        <span className="text-xs text-muted-foreground">({totalRatings || 0} ratings)</span>
      </div>
      {userRating && (
        <p className="text-xs text-muted-foreground">You rated: {userRating}/5</p>
      )}
      {!userRating && (
        <p className="text-xs text-muted-foreground">Click to rate this project</p>
      )}
    </div>
  );
};

export default StarRating;
