"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/home-layout");
      } else {
        router.replace("/login");
      }
      setChecking(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (checking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#111827]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E8730A] border-t-transparent" />
      </div>
    );
  }

  return null;
}
