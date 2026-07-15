# portail/workflows/initial-load.js

Chargement initial des données.

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.portail-initial-load] START: Chargement initial du portail')` |
| `auth-check-start` | `console.log('[WORKFLOW.portail-initial-load] STEP: Vérification de la session utilisateur')` |
| `auth-checked` | `console.log('[WORKFLOW.portail-initial-load] STEP: Session vérifiée, utilisateur authentifié')` |
| `content-rendered` | `console.log('[WORKFLOW.portail-initial-load] STEP: Contenu du portail rendu dans le DOM')` |
| `redirect` | `console.log('[WORKFLOW.portail-initial-load] STEP: Redirection éventuelle vers', targetRoute)` |
| `end` | `console.log('[WORKFLOW.portail-initial-load] SUCCESS: Portail chargé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.portail-initial-load] ERROR:', error)` |
