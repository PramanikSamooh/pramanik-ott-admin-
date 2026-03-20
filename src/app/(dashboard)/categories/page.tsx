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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import {
  IoAddOutline,
  IoCreateOutline,
  IoTrashOutline,
  IoCloseOutline,
  IoSaveOutline,
  IoArrowUp,
  IoArrowDown,
  IoEyeOutline,
  IoEyeOffOutline,
} from "react-icons/io5";

interface Category {
  slug: string;
  label: string;
  labelHi: string;
  icon: string;
  color: string;
  priority: number;
  visible: boolean;
}

const emptyCategory: Omit<Category, "slug" | "priority"> = {
  label: "",
  labelHi: "",
  icon: "",
  color: "#E8730A",
  visible: true,
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ ...emptyCategory, slug: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function load() {
    try {
      const snap = await getDocs(query(collection(db, "categories"), orderBy("priority")));
      setCategories(snap.docs.map((d) => ({ slug: d.id, ...d.data() } as Category)));
    } catch {
      toast("Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyCategory, slug: "" });
    setShowModal(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setForm({ slug: c.slug, label: c.label, labelHi: c.labelHi, icon: c.icon, color: c.color, visible: c.visible });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.slug.trim()) { toast("Slug is required", "error"); return; }
    setSaving(true);
    try {
      const priority = editing ? editing.priority : categories.length;
      await setDoc(doc(db, "categories", form.slug), {
        slug: form.slug,
        label: form.label,
        labelHi: form.labelHi,
        icon: form.icon,
        color: form.color,
        priority,
        visible: form.visible,
      });
      toast(editing ? "Category updated" : "Category created");
      setShowModal(false);
      load();
    } catch {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(slug: string) {
    if (!confirm("Delete this category?")) return;
    try {
      await deleteDoc(doc(db, "categories", slug));
      toast("Category deleted");
      setCategories((prev) => prev.filter((c) => c.slug !== slug));
    } catch {
      toast("Failed to delete", "error");
    }
  }

  async function toggleVisibility(c: Category) {
    try {
      await setDoc(doc(db, "categories", c.slug), { ...c, visible: !c.visible });
      setCategories((prev) => prev.map((x) => (x.slug === c.slug ? { ...x, visible: !x.visible } : x)));
    } catch {
      toast("Failed to update", "error");
    }
  }

  async function moveCategory(index: number, direction: "up" | "down") {
    const newCats = [...categories];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCats.length) return;
    [newCats[index], newCats[targetIndex]] = [newCats[targetIndex], newCats[index]];
    const updated = newCats.map((c, i) => ({ ...c, priority: i }));
    setCategories(updated);
    try {
      await Promise.all(updated.map((c) => setDoc(doc(db, "categories", c.slug), c)));
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
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="mt-1 text-sm text-gray-400">Manage content categories</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover">
          <IoAddOutline className="h-4 w-4" /> Add Category
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface">
            <tr>
              <th className="w-16 px-4 py-3 text-left font-medium text-gray-400">Order</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Slug</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Label</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Label (Hindi)</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Color</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Visible</th>
              <th className="px-4 py-3 text-right font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No categories yet.</td></tr>
            ) : categories.map((c, i) => (
              <tr key={c.slug} className="transition-colors hover:bg-surface">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveCategory(i, "up")} disabled={i === 0} className="rounded p-0.5 text-gray-400 hover:text-foreground disabled:opacity-30"><IoArrowUp className="h-3.5 w-3.5" /></button>
                    <span className="text-xs text-gray-500 w-4 text-center">{i + 1}</span>
                    <button onClick={() => moveCategory(i, "down")} disabled={i === categories.length - 1} className="rounded p-0.5 text-gray-400 hover:text-foreground disabled:opacity-30"><IoArrowDown className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{c.slug}</td>
                <td className="px-4 py-3 font-medium">{c.label}</td>
                <td className="px-4 py-3">{c.labelHi}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded" style={{ backgroundColor: c.color }} />
                    <span className="text-xs text-gray-400">{c.color}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleVisibility(c)} className={`${c.visible ? "text-green-400" : "text-gray-500"}`}>
                    {c.visible ? <IoEyeOutline className="h-5 w-5" /> : <IoEyeOffOutline className="h-5 w-5" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(c)} className="rounded p-1.5 text-gray-400 hover:bg-surface-hover hover:text-saffron"><IoCreateOutline className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(c.slug)} className="rounded p-1.5 text-gray-400 hover:bg-red-400/10 hover:text-red-400"><IoTrashOutline className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing ? "Edit" : "New"} Category</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-foreground"><IoCloseOutline className="h-6 w-6" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Slug (URL-safe ID)</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                  disabled={!!editing}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron disabled:opacity-50"
                  placeholder="e.g. discourse"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Label (English)</label>
                  <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Label (Hindi)</label>
                  <input value={form.labelHi} onChange={(e) => setForm({ ...form, labelHi: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Icon (react-icons name)</label>
                  <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" placeholder="e.g. IoBookOutline" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0" />
                    <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} className="accent-saffron" />
                <label className="text-sm text-gray-300">Visible</label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-gray-400 hover:text-foreground">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
