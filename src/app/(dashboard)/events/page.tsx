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
  IoLogoYoutube,
  IoLogoVimeo,
  IoArrowUpOutline,
  IoArrowDownOutline,
} from "react-icons/io5";

const CLOUD_FN_BASE = "https://us-central1-pramanik-ott.cloudfunctions.net";

interface EventVideo {
  id: string;
  title: string;
  titleHi: string;
  description: string;
  source: "youtube" | "vimeo";
  videoId: string;
  hlsUrl: string;
  thumbnailUrl: string;
  date: string;
  visible: boolean;
  displayOrder: number;
  createdAt: Timestamp | null;
}

type EventForm = Omit<EventVideo, "id" | "createdAt">;

const emptyForm: EventForm = {
  title: "",
  titleHi: "",
  description: "",
  source: "vimeo",
  videoId: "",
  hlsUrl: "",
  thumbnailUrl: "",
  date: "",
  visible: true,
  displayOrder: 0,
};

function extractVimeoId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (match) return match[1];
  if (/^\d+$/.test(trimmed)) return trimmed;
  return trimmed;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [editing, setEditing] = useState<EventVideo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const { toast } = useToast();

  async function load() {
    try {
      const snap = await getDocs(
        query(collection(db, "events"), orderBy("displayOrder", "asc"))
      );
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventVideo)));
    } catch {
      toast("Failed to load events", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(ev: EventVideo) {
    setEditing(ev);
    setForm({
      title: ev.title,
      titleHi: ev.titleHi,
      description: ev.description || "",
      source: ev.source,
      videoId: ev.videoId,
      hlsUrl: ev.hlsUrl || "",
      thumbnailUrl: ev.thumbnailUrl || "",
      date: ev.date || "",
      visible: ev.visible ?? true,
      displayOrder: ev.displayOrder ?? 0,
    });
    setShowModal(true);
  }

  async function validateVimeo() {
    const vimeoId = extractVimeoId(form.videoId);
    if (!vimeoId) { toast("Enter a Vimeo URL or ID", "error"); return; }
    setValidating(true);
    try {
      const res = await fetch(`${CLOUD_FN_BASE}/getVimeoInfo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vimeoId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setForm({
        ...form,
        videoId: data.vimeoId,
        title: form.title || data.title,
        hlsUrl: data.hlsUrl || "",
        thumbnailUrl: data.thumbnailUrl || "",
      });
      toast(`Found: ${data.title}`);
    } catch (err: unknown) {
      toast(`Vimeo validation failed: ${err instanceof Error ? err.message : "Error"}`, "error");
    } finally {
      setValidating(false);
    }
  }

  async function handleSave() {
    if (!form.videoId.trim()) { toast("Video ID is required", "error"); return; }
    if (!form.title.trim()) { toast("Title is required", "error"); return; }

    setSaving(true);
    try {
      const data = {
        ...form,
        thumbnailUrl: form.source === "youtube" && !form.thumbnailUrl
          ? `https://i.ytimg.com/vi/${form.videoId}/hqdefault.jpg`
          : form.thumbnailUrl,
      };

      if (editing) {
        await updateDoc(doc(db, "events", editing.id), { ...data });
        toast("Event updated");
      } else {
        await addDoc(collection(db, "events"), {
          ...data,
          createdAt: Timestamp.now(),
        });
        toast("Event created");
      }
      setShowModal(false);
      load();
    } catch {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this event video?")) return;
    try {
      await deleteDoc(doc(db, "events", id));
      toast("Event deleted");
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch {
      toast("Failed to delete", "error");
    }
  }

  async function moveEvent(id: string, direction: "up" | "down") {
    const idx = events.findIndex((e) => e.id === id);
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= events.length) return;

    const reordered = [...events];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];

    // Update displayOrder in Firestore
    try {
      for (let i = 0; i < reordered.length; i++) {
        await updateDoc(doc(db, "events", reordered[i].id), { displayOrder: i });
      }
      setEvents(reordered.map((e, i) => ({ ...e, displayOrder: i })));
    } catch {
      toast("Failed to reorder", "error");
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-saffron border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Event Videos</h1>
          <p className="mt-1 text-sm text-gray-400">Manage Vimeo and YouTube event recordings for the Events section</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover">
          <IoAddOutline className="h-4 w-4" /> Add Event Video
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Video</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Source</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Date</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Visible</th>
              <th className="px-4 py-3 text-right font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">No event videos yet.</td>
              </tr>
            ) : (
              events.map((ev, idx) => (
                <tr key={ev.id} className="transition-colors hover:bg-surface">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {ev.thumbnailUrl ? (
                        <img src={ev.thumbnailUrl} alt="" className="h-12 w-20 rounded object-cover" />
                      ) : ev.source === "youtube" ? (
                        <img src={`https://i.ytimg.com/vi/${ev.videoId}/mqdefault.jpg`} alt="" className="h-12 w-20 rounded object-cover" />
                      ) : (
                        <div className="flex h-12 w-20 items-center justify-center rounded bg-gray-700 text-xs text-gray-400">No thumb</div>
                      )}
                      <div>
                        <div className="font-medium">{ev.title}</div>
                        {ev.titleHi && <div className="text-xs text-gray-400">{ev.titleHi}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      ev.source === "vimeo" ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {ev.source === "vimeo" ? <IoLogoVimeo className="h-3 w-3" /> : <IoLogoYoutube className="h-3 w-3" />}
                      {ev.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{ev.date || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${ev.visible ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-500"}`}>
                      {ev.visible ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => moveEvent(ev.id, "up")} disabled={idx === 0} className="rounded p-1.5 text-gray-400 hover:text-foreground disabled:opacity-30"><IoArrowUpOutline className="h-4 w-4" /></button>
                      <button onClick={() => moveEvent(ev.id, "down")} disabled={idx === events.length - 1} className="rounded p-1.5 text-gray-400 hover:text-foreground disabled:opacity-30"><IoArrowDownOutline className="h-4 w-4" /></button>
                      <button onClick={() => openEdit(ev)} className="rounded p-1.5 text-gray-400 hover:bg-surface-hover hover:text-saffron"><IoCreateOutline className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(ev.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-400/10 hover:text-red-400"><IoTrashOutline className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing ? "Edit" : "New"} Event Video</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-foreground">
                <IoCloseOutline className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-3">
              {/* Source */}
              <div>
                <label className="mb-1 block text-xs text-gray-400">Source</label>
                <div className="flex gap-2">
                  {(["vimeo", "youtube"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setForm({ ...form, source: s, hlsUrl: "", thumbnailUrl: "" })}
                      className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm ${
                        form.source === s ? "border-saffron bg-saffron/15 text-saffron" : "border-border text-gray-400"
                      }`}
                    >
                      {s === "vimeo" ? <IoLogoVimeo className="h-4 w-4" /> : <IoLogoYoutube className="h-4 w-4" />}
                      <span className="capitalize">{s}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Video ID */}
              <div>
                <label className="mb-1 block text-xs text-gray-400">
                  {form.source === "vimeo" ? "Vimeo" : "YouTube"} Video URL or ID
                </label>
                <div className="flex gap-2">
                  <input
                    value={form.videoId}
                    onChange={(e) => setForm({ ...form, videoId: e.target.value })}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-saffron"
                    placeholder={form.source === "vimeo" ? "e.g. 123456789" : "e.g. dQw4w9WgXcQ"}
                  />
                  {form.source === "vimeo" && (
                    <button
                      onClick={validateVimeo}
                      disabled={validating || !form.videoId.trim()}
                      className="rounded-lg border border-blue-500/50 px-3 py-2 text-xs text-blue-400 hover:bg-blue-500/10 disabled:opacity-50"
                    >
                      {validating ? "..." : "Fetch"}
                    </button>
                  )}
                </div>
              </div>

              {/* Titles */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Title (English)</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Title (Hindi)</label>
                  <input value={form.titleHi} onChange={(e) => setForm({ ...form, titleHi: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-xs text-gray-400">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
              </div>

              {/* Date */}
              <div>
                <label className="mb-1 block text-xs text-gray-400">Event Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
              </div>

              {/* Visible */}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="visible" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} className="accent-saffron" />
                <label htmlFor="visible" className="text-sm text-gray-300">Visible in app</label>
              </div>

              {/* Preview */}
              {form.thumbnailUrl && (
                <img src={form.thumbnailUrl} alt="Preview" className="w-full rounded-lg" />
              )}
              {!form.thumbnailUrl && form.source === "youtube" && form.videoId && (
                <img src={`https://i.ytimg.com/vi/${form.videoId}/hqdefault.jpg`} alt="Preview" className="w-full rounded-lg" />
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-gray-400 hover:text-foreground">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
