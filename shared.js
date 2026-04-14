/**
 * ProcessOS — shared.js
 * Couche données partagée par tous les modules.
 * Chaque module inclut ce fichier. Aucun module ne parle directement à un autre.
 * Communication uniquement via les fonctions save() / load() / getSettings().
 */

// ── CLÉS DE STOCKAGE ──────────────────────────────────────────────────────────
const SK   = 'processOS_v2';
const SK_S = 'processOS_settings';

// ── STRUCTURE DE DONNÉES ──────────────────────────────────────────────────────
// Structure par défaut — tous les modules lisent depuis db
let db = {
  macros: [],   // Macro-processus (Module 2)
  subs:   [],   // Sous-processus  (Module 2)
  org: {
    depts: [],  // Départements personnalisés (Module 1)
    posts: [],  // Postes (Module 1)
  }
};

// ── PARAMÈTRES PAR DÉFAUT ─────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  departments: ['Production', 'Supply Chain', 'Qualité', 'Achats', 'RH', 'Finance', 'Maintenance', 'IT'],
  roles: ['Opérateur', 'Superviseur', 'Responsable Qualité', 'Acheteur', 'Contrôleur qualité', 'Chef d\'équipe', 'Responsable production', 'Système IA'],
  sites: ['Site principal'],
  activeNorms: ['ISO_9001_8.4'],
  org: { name: '', sector: 'Industrie générale', quality: '' },
};

// ── DONNÉES RÉFÉRENTIEL ───────────────────────────────────────────────────────
const ISO_OPTS = [
  { id: 'ISO_9001_8.4',    label: 'ISO 9001:2015 §8.4 — Maîtrise des processus externes' },
  { id: 'ISO_9001_8.5',    label: 'ISO 9001:2015 §8.5 — Production et prestation de service' },
  { id: 'ISO_13485_7.4.3', label: 'ISO 13485:2016 §7.4.3 — Vérification des produits achetés' },
  { id: 'ISO_13485_7.5',   label: 'ISO 13485:2016 §7.5 — Production et prestation de service' },
  { id: 'ISO_13485_8.3',   label: 'ISO 13485:2016 §8.3 — Maîtrise des non-conformités' },
  { id: '21CFR_820.80',    label: '21 CFR Part 820.80 — Acceptance activities (FDA)' },
];

// Départements industriels pré-établis — modulables dans Module 0
const DEPT_PRESETS = [
  { id: 'prod',  name: 'Production',     icon: '🏭', color: 'orange' },
  { id: 'sc',    name: 'Supply Chain',   icon: '📦', color: 'teal'   },
  { id: 'qual',  name: 'Qualité',        icon: '🔬', color: 'purple' },
  { id: 'ach',   name: 'Achats',         icon: '🛒', color: 'blue'   },
  { id: 'rh',    name: 'RH',             icon: '👥', color: 'blue'   },
  { id: 'fin',   name: 'Finance',        icon: '💰', color: 'green'  },
  { id: 'maint', name: 'Maintenance',    icon: '🔧', color: 'amber'  },
  { id: 'it',    name: 'IT',             icon: '💻', color: 'teal'   },
];

// Rôles industriels pré-établis — modulables dans Module 0
const ROLE_PRESETS = [
  'Directeur de site', 'Directeur de département', 'Responsable de département',
  'Chef d\'équipe', 'Superviseur de production', 'Opérateur polyvalent', 'Opérateur spécialisé',
  'Responsable Qualité', 'Contrôleur qualité', 'Auditeur interne', 'Responsable HSE',
  'Acheteur', 'Approvisionneur', 'Responsable logistique', 'Gestionnaire de stock',
  'Responsable RH', 'Chargé de formation', 'Responsable maintenance', 'Technicien de maintenance',
  'Responsable IT', 'Système IA / Automatisme',
];

