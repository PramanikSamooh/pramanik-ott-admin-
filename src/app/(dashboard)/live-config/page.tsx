"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import { IoSaveOutline, IoRadioOutline } from "react-icons/io5";

interface LiveConfig {
  morningTime: string;
  eveningTime: string;
  channelId: string;
  manualOverride: boolean;
  forceLive: boolean;
  forceVideoId: string;
}

const defaults: LiveConfig = {
  morningTime: "08:30",
  eveningTime: "18:20",
  channelId: "",
  manualOverride: false,
  forceLive: false,
  forceVideoId: "",
};

export default function LiveConfigPage() {
  const [config, setConfig] = useState<LiveConfig>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, "config", "live"));
        if (snap.exists()) {
          setConfig({ ...defaults, ...snap.data() } as LiveConfig);
        }
      } catch {
        toast("Failed to load live config", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  async function save() {
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "live"), { ...config, updatedAt: new Date() });
      toast("Live config saved");
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
          <h1 className="text-2xl font-bold">Live Config</h1>
          <p className="mt-1 text-sm text-gray-400">Manage live stream schedule and overrides</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover disabled:opacity-50">
          <IoSaveOutline className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Schedule */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <IoRadioOutline className="h-5 w-5 text-saffron" /> Daily Schedule
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Morning Pravachan Time (IST)</label>
              <input
                type="time"
                value={config.morningTime}
                onChange={(e) => setConfig({ ...config, morningTime: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30"
              />
              <p className="mt-1 text-xs text-gray-500">Default: 8:30 AM IST</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Evening Shanka Samadhan Time (IST)</label>
              <input
                type="time"
                value={config.eveningTime}
                onChange={(e) => setConfig({ ...config, eveningTime: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30"
              />
              <p className="mt-1 text-xs text-gray-500">Default: 6:20 PM IST</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">YouTube Channel ID to Monitor</label>
              <input
                value={config.channelId}
                onChange={(e) => setConfig({ ...config, channelId: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30"
                placeholder="UCxxxxxxxxxx"
              />
            </div>
          </div>
        </div>

        {/* Manual Override */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">Manual Override</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
              <div>
                <div className="text-sm font-medium">Enable Manual Override</div>
                <div className="text-xs text-gray-500">Override automatic live detection</div>
              </div>
              <button
                onClick={() => setConfig({ ...config, manualOverride: !config.manualOverride })}
                className={`h-6 w-11 rounded-full transition-colors ${config.manualOverride ? "bg-saffron" : "bg-gray-600"}`}
              >
                <div className={`h-5 w-5 rounded-full bg-white transition-transform ${config.manualOverride ? "translate-x-5.5" : "translate-x-0.5"}`} />
              </button>
            </div>

            {config.manualOverride && (
              <>
                <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                  <div>
                    <div className="text-sm font-medium">Force Live Status</div>
                    <div className="text-xs text-gray-500">Show as live even if not streaming</div>
                  </div>
                  <button
                    onClick={() => setConfig({ ...config, forceLive: !config.forceLive })}
                    className={`h-6 w-11 rounded-full transition-colors ${config.forceLive ? "bg-green-500" : "bg-gray-600"}`}
                  >
                    <div className={`h-5 w-5 rounded-full bg-white transition-transform ${config.forceLive ? "translate-x-5.5" : "translate-x-0.5"}`} />
                  </button>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Force Video ID</label>
                  <input
                    value={config.forceVideoId}
                    onChange={(e) => setConfig({ ...config, forceVideoId: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30"
                    placeholder="YouTube video ID (e.g. dQw4w9WgXcQ)"
                  />
                  <p className="mt-1 text-xs text-gray-500">If set, this video will be shown as the live stream</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
