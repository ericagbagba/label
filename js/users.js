// ════════════════════════════════════════════════════════════
// users.js — Gestion des comptes : liste des comptes en attente,
// attribution de rôle + agence par l'admin/testeur
// ════════════════════════════════════════════════════════════
import { db } from './firebase-config.js';
import { ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { ROLES, roleLabel, roleRequiresAgency, ASSIGNABLE_ROLES, canManageUsers } from './roles.js';

let pendingCache = {};
let agenciesCache = {};
let currentUserRole = null;

export function initUsers(role) {
  currentUserRole = role;
  if (!canManageUsers(role)) return; // pas de droits → on n'écoute même pas
  listenPendingUsers();
  listenAgenciesForAssignment();
}

function listenPendingUsers() {
  const r = ref(db, 'users');
  onValue(r, snap => {
    const all = snap.val() || {};
    pendingCache = {};
    Object.entries(all).forEach(([uid, u]) => {
      if (u.role === ROLES.PENDING) pendingCache[uid] = u;
    });
    renderPendingBadge();
    renderPendingList();
  });
}

function listenAgenciesForAssignment() {
  const r = ref(db, 'agencies');
  onValue(r, snap => {
    agenciesCache = snap.val() || {};
    populateAgencySelect();
  });
}

function renderPendingBadge() {
  const count = Object.keys(pendingCache).length;
  const badge = document.getElementById('pendingBadge');
  const navBtn = document.getElementById('navUsersBtn');
  if (!badge || !navBtn) return;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'flex';
    navBtn.style.display = 'flex';
  } else {
    badge.style.display = 'none';
    navBtn.style.display = canManageUsers(currentUserRole) ? 'flex' : 'none';
  }
}

function renderPendingList() {
  const list = document.getElementById('pendingList');
  const empty = document.getElementById('pendingEmpty');
  if (!list) return;
  list.innerHTML = '';

  const entries = Object.entries(pendingCache);
  if (!entries.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  entries
    .sort((a,b) => (a[1].createdAt||0) - (b[1].createdAt||0))
    .forEach(([uid, u]) => {
      const card = document.createElement('div');
      card.className = 'pending-card';
      card.innerHTML = `
        <div class="pending-card-avatar">${initials(u.name)}</div>
        <div class="pending-card-body">
          <div class="pending-card-name">${escapeHtml(u.name)}</div>
          <div class="pending-card-email">${escapeHtml(u.email)}</div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      `;
      card.onclick = () => openAssignModal(uid, u);
      list.appendChild(card);
    });
}

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0,2).map(w => w[0].toUpperCase()).join('');
}
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

// ── ASSIGN MODAL ──
let activeUid = null;
let activeRoleChoice = null;

function openAssignModal(uid, u) {
  activeUid = uid;
  activeRoleChoice = null;
  document.getElementById('assignName').textContent = u.name;
  document.getElementById('assignEmail').textContent = u.email;
  renderRoleOptions();
  document.getElementById('assignAgencyField').style.display = 'none';
  document.getElementById('assignAgencySelect').value = '';
  document.getElementById('assignError').style.display = 'none';
  document.getElementById('assignModal').classList.add('show');
}
window.openAssignModal = openAssignModal;

window.closeAssignModal = function() {
  document.getElementById('assignModal').classList.remove('show');
};

function renderRoleOptions() {
  const wrap = document.getElementById('roleOptions');
  wrap.innerHTML = '';
  ASSIGNABLE_ROLES.forEach(role => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'role-chip';
    chip.textContent = roleLabel(role);
    chip.onclick = () => selectRole(role, chip);
    wrap.appendChild(chip);
  });
}

function selectRole(role, chipEl) {
  activeRoleChoice = role;
  document.querySelectorAll('.role-chip').forEach(c => c.classList.remove('selected'));
  chipEl.classList.add('selected');
  const needsAgency = roleRequiresAgency(role);
  document.getElementById('assignAgencyField').style.display = needsAgency ? 'block' : 'none';
}

function populateAgencySelect() {
  const sel = document.getElementById('assignAgencySelect');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Choisir une agence…</option>';
  Object.entries(agenciesCache)
    .sort((a,b) => (a[1].name||'').localeCompare(b[1].name||''))
    .forEach(([id, a]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = a.name;
      sel.appendChild(opt);
    });
  sel.value = current;
}

window.submitAssignRole = async function() {
  const errEl = document.getElementById('assignError');
  errEl.style.display = 'none';

  if (!activeRoleChoice) {
    errEl.textContent = 'Choisissez un rôle.';
    errEl.style.display = 'block';
    return;
  }
  const needsAgency = roleRequiresAgency(activeRoleChoice);
  const agencyId = document.getElementById('assignAgencySelect').value;
  if (needsAgency && !agencyId) {
    errEl.textContent = 'Choisissez une agence pour ce rôle.';
    errEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('assignSubmitBtn');
  btn.disabled = true;
  try {
    await update(ref(db, 'users/' + activeUid), {
      role: activeRoleChoice,
      agencyId: needsAgency ? agencyId : null
    });
    window.closeAssignModal();
  } catch (e) {
    errEl.textContent = "Erreur lors de l'attribution. Réessayez.";
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
};
