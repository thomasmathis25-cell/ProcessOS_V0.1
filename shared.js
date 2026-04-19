/**
 * ProcessOS — shared.js
 * Couche données partagée par tous les modules.
 *
 * DÉPENDANCES à charger AVANT shared.js dans chaque module HTML :
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="config.js"></script>
 */

// ── SUPABASE ──────────────────────────────────────────────────────────────────
// SUPABASE_URL et SUPABASE_KEY viennent de config.js
let supa           = null;
let currentUser    = null;
let currentOrgId   = null;
let currentLicense = null;

function initSupabase() {
  if (typeof supabase     === 'undefined') return false;
  if (typeof SUPABASE_URL === 'undefined') return false;
  supa = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return true;
}

function isCloudMode() {
  return supa !== null && currentUser !== null && currentOrgId !== null;
}

// ── CLÉS DE STOCKAGE ──────────────────────────────────────────────────────────
const SK   = 'processOS_v2';
const SK_S = 'processOS_settings';

// ── STRUCTURE DE DONNÉES ──────────────────────────────────────────────────────
let db = {
  macros: [],
  subs:   [],
  org: { depts: [], posts: [] },
};

// ── PARAMÈTRES PAR DÉFAUT ─────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  departments: ['Production','Supply Chain','Qualité','Achats','RH','Finance','Maintenance','IT'],
  roles: ['Opérateur','Superviseur','Responsable Qualité','Acheteur','Contrôleur qualité','Chef d\'équipe','Responsable production','Système IA'],
  sites: ['Site principal'],
  activeNorms: ['ISO_9001_8.4'],
  org: { name: '', sector: 'Industrie générale', quality: '' },
};

// ── DONNÉES RÉFÉRENTIEL ───────────────────────────────────────────────────────
const ISO_OPTS = [
  { id: 'ISO_9001_8.4',    label: 'ISO 9001:2015 §8.4 — Maîtrise des processus externes'      },
  { id: 'ISO_9001_8.5',    label: 'ISO 9001:2015 §8.5 — Production et prestation de service'  },
  { id: 'ISO_13485_7.4.3', label: 'ISO 13485:2016 §7.4.3 — Vérification des produits achetés' },
  { id: 'ISO_13485_7.5',   label: 'ISO 13485:2016 §7.5 — Production et prestation de service' },
  { id: 'ISO_13485_8.3',   label: 'ISO 13485:2016 §8.3 — Maîtrise des non-conformités'        },
  { id: '21CFR_820.80',    label: '21 CFR Part 820.80 — Acceptance activities (FDA)'           },
];

const DEPT_PRESETS = [
  { id: 'prod',  name: 'Production',   icon: '🏭', color: 'orange' },
  { id: 'sc',    name: 'Supply Chain', icon: '📦', color: 'teal'   },
  { id: 'qual',  name: 'Qualité',      icon: '🔬', color: 'purple' },
  { id: 'ach',   name: 'Achats',       icon: '🛒', color: 'blue'   },
  { id: 'rh',    name: 'RH',           icon: '👥', color: 'blue'   },
  { id: 'fin',   name: 'Finance',      icon: '💰', color: 'green'  },
  { id: 'maint', name: 'Maintenance',  icon: '🔧', color: 'amber'  },
  { id: 'it',    name: 'IT',           icon: '💻', color: 'teal'   },
];

const ROLE_PRESETS = [
  'Directeur de site','Directeur de département','Responsable de département',
  'Chef d\'équipe','Superviseur de production','Opérateur polyvalent','Opérateur spécialisé',
  'Responsable Qualité','Contrôleur qualité','Auditeur interne','Responsable HSE',
  'Acheteur','Approvisionneur','Responsable logistique','Gestionnaire de stock',
  'Responsable RH','Chargé de formation','Responsable maintenance','Technicien de maintenance',
  'Responsable IT','Système IA / Automatisme',
];

const TCFG = {
  action:     { l: 'Action',         c: 'teal',   b: 'ba'  },
  decision:   { l: 'Décision',       c: 'amber',  b: 'bd'  },
  control:    { l: 'Contrôle',       c: 'purple', b: 'bc'  },
  document:   { l: 'Document',       c: 'blue',   b: 'bdo' },
  auto:       { l: 'Auto IA',        c: 'gray',   b: 'bau' },
  end:        { l: 'Fin',            c: 'green',  b: 'be'  },
  subprocess: { l: 'Sous-processus', c: 'teal',   b: 'bsp' },
};

