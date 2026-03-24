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
import { format } from "date-fns";
import {
  IoAddOutline,
  IoCreateOutline,
  IoTrashOutline,
  IoCloseOutline,
} from "react-icons/io5";

interface Announcement {
  id: string;
  title: string;
  titleHi: string;
  type: "event" | "quote" | "location" | "notification";
  imageUrl: string;
  actionUrl: string;
  priority: number;
  active: boolean;
  showOnMobile: boolean;
  showOnTv: boolean;
  startDate: string;
  endDate: string;
  createdAt: Timestamp | null;
}

const emptyAnnouncement: Omit<Announcement, "id" | "createdAt"> = {
  title: "",
  titleHi: "",
  type: "notification",
  imageUrl: "",
  actionUrl: "",
  priority: 0,
  active: true,
  showOnMobile: true,
  showOnTv: true,
  startDate: "",
  endDate: "",
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(emptyAnnouncement);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function load() {
    try {
      const snap = await getDocs(
        query(collection(db, "announcements"), orderBy("priority", "desc"))
      );
      setAnnouncements(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement))
      );
    } catch {
      toast("Failed to load announcements", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyAnnouncement);
    setShowModal(true);
  }

  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({
      title: a.title,
      titleHi: a.titleHi,
      type: a.type,
      imageUrl: a.imageUrl,
      actionUrl: a.actionUrl,
      priority: a.priority,
      active: a.active,
      showOnMobile: a.showOnMobile ?? true,
      showOnTv: a.showOnTv ?? true,
      startDate: a.startDate || "",
      endDate: a.endDate || "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "announcements", editing.id), { ...form });
        toast("Announcement updated");
      } else {
        await addDoc(collection(db, "announcements"), {
          ...form,
          createdAt: Timestamp.now(),
        });
        toast("Announcement created");
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
    if (!confirm("Delete this announcement?")) return;
    try {
      await deleteDoc(doc(db, "announcements", id));
      toast("Announcement deleted");
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast("Failed to delete", "error");
    }
  }

  async function toggleActive(a: Announcement) {
    try {
      await updateDoc(doc(db, "announcements", a.id), { active: !a.active });
      setAnnouncements((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, active: !x.active } : x))
      );
    } catch {
      toast("Failed to update", "error");
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-saffron border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="mt-1 text-sm text-gray-400">Manage app hero announcements</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover">
          <IoAddOutline className="h-4 w-4" /> Add Announcement
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Title</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Priority</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Active</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Platform</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Dates</th>
              <th className="px-4 py-3 text-right font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {announcements.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  No announcements yet.
                </td>
              </tr>
            ) : (
              announcements.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-surface">
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.title || "(No title)"}</div>
                    {a.titleHi && <div className="text-xs text-gray-400">{a.titleHi}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-surface-hover px-2.5 py-0.5 text-xs font-medium capitalize">
                      {a.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">{a.priority}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(a)}
                      className={`h-5 w-9 rounded-full transition-colors ${a.active ? "bg-green-500" : "bg-gray-600"}`}
                    >
                      <div className={`h-4 w-4 rounded-full bg-white transition-transform ${a.active ? "translate-x-4.5" : "translate-x-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {(a.showOnMobile ?? true) && <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] text-green-400">Mobile</span>}
                      {(a.showOnTv ?? true) && <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-400">TV</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {a.startDate && <div>From: {a.startDate}</div>}
                    {a.endDate && <div>To: {a.endDate}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(a)} className="rounded p-1.5 text-gray-400 hover:bg-surface-hover hover:text-saffron">
                        <IoCreateOutline className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(a.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-400/10 hover:text-red-400">
                        <IoTrashOutline className="h-4 w-4" />
                      </button>
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
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing ? "Edit" : "New"} Announcement</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-foreground">
                <IoCloseOutline className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-3">
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Announcement["type"] })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron">
                    <option value="event">Event</option>
                    <option value="quote">Quote</option>
                    <option value="location">Location</option>
                    <option value="notification">Notification</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Priority</label>
                  <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Image URL</label>
                <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" placeholder="https://..." />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Action URL</label>
                <input value={form.actionUrl} onChange={(e) => setForm({ ...form, actionUrl: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">End Date</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-saffron" />
                  <label htmlFor="active" className="text-sm text-gray-300">Active</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="showOnMobile" checked={form.showOnMobile} onChange={(e) => setForm({ ...form, showOnMobile: e.target.checked })} className="accent-green-500" />
                  <label htmlFor="showOnMobile" className="text-sm text-gray-300">Mobile</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="showOnTv" checked={form.showOnTv} onChange={(e) => setForm({ ...form, showOnTv: e.target.checked })} className="accent-blue-500" />
                  <label htmlFor="showOnTv" className="text-sm text-gray-300">TV</label>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-gray-400 hover:text-foreground">
                Cancel
              </button>
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
