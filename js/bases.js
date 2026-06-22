// ════════════════════════════════════════════════════════════
// bases.js — Création et gestion des bases d'une agence
// ════════════════════════════════════════════════════════════
import { db } from './firebase-config.js';
import { ref, push, set, onValue, update } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { ROLES, isFullAccess } from './roles.js';

let currentAgencyId   = null;
let currentAgencyName = null;
let currentUserRole   = null;
let currentUserUid    = null;
let basesCache        = {};
let onOpenBase        = () => {};

export function setOnOpenBase(fn) { onOpenBase = fn; }

export function initBases(agencyId, agencyName, userRole, uid) {
  currentAgencyId   = agencyId;
  currentAgencyName = agencyName;
  currentUserRole   = userRole;
  currentUserUid    = uid;
  basesCache        = {};

  // Titre de l'écran
  document.getElementById('basesAgencyTitle').textContent = agencyName;

  // Bouton "Nouvelle base" : Admin, Testeur, Superviseur, Chef d'agence
  const canCreate = isFullAccess(userRole) ||
    [ROLES.SUPERVISEUR, ROLES.CHEF_AGENCE].includes(userRole);
  document.getElementById('btnNewBase').style.display = canCreate ? 'flex' : 'none';

  listenBases();
}

function listenBases() {
  const r = ref(db, 'agencies/' + currentAgencyId + '/bases');
  onValue(r, snap => {
    basesCache = snap.val() || {};
    renderBaseList();
  });
}

function renderBaseList() {
  const list  = document.getElementById('baseList');
  const empty = document.getElementById('baseEmpty');
  list.innerHTML = '';

  const entries = Object.entries(basesCache).sort((a,b) =>
    (a[1].name||'').localeCompare(b[1].name||'')
  );

  if (!entries.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  entries.forEach(([id, base]) => {
    const clientCount = base.clients ? Object.keys(base.clients).length : 0;
    const card = document.createElement('div');
    card.className = 'base-card';
    card.innerHTML = `
      <div class="base-card-icon">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
      </div>
      <div class="base-card-body">
        <div class="base-card-name">${esc(base.name)}</div>
        <div class="base-card-meta">${esc(base.ip||'—')} · ${clientCount} client${clientCount!==1?'s':''}</div>
      </div>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
    `;
    card.onclick = () => onOpenBase(id, base, currentAgencyId, currentAgencyName);
    list.appendChild(card);
  });
}

// ── CREATE BASE ──
export async function createBase(name, ip, rules) {
  if (!name.trim()) throw new Error('Le nom de la base est requis.');
  if (!validateIP(ip))  throw new Error('Adresse IP invalide. Format : X.X.X.0');
  const r = ref(db, 'agencies/' + currentAgencyId + '/bases');
  const newRef = push(r);
  await set(newRef, {
    name: name.trim(),
    ip:   ip.trim(),
    rules: rules.trim() || '+1',
    agencyId: currentAgencyId,
    createdBy: currentUserUid,
    createdAt: Date.now()
  });
  return newRef.key;
}

function validateIP(s) {
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test((s||'').trim())) return false;
  const p = s.trim().split('.').map(Number);
  return p.length === 4 && p.every(x => x >= 0 && x <= 255) && p[3] === 0;
}

export function getBase(id) { return basesCache[id] || null; }
export function getCurrentAgencyId() { return currentAgencyId; }

function esc(s) {
  const d = document.createElement('div'); d.textContent = s||''; return d.innerHTML;
}
