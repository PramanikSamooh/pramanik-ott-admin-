"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGuard from "@/components/AuthGuard";
import { ToastProvider } from "@/components/Toast";
import {
  IoGridOutline,
  IoHomeOutline,
  IoMegaphoneOutline,
  IoSchoolOutline,
  IoPlayOutline,
  IoHeartOutline,
  IoLayersOutline,
  IoListOutline,
  IoVideocamOutline,
  IoSettingsOutline,
  IoMenuOutline,
  IoCloseOutline,
  IoLogOutOutline,
  IoImageOutline,
  IoPulseOutline,
  IoNotificationsOutline,
  IoFilmOutline,
  IoCalendarOutline,
} from "react-icons/io5";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: IoGridOutline },
  { href: "/playlists", label: "Playlists", icon: IoListOutline },
  { href: "/curated-videos", label: "Poojan & Path", icon: IoHomeOutline },
  { href: "/announcements", label: "Announcements", icon: IoMegaphoneOutline },
  { href: "/pathshala", label: "Pathshala", icon: IoSchoolOutline },
  { href: "/shorts", label: "Shorts", icon: IoPlayOutline },
  { href: "/donations", label: "Donations", icon: IoHeartOutline },
  { href: "/hero", label: "Hero Videos", icon: IoImageOutline },
  { href: "/live", label: "Live Control", icon: IoPulseOutline },
  { href: "/push-notifications", label: "Push Notifications", icon: IoNotificationsOutline },
  { href: "/preroll", label: "Pre-roll Videos", icon: IoFilmOutline },
  { href: "/events", label: "Event Videos", icon: IoCalendarOutline },
  { href: "/categories", label: "Categories", icon: IoLayersOutline },
  { href: "/videos", label: "Videos", icon: IoVideocamOutline },
  { href: "/settings", label: "Settings", icon: IoSettingsOutline },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface border-r border-border transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-saffron flex items-center justify-center text-white font-bold text-sm">
              P
            </div>
            <span className="text-lg font-bold text-foreground">Pramanik OTT</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-foreground">
            <IoCloseOutline className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-saffron/15 text-saffron"
                        : "text-gray-400 hover:bg-surface-hover hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border px-3 py-3">
          <p className="truncate px-3 text-xs text-gray-500">
            {auth.currentUser?.email ?? "Admin"}
          </p>
        </div>
      </aside>
    </>
  );
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/80 backdrop-blur-sm px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="text-gray-400 hover:text-foreground lg:hidden"
      >
        <IoMenuOutline className="h-6 w-6" />
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-4">
        <span className="hidden text-sm text-gray-400 sm:block">
          {auth.currentUser?.email}
        </span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-red-500/50 hover:text-red-400"
        >
          <IoLogOutOutline className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <ToastProvider>
        <div className="min-h-screen bg-background">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="lg:ml-64">
            <TopBar onMenuClick={() => setSidebarOpen(true)} />
            <main className="p-4 lg:p-6">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </AuthGuard>
  );
}
