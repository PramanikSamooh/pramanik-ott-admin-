import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC8V-ouqsgBz7Lmz1tmFy2C2r9H2LUyld8",
  authDomain: "pramanik-ott.firebaseapp.com",
  projectId: "pramanik-ott",
  storageBucket: "pramanik-ott.firebasestorage.app",
  messagingSenderId: "721441685803",
  appId: "pramanik-ott",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
