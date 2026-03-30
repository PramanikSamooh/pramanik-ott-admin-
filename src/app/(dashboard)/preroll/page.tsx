"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import {
  IoSaveOutline,
  IoAddOutline,
  IoTrashOutline,
  IoArrowUpOutline,
  IoArrowDownOutline,
  IoPlayCircleOutline,
  IoAnalyticsOutline,
} from "react-icons/io5";

interface PrerollVideo {
  videoId: string;
  label: string;
  labelHi: string;
  active: boolean;
  order: number;
}

interface PrerollConfig {
  enabled: boolean;
  skipAfter: number;
  oncePerSession: boolean;
  videos: PrerollVideo[];
}

interface VideoAnalytics {
  videoId: string;
  totalViews: number;
  totalSkips: number;
  totalWatchSeconds: number;
  viewsToday: number;
  viewsThisWeek: number;
}

const defaults: PrerollConfig = {
  enabled: false,
  skipAfter: 5,
  oncePerSession: false,
  videos: [],
};

const emptyVideo: PrerollVideo = {
  videoId: "",
  label: "",
  labelHi: "",
  active: true,
  order: 0,
};

export default function PrerollPage() {
  const [config, setConfig] = useState<PrerollConfig>(defaults);
  const [analytics, setAnalytics] = useState<VideoAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, "config", "preroll"));
        if (snap.exists()) {
          const data = snap.data();
          setConfig({
            enabled: data.enabled ?? false,
            skipAfter: data.skipAfter ?? 5,
            oncePerSession: data.oncePerSession ?? false,
            videos: (data.videos ?? []).sort((a: PrerollVideo, b: PrerollVideo) => a.order - b.order),
          });
        }

        // Load analytics
        const analyticsSnap = await getDocs(
          query(collection(db, "prerollAnalytics"), orderBy("totalViews", "desc"), limit(20))
        );
        setAnalytics(
          analyticsSnap.docs.map((d) => ({ videoId: d.id, ...d.data() } as VideoAnalytics))
        );
      } catch {
        toast("Failed to load pre-roll config", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function save() {
    // Validate video IDs
    for (const v of config.videos) {
      if (!v.videoId.trim()) {
        toast("All videos must have a YouTube Video ID", "error");
        return;
      }
      if (v.videoId.includes("/") || v.videoId.includes("youtube.com")) {
        toast("Enter only the Video ID (e.g. dQw4w9WgXcQ), not the full URL", "error");
        return;
      }
    }

    setSaving(true);
    try {
      const videosWithOrder = config.videos.map((v, i) => ({ ...v, order: i }));
      await setDoc(doc(db, "config", "preroll"), {
        enabled: config.enabled,
        skipAfter: config.skipAfter,
        oncePerSession: config.oncePerSession,
        videos: videosWithOrder,
        updatedAt: new Date(),
      });
      toast("Pre-roll config saved");
    } catch {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  function addVideo() {
    if (config.videos.length >= 10) {
      toast("Maximum 10 pre-roll videos allowed", "error");
      return;
    }
    setConfig({
      ...config,
      videos: [...config.videos, { ...emptyVideo, order: config.videos.length }],
    });
  }

  function removeVideo(index: number) {
    setConfig({
      ...config,
      videos: config.videos.filter((_, i) => i !== index),
    });
  }

  function updateVideo(index: number, updates: Partial<PrerollVideo>) {
    setConfig({
      ...config,
      videos: config.videos.map((v, i) => (i === index ? { ...v, ...updates } : v)),
    });
  }

  function moveVideo(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= config.videos.length) return;
    const videos = [...config.videos];
    [videos[index], videos[newIndex]] = [videos[newIndex], videos[index]];
    setConfig({ ...config, videos });
  }

  function getAnalyticsForVideo(videoId: string): VideoAnalytics | undefined {
    return analytics.find((a) => a.videoId === videoId);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-saffron border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pre-roll Videos</h1>
          <p className="mt-1 text-sm text-gray-400">
            Show info videos before content plays — like ads for upcoming events
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover disabled:opacity-50"
        >
          <IoSaveOutline className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Global Config */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <IoPlayCircleOutline className="h-5 w-5 text-saffron" /> Configuration
          </h2>
          <div className="space-y-4">
            {/* Enabled Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
              <div>
                <div className="text-sm font-medium">Enable Pre-roll</div>
                <div className="text-xs text-gray-500">
                  When enabled, users see an info video before their content plays
                </div>
              </div>
              <button
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={`h-6 w-11 rounded-full transition-colors ${
                  config.enabled ? "bg-green-500" : "bg-gray-600"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-white transition-transform ${
                    config.enabled ? "translate-x-5.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Once Per Session */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
              <div>
                <div className="text-sm font-medium">Once Per Session</div>
                <div className="text-xs text-gray-500">
                  Only show pre-roll on the first video play per app session
                </div>
              </div>
              <button
                onClick={() => setConfig({ ...config, oncePerSession: !config.oncePerSession })}
                className={`h-6 w-11 rounded-full transition-colors ${
                  config.oncePerSession ? "bg-green-500" : "bg-gray-600"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-white transition-transform ${
                    config.oncePerSession ? "translate-x-5.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Skip After */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Skip After (seconds)
              </label>
              <input
                type="number"
                min={0}
                max={60}
                value={config.skipAfter}
                onChange={(e) =>
                  setConfig({ ...config, skipAfter: Math.max(0, parseInt(e.target.value) || 0) })
                }
                className="w-32 rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30"
              />
              <p className="mt-1 text-xs text-gray-500">
                Users can skip after this many seconds. Set 0 for immediate skip.
              </p>
            </div>
          </div>
        </div>

        {/* Video Series */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <IoPlayCircleOutline className="h-5 w-5 text-saffron" /> Video Series
            </h2>
            <button
              onClick={addVideo}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-gray-400 hover:border-saffron hover:text-saffron"
            >
              <IoAddOutline className="h-4 w-4" /> Add Video
            </button>
          </div>
          <p className="mb-4 text-xs text-gray-500">
            Videos play in order. Each user sees the next video in sequence — video 1 first time,
            video 2 next time, and so on. After the last video, it loops back.
          </p>

          {config.videos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-gray-500">
              No pre-roll videos added yet. Click &quot;Add Video&quot; to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {config.videos.map((video, index) => {
                const stats = getAnalyticsForVideo(video.videoId);
                return (
                  <div
                    key={index}
                    className={`rounded-lg border bg-background p-4 ${
                      video.active ? "border-border" : "border-border opacity-50"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-saffron/20 text-xs font-bold text-saffron">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium">Video #{index + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveVideo(index, "up")}
                          disabled={index === 0}
                          className="rounded p-1 text-gray-400 hover:text-foreground disabled:opacity-30"
                        >
                          <IoArrowUpOutline className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => moveVideo(index, "down")}
                          disabled={index === config.videos.length - 1}
                          className="rounded p-1 text-gray-400 hover:text-foreground disabled:opacity-30"
                        >
                          <IoArrowDownOutline className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            updateVideo(index, { active: !video.active })
                          }
                          className={`ml-2 h-5 w-9 rounded-full transition-colors ${
                            video.active ? "bg-green-500" : "bg-gray-600"
                          }`}
                        >
                          <div
                            className={`h-4 w-4 rounded-full bg-white transition-transform ${
                              video.active ? "translate-x-4.5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => removeVideo(index)}
                          className="ml-1 rounded p-1 text-gray-400 hover:text-red-400"
                        >
                          <IoTrashOutline className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          YouTube Video ID
                        </label>
                        <input
                          value={video.videoId}
                          onChange={(e) =>
                            updateVideo(index, { videoId: e.target.value.trim() })
                          }
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-saffron"
                          placeholder="e.g. dQw4w9WgXcQ"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Label (English)
                        </label>
                        <input
                          value={video.label}
                          onChange={(e) => updateVideo(index, { label: e.target.value })}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-saffron"
                          placeholder="e.g. Chaturmas 2026"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Label (Hindi)
                        </label>
                        <input
                          value={video.labelHi}
                          onChange={(e) => updateVideo(index, { labelHi: e.target.value })}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-saffron"
                          placeholder="e.g. चातुर्मास 2026"
                        />
                      </div>
                    </div>

                    {/* Thumbnail preview */}
                    {video.videoId && (
                      <div className="mt-3 flex items-center gap-3">
                        <img
                          src={`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
                          alt="Thumbnail"
                          className="h-14 w-24 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        {stats && (
                          <div className="flex gap-4 text-xs text-gray-400">
                            <span>{stats.totalViews} views</span>
                            <span>{stats.totalSkips} skips</span>
                            <span>
                              {stats.totalViews > 0
                                ? Math.round((stats.totalSkips / stats.totalViews) * 100)
                                : 0}
                              % skip rate
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Analytics */}
        {analytics.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <IoAnalyticsOutline className="h-5 w-5 text-saffron" /> Analytics
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-400">Video</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">Views</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">Skips</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">Skip Rate</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">Avg Watch</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">Today</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">This Week</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analytics.map((a) => {
                    const videoConfig = config.videos.find((v) => v.videoId === a.videoId);
                    const avgWatch =
                      a.totalViews > 0
                        ? Math.round(a.totalWatchSeconds / a.totalViews)
                        : 0;
                    return (
                      <tr key={a.videoId} className="hover:bg-surface-hover">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={`https://i.ytimg.com/vi/${a.videoId}/default.jpg`}
                              alt=""
                              className="h-8 w-12 rounded object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                            <div>
                              <div className="font-medium">
                                {videoConfig?.label || a.videoId}
                              </div>
                              {videoConfig?.labelHi && (
                                <div className="text-xs text-gray-400">
                                  {videoConfig.labelHi}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">{a.totalViews.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{a.totalSkips.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">
                          {a.totalViews > 0
                            ? Math.round((a.totalSkips / a.totalViews) * 100)
                            : 0}
                          %
                        </td>
                        <td className="px-3 py-2 text-right">{avgWatch}s</td>
                        <td className="px-3 py-2 text-right">{(a.viewsToday ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{(a.viewsThisWeek ?? 0).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
