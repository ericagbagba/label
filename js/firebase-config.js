// ════════════════════════════════════════════════════════════
// firebase-config.js — Initialisation Firebase, partagée par tous les modules
// ════════════════════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAdWbnvXJghcW12CaoDzaQnu9srbKNgHZc",
  authDomain: "label-79be9.firebaseapp.com",
  databaseURL: "https://label-79be9-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "label-79be9",
  storageBucket: "label-79be9.firebasestorage.app",
  messagingSenderId: "932916283400",
  appId: "1:932916283400:web:e24aa87bab3113d8e1a9bd"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getDatabase(app);
