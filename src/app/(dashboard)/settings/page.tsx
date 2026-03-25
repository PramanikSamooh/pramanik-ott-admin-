"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import { IoSaveOutline, IoSettingsOutline } from "react-icons/io5";

interface AppConfig {
  appVersion: string;
  minVersion: string;
  minVersionCode: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

const defaults: AppConfig = {
  appVersion: "2.3.0",
  minVersion: "2.3.0",
  minVersionCode: 6,
  maintenanceMode: false,
  maintenanceMessage: "",
};

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfig>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, "config", "app"));
        if (snap.exists()) {
          setConfig({ ...defaults, ...snap.data() } as AppConfig);
        }
      } catch {
        toast("Failed to load settings", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  async function save() {
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "app"), { ...config, updatedAt: new Date() });
      toast("Settings saved");
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
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="mt-1 text-sm text-gray-400">App configuration</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover disabled:opacity-50">
          <IoSaveOutline className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="max-w-xl space-y-6">
        {/* App Version */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <IoSettingsOutline className="h-5 w-5 text-saffron" /> Version Control
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Current App Version</label>
              <input
                value={config.appVersion}
                onChange={(e) => setConfig({ ...config, appVersion: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30"
                placeholder="1.0.0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Minimum Required Version</label>
              <input
                value={config.minVersion}
                onChange={(e) => setConfig({ ...config, minVersion: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30"
                placeholder="1.0.0"
              />
              <p className="mt-1 text-xs text-gray-500">Display version (e.g., 2.3.0)</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Minimum Version Code (integer)</label>
              <input
                type="number"
                value={config.minVersionCode}
                onChange={(e) => setConfig({ ...config, minVersionCode: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30"
                placeholder="6"
              />
              <p className="mt-1 text-xs text-gray-500">Users with version code below this will be forced to update. Current release: 6</p>
            </div>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">Maintenance Mode</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
              <div>
                <div className="text-sm font-medium">Enable Maintenance Mode</div>
                <div className="text-xs text-gray-500">App will show a maintenance screen to all users</div>
              </div>
              <button
                onClick={() => setConfig({ ...config, maintenanceMode: !config.maintenanceMode })}
                className={`h-6 w-11 rounded-full transition-colors ${config.maintenanceMode ? "bg-red-500" : "bg-gray-600"}`}
              >
                <div className={`h-5 w-5 rounded-full bg-white transition-transform ${config.maintenanceMode ? "translate-x-5.5" : "translate-x-0.5"}`} />
              </button>
            </div>

            {config.maintenanceMode && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">Maintenance Message</label>
                <textarea
                  value={config.maintenanceMessage}
                  onChange={(e) => setConfig({ ...config, maintenanceMessage: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30 resize-none"
                  placeholder="We are currently performing maintenance. Please try again later."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
