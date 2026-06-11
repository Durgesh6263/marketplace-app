import { useState, useEffect, createContext, useContext } from "react";
import { auth, db } from "@/integrations/firebase/client";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  User 
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";

import { sendPasswordResetEmail } from "firebase/auth";

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isSeller: boolean;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signUpSeller: (email: string, password: string, name: string, phone: string) => Promise<{ error: any }>;
  signUpAdmin: (email: string, password: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    try {
      const docRef = doc(db, "user_roles", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === "Suspended") {
          await firebaseSignOut(auth);
          setUserRole(null);
          setIsAdmin(false);
          setIsSeller(false);
          setUser(null);
          return;
        }
        const role = data.role;
        setUserRole(role);
        setIsAdmin(role === "admin");
        setIsSeller(role === "seller");
      } else {
        setUserRole("user");
        setIsAdmin(false);
        setIsSeller(false);
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      setUserRole(null);
      setIsAdmin(false);
      setIsSeller(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const docRef = doc(db, "user_roles", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().status === "Suspended") {
          await firebaseSignOut(auth);
          setUser(null);
          setIsAdmin(false);
          setIsSeller(false);
          setUserRole(null);
          alert("Your account has been suspended by the administrator.");
        } else {
          setUser(currentUser);
          if (docSnap.exists()) {
            const role = docSnap.data().role;
            setUserRole(role);
            setIsAdmin(role === "admin");
            setIsSeller(role === "seller");
          } else {
            setUserRole("user");
            setIsAdmin(false);
            setIsSeller(false);
          }
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsSeller(false);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Double check suspension status
      const docRef = doc(db, "user_roles", userCredential.user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().status === "Suspended") {
        await firebaseSignOut(auth);
        return { error: new Error("Your account has been suspended by the administrator.") };
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Create a default user role entry in Firestore
      await setDoc(doc(db, "user_roles", userCredential.user.uid), {
        role: "user"
      });
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signUpSeller = async (email: string, password: string, name: string, phone: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Create a seller role entry in Firestore
      await setDoc(doc(db, "user_roles", userCredential.user.uid), {
        role: "seller",
        name,
        email,
        phone,
        created_at: new Date().toISOString()
      });
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signUpAdmin = async (email: string, password: string) => {
    try {
      // Check if an admin already exists
      const q = query(collection(db, "user_roles"), where("role", "==", "admin"));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return { error: new Error("Only one Admin account is allowed.") };
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Create an admin role entry in Firestore
      await setDoc(doc(db, "user_roles", userCredential.user.uid), {
        role: "admin",
        email,
        created_at: new Date().toISOString()
      });
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setIsAdmin(false);
      setIsSeller(false);
      setUserRole(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isSeller,
        userRole,
        loading,
        signIn,
        signUp,
        signUpSeller,
        signUpAdmin,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
