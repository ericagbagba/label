// ════════════════════════════════════════════════════════════
// auth.js — Connexion, création de compte, état de session
// ════════════════════════════════════════════════════════════
import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { ref, get, set } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { ROLES } from './roles.js';

let mode = 'login'; // 'login' | 'signup-admin'
let isFirstAdminSetup = false;

// Callback registry, set by app.js
let onAuthReady = () => {};
export function setOnAuthReady(fn) { onAuthReady = fn; }

export async function checkFirstLaunch() {
  try {
    const snap = await get(ref(db, 'meta/adminCreated'));
    isFirstAdminSetup = !snap.exists();
  } catch (e) {
    isFirstAdminSetup = false;
  }
  applyMode();
}

export function getMode() { return mode; }
export function isFirstLaunch() { return isFirstAdminSetup; }

export function toggleMode() {
  mode = (mode === 'login') ? 'signup-admin' : 'login';
  applyMode();
  hideBanner();
}

function applyMode() {
  const eyebrow  = document.getElementById('authEyebrow');
  const title    = document.getElementById('authTitle');
  const sub      = document.getElementById('authSub');
  const nameF    = document.getElementById('nameField');
  const label    = document.getElementById('submitLabel');
  const switchEl = document.getElementById('authSwitch');
  const badge    = document.getElementById('setupBadge');

  if (isFirstAdminSetup) {
    mode = 'signup-admin';
    badge.style.display = 'inline-flex';
    eyebrow.textContent = 'Initialisation';
    title.textContent = 'Créez le compte administrateur';
    sub.textContent = "Aucun administrateur n'existe encore. Ce compte aura tous les droits sur BIT.";
    nameF.style.display = 'block';
    label.textContent = 'Créer le compte administrateur';
    switchEl.style.display = 'none';
  } else if (mode === 'signup-admin') {
    badge.style.display = 'none';
    eyebrow.textContent = 'Création de compte';
    title.textContent = 'Nouvel accès';
    sub.textContent = "Réservé aux comptes créés par un administrateur.";
    nameF.style.display = 'block';
    label.textContent = 'Créer le compte';
    switchEl.style.display = 'block';
  } else {
    badge.style.display = 'none';
    eyebrow.textContent = 'Connexion';
    title.textContent = 'Bon retour';
    sub.textContent = 'Connectez-vous pour accéder à votre espace.';
    nameF.style.display = 'none';
    label.textContent = 'Se connecter';
    switchEl.style.display = 'block';
  }
}

function showBanner(msg, type='error') {
  const b = document.getElementById('authBanner');
  b.textContent = msg;
  b.className = 'auth-banner show ' + type;
}
function hideBanner() {
  document.getElementById('authBanner').className = 'auth-banner';
}
function setFieldError(id, errId, show) {
  document.getElementById(id).classList.toggle('error', show);
  document.getElementById(errId).style.display = show ? 'block' : 'none';
}
function setLoading(loading) {
  const btn = document.getElementById('submitBtn');
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
}

export async function handleSubmit() {
  hideBanner();
  const email = document.getElementById('fEmail').value.trim();
  const pass  = document.getElementById('fPassword').value;
  const name  = document.getElementById('fName').value.trim();

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passOk  = pass.length >= 6;
  setFieldError('fEmail', 'emailErr', !emailOk);
  setFieldError('fPassword', 'passErr', !passOk);
  if (!emailOk || !passOk) return;

  if ((mode === 'signup-admin' || isFirstAdminSetup) && !name) {
    showBanner('Entrez votre nom complet.', 'error');
    return;
  }

  setLoading(true);
  try {
    if (mode === 'login' && !isFirstAdminSetup) {
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);

      // IMPORTANT : createUserWithEmailAndPassword connecte l'utilisateur
      // immédiatement, ce qui déclenche onAuthStateChanged EN PARALLÈLE.
      // On doit donc écrire le profil et le drapeau admin dans la base
      // AVANT que cet événement ne soit traité, sinon la lecture du profil
      // arrive trop tôt et trouve la base encore vide.
      //
      // ⚠️ Le tout premier compte créé reçoit le rôle TESTEUR (accès total,
      // identique à admin) le temps du développement — à remplacer par
      // ROLES.ADMIN strict avant la mise en production réelle.
      const role = isFirstAdminSetup ? ROLES.TESTEUR : ROLES.PENDING;

      await updateProfile(cred.user, { displayName: name });
      await set(ref(db, 'users/' + cred.user.uid), {
        name, email, role,
        agencyId: null,
        createdAt: Date.now()
      });

      if (isFirstAdminSetup) {
        await set(ref(db, 'meta/adminCreated'), true);
      }
    }
  } catch (err) {
    setLoading(false);
    showBanner(translateError(err.code));
  }
}

function translateError(code) {
  const map = {
    'auth/invalid-email': "Adresse e-mail invalide.",
    'auth/user-not-found': "Aucun compte ne correspond à cet e-mail.",
    'auth/wrong-password': "Mot de passe incorrect.",
    'auth/invalid-credential': "E-mail ou mot de passe incorrect.",
    'auth/email-already-in-use': "Un compte existe déjà avec cet e-mail.",
    'auth/weak-password': "Mot de passe trop faible (6 caractères minimum).",
    'auth/too-many-requests': "Trop de tentatives. Réessayez dans quelques minutes.",
    'auth/network-request-failed': "Pas de connexion réseau."
  };
  return map[code] || "Une erreur est survenue. Réessayez.";
}

export async function handleLogout() {
  await signOut(auth);
}

// ── Fetch the current user's profile (role, agencyId, name) from the database ──
// Réessaie brièvement si le profil n'est pas encore visible : juste après une
// création de compte, onAuthStateChanged peut se déclencher avant que l'écriture
// du profil dans la base ne soit complètement propagée.
export async function fetchUserProfile(uid, attempt = 1) {
  try {
    const snap = await get(ref(db, 'users/' + uid));
    if (snap.exists()) return snap.val();
    if (attempt < 5) {
      await new Promise(r => setTimeout(r, 300));
      return fetchUserProfile(uid, attempt + 1);
    }
    return null;
  } catch (e) {
    return null;
  }
}

// ── Global auth state listener ──
onAuthStateChanged(auth, async (user) => {
  setLoading(false);
  if (user) {
    const profile = await fetchUserProfile(user.uid);
    onAuthReady({ user, profile });
  } else {
    onAuthReady({ user: null, profile: null });
    await checkFirstLaunch();
  }
});
