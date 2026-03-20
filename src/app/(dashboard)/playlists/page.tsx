"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import {
  IoSearchOutline,
  IoChevronBack,
  IoChevronForward,
  IoArrowUp,
  IoArrowDown,
  IoEyeOutline,
  IoEyeOffOutline,
  IoCheckmarkOutline,
} from "react-icons/io5";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Playlist {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelKey: string;
  channelName: string;
  videoCount: number;
  publishedAt: string;
  section: string;
  displayOrder: number;
  pinned: boolean;
  visible: boolean;
  lastFetched: string;
}

const SECTIONS = [
  { value: "pravachan", label: "Pravachan" },
  { value: "shanka-clips", label: "Shanka Clips" },
  { value: "shanka-full", label: "Shanka Full" },
  { value: "bhawna-yog", label: "Bhawna Yog" },
  { value: "swadhyay", label: "Swadhyay" },
  { value: "events", label: "Events" },
  { value: "kids", label: "Kids" },
] as const;

const SECTION_VALUES = SECTIONS.map((s) => s.value);

type SortKey = "date" | "videoCount" | "name";
type TabFilter = "all" | (typeof SECTION_VALUES)[number] | "unassigned";

const TAB_FILTERS: { value: TabFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...SECTIONS.map((s) => ({ value: s.value as TabFilter, label: s.label })),
  { value: "unassigned", label: "Unassigned" },
];

const CHANNEL_COLORS: Record<string, string> = {
  pramansagarji: "bg-[#E8730A] text-white",
  bestofshankasamadhan: "bg-amber-600 text-white",
  shankasamadhan: "bg-amber-600 text-white",
  jainpathshala: "bg-blue-600 text-white",
};

const PAGE_SIZE = 50;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isUnassigned(section: string | undefined | null): boolean {
  return !section || section === "unassigned" || section === "";
}

