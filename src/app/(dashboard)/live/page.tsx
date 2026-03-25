"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import {
  IoRadioOutline,
  IoPlayOutline,
  IoStopOutline,
  IoRefreshOutline,
} from "react-icons/io5";

interface LiveStatus {
  isLive: boolean;
  currentVideoId: string;
  activeStreams: number;
  checkedAt: { seconds: number } | null;
}

interface LiveOverride {
  active: boolean;
  videoId: string;
  channelKey: string;
  channelName: string;
  setAt: { seconds: number } | null;
}

const CLOUD_FN_URL =
  "https://us-central1-pramanik-ott.cloudfunctions.net/setLiveOverride";

function extractVideoId(input: string): string {
  const trimmed = input.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return trimmed;
}

function formatTimestamp(ts: { seconds: number } | null): string {
  if (!ts) return "Never";
  return new Date(ts.seconds * 1000).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

export default function LiveControlPage() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [override, setOverride] = useState<LiveOverride | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoInput, setVideoInput] = useState("");
  const [channelKey, setChannelKey] = useState("main");
  const [channelName, setChannelName] = useState("Pramanik Samooh");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubStatus = onSnapshot(
      doc(db, "live", "status"),
      (snap) => {
        if (snap.exists()) {
          setStatus(snap.data() as LiveStatus);
        }
        setLoading(false);
      },
      () => {
        toast("Failed to listen to live status", "error");
        setLoading(false);
      }
    );

    const unsubOverride = onSnapshot(
      doc(db, "live", "override"),
      (snap) => {
        if (snap.exists()) {
          setOverride(snap.data() as LiveOverride);
        }
      }
    );

    return () => {
      unsubStatus();
      unsubOverride();
    };
  }, [toast]);

  async function handleGoLive() {
    const videoId = extractVideoId(videoInput);
    if (!videoId) {
      toast("Please enter a valid YouTube video ID or URL", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(CLOUD_FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          channelKey,
          channelName,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      toast("Live override set successfully");
      setVideoInput("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast(`Failed to set live override: ${message}`, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClearLive() {
    if (!confirm("Clear the live override? The app will revert to automatic live detection.")) return;
    setSubmitting(true);
    try {
      const res = await fetch(CLOUD_FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      toast("Live override cleared");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast(`Failed to clear live override: ${message}`, "error");
    } finally {
      setSubmitting(false);
    }
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
      <div>
        <h1 className="text-2xl font-bold">Live Control</h1>
        <p className="mt-1 text-sm text-gray-400">
          Monitor live status and set manual live overrides
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Current Live Status */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <IoRadioOutline className="h-5 w-5 text-saffron" /> Live Status
          </h2>

          {status ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                <span className="text-sm text-gray-300">Status</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    status.isLive
                      ? "bg-green-900/50 text-green-400"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {status.isLive ? "LIVE" : "Offline"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                <span className="text-sm text-gray-300">Current Video ID</span>
                <span className="font-mono text-sm text-gray-200">
                  {status.currentVideoId || "None"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                <span className="text-sm text-gray-300">Active Streams</span>
                <span className="text-sm text-gray-200">
                  {status.activeStreams ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                <span className="text-sm text-gray-300">Last Checked</span>
                <span className="text-sm text-gray-200">
                  {formatTimestamp(status.checkedAt)}
                </span>
              </div>

              {status.isLive && status.currentVideoId && (
                <div className="mt-2">
                  <img
                    src={`https://i.ytimg.com/vi/${status.currentVideoId}/hqdefault.jpg`}
                    alt="Current live stream"
                    className="w-full rounded-lg"
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No live status data found. The live checker may not have run yet.
            </p>
          )}
        </div>

        {/* Override Status */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <IoRefreshOutline className="h-5 w-5 text-saffron" /> Override
              Status
            </h2>

            {override ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                  <span className="text-sm text-gray-300">Override Active</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      override.active
                        ? "bg-yellow-900/50 text-yellow-400"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {override.active ? "Active" : "Inactive"}
                  </span>
                </div>

                {override.active && (
                  <>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                      <span className="text-sm text-gray-300">Video ID</span>
                      <span className="font-mono text-sm text-gray-200">
                        {override.videoId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                      <span className="text-sm text-gray-300">Channel</span>
                      <span className="text-sm text-gray-200">
                        {override.channelName} ({override.channelKey})
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                      <span className="text-sm text-gray-300">Set At</span>
                      <span className="text-sm text-gray-200">
                        {formatTimestamp(override.setAt)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No override data found.</p>
            )}

            {override?.active && (
              <button
                onClick={handleClearLive}
                disabled={submitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/50 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                <IoStopOutline className="h-4 w-4" />
                {submitting ? "Clearing..." : "Clear Live Override"}
              </button>
            )}
          </div>

          {/* Set Live Override */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <IoPlayOutline className="h-5 w-5 text-saffron" /> Set Live
              Override
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  YouTube Video URL or ID
                </label>
                <input
                  type="text"
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGoLive()}
                  placeholder="e.g. https://youtube.com/watch?v=... or dQw4w9WgXcQ"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-mono outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    Channel Key
                  </label>
                  <input
                    type="text"
                    value={channelKey}
                    onChange={(e) => setChannelKey(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30"
                    placeholder="main"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30"
                    placeholder="Pramanik Samooh"
                  />
                </div>
              </div>

              {videoInput && extractVideoId(videoInput).length === 11 && (
                <img
                  src={`https://i.ytimg.com/vi/${extractVideoId(videoInput)}/hqdefault.jpg`}
                  alt="Preview"
                  className="w-full rounded-lg"
                />
              )}

              <button
                onClick={handleGoLive}
                disabled={submitting || !videoInput.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                <IoPlayOutline className="h-4 w-4" />
                {submitting ? "Setting..." : "Go Live"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
