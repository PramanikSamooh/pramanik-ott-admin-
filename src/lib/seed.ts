/**
 * Firestore Data Seeding Script
 *
 * Run this from a client-side page or a Node.js script to seed initial data.
 * Usage: Import and call seedFirestore() from any client component.
 *
 * Firestore Structure:
 *
 * /config/home         — { rows: [{id, type, label, labelHi, filter, priority, maxItems, visible}] }
 * /config/live         — { morningTime, eveningTime, channelId, manualOverride, forceVideoId }
 * /config/app          — { appVersion, maintenanceMode, minVersion }
 * /announcements/{id}  — { title, titleHi, type, imageUrl, actionUrl, priority, active, startDate, endDate, createdAt }
 * /pathshala/config    — { languages: ['hindi','english','marathi','gujarati'] }
 * /pathshala/teachers/items/{id} — { name, nameHi, photoUrl, language, bio, active }
 * /pathshala/classes/items/{id}  — { title, titleHi, teacherId, language, dayOfWeek, time, timezone, youtubeLink, description, recurring, active }
 * /shorts/{videoId}    — { videoId, title, thumbnailUrl, displayOrder, addedAt }
 * /categories/{slug}   — { slug, label, labelHi, icon, color, priority, visible }
 * /channels/{key}      — (already exists)
 * /videos/{id}         — (already exists)
 * /homeRows/{id}       — (already exists)
 * /live/status         — (already exists)
 */

import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function seedFirestore() {
  const now = Timestamp.now();

  // 1. Config: Home Layout
  await setDoc(doc(db, "config", "home"), {
    rows: [
      {
        id: "row_live",
        type: "live",
        label: "Live Now",
        labelHi: "अभी लाइव",
        filter: "",
        priority: 0,
        maxItems: 1,
        visible: true,
      },
      {
        id: "row_announcements",
        type: "announcement",
        label: "Announcements",
        labelHi: "सूचनाएं",
        filter: "",
        priority: 1,
        maxItems: 5,
        visible: true,
      },
      {
        id: "row_discourse",
        type: "category",
        label: "Latest Discourses",
        labelHi: "नवीनतम प्रवचन",
        filter: "discourse",
        priority: 2,
        maxItems: 10,
        visible: true,
      },
      {
        id: "row_shanka_clips",
        type: "category",
        label: "Shanka Samadhan Clips",
        labelHi: "शंका समाधान क्लिप्स",
        filter: "shanka-clips",
        priority: 3,
        maxItems: 10,
        visible: true,
      },
      {
        id: "row_bhawna",
        type: "category",
        label: "Bhawna Yog",
        labelHi: "भावना योग",
        filter: "bhawna-yog",
        priority: 4,
        maxItems: 10,
        visible: true,
      },
      {
        id: "row_swadhyay",
        type: "category",
        label: "Swadhyay",
        labelHi: "स्वाध्याय",
        filter: "swadhyay",
        priority: 5,
        maxItems: 10,
        visible: true,
      },
      {
        id: "row_kids",
        type: "category",
        label: "Kids",
        labelHi: "बच्चों के लिए",
        filter: "kids",
        priority: 6,
        maxItems: 10,
        visible: true,
      },
    ],
    updatedAt: now,
  });

  // 2. Config: Live
  await setDoc(doc(db, "config", "live"), {
    morningTime: "08:30",
    eveningTime: "18:20",
    channelId: "",
    manualOverride: false,
    forceLive: false,
    forceVideoId: "",
    updatedAt: now,
  });

  // 3. Config: App
  await setDoc(doc(db, "config", "app"), {
    appVersion: "1.0.0",
    minVersion: "1.0.0",
    maintenanceMode: false,
    maintenanceMessage: "",
    updatedAt: now,
  });

  // 4. Pathshala Config
  await setDoc(doc(db, "pathshala", "config"), {
    languages: ["hindi", "english", "marathi", "gujarati"],
  });

  // 5. Categories
  const categories = [
    { slug: "discourse", label: "Discourse", labelHi: "प्रवचन", icon: "IoBookOutline", color: "#E8730A", priority: 0 },
    { slug: "bhawna-yog", label: "Bhawna Yog", labelHi: "भावना योग", icon: "IoHeartOutline", color: "#C9932A", priority: 1 },
    { slug: "swadhyay", label: "Swadhyay", labelHi: "स्वाध्याय", icon: "IoSchoolOutline", color: "#3B82F6", priority: 2 },
    { slug: "shanka-clips", label: "Shanka Clips", labelHi: "शंका क्लिप्स", icon: "IoChatbubblesOutline", color: "#8B5CF6", priority: 3 },
    { slug: "shanka-full", label: "Shanka Full", labelHi: "शंका समाधान", icon: "IoChatboxOutline", color: "#6366F1", priority: 4 },
    { slug: "live", label: "Live", labelHi: "लाइव", icon: "IoRadioOutline", color: "#EF4444", priority: 5 },
    { slug: "kids", label: "Kids", labelHi: "बच्चों के लिए", icon: "IoHappyOutline", color: "#10B981", priority: 6 },
  ];

  for (const cat of categories) {
    await setDoc(doc(db, "categories", cat.slug), { ...cat, visible: true });
  }

  console.log("Firestore seeded successfully!");
  return true;
}
