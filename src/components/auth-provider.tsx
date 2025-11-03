"use client";

import * as React from "react";
import { toast } from "sonner";
import { auth, googleProvider, db } from "@/lib/firebase";
import { onAuthStateChanged, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

type Role = "owner" | "member" | "visitor" | "mentor";

type AuthContextValue = {
  user: { id: string; name: string; role: Role; avatarUrl?: string } | null;
  loading: boolean;
  loginAs: (userId: string) => Promise<void>;
  loginWithCredentials: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthContextValue["user"]>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (_) {}
      unsub = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          // Check if user document exists in Firestore, create if not
          try {
            const userRef = doc(db, "users", fbUser.uid);
            const userSnap = await getDoc(userRef);
            
            let userData: any = {};
            if (!userSnap.exists()) {
              // User doesn't exist in Firestore, create it
              await setDoc(userRef, {
                displayName: fbUser.displayName || "",
                email: fbUser.email || "",
                photoURL: fbUser.photoURL || "",
                role: "member", // Default role
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              console.log("Created new user document in Firestore:", fbUser.uid);
              userData = { role: "member" };
            } else {
              // User exists, get data including role
              userData = userSnap.data() as any;
            }
            
            const mapped = {
              id: fbUser.uid,
              name: userData.displayName || fbUser.displayName || fbUser.email || "User",
              role: (userData.role || "member") as Role,
              avatarUrl: userData.photoURL || fbUser.photoURL || undefined,
            };
            setUser(mapped);
          } catch (error) {
            console.error("Error checking/creating user document:", error);
            // Fallback to basic user data
            const mapped = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email || "User",
              role: "member" as Role,
              avatarUrl: fbUser.photoURL || undefined,
            };
            setUser(mapped);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  async function loginAs(userId: string) {
    setLoading(true);
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
    const me = await fetch("/api/auth/me").then((r) => r.json());
    setUser(me.user);
    setLoading(false);
    toast.success(`Logged in as ${me.user.name}`);
  }

  async function loginWithCredentials(username: string, password: string) {
    setLoading(true);
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      toast.error("Invalid credentials");
      return { ok: false, error: (data as any).error || "Invalid credentials" };
    }
    const me = await fetch("/api/auth/me").then((r) => r.json());
    setUser(me.user);
    setLoading(false);
    toast.success(`Welcome back, ${me.user.name}!`);
    return { ok: true };
  }

  async function loginWithGoogle() {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle updating user state with role from Firestore
      toast.success("Signed in with Google");
      return { ok: true };
    } catch (e: any) {
      console.error("Google sign-in error:", e);
      const errorMessage = e?.message || "Google sign-in failed";
      
      // Check for common OAuth errors
      if (errorMessage.includes("redirect_uri_mismatch") || errorMessage.includes("redirect_uri")) {
        toast.error("OAuth configuration error. Please contact support.");
        console.error("OAuth redirect URI mismatch. Ensure domain is added to Google Cloud Console.");
      } else if (errorMessage.includes("popup_closed_by_user")) {
        toast.error("Sign-in cancelled");
      } else {
        toast.error("Google sign-in failed: " + errorMessage);
      }
      
      return { ok: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    await signOut(auth);
    setUser(null);
    setLoading(false);
    toast.success("Logged out successfully");
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginAs, loginWithCredentials, loginWithGoogle, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