const DDEF = {
  action:     [],
  decision:   [],
  control:    [{ i: '📋', l: 'Fiche de contrôle'      }],
  document:   [{ i: '📄', l: 'Document archivé'        }],
  auto:       [{ i: '⚡', l: 'Événement système'        }],
  end:        [{ i: '✅', l: 'Processus clôturé'        }],
  subprocess: [{ i: '🔗', l: 'Rapport sous-processus'  }],
};

const FTYPES = [
  { v: 'text',   l: 'Texte'            },
  { v: 'number', l: 'Nombre'           },
  { v: 'date',   l: 'Date'             },
  { v: 'select', l: 'Liste choix'      },
  { v: 'photo',  l: 'Photo'            },
  { v: 'scan',   l: 'Scan code-barres' },
  { v: 'bool',   l: 'Oui / Non'        },
];

const RCYCLE = ['', 'R', 'A', 'C', 'I'];

const WF_STATES = [
  { id: 'draft',     label: 'Brouillon',   cls: 'wf-draft',     icon: '⬤' },
  { id: 'submitted', label: 'En révision', cls: 'wf-submitted', icon: '⬆' },
  { id: 'approved',  label: 'Approuvé',    cls: 'wf-approved',  icon: '✓' },
  { id: 'rejected',  label: 'Rejeté',      cls: 'wf-rejected',  icon: '✕' },
];

// ── STOCKAGE ──────────────────────────────────────────────────────────────────

async function load() {
  // 1. Local d'abord — affichage immédiat même hors-ligne
  try {
    const d = localStorage.getItem(SK);
    if (d) {
      db = JSON.parse(d);
      if (!db.org)    db.org    = { depts: [], posts: [] };
      if (!db.macros) db.macros = [];
      if (!db.subs)   db.subs   = [];
    }
  } catch (e) {
    db = { macros: [], subs: [], org: { depts: [], posts: [] } };
  }

  // 2. Cloud si connecté
  if (!isCloudMode()) return;
  try {
    const { data: procs } = await supa
      .from('processes').select('data,level')
      .eq('org_id', currentOrgId).order('created_at');
    if (procs) {
      db.macros = procs.filter(p => p.level === 'macro').map(p => p.data);
      db.subs   = procs.filter(p => p.level === 'sub').map(p => p.data);
    }

    const { data: settings } = await supa
      .from('org_settings').select('*')
      .eq('org_id', currentOrgId).single();
    if (settings) {
      const s = getSettings();
      s.departments = settings.departments  || s.departments;
      s.roles       = settings.roles        || s.roles;
      s.sites       = settings.sites        || s.sites;
      s.activeNorms = settings.active_norms || s.activeNorms;
      s.org = { name: settings.org_name || '', sector: settings.sector || 'Industrie générale', quality: settings.quality_manager || '' };
      localStorage.setItem(SK_S, JSON.stringify(s));
    }

    const { data: posts } = await supa
      .from('org_posts').select('*').eq('org_id', currentOrgId);
    if (posts) {
      db.org.posts = posts.map(p => ({
        id:             p.id,
        name:           p.name,
        person:         p.person_name    || '',
        dept:           p.department     || '',
        roles:          p.roles          || [],
        parent:         p.parent_id      || null,
        cost_center_id: p.cost_center_id || null,
      }));
    }

    const { data: lic } = await supa
      .from('licenses').select('*').eq('org_id', currentOrgId).single();
    if (lic) currentLicense = lic;

    localStorage.setItem(SK, JSON.stringify(db));
    _updateStime('☁ Sync cloud ✓');
  } catch (e) {
    console.error('Erreur chargement Supabase:', e);
  }
}

