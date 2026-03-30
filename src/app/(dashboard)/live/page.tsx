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
  IoLogoVimeo,
  IoLogoYoutube,
} from "react-icons/io5";

interface LiveStatus {
  isLive: boolean;
  currentVideoId: string;
  currentSource: string;
  activeStreams: number;
  vimeoStreams: Array<{ vimeoVideoId: string; title: string; hlsUrl: string; thumbnailUrl: string }>;
  checkedAt: { seconds: number } | null;
}

interface LiveOverride {
  active: boolean;
  source: string;
  priority: string;
  videoId: string;
  channelKey: string;
  channelName: string;
  vimeoVideoId: string;
  vimeoTitle: string;
  vimeoHlsUrl: string;
  vimeoThumbnailUrl: string;
  setAt: { seconds: number } | null;
}

const CLOUD_FN_BASE = "https://us-central1-pramanik-ott.cloudfunctions.net";

function extractYouTubeId(input: string): string {
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

function extractVimeoId(input: string): string {
  const trimmed = input.trim();
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /vimeo\.com\/video\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  if (/^\d+$/.test(trimmed)) return trimmed;
  return trimmed;
}

function formatTimestamp(ts: { seconds: number } | null): string {
  if (!ts) return "Never";
  return new Date(ts.seconds * 1000).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

type LiveSource = "youtube" | "vimeo" | "both";
type LivePriority = "vimeo" | "youtube";

export default function LiveControlPage() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [override, setOverride] = useState<LiveOverride | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<LiveSource>("youtube");
  const [videoInput, setVideoInput] = useState("");
  const [vimeoInput, setVimeoInput] = useState("");
  const [channelKey, setChannelKey] = useState("pramansagarji");
  const [channelName, setChannelName] = useState("Muni Pramansagar Ji");
  const [priority, setPriority] = useState<LivePriority>("vimeo");
  const [vimeoPreview, setVimeoPreview] = useState<{ title: string; thumbnailUrl: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [validatingVimeo, setValidatingVimeo] = useState(false);
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

  async function validateVimeo() {
    const vimeoId = extractVimeoId(vimeoInput);
    if (!vimeoId) {
      toast("Enter a Vimeo URL or ID", "error");
      return;
    }
    setValidatingVimeo(true);
    try {
      const res = await fetch(`${CLOUD_FN_BASE}/getVimeoInfo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vimeoId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setVimeoPreview({ title: data.title, thumbnailUrl: data.thumbnailUrl });
      toast(`Vimeo video found: ${data.title}${data.isLive ? " (LIVE)" : ""}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast(`Vimeo validation failed: ${message}`, "error");
      setVimeoPreview(null);
    } finally {
      setValidatingVimeo(false);
    }
  }

  async function handleGoLive() {
    const ytId = source !== "vimeo" ? extractYouTubeId(videoInput) : "";
    const vimeoId = source !== "youtube" ? extractVimeoId(vimeoInput) : "";

    if (source === "youtube" && !ytId) {
      toast("Enter a valid YouTube video ID or URL", "error");
      return;
    }
    if (source === "vimeo" && !vimeoId) {
      toast("Enter a valid Vimeo video ID or URL", "error");
      return;
    }
    if (source === "both" && !ytId && !vimeoId) {
      toast("Enter at least one video ID", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${CLOUD_FN_BASE}/setLiveOverride`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: true,
          source,
          priority,
          videoId: ytId || undefined,
          channelKey: ytId ? channelKey : undefined,
          channelName: ytId ? channelName : undefined,
          vimeoVideoId: vimeoId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      toast("Live override set successfully");
      setVideoInput("");
      setVimeoInput("");
      setVimeoPreview(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast(`Failed: ${message}`, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClearLive() {
    if (!confirm("Clear the live override? The app will revert to automatic detection.")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${CLOUD_FN_BASE}/setLiveOverride`, {
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
      toast(`Failed: ${message}`, "error");
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
          Monitor live status and set manual overrides — supports YouTube and Vimeo
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
                <span className="text-sm text-gray-300">Source</span>
                <span className="flex items-center gap-1.5 text-sm text-gray-200">
                  {(status.currentSource || "youtube") === "vimeo" ? (
                    <><IoLogoVimeo className="h-4 w-4 text-blue-400" /> Vimeo</>
                  ) : (
                    <><IoLogoYoutube className="h-4 w-4 text-red-400" /> YouTube</>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                <span className="text-sm text-gray-300">Video ID</span>
                <span className="font-mono text-sm text-gray-200">
                  {status.currentVideoId || "None"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                <span className="text-sm text-gray-300">Last Checked</span>
                <span className="text-sm text-gray-200">
                  {formatTimestamp(status.checkedAt)}
                </span>
              </div>

              {/* Thumbnail preview */}
              {status.isLive && status.currentVideoId && (
                <div className="mt-2">
                  {(status.currentSource || "youtube") === "vimeo" && status.vimeoStreams?.[0]?.thumbnailUrl ? (
                    <img src={status.vimeoStreams[0].thumbnailUrl} alt="Vimeo live" className="w-full rounded-lg" />
                  ) : (
                    <img src={`https://i.ytimg.com/vi/${status.currentVideoId}/hqdefault.jpg`} alt="YouTube live" className="w-full rounded-lg" />
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No live status data found.</p>
          )}
        </div>

        {/* Right column: Override + Set Live */}
        <div className="space-y-6">
          {/* Override Status */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <IoRefreshOutline className="h-5 w-5 text-saffron" /> Override Status
            </h2>

            {override?.active ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                  <span className="text-sm text-gray-300">Source</span>
                  <span className="rounded-full bg-saffron/20 px-2.5 py-0.5 text-xs font-medium text-saffron capitalize">
                    {override.source || "youtube"}
                  </span>
                </div>
                {override.videoId && (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <span className="text-sm text-gray-300">YouTube</span>
                    <span className="font-mono text-sm text-gray-200">{override.videoId}</span>
                  </div>
                )}
                {override.vimeoVideoId && (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <span className="text-sm text-gray-300">Vimeo</span>
                    <span className="font-mono text-sm text-gray-200">{override.vimeoVideoId} — {override.vimeoTitle}</span>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                  <span className="text-sm text-gray-300">Priority</span>
                  <span className="text-sm text-gray-200 capitalize">{override.priority || "vimeo"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                  <span className="text-sm text-gray-300">Set At</span>
                  <span className="text-sm text-gray-200">{formatTimestamp(override.setAt)}</span>
                </div>
                <button
                  onClick={handleClearLive}
                  disabled={submitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/50 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <IoStopOutline className="h-4 w-4" />
                  {submitting ? "Clearing..." : "Clear Live Override"}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No active override.</p>
            )}
          </div>

          {/* Set Live Override */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <IoPlayOutline className="h-5 w-5 text-saffron" /> Set Live Override
            </h2>

            <div className="space-y-4">
              {/* Source Selector */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Source</label>
                <div className="flex gap-2">
                  {(["youtube", "vimeo", "both"] as LiveSource[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSource(s)}
                      className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        source === s
                          ? "border-saffron bg-saffron/15 text-saffron"
                          : "border-border text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      {s === "youtube" && <IoLogoYoutube className="h-4 w-4" />}
                      {s === "vimeo" && <IoLogoVimeo className="h-4 w-4" />}
                      {s === "both" && <><IoLogoYoutube className="h-3.5 w-3.5" /><IoLogoVimeo className="h-3.5 w-3.5" /></>}
                      <span className="capitalize">{s}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* YouTube Input */}
              {(source === "youtube" || source === "both") && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    YouTube Video URL or ID
                  </label>
                  <input
                    type="text"
                    value={videoInput}
                    onChange={(e) => setVideoInput(e.target.value)}
                    placeholder="e.g. https://youtube.com/watch?v=... or dQw4w9WgXcQ"
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-mono outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30"
                  />
                  {videoInput && extractYouTubeId(videoInput).length === 11 && (
                    <img
                      src={`https://i.ytimg.com/vi/${extractYouTubeId(videoInput)}/hqdefault.jpg`}
                      alt="YouTube preview"
                      className="mt-2 w-full rounded-lg"
                    />
                  )}
                </div>
              )}

              {/* YouTube Channel */}
              {(source === "youtube" || source === "both") && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Channel</label>
                  <select
                    value={channelKey}
                    onChange={(e) => {
                      const key = e.target.value;
                      setChannelKey(key);
                      setChannelName(key === "pramansagarji" ? "Muni Pramansagar Ji" : "Jain Pathshala");
                    }}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30"
                  >
                    <option value="pramansagarji">Muni Pramansagar Ji</option>
                    <option value="jainpathshala">Jain Pathshala</option>
                  </select>
                </div>
              )}

              {/* Vimeo Input */}
              {(source === "vimeo" || source === "both") && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    Vimeo Video URL or ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={vimeoInput}
                      onChange={(e) => { setVimeoInput(e.target.value); setVimeoPreview(null); }}
                      placeholder="e.g. https://vimeo.com/123456789 or 123456789"
                      className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-mono outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30"
                    />
                    <button
                      onClick={validateVimeo}
                      disabled={validatingVimeo || !vimeoInput.trim()}
                      className="rounded-lg border border-blue-500/50 px-4 py-2.5 text-sm font-medium text-blue-400 hover:bg-blue-500/10 disabled:opacity-50"
                    >
                      {validatingVimeo ? "..." : "Validate"}
                    </button>
                  </div>
                  {vimeoPreview && (
                    <div className="mt-2 space-y-1">
                      {vimeoPreview.thumbnailUrl && (
                        <img src={vimeoPreview.thumbnailUrl} alt="Vimeo preview" className="w-full rounded-lg" />
                      )}
                      <p className="text-xs text-gray-400">{vimeoPreview.title}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Priority — when both sources */}
              {source === "both" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    Priority (shown first in app)
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as LivePriority)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30"
                  >
                    <option value="vimeo">Vimeo first (recommended for Digambar events)</option>
                    <option value="youtube">YouTube first</option>
                  </select>
                </div>
              )}

              <button
                onClick={handleGoLive}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
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
