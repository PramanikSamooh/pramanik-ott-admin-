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
import {
  IoAddOutline,
  IoCreateOutline,
  IoTrashOutline,
  IoCloseOutline,
} from "react-icons/io5";

interface DonationOrg {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  descriptionHi: string;
  qrCodeUrl: string;
  upiAddress: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  priority: number;
  active: boolean;
  createdAt: Timestamp | null;
}

const emptyOrg: Omit<DonationOrg, "id" | "createdAt"> = {
  name: "",
  nameHi: "",
  description: "",
  descriptionHi: "",
  qrCodeUrl: "",
  upiAddress: "",
  accountName: "",
  accountNumber: "",
  ifscCode: "",
  bankName: "",
  priority: 0,
  active: true,
};

export default function DonationsPage() {
  const [orgs, setOrgs] = useState<DonationOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DonationOrg | null>(null);
  const [form, setForm] = useState(emptyOrg);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function load() {
    try {
      const snap = await getDocs(
        query(collection(db, "donations"), orderBy("priority", "asc"))
      );
      setOrgs(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as DonationOrg))
      );
    } catch {
      toast("Failed to load donations", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyOrg);
    setShowModal(true);
  }

  function openEdit(org: DonationOrg) {
    setEditing(org);
    setForm({
      name: org.name,
      nameHi: org.nameHi,
      description: org.description,
      descriptionHi: org.descriptionHi,
      qrCodeUrl: org.qrCodeUrl,
      upiAddress: org.upiAddress,
      accountName: org.accountName,
      accountNumber: org.accountNumber,
      ifscCode: org.ifscCode,
      bankName: org.bankName,
      priority: org.priority,
      active: org.active,
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "donations", editing.id), { ...form });
        toast("Organization updated");
      } else {
        await addDoc(collection(db, "donations"), {
          ...form,
          createdAt: Timestamp.now(),
        });
        toast("Organization added");
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
    if (!confirm("Delete this organization?")) return;
    try {
      await deleteDoc(doc(db, "donations", id));
      toast("Organization deleted");
      setOrgs((prev) => prev.filter((o) => o.id !== id));
    } catch {
      toast("Failed to delete", "error");
    }
  }

  async function toggleActive(org: DonationOrg) {
    try {
      await updateDoc(doc(db, "donations", org.id), { active: !org.active });
      setOrgs((prev) =>
        prev.map((x) => (x.id === org.id ? { ...x, active: !x.active } : x))
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
          <h1 className="text-2xl font-bold">Donations / Swa Par Kalyan</h1>
          <p className="mt-1 text-sm text-gray-400">Manage donation organizations with QR codes and bank details</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover">
          <IoAddOutline className="h-4 w-4" /> Add Organization
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-800/50">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left text-gray-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Name (Hindi)</th>
              <th className="px-4 py-3">UPI</th>
              <th className="px-4 py-3">Bank</th>
              <th className="px-4 py-3">QR Code</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => (
              <tr key={org.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="px-4 py-3 font-medium text-white">{org.name}</td>
                <td className="px-4 py-3 text-gray-300">{org.nameHi}</td>
                <td className="px-4 py-3 text-gray-300 font-mono text-xs">{org.upiAddress || "—"}</td>
                <td className="px-4 py-3 text-gray-300">{org.bankName || "—"}</td>
                <td className="px-4 py-3">
                  {org.qrCodeUrl ? (
                    <img src={org.qrCodeUrl} alt="QR" className="h-10 w-10 rounded bg-white p-0.5" />
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-300">{org.priority}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(org)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      org.active ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
                    }`}
                  >
                    {org.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(org)} className="rounded p-1 hover:bg-gray-600" title="Edit">
                      <IoCreateOutline className="h-4 w-4 text-gray-300" />
                    </button>
                    <button onClick={() => handleDelete(org.id)} className="rounded p-1 hover:bg-red-900/50" title="Delete">
                      <IoTrashOutline className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No organizations added yet. Click &quot;Add Organization&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-gray-800 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {editing ? "Edit Organization" : "Add Organization"}
              </h2>
              <button onClick={() => setShowModal(false)} className="rounded p-1 hover:bg-gray-700">
                <IoCloseOutline className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Name (English)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Name (Hindi)" value={form.nameHi} onChange={(v) => setForm({ ...form, nameHi: v })} />
              <Field label="Description (English)" value={form.description} onChange={(v) => setForm({ ...form, description: v })} multiline />
              <Field label="Description (Hindi)" value={form.descriptionHi} onChange={(v) => setForm({ ...form, descriptionHi: v })} multiline />
              <Field label="QR Code Image URL" value={form.qrCodeUrl} onChange={(v) => setForm({ ...form, qrCodeUrl: v })} colSpan2 />
              <Field label="UPI Address" value={form.upiAddress} onChange={(v) => setForm({ ...form, upiAddress: v })} />
              <Field label="Account Name" value={form.accountName} onChange={(v) => setForm({ ...form, accountName: v })} />
              <Field label="Account Number" value={form.accountNumber} onChange={(v) => setForm({ ...form, accountNumber: v })} />
              <Field label="IFSC Code" value={form.ifscCode} onChange={(v) => setForm({ ...form, ifscCode: v })} />
              <Field label="Bank Name" value={form.bankName} onChange={(v) => setForm({ ...form, bankName: v })} />
              <div>
                <label className="mb-1 block text-xs text-gray-400">Priority</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="rounded"
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-saffron px-6 py-2 text-sm font-semibold text-white hover:bg-saffron-hover disabled:opacity-50">
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  colSpan2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  colSpan2?: boolean;
}) {
  return (
    <div className={colSpan2 ? "col-span-2" : ""}>
      <label className="mb-1 block text-xs text-gray-400">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
        />
      )}
    </div>
  );
}