async function save() {
  // 1. Local toujours
  try { localStorage.setItem(SK, JSON.stringify(db)); }
  catch (e) { console.error('Save local error:', e); }
  _updateStime('Sauvegardé');

  // 2. Cloud si connecté
  if (!isCloudMode()) return;
  try {
    for (const p of [...db.macros, ...db.subs]) {
      await supa.from('processes').upsert({
        org_id: currentOrgId, local_id: p._id,
        process_code: p.id, name: p.name, level: p.level,
        version: p.version || 'v1.0', department: p.department || '',
        description: p.description || '', iso_refs: p.iso_refs || [],
        workflow_state: p.workflow?.state || 'draft',
        data: p, updated_at: new Date().toISOString(),
      }, { onConflict: 'org_id,process_code,version' });
    }

    const s = getSettings();
    await supa.from('org_settings').upsert({
      org_id: currentOrgId, org_name: s.org?.name || '',
      sector: s.org?.sector || '', quality_manager: s.org?.quality || '',
      departments: s.departments || [], roles: s.roles || [],
      sites: s.sites || [], active_norms: s.activeNorms || [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id' });

    for (const post of (db.org?.posts || [])) {
      await supa.from('org_posts').upsert({
        id:              post.id,
        org_id:          currentOrgId,
        name:            post.name,
        person_name:     post.person  || null,
        department:      post.dept    || null,
        parent_id:       post.parent  || null,
        roles:           post.roles   || [],
        cost_center_id:  post.cost_center_id || null,
        updated_at:      new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    _updateStime('☁ Cloud ✓');
  } catch (e) {
    console.error('Erreur sync Supabase:', e);
  }
}

function _updateStime(prefix) {
  const el = document.getElementById('stime');
  if (el) el.textContent = prefix + ' · ' + new Date().toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
}

function getSettings() {
  try {
    const d = localStorage.getItem(SK_S);
    return d ? JSON.parse(d) : JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  } catch (e) { return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); }
}

function saveSettingsData(s) {
  localStorage.setItem(SK_S, JSON.stringify(s));
  if (!isCloudMode()) return;
  supa.from('org_settings').upsert({
    org_id: currentOrgId, org_name: s.org?.name || '',
    sector: s.org?.sector || '', quality_manager: s.org?.quality || '',
    departments: s.departments || [], roles: s.roles || [],
    sites: s.sites || [], active_norms: s.activeNorms || [],
    updated_at: new Date().toISOString(),
  }, { onConflict: 'org_id' }).catch(e => console.error('Settings sync error:', e));
}

// ── AUTHENTIFICATION ──────────────────────────────────────────────────────────

async function onLoginSuccess(user) {
  currentUser = user;
  const { data: profile } = await supa
    .from('user_profiles').select('org_id,role').eq('id', user.id).single();
  if (profile) currentOrgId = profile.org_id;
  await load();
  renderTopbar(document.querySelector('.nav-link.active')?.dataset?.module || 'index');
  showToast('Connecté — ' + user.email + ' ✓');
}

async function logout() {
  if (supa) await supa.auth.signOut();
  currentUser = null; currentOrgId = null; currentLicense = null;
  db = { macros: [], subs: [], org: { depts: [], posts: [] } };
  window.location.href = 'index.html';
}

function canAccessModule(moduleId) {
  if (!currentLicense) return true;
  return (currentLicense.modules_enabled || []).includes(moduleId);
}

// ── THÈME ─────────────────────────────────────────────────────────────────────

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('processOS_theme', next);
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', localStorage.getItem('processOS_theme') || 'light');
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────

const MODULES = [
  { id: 'index',    label: '⌂ Accueil',    file: 'index.html'    },
  { id: 'module-0', label: '⚙ Paramètres',  file: 'module-0.html' },
  { id: 'module-1', label: '👥 RH',          file: 'module-1.html' },
  { id: 'module-2', label: '🔁 Processus',   file: 'module-2.html' },
  { id: 'module-3', label: '🏭 Structure',   file: 'module-3.html' },
];

function renderTopbar(activeId) {
  const s       = getSettings();
  const orgName = s.org?.name || 'ProcessOS';
  const topbar  = document.getElementById('topbar');
  if (!topbar) return;
  const userBadge = currentUser
    ? `<span style="font-size:11px;color:var(--text3);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${currentUser.email}</span>
       <button class="btn btn-sm" onclick="logout()">Déconnexion</button>`
    : '';
  topbar.innerHTML = `
    <a href="index.html" class="logo"><div class="logo-mark">P</div><span class="logo-text">${orgName}</span></a>
    <div class="topbar-sep"></div>
    <nav class="topbar-nav">
      ${MODULES.filter(m => m.id !== 'index').map(m =>
        `<a href="${m.file}" class="nav-link ${m.id === activeId ? 'active' : ''}" data-module="${m.id}">${m.label}</a>`
      ).join('')}
    </nav>
    <div class="topbar-actions">${userBadge}<button class="theme-btn" onclick="toggleTheme()" title="Thème"></button></div>`;
}

// ── TOAST ─────────────────────────────────────────────────────────────────────

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(t._timer); t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2400);
}

// ── UTILITAIRES ───────────────────────────────────────────────────────────────

function uid(prefix = 'id') {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 6);
}

function getAllDepts() {
  const s = getSettings();
  // Les depts peuvent être des strings (ancien format) ou des objets {code, name, description}
  const settingsDepts = (s.departments || []).map(d => {
    if (typeof d === 'object' && d.name) {
      // Nouveau format — enrichi avec icône depuis presets si disponible
      const preset = DEPT_PRESETS.find(p => p.name === d.name);
      return { id: d.code || d.name, name: d.name, icon: preset?.icon || '🏢', color: preset?.color || 'blue', code: d.code, description: d.description };
    }
    // Ancien format string — chercher dans presets
    const preset = DEPT_PRESETS.find(p => p.name === d);
    return preset ? { ...preset } : { id: d, name: d, icon: '🏢', color: 'blue' };
  });
  // Fusionner avec presets (sans doublon)
  const custom = db.org?.depts || [];
  return [...settingsDepts, ...custom.filter(c => !settingsDepts.find(d => d.name === c.name))];
}

function getAllRoles() {
  return [...new Set([...(getSettings().roles || []), ...ROLE_PRESETS])];
}

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('fr-CH'); } catch (e) { return '—'; }
}

