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
  IoEyeOutline,
  IoEyeOffOutline,
} from "react-icons/io5";

interface HomeRow {
  id: string;
  type: "category" | "channel" | "announcement" | "live";
  label: string;
  labelHi: string;
  filter: string;
  priority: number;
  maxItems: number;
  visible: boolean;
}

const defaultRow: Omit<HomeRow, "id" | "priority"> = {
  type: "category",
  label: "",
  labelHi: "",
  filter: "",
  maxItems: 10,
  visible: true,
};

export default function HomeLayoutPage() {
  const [rows, setRows] = useState<HomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, "config", "home"));
        if (snap.exists()) {
          setRows(snap.data().rows || []);
        }
      } catch {
        toast("Failed to load home layout", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  function addRow() {
    const id = `row_${Date.now()}`;
    setRows((prev) => [
      ...prev,
      { ...defaultRow, id, priority: prev.length },
    ]);
  }

  function updateRow(index: number, updates: Partial<HomeRow>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...updates } : r))
    );
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function moveRow(index: number, direction: "up" | "down") {
    const newRows = [...rows];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newRows.length) return;
    [newRows[index], newRows[targetIndex]] = [newRows[targetIndex], newRows[index]];
    setRows(newRows.map((r, i) => ({ ...r, priority: i })));
  }

  async function save() {
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "home"), { rows, updatedAt: new Date() });
      toast("Home layout saved");
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
          <h1 className="text-2xl font-bold">Home Layout</h1>
          <p className="mt-1 text-sm text-gray-400">Manage app home screen rows</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addRow} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-gray-300 hover:border-saffron/50 hover:text-saffron">
            <IoAddOutline className="h-4 w-4" /> Add Row
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover disabled:opacity-50">
            <IoSaveOutline className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-gray-400">No rows configured. Click "Add Row" to start.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className={`rounded-xl border bg-surface p-4 ${row.visible ? "border-border" : "border-border opacity-50"}`}
            >
              <div className="flex flex-wrap items-start gap-4">
                {/* Order controls */}
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveRow(index, "up")} disabled={index === 0} className="rounded p-1 text-gray-400 hover:bg-surface-hover hover:text-foreground disabled:opacity-30">
                    <IoArrowUp className="h-4 w-4" />
                  </button>
                  <span className="text-center text-xs text-gray-500">{index + 1}</span>
                  <button onClick={() => moveRow(index, "down")} disabled={index === rows.length - 1} className="rounded p-1 text-gray-400 hover:bg-surface-hover hover:text-foreground disabled:opacity-30">
                    <IoArrowDown className="h-4 w-4" />
                  </button>
                </div>

                {/* Fields */}
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Type</label>
                    <select
                      value={row.type}
                      onChange={(e) => updateRow(index, { type: e.target.value as HomeRow["type"] })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron"
                    >
                      <option value="category">Category</option>
                      <option value="channel">Channel</option>
                      <option value="announcement">Announcement</option>
                      <option value="live">Live</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Label (English)</label>
                    <input
                      value={row.label}
                      onChange={(e) => updateRow(index, { label: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron"
                      placeholder="e.g. Latest Discourses"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Label (Hindi)</label>
                    <input
                      value={row.labelHi}
                      onChange={(e) => updateRow(index, { labelHi: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron"
                      placeholder="e.g. ताज़ा प्रवचन"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Filter / Slug</label>
                    <input
                      value={row.filter}
                      onChange={(e) => updateRow(index, { filter: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron"
                      placeholder="e.g. discourse"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Max Items</label>
                    <input
                      type="number"
                      value={row.maxItems}
                      onChange={(e) => updateRow(index, { maxItems: parseInt(e.target.value) || 10 })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron"
                      min={1}
                      max={50}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={() => updateRow(index, { visible: !row.visible })}
                    className={`rounded p-2 transition-colors ${row.visible ? "text-green-400 hover:bg-green-400/10" : "text-gray-500 hover:bg-surface-hover"}`}
                    title={row.visible ? "Visible" : "Hidden"}
                  >
                    {row.visible ? <IoEyeOutline className="h-5 w-5" /> : <IoEyeOffOutline className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => removeRow(index)}
                    className="rounded p-2 text-gray-400 transition-colors hover:bg-red-400/10 hover:text-red-400"
                  >
                    <IoTrashOutline className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
