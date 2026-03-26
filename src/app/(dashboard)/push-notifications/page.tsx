"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, query, orderBy, limit, Timestamp } from "firebase/firestore";
import { useToast } from "@/components/Toast";

interface NotificationLog {
  id: string;
  title: string;
  body: string;
  type: string;
  videoId: string;
  target: string;
  sentAt: any;
  sentBy: string;
}

export default function PushNotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("general");
  const [videoId, setVideoId] = useState("");
  const [target, setTarget] = useState("all"); // all, mobile, tv
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      const q = query(collection(db, "notification_logs"), orderBy("sentAt", "desc"), limit(20));
      const snap = await getDocs(q);
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationLog)));
    } catch (_) {}
    setLoading(false);
  }

  async function sendNotification() {
    if (!title.trim() || !body.trim()) {
      toast("Title and body are required", "error");
      return;
    }

    setSending(true);
    try {
      // Send via Firebase Cloud Function
      const res = await fetch("https://us-central1-pramanik-ott.cloudfunctions.net/sendPushNotification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          type,
          videoId: videoId.trim(),
          target,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast("Notification sent successfully!", "success");
        // Log it
        await addDoc(collection(db, "notification_logs"), {
          title: title.trim(),
          body: body.trim(),
          type,
          videoId: videoId.trim(),
          target,
          sentAt: Timestamp.now(),
          sentBy: "admin",
        });
        setTitle("");
        setBody("");
        setVideoId("");
        loadLogs();
      } else {
        toast(data.error || "Failed to send", "error");
      }
    } catch (e: any) {
      toast("Error: " + e.message, "error");
    }
    setSending(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Push Notifications</h1>
      <p className="text-gray-400">Send push notifications to all app users</p>

      {/* Send Notification Form */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Send New Notification</h2>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Live Pravachan Starting Now!"
            className="w-full px-4 py-2 bg-black/30 border border-border rounded-lg text-white placeholder-gray-500 focus:border-saffron focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Message *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="e.g., Muni Shri Pramansagar Ji is live now. Tap to watch."
            rows={3}
            className="w-full px-4 py-2 bg-black/30 border border-border rounded-lg text-white placeholder-gray-500 focus:border-saffron focus:outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2 bg-black/30 border border-border rounded-lg text-white focus:border-saffron focus:outline-none"
            >
              <option value="general">General</option>
              <option value="live">Live Stream</option>
              <option value="video">New Video</option>
              <option value="announcement">Announcement</option>
              <option value="pathshala">Pathshala Class</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Target</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full px-4 py-2 bg-black/30 border border-border rounded-lg text-white focus:border-saffron focus:outline-none"
            >
              <option value="all">All Devices</option>
              <option value="mobile">Mobile Only</option>
              <option value="tv">TV Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Video ID (optional)</label>
            <input
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              placeholder="YouTube video ID"
              className="w-full px-4 py-2 bg-black/30 border border-border rounded-lg text-white placeholder-gray-500 focus:border-saffron focus:outline-none"
            />
          </div>
        </div>

        {videoId && (
          <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
            <img
              src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`}
              alt="Preview"
              className="w-24 h-14 rounded object-cover"
            />
            <span className="text-gray-400 text-sm">Video preview</span>
          </div>
        )}

        <button
          onClick={sendNotification}
          disabled={sending || !title.trim() || !body.trim()}
          className="px-6 py-2 bg-saffron text-white rounded-lg font-medium hover:bg-saffron/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? "Sending..." : "Send Notification"}
        </button>
      </div>

      {/* Quick Templates */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold text-white">Quick Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { t: "Live Pravachan", b: "Muni Shri Pramansagar Ji is live now. Tap to watch.", ty: "live" },
            { t: "Live Shanka Samadhan", b: "Shanka Samadhan session is live. Join now!", ty: "live" },
            { t: "New Pravachan Available", b: "A new pravachan has been uploaded. Watch now.", ty: "video" },
            { t: "Pathshala Class Starting", b: "Jain Pathshala class is about to start. Join now!", ty: "pathshala" },
            { t: "Event Announcement", b: "New event has been scheduled. Check the app for details.", ty: "announcement" },
            { t: "Bhawna Yog Reminder", b: "Daily Bhawna Yog session is starting soon.", ty: "general" },
          ].map((tmpl, i) => (
            <button
              key={i}
              onClick={() => { setTitle(tmpl.t); setBody(tmpl.b); setType(tmpl.ty); }}
              className="text-left p-3 bg-black/20 border border-border rounded-lg hover:border-saffron/50 transition-colors"
            >
              <span className="text-white font-medium text-sm">{tmpl.t}</span>
              <span className="text-gray-500 text-xs block mt-1 truncate">{tmpl.b}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notification History */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Notifications</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-gray-500">No notifications sent yet</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 p-3 bg-black/20 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  log.type === "live" ? "bg-red-500" :
                  log.type === "video" ? "bg-blue-400" :
                  log.type === "pathshala" ? "bg-green-400" :
                  "bg-gray-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium text-sm">{log.title}</span>
                  <span className="text-gray-400 text-xs block truncate">{log.body}</span>
                  <div className="flex gap-3 mt-1">
                    <span className="text-gray-600 text-xs">{log.type}</span>
                    <span className="text-gray-600 text-xs">{log.target}</span>
                    {log.videoId && <span className="text-gray-600 text-xs">🎬 {log.videoId}</span>}
                    <span className="text-gray-600 text-xs">
                      {log.sentAt?.toDate?.()?.toLocaleString() || ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
