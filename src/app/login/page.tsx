"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { IoShieldCheckmark, IoLogoGoogle } from "react-icons/io5";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/home-layout");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message.includes("invalid") ? "Invalid email or password" : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-saffron/20">
            <IoShieldCheckmark className="h-8 w-8 text-saffron" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Pramanik OTT</h1>
          <p className="mt-1 text-sm text-gray-400">Admin Panel</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-foreground placeholder-gray-500 outline-none transition-all focus:border-saffron focus:ring-2 focus:ring-saffron/30"
              placeholder="admin@pramanik.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-foreground placeholder-gray-500 outline-none transition-all focus:border-saffron focus:ring-2 focus:ring-saffron/30"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-saffron px-4 py-2.5 font-semibold text-white transition-colors hover:bg-saffron-hover disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-gray-500">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={async () => {
            setError("");
            setLoading(true);
            try {
              await signInWithPopup(auth, new GoogleAuthProvider());
              router.replace("/home-layout");
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : "Google login failed";
              setError(message);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 font-medium text-foreground transition-colors hover:bg-border disabled:opacity-50"
        >
          <IoLogoGoogle className="h-5 w-5 text-saffron" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
