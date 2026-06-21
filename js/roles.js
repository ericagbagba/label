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
  PENDING:      'pending'     // compte créé, en attente d'attribution de rôle par un admin
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]:       'Administrateur',
  [ROLES.CONTROLEUR]:  'Contrôleur',
  [ROLES.SUPERVISEUR]: 'Superviseur',
  [ROLES.CHEF_AGENCE]: "Chef d'agence",
  [ROLES.OPERATEUR]:   'Opérateur',
  [ROLES.TECHNICIEN]:  'Technicien',
  [ROLES.AGENT]:       'Agent terrain',
  [ROLES.PENDING]:     'En attente'
};

// Qui peut créer une agence
export const CAN_CREATE_AGENCY = [ROLES.ADMIN, ROLES.SUPERVISEUR];

// Qui voit toutes les agences (vs seulement la sienne)
export const CAN_VIEW_ALL_AGENCIES = [ROLES.ADMIN, ROLES.SUPERVISEUR, ROLES.CONTROLEUR];

export function canCreateAgency(role) {
  return CAN_CREATE_AGENCY.includes(role);
}

export function canViewAllAgencies(role) {
  return CAN_VIEW_ALL_AGENCIES.includes(role);
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}
