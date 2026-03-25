"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

// ⚠️ AUTHORIZED ADMIN EMAILS — only these can access the admin panel
const ALLOWED_EMAILS = [
  "gunayatan.org@gmail.com",
  "sachin@ifsjaipur.com",
  "pramaniksamooh@gmail.com",
  // Add more admin emails here
];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Check if user's email is in the allowlist
        const email = u.email?.toLowerCase() || "";
        if (ALLOWED_EMAILS.some(allowed => allowed.toLowerCase() === email)) {
          setUser(u);
          setUnauthorized(false);
          setLoading(false);
        } else {
          // Unauthorized — sign them out immediately
          setUnauthorized(true);
          setLoading(false);
          await signOut(auth);
        }
      } else {
        setUser(null);
        setUnauthorized(false);
        router.replace("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#111827]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E8730A] border-t-transparent" />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#111827] text-white">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-gray-400 mb-6 text-center max-w-md">
          Your account is not authorized to access the admin panel.
          Please contact the administrator.
        </p>
        <button
          onClick={() => router.replace("/login")}
          className="rounded-lg bg-[#E8730A] px-6 py-2.5 font-semibold text-white hover:bg-[#C55E06]"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
