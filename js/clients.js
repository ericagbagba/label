// ════════════════════════════════════════════════════════════
// clients.js — Enregistrement clients dans une base
// Reprend la logique complète de l'app terrain précédente :
// codes 1-66, SSID auto (BW+N), IP auto, adresse MAC, localisation
// ════════════════════════════════════════════════════════════
import { db, auth } from './firebase-config.js';
import { ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { ROLES, isFullAccess } from './roles.js';

// ── 66 codes fixes liés aux numéros ──
const CODES = {
   1:'A7K',    2:'X9LM',   3:'Q4ZTR',  4:'R2WXC',  5:'M7QAFJ',
   6:'T5K',    7:'V3LF',   8:'H9XCTR', 9:'J4MNB',  10:'C8TYQL',
  11:'N2Q',   12:'F7LPAR', 13:'D5XA',  14:'K9RVTQ',15:'W8QKL',
  16:'Y4TZPX',17:'G2N',   18:'L7XMRQ',19:'U5M',   20:'E9QFAT',
  21:'Z3KD',  22:'A6TWPX',23:'P2ZXQV',24:'N5Q',   25:'H7KFAL',
  26:'T9X',   27:'B4MRLW',28:'J8QWXT',29:'F5TZ',  30:'X7KDMQ',
  31:'M3RVTA',32:'D8KFLT',33:'A2X',   34:'R7MQTL',
  35:'P9LVXC',36:'H2KFMP',37:'T7XCQL',38:'B5M',   39:'V9LPQA',
  40:'J3QWFT',41:'X2KDPL',42:'C7MNQX',43:'M5R',   44:'D9QFLT',
  45:'L8XQTR',46:'U2M',   47:'Y7KPLA',48:'E4WQXT',49:'Z5MR',
  50:'A8T',
  51:'R3XQFA',52:'P7L',   53:'N9KDMX',54:'T2QWLP',55:'B7MRXT',
  56:'J9LPQA',57:'F3Q',   58:'X8TZRM',59:'M7QFLT',60:'D4X',
  61:'K87MNQP',62:'U9RVTA',63:'Y2K',  64:'G7XKPL',65:'Z2WKFA',
  66:'A9PXT'
};

const getSSID  = n => 'BW' + n;
function calcIP(base, rules, n) {
  const p = base.trim().split('.').map(Number);
  if (p.length!==4) return '—';
  const inc = parseInt((rules||'+1').replace('+',''))||1;
  const add = inc + n;
  let v3=p[3]+add, v2=p[2]+Math.floor(v3/256),
      v1=p[1]+Math.floor(v2/256), v0=p[0]+Math.floor(v1/256);
  return (v0%256)+'.'+(v1%256)+'.'+(v2%256)+'.'+(v3%256);
}

let state = {
  agencyId: null, agencyName: null,
  baseId: null,   baseName: null, baseIP: null, baseRules: null,
  userRole: null, userName: null,
  clients: {},
  selectedNum: null,
  step: 1
};

const DRAFT_KEY = 'client_draft_bit';

export function initClients(agencyId, agencyName, baseId, base, userRole, userName) {
  state = {
    agencyId, agencyName,
    baseId, baseName: base.name, baseIP: base.ip, baseRules: base.rules||'+1',
    userRole, userName,
    clients: {}, selectedNum: null, step: 1
  };

  document.getElementById('clientsBaseTitle').textContent = base.name;
  document.getElementById('clientsAgencyLabel').textContent = agencyName;

  // Only agents, techniciens, opérateurs, chefs d'agence, and full-access can register clients
  const canRegister = isFullAccess(userRole) ||
    [ROLES.CHEF_AGENCE, ROLES.OPERATEUR, ROLES.TECHNICIEN, ROLES.AGENT].includes(userRole);
  document.getElementById('btnNewClient').style.display = canRegister ? 'flex' : 'none';

  listenClients();
}

function listenClients() {
  const path = 'agencies/' + state.agencyId + '/bases/' + state.baseId + '/clients';
  onValue(ref(db, path), snap => {
    state.clients = snap.val() || {};
    renderClientList();
    renderGrid(); // refresh grid if the form is visible
  });
}

// ── CLIENT LIST ──
function renderClientList() {
  const list  = document.getElementById('clientList');
  const empty = document.getElementById('clientEmpty');
  list.innerHTML = '';

  const entries = Object.entries(state.clients).sort((a,b)=>a[1].num-b[1].num);
  if (!entries.length) { empty.style.display='block'; return; }
  empty.style.display='none';

  entries.forEach(([id, c]) => {
    const row = document.createElement('div');
    row.className = 'client-row';
    row.innerHTML = `
      <div class="client-row-num">${c.num}</div>
      <div class="client-row-body">
        <div class="client-row-name">${esc(c.nom||'—')}</div>
        <div class="client-row-meta">
          <span class="mono">${esc(c.code)}</span> ·
          <span class="mono">${esc(c.ssid)}</span> ·
          <span class="mono">${esc(c.ip)}</span>
        </div>
      </div>
    `;
    list.appendChild(row);
  });
}

// ── FORM : NUMBER GRID ──
export function openClientForm() {
  state.selectedNum = null;
  state.step = 1;
  clearFormFields();
  goToStep(1);
  document.getElementById('clientForm').style.display = 'block';
  document.getElementById('clientListSection').style.display = 'none';
  renderGrid();
  restoreDraft();
}
window.openClientForm = openClientForm;

export function closeClientForm() {
  document.getElementById('clientForm').style.display = 'none';
  document.getElementById('clientListSection').style.display = 'block';
}
window.closeClientForm = closeClientForm;

function usedNums() { return Object.values(state.clients).map(c=>c.num); }

function renderGrid() {
  const grid = document.getElementById('clientNumGrid');
  if (!grid) return;
  const used = usedNums();
  grid.innerHTML = '';
  for (let n=1; n<=66; n++) {
    const isUsed = used.includes(n);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'num-btn'+(isUsed?' used':'')+(state.selectedNum===n?' selected':'');
    btn.innerHTML = `<span class="nb-num">${n}</span><span class="nb-code">${CODES[n]}</span>${isUsed?'<span class="used-x">✓</span>':''}`;
    if (!isUsed) btn.onclick = () => selectClientNum(n);
    grid.appendChild(btn);
  }
}

function selectClientNum(n) {
  state.selectedNum = n;
  renderGrid();
  const ip = calcIP(state.baseIP, state.baseRules, n);
  const info = document.getElementById('clientSelInfo');
  info.style.display = 'block';
  info.innerHTML = `✅ <b>N°${n}</b> · Code : <b>${CODES[n]}</b> · SSID : <b>${getSSID(n)}</b> · IP : <b style="color:var(--field)">${ip}</b>`;
  const btn = document.getElementById('clientBtnStep2');
  btn.disabled = false; btn.style.opacity = '1';
  saveDraft();
}

// ── STEPS ──
window.clientGoStep = function(n) {
  if (n===2 && !state.selectedNum) return;
  state.step = n;
  goToStep(n);
  if (n===2) {
    const ip = calcIP(state.baseIP, state.baseRules, state.selectedNum);
    document.getElementById('clientAutoInfo').value =
      `N°${state.selectedNum} | Code:${CODES[state.selectedNum]} | SSID:${getSSID(state.selectedNum)} | IP:${ip}`;
    setTimeout(()=>document.getElementById('cNom').focus(), 80);
  }
  if (n===3) setTimeout(()=>document.getElementById('cNumero').focus(), 80);
  if (n===4) setTimeout(()=>document.getElementById('cMAC').focus(), 80);
  if (n===5) fillRecap();
  saveDraft();
};

function goToStep(n) {
  [1,2,3,4,5].forEach(i => {
    const el = document.getElementById('clientStep'+i);
    if (el) el.style.display = i===n ? 'block' : 'none';
  });
  const pct = n===5 ? 100 : n/5*100;
  document.getElementById('clientProgressBar').style.width = pct+'%';
  document.getElementById('clientProgressLabel').textContent =
    n < 5 ? `Étape ${n} / 5` : 'Récapitulatif';
}

window.clientValidateStep4 = function() {
  const mac = document.getElementById('cMAC').value.trim().toUpperCase();
  const ok = /^[A-Z0-9]{4}$/.test(mac);
  document.getElementById('cMACErr').style.display = ok ? 'none' : 'block';
  document.getElementById('cMAC').classList.toggle('error', !ok);
  if (ok) { document.getElementById('cMAC').value = mac; window.clientGoStep(5); }
  else document.getElementById('cMAC').focus();
};

function fillRecap() {
  const ip = calcIP(state.baseIP, state.baseRules, state.selectedNum);
  const set_ = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set_('cr_agent',    state.userName);
  set_('cr_agence',   state.agencyName);
  set_('cr_base',     state.baseName);
  set_('cr_num',      state.selectedNum);
  set_('cr_code',     CODES[state.selectedNum]);
  set_('cr_ssid',     getSSID(state.selectedNum));
  set_('cr_ip',       ip);
  set_('cr_nom',      document.getElementById('cNom').value||'—');
  set_('cr_numero',   document.getElementById('cNumero').value||'—');
  set_('cr_mac',      document.getElementById('cMAC').value||'—');
  set_('cr_local',    document.getElementById('cLocal').value||'—');
}

// ── SAVE CLIENT ──
window.submitClient = async function() {
  const ip = calcIP(state.baseIP, state.baseRules, state.selectedNum);
  const c = {
    agent:   state.userName,
    agencyId: state.agencyId,
    baseId:   state.baseId,
    num:     state.selectedNum,
    code:    CODES[state.selectedNum],
    ssid:    getSSID(state.selectedNum),
    ip,
    nom:     document.getElementById('cNom').value.trim(),
    numero:  document.getElementById('cNumero').value.trim(),
    mac:     document.getElementById('cMAC').value.trim().toUpperCase(),
    local:   document.getElementById('cLocal').value.trim(),
    date:    new Date().toLocaleString('fr-FR')
  };

  const btn = document.getElementById('clientSubmitBtn');
  btn.disabled = true;
  try {
    const path = 'agencies/' + state.agencyId + '/bases/' + state.baseId + '/clients';
    await push(ref(db, path), c);
    clearDraft();
    showClientSuccess(c);
  } catch (e) {
    alert('Erreur lors de l\'enregistrement. Réessayez.');
  } finally {
    btn.disabled = false;
  }
};

function showClientSuccess(c) {
  document.getElementById('clientForm').style.display = 'none';
  const s = document.getElementById('clientSuccess');
  s.style.display = 'block';
  document.getElementById('cs_info').textContent =
    `N°${c.num} · ${c.code} · IP: ${c.ip}${c.nom?' · '+c.nom:''}`;
}

window.clientNextRegister = function() {
  document.getElementById('clientSuccess').style.display = 'none';
  openClientForm();
};
window.clientBackToList = function() {
  document.getElementById('clientSuccess').style.display = 'none';
  document.getElementById('clientListSection').style.display = 'block';
};

// ── DRAFT (anti-perte de données) ──
function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      baseId: state.baseId, step: state.step,
      selectedNum: state.selectedNum,
      nom:    document.getElementById('cNom')?.value||'',
      numero: document.getElementById('cNumero')?.value||'',
      mac:    document.getElementById('cMAC')?.value||'',
      local:  document.getElementById('cLocal')?.value||''
    }));
  } catch(e){}
}
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); }catch(e){} }
function restoreDraft() {
  try {
    const s = localStorage.getItem(DRAFT_KEY);
    if (!s) return;
    const d = JSON.parse(s);
    if (d.baseId !== state.baseId) { clearDraft(); return; }
    if (usedNums().includes(d.selectedNum)) { clearDraft(); return; }
    if (!confirm(`📝 Saisie inachevée retrouvée (N°${d.selectedNum}${d.nom?' · '+d.nom:''}). Reprendre ?`)) { clearDraft(); return; }
    state.selectedNum = d.selectedNum;
    document.getElementById('cNom').value    = d.nom||'';
    document.getElementById('cNumero').value = d.numero||'';
    document.getElementById('cMAC').value    = d.mac||'';
    document.getElementById('cLocal').value  = d.local||'';
    renderGrid();
    const ip = calcIP(state.baseIP, state.baseRules, d.selectedNum);
    const info = document.getElementById('clientSelInfo');
    info.style.display = 'block';
    info.innerHTML = `✅ <b>N°${d.selectedNum}</b> · Code : <b>${CODES[d.selectedNum]}</b> · IP : <b style="color:var(--field)">${ip}</b>`;
    document.getElementById('clientBtnStep2').disabled = false;
    document.getElementById('clientBtnStep2').style.opacity = '1';
    window.clientGoStep(Math.min(d.step||1, 4));
  } catch(e){ clearDraft(); }
}

// Autosave on input
['cNom','cNumero','cMAC','cLocal'].forEach(id => {
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', saveDraft);
  });
});

function clearFormFields() {
  ['cNom','cNumero','cMAC','cLocal'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value='';
  });
  const info = document.getElementById('clientSelInfo');
  if (info) { info.style.display='none'; info.innerHTML=''; }
  const btn = document.getElementById('clientBtnStep2');
  if (btn) { btn.disabled=true; btn.style.opacity='0.4'; }
}
function esc(s) { const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }
