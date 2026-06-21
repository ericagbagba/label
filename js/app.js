// ════════════════════════════════════════════════════════════
// app.js — Orchestrateur principal : bascule entre écrans selon l'état de connexion
// ════════════════════════════════════════════════════════════
import { setOnAuthReady, handleSubmit, handleLogout, toggleMode, checkFirstLaunch } from './auth.js';
import { initAgencies, setOnOpenAgency, createAgency } from './agences.js';
import { initUsers } from './users.js';
import { roleLabel, canManageUsers } from './roles.js';

// Expose functions needed by inline onclick= handlers in index.html
window.handleSubmit = handleSubmit;
window.handleLogout = handleLogout;
window.toggleMode = toggleMode;

window.openNewAgencyModal = function() {
  document.getElementById('newAgencyName').value = '';
  document.getElementById('agencyModalError').style.display = 'none';
  document.getElementById('agencyModal').classList.add('show');
  setTimeout(() => document.getElementById('newAgencyName').focus(), 150);
};
window.closeAgencyModal = function() {
  document.getElementById('agencyModal').classList.remove('show');
};
window.submitNewAgency = async function() {
  const name = document.getElementById('newAgencyName').value;
  const errEl = document.getElementById('agencyModalError');
  const btn = document.getElementById('agencyModalSubmit');
  errEl.style.display = 'none';
  btn.disabled = true;
  try {
    await createAgency(name);
    window.closeAgencyModal();
  } catch (e) {
    errEl.textContent = e.message || 'Une erreur est survenue.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
};

setOnOpenAgency((id, agency) => {
  // Placeholder for the next step: agency detail screen (bases list)
  alert('Agence : ' + agency.name + '\n\n(Écran détail / bases à venir dans la prochaine étape)');
});

// ── NAVIGATION : Agences ⇄ Comptes en attente ──
window.showAgenciesScreen = function() {
  document.getElementById('agenciesScreen').style.display = 'block';
  document.getElementById('pendingScreen').style.display = 'none';
  setNavActive('navAgenciesBtn');
};
window.showPendingScreen = function() {
  document.getElementById('agenciesScreen').style.display = 'none';
  document.getElementById('pendingScreen').style.display = 'block';
  setNavActive('navUsersBtn');
};
function setNavActive(activeId) {
  ['navAgenciesBtn','navUsersBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', id === activeId);
  });
}

setOnAuthReady(({ user, profile }) => {
  if (user && profile) {
    showAppShell(user, profile);
  } else if (user && !profile) {
    // Authenticated but no profile row yet (edge case) — show minimal shell
    showAppShell(user, { name: user.displayName || user.email, role: 'pending' });
  } else {
    showAuthScreen();
  }
});

function showAuthScreen() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appShell').style.display = 'none';
}

function showAppShell(user, profile) {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'block';
  document.getElementById('shellUserName').textContent = profile.name || user.email;
  document.getElementById('shellUserRole').textContent = roleLabel(profile.role);

  initAgencies(profile, user.uid);

  if (canManageUsers(profile.role)) {
    initUsers(profile.role);
  } else {
    document.getElementById('navUsersBtn').style.display = 'none';
  }

  window.showAgenciesScreen();
}

// Initial check on cold load (before any auth state event fires)
checkFirstLaunch();
