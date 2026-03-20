"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  IoVideocamOutline,
  IoMegaphoneOutline,
  IoSchoolOutline,
  IoRadioOutline,
  IoSyncOutline,
  IoAddOutline,
  IoCalendarOutline,
} from "react-icons/io5";

interface Stats {
  totalVideos: number;
  activeAnnouncements: number;
  upcomingClasses: number;
  shorts: number;
}

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats>({
    totalVideos: 0,
    activeAnnouncements: 0,
    upcomingClasses: 0,
    shorts: 0,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadStats() {
      try {
        const [videosSnap, announcementsSnap, classesSnap, shortsSnap] = await Promise.all([
          getCountFromServer(collection(db, "videos")).catch(() => ({ data: () => ({ count: 0 }) })),
          getCountFromServer(
            query(collection(db, "announcements"), where("active", "==", true))
          ).catch(() => ({ data: () => ({ count: 0 }) })),
          getCountFromServer(
            query(collection(db, "pathshala/classes/items"), where("active", "==", true))
          ).catch(() => ({ data: () => ({ count: 0 }) })),
          getCountFromServer(collection(db, "shorts")).catch(() => ({
            data: () => ({ count: 0 }),
          })),
        ]);
        setStats({
          totalVideos: videosSnap.data().count,
          activeAnnouncements: announcementsSnap.data().count,
          upcomingClasses: classesSnap.data().count,
          shorts: shortsSnap.data().count,
        });
      } catch {
        // Stats may fail if collections don't exist yet
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const statCards = [
    {
      label: "Total Videos",
      value: stats.totalVideos,
      icon: IoVideocamOutline,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Active Announcements",
      value: stats.activeAnnouncements,
      icon: IoMegaphoneOutline,
      color: "text-saffron",
      bg: "bg-saffron/10",
    },
    {
      label: "Active Classes",
      value: stats.upcomingClasses,
      icon: IoSchoolOutline,
      color: "text-green-400",
      bg: "bg-green-400/10",
    },
    {
      label: "Shorts",
      value: stats.shorts,
      icon: IoRadioOutline,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
  ];

  const quickActions = [
    {
      label: "Sync Videos",
      icon: IoSyncOutline,
      onClick: () => router.push("/videos"),
    },
    {
      label: "Add Announcement",
      icon: IoAddOutline,
      onClick: () => router.push("/announcements"),
    },
    {
      label: "Schedule Class",
      icon: IoCalendarOutline,
      onClick: () => router.push("/pathshala"),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">Pramanik OTT Admin Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{card.label}</p>
                <p className="mt-1 text-3xl font-bold">
                  {loading ? "-" : card.value}
                </p>
              </div>
              <div className={`rounded-lg p-3 ${card.bg}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-saffron/50 hover:text-saffron"
            >
              <action.icon className="h-5 w-5" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
