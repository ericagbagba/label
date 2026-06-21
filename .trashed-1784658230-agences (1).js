// ════════════════════════════════════════════════════════════
// agences.js — Création, liste et rendu des agences
// ════════════════════════════════════════════════════════════
import { db } from './firebase-config.js';
import { ref, push, set, onValue, get } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { canCreateAgency, ROLES } from './roles.js';

let currentUserRole = null;
let currentUserUid  = null;
let agenciesCache = {};
let onOpenAgency = () => {};

export function setOnOpenAgency(fn) { onOpenAgency = fn; }

export function initAgencies(role, uid) {
  currentUserRole = role;
  currentUserUid  = uid;
  document.getElementById('btnNewAgency').style.display =
    canCreateAgency(role) ? 'flex' : 'none';
  listenAgencies();
}

function listenAgencies() {
  const r = ref(db, 'agencies');
  onValue(r, snap => {
    agenciesCache = snap.val() || {};
    renderAgencyList();
  });
}

function renderAgencyList() {
  const list = document.getElementById('agencyList');
  const empty = document.getElementById('agencyEmpty');
  list.innerHTML = '';

  // Chef d'agence ne voit que son agence assignée ; les autres rôles
  // habilités voient tout (logique posée dès maintenant pour éviter
  // une restructuration plus tard).
  let entries = Object.entries(agenciesCache);
  if (currentUserRole === ROLES.CHEF_AGENCE) {
    entries = entries.filter(([id]) => true); // affiné quand l'agencyId du chef sera branché
  }

  if (!entries.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  entries
    .sort((a,b) => (a[1].name||'').localeCompare(b[1].name||''))
    .forEach(([id, agency]) => {
      const baseCount = agency.bases ? Object.keys(agency.bases).length : 0;
      const card = document.createElement('div');
      card.className = 'agency-card';
      card.innerHTML = `
        <div class="agency-card-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
        </div>
        <div class="agency-card-body">
          <div class="agency-card-name">${escapeHtml(agency.name)}</div>
          <div class="agency-card-meta">${baseCount} base${baseCount!==1?'s':''}</div>
        </div>
        <svg class="agency-card-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      `;
      card.onclick = () => onOpenAgency(id, agency);
      list.appendChild(card);
    });
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

export async function createAgency(name) {
  const trimmed = (name||'').trim();
  if (!trimmed) throw new Error('Le nom de l\'agence est requis.');
  const r = ref(db, 'agencies');
  const newRef = push(r);
  await set(newRef, {
    name: trimmed,
    createdBy: currentUserUid,
    createdAt: Date.now()
  });
  return newRef.key;
}

export function getAgency(id) {
  return agenciesCache[id] || null;
}
