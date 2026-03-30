"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import {
  IoAddOutline,
  IoCreateOutline,
  IoTrashOutline,
  IoCloseOutline,
  IoPeopleOutline,
  IoCalendarOutline,
  IoGridOutline,
} from "react-icons/io5";

interface Teacher {
  id: string;
  name: string;
  nameHi: string;
  photoUrl: string;
  language: string;
  bio: string;
  active: boolean;
}

interface PClass {
  id: string;
  title: string;
  titleHi: string;
  teacherId: string;
  language: string;
  dayOfWeek: number | number[];
  time: string;
  timezone: string;
  youtubeLink: string;
  description: string;
  recurring: boolean;
  active: boolean;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LANGUAGES = ["Hindi", "English", "Marathi", "Gujarati"];
const TIMEZONES = ["IST", "EST", "CST", "PST", "GMT", "CET"];

const emptyTeacher = { name: "", nameHi: "", photoUrl: "", language: "Hindi", bio: "", active: true };
const emptyClass = { title: "", titleHi: "", teacherId: "", language: "Hindi", dayOfWeek: [1] as number[], time: "08:00", timezone: "IST", youtubeLink: "", description: "", recurring: true, active: true };

type Tab = "teachers" | "classes" | "schedule";

export default function PathshalaPage() {
  const [tab, setTab] = useState<Tab>("teachers");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<PClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState<"teacher" | "class" | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingClass, setEditingClass] = useState<PClass | null>(null);
  const [tForm, setTForm] = useState(emptyTeacher);
  const [cForm, setCForm] = useState(emptyClass);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function loadAll() {
    try {
      const [tSnap, cSnap] = await Promise.all([
        getDocs(collection(db, "pathshala", "teachers", "items")),
        getDocs(collection(db, "pathshala", "classes", "items")),
      ]);
      setTeachers(tSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Teacher)));
      setClasses(cSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PClass)));
    } catch {
      toast("Failed to load pathshala data", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  // Teacher CRUD
  function openTeacherCreate() {
    setEditingTeacher(null);
    setTForm(emptyTeacher);
    setShowModal("teacher");
  }
  function openTeacherEdit(t: Teacher) {
    setEditingTeacher(t);
    setTForm({ name: t.name, nameHi: t.nameHi, photoUrl: t.photoUrl, language: t.language, bio: t.bio, active: t.active });
    setShowModal("teacher");
  }
  async function saveTeacher() {
    setSaving(true);
    try {
      const ref = collection(db, "pathshala", "teachers", "items");
      if (editingTeacher) {
        await updateDoc(doc(db, "pathshala", "teachers", "items", editingTeacher.id), { ...tForm });
        toast("Teacher updated");
      } else {
        await addDoc(ref, { ...tForm, createdAt: Timestamp.now() });
        toast("Teacher added");
      }
      setShowModal(null);
      loadAll();
    } catch { toast("Failed to save teacher", "error"); }
    finally { setSaving(false); }
  }
  async function deleteTeacher(id: string) {
    if (!confirm("Delete this teacher?")) return;
    try {
      await deleteDoc(doc(db, "pathshala", "teachers", "items", id));
      toast("Teacher deleted");
      setTeachers((p) => p.filter((t) => t.id !== id));
    } catch { toast("Failed to delete", "error"); }
  }

  // Class CRUD
  function openClassCreate() {
    setEditingClass(null);
    setCForm(emptyClass);
    setShowModal("class");
  }
  function openClassEdit(c: PClass) {
    setEditingClass(c);
    setCForm({ title: c.title, titleHi: c.titleHi, teacherId: c.teacherId, language: c.language, dayOfWeek: c.dayOfWeek, time: c.time, timezone: c.timezone, youtubeLink: c.youtubeLink, description: c.description, recurring: c.recurring, active: c.active });
    setShowModal("class");
  }
  async function saveClass() {
    setSaving(true);
    try {
      const ref = collection(db, "pathshala", "classes", "items");
      if (editingClass) {
        await updateDoc(doc(db, "pathshala", "classes", "items", editingClass.id), { ...cForm });
        toast("Class updated");
      } else {
        await addDoc(ref, { ...cForm, createdAt: Timestamp.now() });
        toast("Class scheduled");
      }
      setShowModal(null);
      loadAll();
    } catch { toast("Failed to save class", "error"); }
    finally { setSaving(false); }
  }
  async function deleteClass(id: string) {
    if (!confirm("Delete this class?")) return;
    try {
      await deleteDoc(doc(db, "pathshala", "classes", "items", id));
      toast("Class deleted");
      setClasses((p) => p.filter((c) => c.id !== id));
    } catch { toast("Failed to delete", "error"); }
  }

  function getTeacherName(id: string) {
    return teachers.find((t) => t.id === id)?.name || "Unknown";
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-saffron border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pathshala</h1>
        <p className="mt-1 text-sm text-gray-400">Manage teachers, classes, and schedule</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-surface p-1 w-fit">
        {([["teachers", IoPeopleOutline, "Teachers"], ["classes", IoCalendarOutline, "Classes"], ["schedule", IoGridOutline, "Schedule"]] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === key ? "bg-saffron text-white" : "text-gray-400 hover:text-foreground"}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Teachers Tab */}
      {tab === "teachers" && (
        <>
          <div className="flex justify-end">
            <button onClick={openTeacherCreate} className="flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover">
              <IoAddOutline className="h-4 w-4" /> Add Teacher
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.length === 0 ? (
              <div className="col-span-full rounded-xl border border-border bg-surface p-12 text-center text-gray-500">No teachers added yet.</div>
            ) : teachers.map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {t.photoUrl ? (
                      <img src={t.photoUrl} alt={t.name} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-saffron/20 text-saffron font-bold">{t.name.charAt(0)}</div>
                    )}
                    <div>
                      <div className="font-medium">{t.name}</div>
                      {t.nameHi && <div className="text-xs text-gray-400">{t.nameHi}</div>}
                      <div className="text-xs text-gray-500">{t.language}</div>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${t.active ? "text-green-400" : "text-gray-500"}`}>
                    {t.active ? "Active" : "Inactive"}
                  </span>
                </div>
                {t.bio && <p className="mt-2 text-xs text-gray-400 line-clamp-2">{t.bio}</p>}
                <div className="mt-3 flex gap-1">
                  <button onClick={() => openTeacherEdit(t)} className="rounded p-1.5 text-gray-400 hover:bg-surface-hover hover:text-saffron"><IoCreateOutline className="h-4 w-4" /></button>
                  <button onClick={() => deleteTeacher(t.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-400/10 hover:text-red-400"><IoTrashOutline className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Classes Tab */}
      {tab === "classes" && (
        <>
          <div className="flex justify-end">
            <button onClick={openClassCreate} className="flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover">
              <IoAddOutline className="h-4 w-4" /> Schedule Class
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Teacher</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Day / Time</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Language</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {classes.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No classes scheduled.</td></tr>
                ) : classes.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-surface">
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.title}</div>
                      {c.titleHi && <div className="text-xs text-gray-400">{c.titleHi}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{getTeacherName(c.teacherId)}</td>
                    <td className="px-4 py-3 text-gray-300">{Array.isArray(c.dayOfWeek) ? c.dayOfWeek.map((d) => DAYS[d]).join(", ") : DAYS[c.dayOfWeek]} {c.time} {c.timezone}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-surface-hover px-2.5 py-0.5 text-xs">{c.language}</span></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${c.active ? "text-green-400" : "text-gray-500"}`}>{c.active ? "Active" : "Inactive"}</span>
                      {c.recurring && <span className="ml-2 text-xs text-gray-500">Recurring</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openClassEdit(c)} className="rounded p-1.5 text-gray-400 hover:bg-surface-hover hover:text-saffron"><IoCreateOutline className="h-4 w-4" /></button>
                        <button onClick={() => deleteClass(c.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-400/10 hover:text-red-400"><IoTrashOutline className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Schedule View */}
      {tab === "schedule" && (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[700px]">
            {DAYS.map((day, di) => (
              <div key={day} className="rounded-xl border border-border bg-surface">
                <div className="border-b border-border px-3 py-2 text-center text-xs font-semibold text-gray-400">{day}</div>
                <div className="space-y-2 p-2 min-h-[120px]">
                  {classes.filter((c) => (Array.isArray(c.dayOfWeek) ? c.dayOfWeek.includes(di) : c.dayOfWeek === di) && c.active).map((c) => (
                    <div key={c.id} className="rounded-lg bg-saffron/10 border border-saffron/20 p-2">
                      <div className="text-xs font-medium text-saffron">{c.time} {c.timezone}</div>
                      <div className="text-xs font-medium text-foreground mt-0.5">{c.title}</div>
                      <div className="text-xs text-gray-400">{getTeacherName(c.teacherId)}</div>
                      <div className="text-xs text-gray-500">{c.language}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teacher Modal */}
      {showModal === "teacher" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingTeacher ? "Edit" : "Add"} Teacher</h2>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-foreground"><IoCloseOutline className="h-6 w-6" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Name (English)</label>
                  <input value={tForm.name} onChange={(e) => setTForm({ ...tForm, name: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Name (Hindi)</label>
                  <input value={tForm.nameHi} onChange={(e) => setTForm({ ...tForm, nameHi: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Photo URL</label>
                <input value={tForm.photoUrl} onChange={(e) => setTForm({ ...tForm, photoUrl: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" placeholder="https://..." />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Language</label>
                <select value={tForm.language} onChange={(e) => setTForm({ ...tForm, language: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron">
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Bio</label>
                <textarea value={tForm.bio} onChange={(e) => setTForm({ ...tForm, bio: e.target.value })} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron resize-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={tForm.active} onChange={(e) => setTForm({ ...tForm, active: e.target.checked })} className="accent-saffron" />
                <label className="text-sm text-gray-300">Active</label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowModal(null)} className="rounded-lg border border-border px-4 py-2 text-sm text-gray-400 hover:text-foreground">Cancel</button>
              <button onClick={saveTeacher} disabled={saving} className="rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Class Modal */}
      {showModal === "class" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingClass ? "Edit" : "Schedule"} Class</h2>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-foreground"><IoCloseOutline className="h-6 w-6" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Title (English)</label>
                  <input value={cForm.title} onChange={(e) => setCForm({ ...cForm, title: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Title (Hindi)</label>
                  <input value={cForm.titleHi} onChange={(e) => setCForm({ ...cForm, titleHi: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Teacher</label>
                  <select value={cForm.teacherId} onChange={(e) => setCForm({ ...cForm, teacherId: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron">
                    <option value="">Select Teacher</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Language</label>
                  <select value={cForm.language} onChange={(e) => setCForm({ ...cForm, language: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron">
                    {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Days of Week</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS.map((d, i) => {
                      const selected = Array.isArray(cForm.dayOfWeek) ? cForm.dayOfWeek.includes(i) : cForm.dayOfWeek === i;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            const current = Array.isArray(cForm.dayOfWeek) ? cForm.dayOfWeek : [cForm.dayOfWeek];
                            const updated = selected ? current.filter((x) => x !== i) : [...current, i].sort();
                            setCForm({ ...cForm, dayOfWeek: updated.length > 0 ? updated : [i] });
                          }}
                          className={`rounded-md border px-2 py-1 text-xs ${selected ? "border-saffron bg-saffron/15 text-saffron" : "border-border text-gray-400"}`}
                        >
                          {d.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Time</label>
                  <input type="time" value={cForm.time} onChange={(e) => setCForm({ ...cForm, time: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Timezone</label>
                  <select value={cForm.timezone} onChange={(e) => setCForm({ ...cForm, timezone: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron">
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">YouTube Live Link</label>
                <input value={cForm.youtubeLink} onChange={(e) => setCForm({ ...cForm, youtubeLink: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron" placeholder="https://youtube.com/live/..." />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Description</label>
                <textarea value={cForm.description} onChange={(e) => setCForm({ ...cForm, description: e.target.value })} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron resize-none" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={cForm.recurring} onChange={(e) => setCForm({ ...cForm, recurring: e.target.checked })} className="accent-saffron" />
                  <label className="text-sm text-gray-300">Recurring</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={cForm.active} onChange={(e) => setCForm({ ...cForm, active: e.target.checked })} className="accent-saffron" />
                  <label className="text-sm text-gray-300">Active</label>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowModal(null)} className="rounded-lg border border-border px-4 py-2 text-sm text-gray-400 hover:text-foreground">Cancel</button>
              <button onClick={saveClass} disabled={saving} className="rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-hover disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
