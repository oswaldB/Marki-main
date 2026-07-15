# settings-users/workflows/initial-load.js

Charge la liste des utilisateurs.

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `loading-shown` | `console.log('[WORKFLOW.settings-users-initial-load] START: Affichage spinner chargement')` |
| `auth-verified` | `console.log('[WORKFLOW.settings-users-initial-load] STEP: Token auth vérifié')` |
| `users-fetch-start` | `console.log('[WORKFLOW.settings-users-initial-load] STEP: Appel API GET /api/users')` |
| `users-fetched` | `console.log('[WORKFLOW.settings-users-initial-load] DATA: Utilisateurs reçus:', {count: users.length})` |
| `roles-fetch-start` | `console.log('[WORKFLOW.settings-users-initial-load] STEP: Appel API GET /api/roles')` |
| `roles-fetched` | `console.log('[WORKFLOW.settings-users-initial-load] DATA: Rôles reçus:', {count: roles.length})` |
| `table-rendered` | `console.log('[WORKFLOW.settings-users-initial-load] SUCCESS: Tableau utilisateurs rendu')` |
| `loading-complete` | `console.log('[WORKFLOW.settings-users-initial-load] END: Settings users chargés en', duree, 'ms')` |
| `loading-error` | `console.error('[WORKFLOW.settings-users-initial-load] ERROR:', error)` |
