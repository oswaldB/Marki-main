# settings/workflows/initial-load.js

Chargement initial des données.

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `loading-shown` | `console.log('[WORKFLOW.settings-initial-load] START: Affichage spinner chargement')` |
| `auth-verified` | `console.log('[WORKFLOW.settings-initial-load] STEP: Token auth vérifié')` |
| `user-fetch-start` | `console.log('[WORKFLOW.settings-initial-load] STEP: Appel API GET /api/user/profile')` |
| `user-fetched` | `console.log('[WORKFLOW.settings-initial-load] DATA: Profil utilisateur reçu:', user)` |
| `preferences-fetch-start` | `console.log('[WORKFLOW.settings-initial-load] STEP: Appel API GET /api/settings/preferences')` |
| `preferences-fetched` | `console.log('[WORKFLOW.settings-initial-load] DATA: Préférences reçues:', preferences)` |
| `form-render-start` | `console.log('[WORKFLOW.settings-initial-load] STEP: Rendu formulaire settings')` |
| `form-rendered` | `console.log('[WORKFLOW.settings-initial-load] SUCCESS: Formulaire affiché')` |
| `loading-complete` | `console.log('[WORKFLOW.settings-initial-load] END: Settings chargés en', duree, 'ms')` |
| `loading-error` | `console.error('[WORKFLOW.settings-initial-load] ERROR:', error)` |
