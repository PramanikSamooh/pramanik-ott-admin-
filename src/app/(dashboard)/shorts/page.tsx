"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import {
  IoArrowUp,
  IoArrowDown,
  IoTrashOutline,
  IoSearchOutline,
  IoSaveOutline,
  IoPlayOutline,
} from "react-icons/io5";

interface Short {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  displayOrder: number;
  addedAt: Timestamp | null;
}

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
}

export default function ShortsPage() {
  const [shorts, setShorts] = useState<Short[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function load() {
    try {
      const [shortsSnap, videosSnap] = await Promise.all([
        getDocs(query(collection(db, "shorts"), orderBy("displayOrder"))),
        getDocs(query(collection(db, "videos"), limit(200))),
      ]);
      setShorts(shortsSnap.docs.map((d) => ({ videoId: d.id, ...d.data() } as Short)));
      setVideos(videosSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Video)));
    } catch {
      toast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const shortIds = new Set(shorts.map((s) => s.videoId));

  const filteredVideos = videos.filter(
    (v) => !shortIds.has(v.id) && (search === "" || v.title?.toLowerCase().includes(search.toLowerCase()))
  );

  function addShort(video: Video) {
    setShorts((prev) => [
      ...prev,
      {
        videoId: video.id,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl || "",
        displayOrder: prev.length,
        addedAt: null,
      },
    ]);
  }

  function removeShort(videoId: string) {
    setShorts((prev) => prev.filter((s) => s.videoId !== videoId).map((s, i) => ({ ...s, displayOrder: i })));
  }

  function moveShort(index: number, direction: "up" | "down") {
    const newShorts = [...shorts];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newShorts.length) return;
    [newShorts[index], newShorts[targetIndex]] = [newShorts[targetIndex], newShorts[index]];
    setShorts(newShorts.map((s, i) => ({ ...s, displayOrder: i })));
  }

  async function save() {
    setSaving(true);
    try {
      // Delete removed shorts
      const existingSnap = await getDocs(collection(db, "shorts"));
      const existingIds = new Set(existingSnap.docs.map((d) => d.id));
      const currentIds = new Set(shorts.map((s) => s.videoId));

      const deletePromises = [...existingIds].filter((id) => !currentIds.has(id)).map((id) => deleteDoc(doc(db, "shorts", id)));

      const savePromises = shorts.map((s) =>
        setDoc(doc(db, "shorts", s.videoId), {
          videoId: s.videoId,
          title: s.title,
          thumbnailUrl: s.thumbnailUrl,
          displayOrder: s.displayOrder,
          addedAt: s.addedAt || Timestamp.now(),
        })
      );

      await Promise.all([...deletePromises, ...savePromises]);
      toast("Shorts saved");
    } catch {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-saffron border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shorts</h1>
          <p className="mt-1 text-sm text-gray-400">Mark videos as shorts and manage display order</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover disabled:opacity-50">
          <IoSaveOutline className="h-4 w-4" /> {saving ? "Saving..." : "Save Order"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Current Shorts */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-400 uppercase tracking-wider">Current Shorts ({shorts.length})</h2>
          <div className="space-y-2">
            {shorts.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-8 text-center text-gray-500 text-sm">No shorts yet. Add videos from the right panel.</div>
            ) : shorts.map((s, i) => (
              <div key={s.videoId} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveShort(i, "up")} disabled={i === 0} className="rounded p-0.5 text-gray-400 hover:text-foreground disabled:opacity-30"><IoArrowUp className="h-3.5 w-3.5" /></button>
                  <span className="text-center text-xs text-gray-500">{i + 1}</span>
                  <button onClick={() => moveShort(i, "down")} disabled={i === shorts.length - 1} className="rounded p-0.5 text-gray-400 hover:text-foreground disabled:opacity-30"><IoArrowDown className="h-3.5 w-3.5" /></button>
                </div>
                {s.thumbnailUrl ? (
                  <img src={s.thumbnailUrl} alt="" className="h-12 w-20 rounded object-cover" />
                ) : (
                  <div className="flex h-12 w-20 items-center justify-center rounded bg-surface-hover"><IoPlayOutline className="h-5 w-5 text-gray-500" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.title || s.videoId}</div>
                </div>
                <button onClick={() => removeShort(s.videoId)} className="rounded p-1.5 text-gray-400 hover:bg-red-400/10 hover:text-red-400">
                  <IoTrashOutline className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Video Browser */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-400 uppercase tracking-wider">Browse Videos</h2>
          <div className="mb-3 relative">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface pl-10 pr-4 py-2.5 text-sm outline-none focus:border-saffron"
              placeholder="Search videos..."
            />
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredVideos.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-8 text-center text-gray-500 text-sm">
                {videos.length === 0 ? "No videos in database." : "No matching videos found."}
              </div>
            ) : filteredVideos.slice(0, 50).map((v) => (
              <button
                key={v.id}
                onClick={() => addShort(v)}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-saffron/50"
              >
                {v.thumbnailUrl ? (
                  <img src={v.thumbnailUrl} alt="" className="h-12 w-20 rounded object-cover" />
                ) : (
                  <div className="flex h-12 w-20 items-center justify-center rounded bg-surface-hover"><IoPlayOutline className="h-5 w-5 text-gray-500" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{v.title || v.id}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
