// ════════════════════════════════════════════════════════════
// roles.js — Définition des rôles et permissions BIT
// Architecture prévue pour les 6 rôles du cahier des charges.
// Seuls Admin et Agent terrain sont pleinement actifs pour l'instant ;
// les autres sont déclarés ici pour qu'aucune restructuration ne soit
// nécessaire quand on les activera.
// ════════════════════════════════════════════════════════════

export const ROLES = {
  ADMIN:        'admin',
  CONTROLEUR:   'controleur',
  SUPERVISEUR:  'superviseur',
  CHEF_AGENCE:  'chef_agence',
  OPERATEUR:    'operateur',
  TECHNICIEN:   'technicien',
  AGENT:        'agent',      // agent terrain — saisie clients (rôle actif dès maintenant)
  PENDING:      'pending',    // compte créé, en attente d'attribution de rôle par un admin

  // ⚠️ RÔLE TEMPORAIRE DE TEST — accès total à tout, comme l'admin.
  // À retirer avant la mise en production réelle. Sert uniquement
  // à tester chaque écran/fonction pendant le développement.
  TESTEUR:      'testeur_dev'
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]:       'Administrateur',
  [ROLES.CONTROLEUR]:  'Contrôleur',
  [ROLES.SUPERVISEUR]: 'Superviseur',
  [ROLES.CHEF_AGENCE]: "Chef d'agence",
  [ROLES.OPERATEUR]:   'Opérateur',
  [ROLES.TECHNICIEN]:  'Technicien',
  [ROLES.AGENT]:       'Agent terrain',
  [ROLES.PENDING]:     'En attente',
  [ROLES.TESTEUR]:     '🧪 Testeur (accès total)'
};

// Qui peut créer une agence
export const CAN_CREATE_AGENCY = [ROLES.ADMIN, ROLES.SUPERVISEUR, ROLES.TESTEUR];

// Qui voit TOUTES les agences sans restriction (vision globale).
// Le Superviseur N'EST PAS ici : il crée des agences mais ne voit ensuite
// que celles auxquelles il est explicitement rattaché (agencyIds).
export const CAN_VIEW_ALL_AGENCIES = [ROLES.ADMIN, ROLES.CONTROLEUR, ROLES.TESTEUR];

export function canCreateAgency(role) {
  return CAN_CREATE_AGENCY.includes(role);
}

export function canViewAllAgencies(role) {
  return CAN_VIEW_ALL_AGENCIES.includes(role);
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

// Pratique pour activer/désactiver rapidement tout le reste du code
// sans avoir à dupliquer "role === ROLES.ADMIN || role === ROLES.TESTEUR" partout.
export function isFullAccess(role) {
  return role === ROLES.ADMIN || role === ROLES.TESTEUR;
}

// Qui peut gérer les comptes en attente et attribuer des rôles
export function canManageUsers(role) {
  return role === ROLES.ADMIN || role === ROLES.TESTEUR;
}

// Rôles qui nécessitent obligatoirement une agence de rattachement
export const ROLES_REQUIRING_AGENCY = [
  ROLES.SUPERVISEUR, ROLES.CHEF_AGENCE, ROLES.OPERATEUR, ROLES.TECHNICIEN, ROLES.AGENT
];
export function roleRequiresAgency(role) {
  return ROLES_REQUIRING_AGENCY.includes(role);
}

// Rôles assignables par l'admin depuis l'écran "comptes en attente"
// (on exclut PENDING et TESTEUR qui ne se choisissent pas manuellement)
export const ASSIGNABLE_ROLES = [
  ROLES.ADMIN, ROLES.CONTROLEUR, ROLES.SUPERVISEUR,
  ROLES.CHEF_AGENCE, ROLES.OPERATEUR, ROLES.TECHNICIEN, ROLES.AGENT
];