function sectionLabel(val: string): string {
  const found = SECTIONS.find((s) => s.value === val);
  return found ? found.label : "Unassigned";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSection, setBulkSection] = useState("");
  const [editingOrder, setEditingOrder] = useState<Record<string, string>>({});
  const { toast } = useToast();

  /* ---- Load ---- */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "playlists"), orderBy("publishedAt", "desc"));
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title ?? "",
          description: data.description ?? "",
          thumbnailUrl: data.thumbnailUrl ?? "",
          channelKey: data.channelKey ?? "",
          channelName: data.channelName ?? "",
          videoCount: data.videoCount ?? 0,
          publishedAt: data.publishedAt ?? "",
          section: data.section ?? "unassigned",
          displayOrder: data.displayOrder ?? 999,
          pinned: data.pinned ?? false,
          visible: data.visible !== false,
          lastFetched: data.lastFetched ?? "",
        } as Playlist;
      });
      setPlaylists(docs);
    } catch {
      toast("Failed to load playlists", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---- Filtering / Sorting ---- */
  const filtered = playlists
    .filter((p) => {
      if (tab === "all") return true;
      if (tab === "unassigned") return isUnassigned(p.section);
      return p.section === tab;
    })
    .filter((p) => {
      if (!search) return true;
      return p.title.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (sortKey === "date") return (b.publishedAt || "").localeCompare(a.publishedAt || "");
      if (sortKey === "videoCount") return b.videoCount - a.videoCount;
      if (sortKey === "name") return a.title.localeCompare(b.title);
      return 0;
    });

  // Within a section tab (not "all"), also sort by displayOrder first
  const sorted =
    tab !== "all" && tab !== "unassigned"
      ? [...filtered].sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999))
      : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /* ---- Stats ---- */
  const totalCount = playlists.length;
  const assignedCount = playlists.filter((p) => !isUnassigned(p.section)).length;
  const unassignedCount = totalCount - assignedCount;

  /* ---- Firestore update helpers ---- */
  async function updateField(id: string, field: string, value: unknown) {
    try {
      await updateDoc(doc(db, "playlists", id), { [field]: value });
      setPlaylists((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
      );
    } catch {
      toast(`Failed to update ${field}`, "error");
    }
  }

  async function handleSectionChange(id: string, newSection: string) {
    await updateField(id, "section", newSection);
    toast(`Section updated`, "success");
  }

  async function handleTogglePinned(p: Playlist) {
    await updateField(p.id, "pinned", !p.pinned);
  }

  async function handleToggleVisible(p: Playlist) {
    await updateField(p.id, "visible", !p.visible);
  }

  function handleOrderChange(id: string, val: string) {
    setEditingOrder((prev) => ({ ...prev, [id]: val }));
  }

  async function handleOrderBlur(id: string) {
    const raw = editingOrder[id];
    if (raw === undefined) return;
    const num = parseInt(raw, 10);
    if (isNaN(num)) {
      setEditingOrder((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      return;
    }
    await updateField(id, "displayOrder", num);
    setEditingOrder((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  async function handleMoveUp(idx: number) {
    if (idx === 0) return;
    const current = paginated[idx];
    const above = paginated[idx - 1];
    const curOrder = current.displayOrder;
    const aboveOrder = above.displayOrder;
    await updateField(current.id, "displayOrder", aboveOrder);
    await updateField(above.id, "displayOrder", curOrder);
  }

  async function handleMoveDown(idx: number) {
    if (idx >= paginated.length - 1) return;
    const current = paginated[idx];
    const below = paginated[idx + 1];
    const curOrder = current.displayOrder;
    const belowOrder = below.displayOrder;
    await updateField(current.id, "displayOrder", belowOrder);
    await updateField(below.id, "displayOrder", curOrder);
  }

  /* ---- Bulk ---- */
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === paginated.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map((p) => p.id)));
    }
  }

  async function handleBulkSection() {
    if (!bulkSection || selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      await Promise.all(ids.map((id) => updateDoc(doc(db, "playlists", id), { section: bulkSection })));
      setPlaylists((prev) =>
        prev.map((p) => (ids.includes(p.id) ? { ...p, section: bulkSection } : p))
      );
      setSelected(new Set());
      setBulkSection("");
      toast(`Updated ${ids.length} playlists`, "success");
    } catch {
      toast("Bulk update failed", "error");
    }
  }

  async function handleBulkToggleVisible() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      await Promise.all(
        ids.map((id) => {
          const p = playlists.find((pl) => pl.id === id);
          return updateDoc(doc(db, "playlists", id), { visible: !(p?.visible ?? true) });
        })
      );
      setPlaylists((prev) =>
        prev.map((p) => (ids.includes(p.id) ? { ...p, visible: !p.visible } : p))
      );
      setSelected(new Set());
      toast(`Toggled visibility for ${ids.length} playlists`, "success");
    } catch {
      toast("Bulk toggle failed", "error");
    }
  }

  /* ---- Render ---- */
  const showReorder = tab !== "all" && tab !== "unassigned";

  return (
    <div className="space-y-5">
      {/* Header & Stats */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Playlists</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage {totalCount} playlists across sections
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="rounded-md bg-[#1F2937] px-3 py-1.5 text-gray-300">
            Total: <span className="font-semibold text-white">{totalCount}</span>
          </span>
          <span className="rounded-md bg-[#1F2937] px-3 py-1.5 text-gray-300">
            Assigned: <span className="font-semibold text-green-400">{assignedCount}</span>
          </span>
          <span className="rounded-md bg-[#1F2937] px-3 py-1.5 text-gray-300">
            Unassigned: <span className="font-semibold text-yellow-400">{unassignedCount}</span>
          </span>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {TAB_FILTERS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTab(t.value); setPage(1); setSelected(new Set()); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.value
                ? "bg-[#E8730A] text-white"
                : "bg-[#1F2937] text-gray-400 hover:bg-[#374151] hover:text-gray-200"
            }`}
          >
            {t.label}
            {t.value !== "all" && (
              <span className="ml-1.5 text-xs opacity-75">
                {t.value === "unassigned"
                  ? unassignedCount
                  : playlists.filter((p) => p.section === t.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search playlists..."
            className="w-full rounded-lg border border-[#374151] bg-[#1F2937] py-2 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-[#E8730A] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400">Sort:</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-[#374151] bg-[#1F2937] px-3 py-2 text-sm text-white focus:border-[#E8730A] focus:outline-none"
          >
            <option value="date">Date</option>
            <option value="videoCount">Video Count</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#E8730A]/30 bg-[#E8730A]/5 p-3">
          <span className="text-sm font-medium text-[#E8730A]">{selected.size} selected</span>
          <select
            value={bulkSection}
            onChange={(e) => setBulkSection(e.target.value)}
            className="rounded border border-[#374151] bg-[#1F2937] px-2 py-1 text-sm text-white"
          >
            <option value="">Assign to section...</option>
            {SECTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
            <option value="unassigned">Unassigned</option>
          </select>
          <button
            onClick={handleBulkSection}
            disabled={!bulkSection}
            className="rounded bg-[#E8730A] px-3 py-1 text-sm font-medium text-white disabled:opacity-40"
          >
            Apply
          </button>
          <button
            onClick={handleBulkToggleVisible}
            className="rounded border border-[#374151] bg-[#1F2937] px-3 py-1 text-sm text-gray-300 hover:text-white"
          >
            Toggle Visible
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-sm text-gray-400 hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E8730A] border-t-transparent" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-[#374151] bg-[#1F2937] p-12 text-center text-gray-400">
          No playlists found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#374151]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#374151] bg-[#1F2937]">
                <th className="px-3 py-2.5 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === paginated.length && paginated.length > 0}
                    onChange={toggleSelectAll}
                    className="accent-[#E8730A]"
                  />
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-gray-400">
                  Playlist
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-gray-400">
                  Channel
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase text-gray-400">
                  Videos
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-gray-400">
                  Section
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase text-gray-400">
                  Order
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase text-gray-400">
                  Pinned
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase text-gray-400">
                  Visible
                </th>
                {showReorder && (
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase text-gray-400">
                    Move
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151]">
              {paginated.map((p, idx) => (
                <tr
                  key={p.id}
                  className={`transition-colors hover:bg-[#374151]/40 ${
                    selected.has(p.id) ? "bg-[#E8730A]/5" : ""
                  } ${!p.visible ? "opacity-50" : ""}`}
                >
                  {/* Checkbox */}
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="accent-[#E8730A]"
                    />
                  </td>

                  {/* Thumbnail + Title */}
                  <td className="max-w-xs px-3 py-2">
                    <div className="flex items-center gap-3">
                      {p.thumbnailUrl ? (
                        <img
                          src={p.thumbnailUrl}
                          alt=""
                          className="h-9 w-16 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="h-9 w-16 shrink-0 rounded bg-[#374151]" />
                      )}
                      <span className="line-clamp-2 text-sm font-medium text-white" title={p.title}>
                        {p.title}
                      </span>
                    </div>
                  </td>

                  {/* Channel */}
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        CHANNEL_COLORS[p.channelKey] || "bg-gray-600 text-gray-200"
                      }`}
                    >
                      {p.channelName || p.channelKey}
                    </span>
                  </td>

                  {/* Video count */}
                  <td className="px-3 py-2 text-center text-gray-300">{p.videoCount}</td>

                  {/* Section dropdown */}
                  <td className="px-3 py-2">
                    <select
                      value={isUnassigned(p.section) ? "unassigned" : p.section}
                      onChange={(e) => handleSectionChange(p.id, e.target.value)}
                      className="rounded border border-[#374151] bg-[#111827] px-2 py-1 text-xs text-white focus:border-[#E8730A] focus:outline-none"
                    >
                      <option value="unassigned">Unassigned</option>
                      {SECTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Display order */}
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      value={editingOrder[p.id] !== undefined ? editingOrder[p.id] : p.displayOrder}
                      onChange={(e) => handleOrderChange(p.id, e.target.value)}
                      onBlur={() => handleOrderBlur(p.id)}
                      className="w-16 rounded border border-[#374151] bg-[#111827] px-2 py-1 text-center text-xs text-white focus:border-[#E8730A] focus:outline-none"
                    />
                  </td>

                  {/* Pinned */}
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleTogglePinned(p)}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded transition-colors ${
                        p.pinned
                          ? "bg-[#E8730A] text-white"
                          : "bg-[#1F2937] text-gray-500 hover:text-gray-300"
                      }`}
                      title={p.pinned ? "Unpin" : "Pin"}
                    >
                      <IoCheckmarkOutline className="h-4 w-4" />
                    </button>
                  </td>

                  {/* Visible */}
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleToggleVisible(p)}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded transition-colors ${
                        p.visible
                          ? "bg-green-700/30 text-green-400"
                          : "bg-red-700/20 text-red-400"
                      }`}
                      title={p.visible ? "Hide" : "Show"}
                    >
                      {p.visible ? (
                        <IoEyeOutline className="h-4 w-4" />
                      ) : (
                        <IoEyeOffOutline className="h-4 w-4" />
                      )}
                    </button>
                  </td>

                  {/* Reorder */}
                  {showReorder && (
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="rounded p-1 text-gray-500 hover:bg-[#374151] hover:text-white disabled:opacity-30"
                        >
                          <IoArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx >= paginated.length - 1}
                          className="rounded p-1 text-gray-500 hover:bg-[#374151] hover:text-white disabled:opacity-30"
                        >
                          <IoArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} of{" "}
            {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="rounded-lg border border-[#374151] bg-[#1F2937] p-2 text-gray-400 hover:text-white disabled:opacity-40"
            >
              <IoChevronBack className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-300">
              Page {safePage} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="rounded-lg border border-[#374151] bg-[#1F2937] p-2 text-gray-400 hover:text-white disabled:opacity-40"
            >
              <IoChevronForward className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
