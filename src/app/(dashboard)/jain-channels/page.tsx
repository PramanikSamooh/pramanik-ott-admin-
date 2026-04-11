"use client";

import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  orderBy, query, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import {
  IoAddOutline, IoCreateOutline, IoTrashOutline, IoCloseOutline,
  IoTvOutline,
} from "react-icons/io5";

interface JainChannel {
  id: string;
  name: string;
  nameHi: string;
  youtubeChannelId: string;
  logoUrl: string;
  description: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Timestamp | null;
}

const emptyForm = {
  name: "",
  nameHi: "",
  youtubeChannelId: "",
  logoUrl: "",
  description: "",
  isActive: true,
  displayOrder: 0,
};

export default function JainChannelsPage() {
  const [channels, setChannels] = useState<JainChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<JainChannel | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function load() {
    try {
      const snap = await getDocs(
        query(collection(db, "jainChannels"), orderBy("displayOrder", "asc"))
      );
      setChannels(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JainChannel)));
    } catch {
      toast("Failed to load channels", "error");
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

  function openEdit(ch: JainChannel) {
    setEditing(ch);
    setForm({
      name: ch.name,
      nameHi: ch.nameHi,
      youtubeChannelId: ch.youtubeChannelId,
      logoUrl: ch.logoUrl,
      description: ch.description || "",
      isActive: ch.isActive ?? true,
      displayOrder: ch.displayOrder ?? 0,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.youtubeChannelId.trim()) {
      toast("Name and YouTube Channel ID are required", "error");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "jainChannels", editing.id), { ...form });
        toast("Channel updated");
      } else {
        await addDoc(collection(db, "jainChannels"), {
          ...form,
          createdAt: Timestamp.now(),
        });
        toast("Channel added");
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
    if (!confirm("Delete this channel?")) return;
    try {
      await deleteDoc(doc(db, "jainChannels", id));
      toast("Channel deleted");
      setChannels((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast("Failed to delete", "error");
    }
  }

  async function toggleActive(ch: JainChannel) {
    try {
      await updateDoc(doc(db, "jainChannels", ch.id), { isActive: !ch.isActive });
      setChannels((prev) =>
        prev.map((c) => (c.id === ch.id ? { ...c, isActive: !c.isActive } : c))
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
          <h1 className="text-2xl font-bold">Jain TV Channels</h1>
          <p className="mt-1 text-sm text-gray-400">
            Add YouTube channels of Jain TV networks. Their live streams will appear in the app.
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover">
          <IoAddOutline className="h-4 w-4" /> Add Channel
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs text-gray-400 mb-2">
          <strong>How to find YouTube Channel ID:</strong> Go to the channel page → View Page Source → search for &quot;channelId&quot; or use{" "}
          <a href="https://commentpicker.com/youtube-channel-id.php" target="_blank" className="text-saffron hover:underline">this tool</a>
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Channel</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">YouTube Channel ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Active</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Order</th>
              <th className="px-4 py-3 text-right font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {channels.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                  No channels added yet. Add Jinvani TV, Paras TV, Aadinath TV etc.
                </td>
              </tr>
            ) : (
              channels.map((ch) => (
                <tr key={ch.id} className="transition-colors hover:bg-surface">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {ch.logoUrl ? (
                        <img src={ch.logoUrl} alt={ch.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-saffron/20">
                          <IoTvOutline className="h-5 w-5 text-saffron" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{ch.name}</div>
                        {ch.nameHi && <div className="text-xs text-gray-400">{ch.nameHi}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{ch.youtubeChannelId}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(ch)}
                      className={`h-5 w-9 rounded-full transition-colors ${ch.isActive ? "bg-green-500" : "bg-gray-600"}`}
                    >
                      <div className={`h-4 w-4 rounded-full bg-white transition-transform ${ch.isActive ? "translate-x-4.5" : "translate-x-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{ch.displayOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(ch)} className="rounded p-1.5 text-gray-400 hover:bg-surface-hover hover:text-saffron">
                        <IoCreateOutline className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(ch.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-400/10 hover:text-red-400">
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
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing ? "Edit" : "Add"} Channel</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-foreground">
                <IoCloseOutline className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Channel Name (English)</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron"
                    placeholder="e.g. Paras TV" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Channel Name (Hindi)</label>
                  <input value={form.nameHi} onChange={(e) => setForm({ ...form, nameHi: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron"
                    placeholder="e.g. पारस टीवी" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">YouTube Channel ID</label>
                <input value={form.youtubeChannelId} onChange={(e) => setForm({ ...form, youtubeChannelId: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-saffron"
                  placeholder="e.g. UCxxxxxxxxxxxxxx" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Logo URL (optional)</label>
                <input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron"
                  placeholder="https://..." />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Description (optional)</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Display Order</label>
                  <input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-saffron" />
                    Active
                  </label>
                </div>
              </div>
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
