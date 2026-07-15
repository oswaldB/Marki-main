---
id: settings-smtp-initial-load
type: frontend
folder: specs/workflows/frontend/settings-smtp/
description: Charger les profils SMTP configurés
depends_on: [auth-check]
screen: settings-smtp
global: false
mockup_entry: specs/mockups/settings-smtp.html
---

# settings-smtp-initial-load : Chargement initial Profils SMTP

## Description

Charger la liste des profils SMTP avec leur statut et statistiques d'envoi.

## Étapes

```javascript
/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, liste en chargement
 */

/**
 * @action Récupérer les profils SMTP via GET /api/smtp-profiles
 * @checkpoint profils-fetched, profils SMTP reçus (sans mots de passe)
 */

/**
 * @action Les profils SMTP sont récupérés avec leur statut actif/inactif
 * @checkpoint profils-fetched, profils SMTP reçus (sans mots de passe)
 * 
 * **Note** : Pas de stats d'envoi. Seuls les champs de configuration sont retournés.
 */

/**
 * @action Stocker les données dans Alpine.store('smtp')
 * @checkpoint data-stored, profils avec stats disponibles
 */

/**
 * @action Rendre la liste des profils avec indicateurs de statut
 * @checkpoint list-rendered, badges actif/inactif et boutons test visibles
 */
```

## Mockups de référence

- `specs/mockups/settings-smtp.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `loading-shown` | `console.log('[WORKFLOW.settings-smtp-initial-load] START: Affichage spinner chargement')` |
| `auth-verified` | `console.log('[WORKFLOW.settings-smtp-initial-load] STEP: Token auth vérifié')` |
| `profils-fetch-start` | `console.log('[WORKFLOW.settings-smtp-initial-load] STEP: Appel API GET /api/smtp-profiles')` |
| `profils-fetched` | `console.log('[WORKFLOW.settings-smtp-initial-load] DATA: Profils SMTP reçus:', {count: profils.length})` |
| `data-store-start` | `console.log('[WORKFLOW.settings-smtp-initial-load] STEP: Stockage données dans Alpine.store(smtp)')` |
| `data-stored` | `console.log('[WORKFLOW.settings-smtp-initial-load] DATA: Profils stockés dans Alpine.store(smtp)')` |
| `list-render-start` | `console.log('[WORKFLOW.settings-smtp-initial-load] STEP: Rendu liste des profils avec badges')` |
| `list-rendered` | `console.log('[WORKFLOW.settings-smtp-initial-load] SUCCESS: Liste profils rendue:', {count: profils.length, actifs: actifsCount})` |
| `mask-credentials-start` | `console.log('[WORKFLOW.settings-smtp-initial-load] STEP: Masquage mots de passe dans laffichage')` |
| `mask-credentials-done` | `console.log('[WORKFLOW.settings-smtp-initial-load] SUCCESS: Mots de passe masqués')` |
| `loading-complete` | `console.log('[WORKFLOW.settings-smtp-initial-load] END: Profils SMTP chargés en', duree, 'ms')` |
| `loading-error` | `console.error('[WORKFLOW.settings-smtp-initial-load] ERROR:', error)` |
