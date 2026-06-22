// ════════════════════════════════════════════════════════════
// app.js — Orchestrateur principal BIT
// ════════════════════════════════════════════════════════════
import { setOnAuthReady, handleSubmit, handleLogout, toggleMode, checkFirstLaunch } from './auth.js';
import { initAgencies, setOnOpenAgency, createAgency } from './agences.js';
import { initBases, setOnOpenBase, createBase } from './bases.js';
import { initClients, openClientForm, closeClientForm } from './clients.js';
import { initUsers } from './users.js';
import { roleLabel, canManageUsers } from './roles.js';

// ── Expose to HTML onclick handlers ──
window.handleSubmit  = handleSubmit;
window.handleLogout  = handleLogout;
window.toggleMode    = toggleMode;

// ── Current session ──
let currentUser    = null;
let currentProfile = null;

// ════════════════════════════════════
// NAVIGATION : screen stack
// ════════════════════════════════════
const SCREENS = ['agenciesScreen','basesScreen','clientsScreen','pendingScreen'];

function showOnly(id) {
  SCREENS.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = s===id ? 'block' : 'none';
  });
  // update bottom nav
  document.getElementById('navAgenciesBtn')?.classList.toggle('active', id==='agenciesScreen');
  document.getElementById('navUsersBtn')?.classList.toggle('active',    id==='pendingScreen');
}

window.showAgenciesScreen = () => showOnly('agenciesScreen');
window.showPendingScreen  = () => showOnly('pendingScreen');

function setNavActive(id) {
  ['navAgenciesBtn','navUsersBtn'].forEach(b => {
    const el=document.getElementById(b);
    if(el) el.classList.toggle('active', b===id);
  });
}

// ════════════════════════════════════
// AGENCES
// ════════════════════════════════════
window.openNewAgencyModal = () => {
  document.getElementById('newAgencyName').value = '';
  document.getElementById('agencyModalError').style.display = 'none';
  document.getElementById('agencyModal').classList.add('show');
  setTimeout(()=>document.getElementById('newAgencyName').focus(), 150);
};
window.closeAgencyModal = () => document.getElementById('agencyModal').classList.remove('show');
window.submitNewAgency = async () => {
  const name = document.getElementById('newAgencyName').value;
  const errEl = document.getElementById('agencyModalError');
  const btn   = document.getElementById('agencyModalSubmit');
  errEl.style.display = 'none'; btn.disabled = true;
  try   { await createAgency(name); window.closeAgencyModal(); }
  catch (e) { errEl.textContent = e.message||'Erreur.'; errEl.style.display='block'; }
  finally   { btn.disabled = false; }
};

setOnOpenAgency((agencyId, agency) => {
  initBases(agencyId, agency.name, currentProfile.role, currentUser.uid);
  showOnly('basesScreen');
  setNavActive(null);
});

// ════════════════════════════════════
// BASES
// ════════════════════════════════════
window.openNewBaseModal = () => {
  ['newBaseName','newBaseIP','newBaseRules'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('baseModalError').style.display = 'none';
  document.getElementById('baseModal').classList.add('show');
  setTimeout(()=>document.getElementById('newBaseName').focus(), 150);
};
window.closeBaseModal = () => document.getElementById('baseModal').classList.remove('show');
window.submitNewBase = async () => {
  const name  = document.getElementById('newBaseName').value;
  const ip    = document.getElementById('newBaseIP').value;
  const rules = document.getElementById('newBaseRules').value||'+1';
  const errEl = document.getElementById('baseModalError');
  const btn   = document.getElementById('baseModalSubmit');
  errEl.style.display = 'none'; btn.disabled = true;
  try   { await createBase(name, ip, rules); window.closeBaseModal(); }
  catch (e) { errEl.textContent = e.message||'Erreur.'; errEl.style.display='block'; }
  finally   { btn.disabled = false; }
};
window.backToAgencies = () => showOnly('agenciesScreen');

setOnOpenBase((baseId, base, agencyId, agencyName) => {
  initClients(agencyId, agencyName, baseId, base, currentProfile.role,
    currentProfile.name || currentUser.email);
  showOnly('clientsScreen');
  setNavActive(null);
});

// ════════════════════════════════════
// CLIENTS
// ════════════════════════════════════
window.openNewClientModal = openClientForm;
window.backToBases = () => {
  closeClientForm();
  showOnly('basesScreen');
};

// ════════════════════════════════════
// USERS / PENDING
// ════════════════════════════════════
window.showPendingScreen = () => {
  showOnly('pendingScreen');
  setNavActive('navUsersBtn');
};

// ════════════════════════════════════
// AUTH STATE
// ════════════════════════════════════
setOnAuthReady(({ user, profile }) => {
  if (user && profile) {
    currentUser    = user;
    currentProfile = profile;
    showAppShell(user, profile);
  } else if (user && !profile) {
    currentUser    = user;
    currentProfile = { name: user.displayName||user.email, role:'pending' };
    showAppShell(user, currentProfile);
  } else {
    showAuthScreen();
  }
});

function showAuthScreen() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appShell').style.display   = 'none';
}

function showAppShell(user, profile) {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appShell').style.display   = 'block';
  document.getElementById('shellUserName').textContent = profile.name || user.email;
  document.getElementById('shellUserRole').textContent = roleLabel(profile.role);

  initAgencies(profile, user.uid);

  if (canManageUsers(profile.role)) {
    initUsers(profile.role);
    const nb = document.getElementById('navUsersBtn');
    if (nb) nb.style.display = 'flex';
  } else {
    const nb = document.getElementById('navUsersBtn');
    if (nb) nb.style.display = 'none';
  }

  showOnly('agenciesScreen');
}

checkFirstLaunch();