// ── EXPORT EXCEL ──────────────────────────────────────────────────────────────
// Requiert dans le module : <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js">

async function exportToExcel(data, filename, sheetName = 'Export') {
  if (typeof XLSX === 'undefined') { showToast('Librairie Excel non chargée'); return; }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), sheetName);
  XLSX.writeFile(wb, filename + '_' + new Date().toISOString().split('T')[0] + '.xlsx');
  if (isCloudMode()) {
    await supa.from('audit_log').insert({
      org_id: currentOrgId, user_id: currentUser.id, user_email: currentUser.email,
      table_name: sheetName, action: 'export', new_data: { filename, rows: data.length },
    }).catch(() => {});
  }
  showToast('Export Excel ✓ — ' + data.length + ' lignes');
}

// ── CSS COMMUN ────────────────────────────────────────────────────────────────

function injectSharedCSS() {
  if (document.getElementById('shared-css')) return;
  const style = document.createElement('style');
  style.id = 'shared-css';
  style.textContent = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
:root,[data-theme="light"]{
  --bg:#f4f4f1;--bg2:#ffffff;--bg3:#f0efec;--bg4:#e6e5e0;
  --border:#e0dfd8;--border2:#cccbc3;
  --text:#1c1c1a;--text2:#4a4a46;--text3:#8a8a84;
  --purple:#5b4fcf;--purple2:#4a3fb8;--purple-bg:#eeedfb;--purple-light:#f6f5fd;
  --green:#1a7a4a;--green-bg:#e8f5ee;--amber:#b86a00;--amber-bg:#fef3e2;
  --red:#c0392b;--red-bg:#fdecea;--blue:#1a6ab8;--blue-bg:#e8f0fb;
  --teal:#0d7a70;--teal-bg:#e6f5f3;--orange:#c45000;--orange-bg:#fef0e8;
  --shadow:0 1px 3px rgba(0,0,0,.07);--shadow-md:0 4px 12px rgba(0,0,0,.08);--shadow-lg:0 8px 24px rgba(0,0,0,.1);
  --font:'IBM Plex Sans',sans-serif;--mono:'IBM Plex Mono',monospace;--r:7px;--r2:11px;
}
[data-theme="dark"]{
  --bg:#0f0f11;--bg2:#161618;--bg3:#1e1e22;--bg4:#26262c;
  --border:#2e2e36;--border2:#3a3a44;--text:#e8e8f0;--text2:#9090a8;--text3:#5a5a70;
  --purple:#7c6fef;--purple2:#5a4fd4;--purple-bg:#1a1830;--purple-light:#141228;
  --green:#2dd87a;--green-bg:#0f2418;--amber:#f5a623;--amber-bg:#261c0a;
  --red:#ef5353;--red-bg:#261010;--blue:#4da6ff;--blue-bg:#0d1e33;
  --teal:#2dd8c8;--teal-bg:#0f2420;--orange:#ff8c42;--orange-bg:#2a1800;
  --shadow:0 1px 3px rgba(0,0,0,.3);--shadow-md:0 4px 12px rgba(0,0,0,.4);--shadow-lg:0 8px 24px rgba(0,0,0,.5);
}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column;font-size:14px;line-height:1.5;}
.topbar{display:flex;align-items:center;gap:10px;padding:0 16px;height:50px;background:var(--bg2);border-bottom:1px solid var(--border);flex-shrink:0;box-shadow:var(--shadow);}
.logo{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;color:var(--text);text-decoration:none;}
.logo-mark{width:26px;height:26px;border-radius:7px;background:var(--purple);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;flex-shrink:0;}
.logo-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px;}
.topbar-sep{width:1px;height:18px;background:var(--border);}
.topbar-nav{display:flex;gap:2px;flex:1;overflow-x:auto;}
.nav-link{padding:5px 10px;border-radius:var(--r);font-size:12px;font-weight:500;color:var(--text3);text-decoration:none;transition:all .15s;white-space:nowrap;}
.nav-link:hover{background:var(--bg3);color:var(--text);}
.nav-link.active{background:var(--purple-bg);color:var(--purple);}
.topbar-actions{display:flex;gap:6px;align-items:center;margin-left:auto;}
.theme-btn{width:32px;height:18px;border-radius:9px;background:var(--border2);border:none;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0;}
.theme-btn::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:white;transition:transform .2s;box-shadow:0 1px 2px rgba(0,0,0,.2);}
[data-theme="dark"] .theme-btn{background:var(--purple);}
[data-theme="dark"] .theme-btn::after{transform:translateX(14px);}
.btn{padding:5px 11px;border-radius:var(--r);border:1px solid var(--border2);font-size:12px;font-weight:500;cursor:pointer;font-family:var(--font);background:var(--bg2);color:var(--text2);transition:all .15s;white-space:nowrap;}
.btn:hover{background:var(--bg3);color:var(--text);}
.btn-primary{background:var(--purple);color:white;border-color:var(--purple);}
.btn-primary:hover{background:var(--purple2);color:white;}
.btn-teal{background:var(--teal-bg);color:var(--teal);border-color:var(--teal);}
.btn-success{background:var(--green-bg);color:var(--green);border-color:var(--green);}
.btn-amber{background:var(--amber-bg);color:var(--amber);border-color:var(--amber);}
.btn-danger{background:var(--red-bg);color:var(--red);border-color:var(--red);}
.btn-sm{padding:4px 8px;font-size:11px;}
.icon-btn{width:26px;height:26px;border-radius:5px;border:1px solid transparent;background:transparent;color:var(--text3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s;}
.icon-btn:hover{background:var(--bg3);color:var(--text2);}
.icon-btn.danger:hover{background:var(--red-bg);color:var(--red);}
.fg{display:flex;flex-direction:column;gap:4px;}
.fl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);}
.fi{font-family:var(--font);font-size:13px;padding:7px 9px;border-radius:var(--r);border:1px solid var(--border);background:var(--bg3);color:var(--text);outline:none;transition:border-color .15s;width:100%;}
.fi:focus{border-color:var(--purple);}
select.fi{cursor:pointer;}
textarea.fi{resize:vertical;min-height:52px;font-size:12px;line-height:1.5;}
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:200;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(2px);}
.modal-overlay.open{display:flex;}
.modal{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);width:100%;max-width:540px;max-height:92vh;overflow-y:auto;box-shadow:var(--shadow-lg);}
.modal-lg{max-width:760px;}
.modal-header{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg3);}
.modal-title{font-size:13px;font-weight:600;color:var(--text);}
.modal-body{padding:16px;display:flex;flex-direction:column;gap:11px;}
.modal-footer{padding:11px 16px;border-top:1px solid var(--border);display:flex;gap:7px;justify-content:flex-end;background:var(--bg3);}
.pill{display:inline-flex;align-items:center;font-size:10px;padding:1px 6px;border-radius:20px;font-weight:500;}
.pill-purple{background:var(--purple-bg);color:var(--purple);}
.pill-teal{background:var(--teal-bg);color:var(--teal);}
.pill-green{background:var(--green-bg);color:var(--green);}
.pill-amber{background:var(--amber-bg);color:var(--amber);}
.pill-red{background:var(--red-bg);color:var(--red);}
.pill-blue{background:var(--blue-bg);color:var(--blue);}
.wf-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid;}
.wf-draft{background:var(--bg3);color:var(--text3);border-color:var(--border2);}
.wf-submitted{background:var(--amber-bg);color:var(--amber);border-color:var(--amber);}
.wf-approved{background:var(--green-bg);color:var(--green);border-color:var(--green);}
.wf-rejected{background:var(--red-bg);color:var(--red);border-color:var(--red);}
.statusbar{padding:0 12px;height:26px;background:var(--bg2);border-top:1px solid var(--border);display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text3);flex-shrink:0;}
.status-dot{width:6px;height:6px;border-radius:50%;background:var(--green);}
#toast{position:fixed;bottom:36px;right:16px;background:var(--text);color:var(--bg2);padding:8px 14px;border-radius:var(--r);font-size:12px;font-weight:500;opacity:0;transition:opacity .2s;pointer-events:none;z-index:999;box-shadow:var(--shadow-lg);}
::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px;}
  `;
  document.head.appendChild(style);
}