// Types d'étapes (Module 2 — Processus)
const TCFG = {
  action:     { l: 'Action',         c: 'teal',   b: 'ba'  },
  decision:   { l: 'Décision',       c: 'amber',  b: 'bd'  },
  control:    { l: 'Contrôle',       c: 'purple', b: 'bc'  },
  document:   { l: 'Document',       c: 'blue',   b: 'bdo' },
  auto:       { l: 'Auto IA',        c: 'gray',   b: 'bau' },
  end:        { l: 'Fin',            c: 'green',  b: 'be'  },
  subprocess: { l: 'Sous-processus', c: 'teal',   b: 'bsp' },
};

// Délivrables par défaut selon type d'étape (Module 2)
const DDEF = {
  action:     [],
  decision:   [],
  control:    [{ i: '📋', l: 'Fiche de contrôle' }],
  document:   [{ i: '📄', l: 'Document archivé' }],
  auto:       [{ i: '⚡', l: 'Événement système' }],
  end:        [{ i: '✅', l: 'Processus clôturé' }],
  subprocess: [{ i: '🔗', l: 'Rapport sous-processus' }],
};

// Types de champs de saisie (Module 2)
const FTYPES = [
  { v: 'text',   l: 'Texte' },
  { v: 'number', l: 'Nombre' },
  { v: 'date',   l: 'Date' },
  { v: 'select', l: 'Liste choix' },
  { v: 'photo',  l: 'Photo' },
  { v: 'scan',   l: 'Scan code-barres' },
  { v: 'bool',   l: 'Oui / Non' },
];

// Cycle RACI
const RCYCLE = ['', 'R', 'A', 'C', 'I'];

// Workflow de validation
const WF_STATES = [
  { id: 'draft',     label: 'Brouillon',    cls: 'wf-draft',     icon: '⬤' },
  { id: 'submitted', label: 'En révision',  cls: 'wf-submitted', icon: '⬆' },
  { id: 'approved',  label: 'Approuvé',     cls: 'wf-approved',  icon: '✓' },
  { id: 'rejected',  label: 'Rejeté',       cls: 'wf-rejected',  icon: '✕' },
];

// ── FONCTIONS DE STOCKAGE ─────────────────────────────────────────────────────

/**
 * Charge les données depuis localStorage.
 * Appelée au démarrage de chaque module.
 */
function load() {
  try {
    const d = localStorage.getItem(SK);
    if (d) {
      db = JSON.parse(d);
      if (!db.org)       db.org       = { depts: [], posts: [] };
      if (!db.macros)    db.macros    = [];
      if (!db.subs)      db.subs      = [];
    }
  } catch (e) {
    db = { macros: [], subs: [], org: { depts: [], posts: [] } };
  }
}

/**
 * Sauvegarde les données dans localStorage.
 * Appelée après chaque modification.
 * Met à jour l'heure dans #stime si l'élément existe.
 */
