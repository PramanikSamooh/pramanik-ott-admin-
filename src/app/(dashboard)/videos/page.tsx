"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import { IoSearchOutline, IoPlayOutline, IoChevronForward, IoChevronBack } from "react-icons/io5";

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  category: string;
  publishedAt: string;
}

const PAGE_SIZE = 25;

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  async function loadVideos(after?: DocumentSnapshot) {
    setLoading(true);
    try {
      let q = query(collection(db, "videos"), orderBy("publishedAt", "desc"), limit(PAGE_SIZE));
      if (after) {
        q = query(collection(db, "videos"), orderBy("publishedAt", "desc"), startAfter(after), limit(PAGE_SIZE));
      }
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Video));
      setVideos(docs);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch {
      toast("Failed to load videos", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadVideos(); }, []);

  function nextPage() {
    if (lastDoc && hasMore) {
      loadVideos(lastDoc);
      setPage((p) => p + 1);
    }
  }

  const filteredVideos = search
    ? videos.filter((v) => v.title?.toLowerCase().includes(search.toLowerCase()))
    : videos;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Videos</h1>
        <p className="mt-1 text-sm text-gray-400">Browse synced videos from YouTube</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface pl-10 pr-4 py-2.5 text-sm outline-none focus:border-saffron"
          placeholder="Search videos on this page..."
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Thumbnail</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Title</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Channel</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Category</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Published</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center"><div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-saffron border-t-transparent" /></td></tr>
            ) : filteredVideos.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">No videos found.</td></tr>
            ) : filteredVideos.map((v) => (
              <tr key={v.id} className="transition-colors hover:bg-surface">
                <td className="px-4 py-3">
                  {v.thumbnailUrl ? (
                    <img src={v.thumbnailUrl} alt="" className="h-10 w-16 rounded object-cover" />
                  ) : (
                    <div className="flex h-10 w-16 items-center justify-center rounded bg-surface-hover"><IoPlayOutline className="h-4 w-4 text-gray-500" /></div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-xs truncate font-medium">{v.title || v.id}</div>
                </td>
                <td className="px-4 py-3 text-gray-400">{v.channelTitle || "-"}</td>
                <td className="px-4 py-3">
                  {v.category ? (
                    <span className="rounded-full bg-surface-hover px-2.5 py-0.5 text-xs">{v.category}</span>
                  ) : "-"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{v.publishedAt || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Page {page}</span>
        <div className="flex gap-2">
          <button
            onClick={() => { setPage(1); loadVideos(); }}
            disabled={page === 1}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-gray-400 hover:text-foreground disabled:opacity-30"
          >
            <IoChevronBack className="h-4 w-4" /> First
          </button>
          <button
            onClick={nextPage}
            disabled={!hasMore}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-gray-400 hover:text-foreground disabled:opacity-30"
          >
            Next <IoChevronForward className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
