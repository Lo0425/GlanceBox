"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, User } from "firebase/auth";
import { getFirebaseAuth, googleProvider } from "@/lib/firebaseClient";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthUser {
  uid: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  // Resolves to a fresh Firebase ID token for authenticating API calls, or
  // null when signed out. Firebase refreshes the underlying token as needed.
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(user: User): AuthUser {
  return { uid: user.uid, email: user.email, name: user.displayName, image: user.photoURL };
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      setFirebaseUser(user);
      setStatus(user ? "authenticated" : "unauthenticated");
    });
  }, []);

  const value: AuthContextValue = {
    status,
    user: firebaseUser ? toAuthUser(firebaseUser) : null,
    signInWithGoogle: async () => {
      await signInWithPopup(getFirebaseAuth(), googleProvider);
    },
    signOutUser: async () => {
      await firebaseSignOut(getFirebaseAuth());
    },
    getIdToken: async () => (firebaseUser ? firebaseUser.getIdToken() : null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
