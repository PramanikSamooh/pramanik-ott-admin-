"use client";

import { useState, useRef } from "react";
import { doc, writeBatch, getDoc, deleteDoc, collection, getDocs, query, where, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import { IoCloudUploadOutline, IoTrashOutline, IoCalendarOutline, IoDocumentTextOutline } from "react-icons/io5";

interface PanchangMeta {
  yearsImported: string[];
  lastImported: string;
  totalDocs: number;
}

export default function PanchangPage() {
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [meta, setMeta] = useState<PanchangMeta | null>(null);
  const [todayPreview, setTodayPreview] = useState<Record<string, unknown> | null>(null);
  const [deleteYear, setDeleteYear] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load meta on mount
  useState(() => {
    loadMeta();
    loadTodayPreview();
  });

  async function loadMeta() {
    try {
      const snap = await getDoc(doc(db, "panchang", "_meta"));
      if (snap.exists()) setMeta(snap.data() as PanchangMeta);
    } catch {}
  }

  async function loadTodayPreview() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const snap = await getDoc(doc(db, "panchang", today));
      if (snap.exists()) setTodayPreview(snap.data());
    } catch {}
  }

  async function handleImport(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Array<Record<string, unknown>>;

      if (!Array.isArray(data) || data.length === 0) {
        toast("Invalid JSON — expected array of panchang documents", "error");
        setImporting(false);
        return;
      }

      // Validate first entry
      const first = data[0];
      if (!first.date || !first.tithi) {
        toast("Invalid format — missing date or tithi field", "error");
        setImporting(false);
        return;
      }

      const total = data.length;
      setProgress({ done: 0, total });

      // Write in batches of 400 (Firestore limit is 500)
      for (let i = 0; i < total; i += 400) {
        const batch = writeBatch(db);
        const chunk = data.slice(i, i + 400);
        for (const entry of chunk) {
          const dateStr = entry.date as string;
          batch.set(doc(db, "panchang", dateStr), entry);
        }
        await batch.commit();
        setProgress({ done: Math.min(i + 400, total), total });
      }

      // Update meta
      const years = [...new Set(data.map((d) => (d.date as string).split("-")[0]))];
      const existingMeta = meta || { yearsImported: [], lastImported: "", totalDocs: 0 };
      const allYears = [...new Set([...existingMeta.yearsImported, ...years])].sort();
      await setDoc(doc(db, "panchang", "_meta"), {
        yearsImported: allYears,
        lastImported: new Date().toISOString(),
        totalDocs: existingMeta.totalDocs + total,
      });

      toast(`Imported ${total} panchang documents for ${years.join(", ")}`);
      loadMeta();
      loadTodayPreview();
    } catch (err: unknown) {
      toast(`Import failed: ${err instanceof Error ? err.message : "Error"}`, "error");
    } finally {
      setImporting(false);
    }
  }

  async function handleDeleteYear() {
    if (!deleteYear) return;
    if (!confirm(`Delete ALL panchang data for ${deleteYear}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      // Find all docs starting with the year
      const snap = await getDocs(collection(db, "panchang"));
      const batch = writeBatch(db);
      let count = 0;
      snap.forEach((d) => {
        if (d.id.startsWith(deleteYear + "-")) {
          batch.delete(d.ref);
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
        toast(`Deleted ${count} documents for ${deleteYear}`);
      } else {
        toast(`No documents found for ${deleteYear}`, "error");
      }

      // Update meta
      if (meta) {
        await setDoc(doc(db, "panchang", "_meta"), {
          ...meta,
          yearsImported: meta.yearsImported.filter((y) => y !== deleteYear),
          totalDocs: Math.max(0, meta.totalDocs - count),
        });
      }
      loadMeta();
    } catch (err: unknown) {
      toast(`Delete failed: ${err instanceof Error ? err.message : "Error"}`, "error");
    } finally {
      setDeleting(false);
      setDeleteYear("");
    }
  }

  const preview = todayPreview as Record<string, unknown> | null;
  const tithiData = preview?.tithi as Record<string, unknown> | null;
  const monthData = preview?.hinduMonth as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panchang Management</h1>
        <p className="mt-1 text-sm text-gray-400">
          Import panchang data generated from the{" "}
          <a href="https://panchang.munipramansagar.net" target="_blank" className="text-saffron hover:underline">
            Panchang Tool
          </a>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <IoCalendarOutline className="h-5 w-5 text-saffron" /> Status
          </h2>
          {meta ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <span className="text-sm text-gray-300">Years Imported</span>
                <span className="text-sm font-mono text-saffron">{meta.yearsImported.join(", ") || "None"}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <span className="text-sm text-gray-300">Total Documents</span>
                <span className="text-sm text-gray-200">{meta.totalDocs}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <span className="text-sm text-gray-300">Last Imported</span>
                <span className="text-sm text-gray-200">{meta.lastImported ? new Date(meta.lastImported).toLocaleString("en-IN") : "Never"}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No panchang data imported yet.</p>
          )}

          {/* Today's Preview */}
          {preview && (
            <div className="mt-4 rounded-lg border border-saffron/30 bg-saffron/5 p-4">
              <div className="text-xs text-saffron font-semibold mb-2">Today&apos;s Panchang</div>
              <div className="text-sm text-gray-200">
                <div className="font-medium">{preview.varaHi as string} ({preview.varaEn as string})</div>
                <div>तिथि: {tithiData?.nameHi as string} · {tithiData?.pakshaHi as string}</div>
                <div>मास: {monthData?.hi as string} ({monthData?.en as string})</div>
                <div className="text-xs text-gray-400 mt-1">वीर नि.सं. {preview.vnsYear as number}</div>
              </div>
            </div>
          )}
        </div>

        {/* Import + Delete */}
        <div className="space-y-6">
          {/* Import JSON */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <IoCloudUploadOutline className="h-5 w-5 text-saffron" /> Import Panchang Data
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              Upload the JSON file exported from the Panchang Tool. This will write documents to Firestore.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
            />

            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-saffron px-4 py-2.5 text-sm font-semibold text-white hover:bg-saffron-hover disabled:opacity-50"
            >
              <IoDocumentTextOutline className="h-4 w-4" />
              {importing ? `Importing... ${progress.done}/${progress.total}` : "Upload JSON & Import"}
            </button>

            {importing && (
              <div className="mt-3 h-2 rounded-full bg-gray-800">
                <div
                  className="h-2 rounded-full bg-saffron transition-all"
                  style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            )}

            <div className="mt-4 rounded-lg bg-gray-800/50 p-3 text-xs text-gray-400">
              <strong>Workflow:</strong>
              <ol className="mt-1 list-decimal list-inside space-y-1">
                <li>Open <a href="https://panchang.munipramansagar.net" target="_blank" className="text-saffron">Panchang Tool</a></li>
                <li>Generate panchang for a year</li>
                <li>Review and verify events</li>
                <li>Click &quot;Download JSON&quot;</li>
                <li>Upload that JSON file here</li>
              </ol>
              <p className="mt-2"><strong>Adding new events:</strong> Edit events in the Panchang Tool → regenerate → download new JSON → import here (overwrites existing dates).</p>
            </div>
          </div>

          {/* Delete Year */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <IoTrashOutline className="h-5 w-5 text-red-400" /> Delete Year Data
            </h2>
            <div className="flex gap-2">
              <select
                value={deleteYear}
                onChange={(e) => setDeleteYear(e.target.value)}
                className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-saffron focus:outline-none"
              >
                <option value="">Select year...</option>
                {(meta?.yearsImported || []).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={handleDeleteYear}
                disabled={!deleteYear || deleting}
                className="rounded-lg border border-red-500/50 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