function save() {
  try {
    localStorage.setItem(SK, JSON.stringify(db));
  } catch (e) {
    console.error('ProcessOS save error:', e);
  }
  const el = document.getElementById('stime');
  if (el) {
    el.textContent = 'Sauvegardé à ' + new Date().toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Charge les paramètres globaux (Module 0).
 * Retourne les paramètres par défaut si rien n'est sauvegardé.
 */
function getSettings() {
  try {
    const d = localStorage.getItem(SK_S);
    return d ? JSON.parse(d) : JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
}

/**
 * Sauvegarde les paramètres globaux.
 */
function saveSettingsData(s) {
  localStorage.setItem(SK_S, JSON.stringify(s));
}

// ── THÈME ─────────────────────────────────────────────────────────────────────

/**
 * Bascule entre thème clair et sombre.
 * Le choix est mémorisé entre sessions.
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('processOS_theme', next);
}

/**
 * Applique le thème sauvegardé au chargement.
 * À appeler dans chaque module au démarrage.
 */
function applyTheme() {
  const t = localStorage.getItem('processOS_theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────

/**
 * Liste des modules pour la navigation.
 * Ajouter ici quand un nouveau module est créé.
 */
const MODULES = [
  { id: 'index',    label: '⌂ Accueil',      file: 'index.html'    },
  { id: 'module-0', label: '⚙ Paramètres',   file: 'module-0.html' },
  { id: 'module-1', label: '👥 RH',           file: 'module-1.html' },
  { id: 'module-2', label: '🔁 Processus',    file: 'module-2.html' },
];

/**
 * Génère la topbar de navigation commune à tous les modules.
 * Appeler avec l'ID du module actif pour surligner le bon lien.
 * @param {string} activeId - ex: 'module-0'
 */
function renderTopbar(activeId) {
  const settings = getSettings();
  const orgName  = settings.org?.name || 'ProcessOS';
  const topbar   = document.getElementById('topbar');
  if (!topbar) return;

  topbar.innerHTML = `
    <a href="index.html" class="logo">
      <div class="logo-mark">P</div>
      <span class="logo-text">${orgName}</span>
    </a>
    <div class="topbar-sep"></div>
    <nav class="topbar-nav">
      ${MODULES.filter(m => m.id !== 'index').map(m => `
        <a href="${m.file}" class="nav-link ${m.id === activeId ? 'active' : ''}">${m.label}</a>
      `).join('')}
    </nav>
    <div class="topbar-actions">
      <button class="theme-btn" onclick="toggleTheme()" title="Thème clair / sombre"></button>
    </div>
  `;
}

// ── TOAST ─────────────────────────────────────────────────────────────────────

/**
 * Affiche une notification temporaire en bas à droite.
 */
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2400);
}

// ── UTILITAIRES ───────────────────────────────────────────────────────────────

/**
 * Génère un ID unique.
 */
function uid(prefix = 'id') {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 6);
}

/**
 * Retourne la liste combinée des départements :
 * presets + départements personnalisés de l'organigramme.
 */
function getAllDepts() {
  const custom = db.org?.depts || [];
  return [...DEPT_PRESETS, ...custom];
}

/**
 * Retourne la liste combinée des rôles :
 * paramètres settings + presets (sans doublons).
 */
function getAllRoles() {
  const s = getSettings();
  return [...new Set([...s.roles, ...ROLE_PRESETS])];
}

/**
 * Formate une date ISO en date locale française.
 */
function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('fr-CH'); }
  catch (e) { return '—'; }
}

// ── CSS COMMUN ────────────────────────────────────────────────────────────────
// Injecte le CSS partagé dans le <head> du document courant.
// Chaque module appelle cette fonction au démarrage.
function injectSharedCSS() {
  if (document.getElementById('shared-css')) return;
  const style = document.createElement('style');
  style.id = 'shared-css';
  style.textContent = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

/* ── THÈMES ── */
:root,[data-theme="light"]{
  --bg:#f4f4f1;--bg2:#ffffff;--bg3:#f0efec;--bg4:#e6e5e0;
  --border:#e0dfd8;--border2:#cccbc3;
  --text:#1c1c1a;--text2:#4a4a46;--text3:#8a8a84;
  --purple:#5b4fcf;--purple2:#4a3fb8;--purple-bg:#eeedfb;--purple-light:#f6f5fd;
  --green:#1a7a4a;--green-bg:#e8f5ee;
  --amber:#b86a00;--amber-bg:#fef3e2;
  --red:#c0392b;--red-bg:#fdecea;
  --blue:#1a6ab8;--blue-bg:#e8f0fb;
  --teal:#0d7a70;--teal-bg:#e6f5f3;
  --orange:#c45000;--orange-bg:#fef0e8;
  --shadow:0 1px 3px rgba(0,0,0,.07);
  --shadow-md:0 4px 12px rgba(0,0,0,.08);
  --shadow-lg:0 8px 24px rgba(0,0,0,.1);
  --font:'IBM Plex Sans',sans-serif;
  --mono:'IBM Plex Mono',monospace;
  --r:7px;--r2:11px;
}
[data-theme="dark"]{
  --bg:#0f0f11;--bg2:#161618;--bg3:#1e1e22;--bg4:#26262c;
  --border:#2e2e36;--border2:#3a3a44;
  --text:#e8e8f0;--text2:#9090a8;--text3:#5a5a70;
  --purple:#7c6fef;--purple2:#5a4fd4;--purple-bg:#1a1830;--purple-light:#141228;
  --green:#2dd87a;--green-bg:#0f2418;
  --amber:#f5a623;--amber-bg:#261c0a;
  --red:#ef5353;--red-bg:#261010;
  --blue:#4da6ff;--blue-bg:#0d1e33;
  --teal:#2dd8c8;--teal-bg:#0f2420;
  --orange:#ff8c42;--orange-bg:#2a1800;
  --shadow:0 1px 3px rgba(0,0,0,.3);
  --shadow-md:0 4px 12px rgba(0,0,0,.4);
  --shadow-lg:0 8px 24px rgba(0,0,0,.5);
}

/* ── BASE ── */
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column;font-size:14px;line-height:1.5;}

