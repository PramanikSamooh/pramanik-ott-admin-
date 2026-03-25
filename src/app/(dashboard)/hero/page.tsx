"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import {
  IoArrowUp,
  IoArrowDown,
  IoAddOutline,
  IoTrashOutline,
  IoSaveOutline,
  IoCloseOutline,
} from "react-icons/io5";

interface HeroVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  order: number;
}

function extractVideoId(input: string): string {
  const trimmed = input.trim();
  // Try to extract from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  // If it looks like a raw video ID (11 chars, valid chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return trimmed;
}

export default function HeroVideosPage() {
  const [videos, setVideos] = useState<HeroVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [fetching, setFetching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, "config", "hero"));
        if (snap.exists()) {
          const data = snap.data();
          setVideos(data.videos || []);
        }
      } catch {
        toast("Failed to load hero videos", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  function moveVideo(index: number, direction: "up" | "down") {
    const newVideos = [...videos];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newVideos.length) return;
    [newVideos[index], newVideos[targetIndex]] = [newVideos[targetIndex], newVideos[index]];
    setVideos(newVideos.map((v, i) => ({ ...v, order: i })));
  }

  function removeVideo(index: number) {
    if (!confirm("Remove this hero video?")) return;
    setVideos((prev) => prev.filter((_, i) => i !== index).map((v, i) => ({ ...v, order: i })));
  }

  async function handleAdd() {
    const videoId = extractVideoId(addInput);
    if (!videoId) {
      toast("Please enter a valid YouTube video ID or URL", "error");
      return;
    }
    if (videos.some((v) => v.videoId === videoId)) {
      toast("This video is already in the hero list", "error");
      return;
    }

    setFetching(true);
    let title = "";
    let thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`
      );
      if (res.ok) {
        const data = await res.json();
        title = data.title || "";
        thumbnailUrl = data.thumbnail_url || thumbnailUrl;
      }
    } catch {
      // oEmbed failed, use defaults
    }

    const newVideo: HeroVideo = {
      videoId,
      title,
      thumbnailUrl,
      order: videos.length,
    };

    setVideos((prev) => [...prev, newVideo]);
    setAddInput("");
    setShowModal(false);
    setFetching(false);
    toast("Video added to hero list");
  }

  async function save() {
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "hero"), {
        videos,
        updatedAt: new Date(),
      });
      toast("Hero videos saved");
    } catch {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hero Videos</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage the hero banner videos shown on the app home screen
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-gray-300 hover:border-saffron/50 hover:text-saffron"
          >
            <IoAddOutline className="h-4 w-4" /> Add Video
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover disabled:opacity-50"
          >
            <IoSaveOutline className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-gray-400">
            No hero videos configured. Click &quot;Add Video&quot; to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video, index) => (
            <div
              key={`${video.videoId}-${index}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
            >
              {/* Order controls */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveVideo(index, "up")}
                  disabled={index === 0}
                  className="rounded p-1 text-gray-400 hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
                >
                  <IoArrowUp className="h-4 w-4" />
                </button>
                <span className="text-center text-xs text-gray-500">{index + 1}</span>
                <button
                  onClick={() => moveVideo(index, "down")}
                  disabled={index === videos.length - 1}
                  className="rounded p-1 text-gray-400 hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
                >
                  <IoArrowDown className="h-4 w-4" />
                </button>
              </div>

              {/* Thumbnail */}
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="h-20 w-36 rounded-lg object-cover"
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {video.title || "Untitled"}
                </div>
                <div className="mt-1 text-xs font-mono text-gray-400">{video.videoId}</div>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeVideo(index)}
                className="rounded p-2 text-gray-400 transition-colors hover:bg-red-400/10 hover:text-red-400"
              >
                <IoTrashOutline className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Video Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-gray-800 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Add Hero Video</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded p-1 hover:bg-gray-700"
              >
                <IoCloseOutline className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-gray-400">
                  YouTube Video URL or ID
                </label>
                <input
                  type="text"
                  value={addInput}
                  onChange={(e) => setAddInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="e.g. https://youtube.com/watch?v=... or dQw4w9WgXcQ"
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white font-mono"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">
                  Title and thumbnail will be auto-fetched from YouTube
                </p>
              </div>

              {addInput && extractVideoId(addInput).length === 11 && (
                <img
                  src={`https://i.ytimg.com/vi/${extractVideoId(addInput)}/hqdefault.jpg`}
                  alt="Preview"
                  className="h-32 w-full rounded-lg object-cover"
                />
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={fetching || !addInput.trim()}
                className="rounded-lg bg-saffron px-6 py-2 text-sm font-semibold text-white hover:bg-saffron-hover disabled:opacity-50"
              >
                {fetching ? "Fetching..." : "Add Video"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
