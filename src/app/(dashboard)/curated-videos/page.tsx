"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import {
  IoAddOutline,
  IoCreateOutline,
  IoTrashOutline,
  IoCloseOutline,
} from "react-icons/io5";

const COLLECTIONS = [
  { value: "curated_nitya_poojan", label: "Nitya Poojan" },
  { value: "curated_path", label: "Path" },
  { value: "curated_stotra", label: "Stotra" },
  { value: "curated_granth_vachan", label: "Granth Vachan" },
];

interface CuratedVideo {
  id: string;
  title: string;
  titleHi: string;
  youtubeVideoId: string;
  thumbnailUrl: string;
  channelName: string;
  duration: string;
  priority: number;
  active: boolean;
}

const emptyVideo: Omit<CuratedVideo, "id"> = {
  title: "",
  titleHi: "",
  youtubeVideoId: "",
  thumbnailUrl: "",
  channelName: "",
  duration: "",
  priority: 0,
  active: true,
};

export default function CuratedVideosPage() {
  const [activeTab, setActiveTab] = useState(COLLECTIONS[0].value);
  const [videos, setVideos] = useState<CuratedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CuratedVideo | null>(null);
  const [form, setForm] = useState(emptyVideo);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function load(col: string) {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, col), orderBy("priority", "asc"))
      );
      setVideos(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as CuratedVideo))
      );
    } catch {
      toast("Failed to load", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(activeTab); }, [activeTab]);

  function openCreate() {
    setEditing(null);
    setForm(emptyVideo);
    setShowModal(true);
  }

  function openEdit(v: CuratedVideo) {
    setEditing(v);
    setForm({
      title: v.title,
      titleHi: v.titleHi,
      youtubeVideoId: v.youtubeVideoId,
      thumbnailUrl: v.thumbnailUrl,
      channelName: v.channelName,
      duration: v.duration,
      priority: v.priority,
      active: v.active,
    });
    setShowModal(true);
  }

  // Auto-generate thumbnail from YouTube video ID
  function autoThumbnail(videoId: string) {
    if (videoId.length === 11) {
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
    return "";
  }

  async function handleSave() {
    setSaving(true);
    const data = {
      ...form,
      thumbnailUrl: form.thumbnailUrl || autoThumbnail(form.youtubeVideoId),
    };
    try {
      if (editing) {
        await updateDoc(doc(db, activeTab, editing.id), data);
        toast("Video updated");
      } else {
        await addDoc(collection(db, activeTab), {
          ...data,
          createdAt: Timestamp.now(),
        });
        toast("Video added");
      }
      setShowModal(false);
      load(activeTab);
    } catch {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this video?")) return;
    try {
      await deleteDoc(doc(db, activeTab, id));
      toast("Deleted");
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch {
      toast("Failed to delete", "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Curated Videos — Poojan & Path</h1>
          <p className="mt-1 text-sm text-gray-400">Add YouTube videos from any channel for Nitya Poojan, Path, Stotra, Granth Vachan</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover">
          <IoAddOutline className="h-4 w-4" /> Add Video
        </button>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {COLLECTIONS.map((col) => (
          <button
            key={col.value}
            onClick={() => setActiveTab(col.value)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === col.value
                ? "bg-saffron/20 text-saffron border-b-2 border-saffron"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {col.label}
          </button>
        ))}
      </div>

      {/* Video list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-saffron border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-800/50">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left text-gray-400">
                <th className="px-4 py-3">Thumbnail</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">YouTube ID</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <img
                      src={v.thumbnailUrl || autoThumbnail(v.youtubeVideoId)}
                      alt=""
                      className="h-12 w-20 rounded object-cover"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{v.title}</div>
                    {v.titleHi && <div className="text-xs text-gray-400">{v.titleHi}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{v.youtubeVideoId}</td>
                  <td className="px-4 py-3 text-gray-300">{v.channelName || "—"}</td>
                  <td className="px-4 py-3 text-gray-300">{v.priority}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      v.active ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
                    }`}>
                      {v.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(v)} className="rounded p-1 hover:bg-gray-600">
                        <IoCreateOutline className="h-4 w-4 text-gray-300" />
                      </button>
                      <button onClick={() => handleDelete(v.id)} className="rounded p-1 hover:bg-red-900/50">
                        <IoTrashOutline className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {videos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No videos in this section. Click &quot;Add Video&quot; — paste a YouTube video ID to add it.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-gray-800 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {editing ? "Edit Video" : "Add Video"}
              </h2>
              <button onClick={() => setShowModal(false)} className="rounded p-1 hover:bg-gray-700">
                <IoCloseOutline className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-gray-400">YouTube Video ID *</label>
                <input
                  type="text"
                  value={form.youtubeVideoId}
                  onChange={(e) => setForm({ ...form, youtubeVideoId: e.target.value })}
                  placeholder="e.g. dQw4w9WgXcQ"
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white font-mono"
                />
                <p className="mt-1 text-xs text-gray-500">From URL: youtube.com/watch?v=<b>THIS_PART</b></p>
              </div>

              {form.youtubeVideoId.length === 11 && (
                <img
                  src={autoThumbnail(form.youtubeVideoId)}
                  alt="Preview"
                  className="h-32 w-full rounded-lg object-cover"
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Title (English)</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Title (Hindi)</label>
                  <input type="text" value={form.titleHi} onChange={(e) => setForm({ ...form, titleHi: e.target.value })}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Channel Name</label>
                  <input type="text" value={form.channelName} onChange={(e) => setForm({ ...form, channelName: e.target.value })}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Duration</label>
                  <input type="text" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    placeholder="e.g. 15:30" className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Priority (lower = first)</label>
                  <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="rounded" />
                    Active
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.youtubeVideoId}
                className="rounded-lg bg-saffron px-6 py-2 text-sm font-semibold text-white hover:bg-saffron-hover disabled:opacity-50">
                {saving ? "Saving..." : editing ? "Update" : "Add Video"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