/* ── TOPBAR ── */
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

/* ── THEME TOGGLE ── */
.theme-btn{width:32px;height:18px;border-radius:9px;background:var(--border2);border:none;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0;}
.theme-btn::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:white;transition:transform .2s;box-shadow:0 1px 2px rgba(0,0,0,.2);}
[data-theme="dark"] .theme-btn{background:var(--purple);}
[data-theme="dark"] .theme-btn::after{transform:translateX(14px);}

/* ── BOUTONS ── */
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

/* ── FORMULAIRES ── */
.fg{display:flex;flex-direction:column;gap:4px;}
.fl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);}
.fi{font-family:var(--font);font-size:13px;padding:7px 9px;border-radius:var(--r);border:1px solid var(--border);background:var(--bg3);color:var(--text);outline:none;transition:border-color .15s;width:100%;}
.fi:focus{border-color:var(--purple);}
select.fi{cursor:pointer;}
textarea.fi{resize:vertical;min-height:52px;font-size:12px;line-height:1.5;}

/* ── MODALS ── */
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:200;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(2px);}
.modal-overlay.open{display:flex;}
.modal{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);width:100%;max-width:540px;max-height:92vh;overflow-y:auto;box-shadow:var(--shadow-lg);}
.modal-lg{max-width:760px;}
.modal-header{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg3);}
.modal-title{font-size:13px;font-weight:600;color:var(--text);}
.modal-body{padding:16px;display:flex;flex-direction:column;gap:11px;}
.modal-footer{padding:11px 16px;border-top:1px solid var(--border);display:flex;gap:7px;justify-content:flex-end;background:var(--bg3);}

/* ── PILLS & TAGS ── */
.pill{display:inline-flex;align-items:center;font-size:10px;padding:1px 6px;border-radius:20px;font-weight:500;}
.pill-purple{background:var(--purple-bg);color:var(--purple);}
.pill-teal{background:var(--teal-bg);color:var(--teal);}
.pill-green{background:var(--green-bg);color:var(--green);}
.pill-amber{background:var(--amber-bg);color:var(--amber);}
.pill-red{background:var(--red-bg);color:var(--red);}
.pill-blue{background:var(--blue-bg);color:var(--blue);}

/* ── WORKFLOW BADGES ── */
.wf-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid;}
.wf-draft{background:var(--bg3);color:var(--text3);border-color:var(--border2);}
.wf-submitted{background:var(--amber-bg);color:var(--amber);border-color:var(--amber);}
.wf-approved{background:var(--green-bg);color:var(--green);border-color:var(--green);}
.wf-rejected{background:var(--red-bg);color:var(--red);border-color:var(--red);}

/* ── STATUS BAR ── */
.statusbar{padding:0 12px;height:26px;background:var(--bg2);border-top:1px solid var(--border);display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text3);flex-shrink:0;}
.status-dot{width:6px;height:6px;border-radius:50%;background:var(--green);}

/* ── TOAST ── */
#toast{position:fixed;bottom:36px;right:16px;background:var(--text);color:var(--bg2);padding:8px 14px;border-radius:var(--r);font-size:12px;font-weight:500;opacity:0;transition:opacity .2s;pointer-events:none;z-index:999;box-shadow:var(--shadow-lg);}

/* ── SCROLLBAR ── */
::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px;}
  `;
  document.head.appendChild(style);
}
