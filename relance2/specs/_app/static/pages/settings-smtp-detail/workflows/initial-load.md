---
id: settings-smtp-detail-initial-load
type: frontend
folder: specs/workflows/frontend/settings-smtp-detail/
description: Charger le détail d'un profil SMTP avec historique et stats
depends_on: [auth-check]
screen: settings-smtp-detail
global: false
mockup_entry: specs/mockups/settings-smtp-detail.html
---

# settings-smtp-detail-initial-load : Chargement initial Détail Profil SMTP

## Description

Charger les informations complètes d'un profil SMTP, son historique d'envoi et ses statistiques.

## Étapes

```javascript
/**
 * @action Extraire l'ID du profil depuis l'URL (/settings/smtp/:id)
 * @checkpoint profil-id-extracted, paramètre URL récupéré
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, overlay sur la page
 */

/**
 * @action Récupérer le profil via GET /api/smtp-profiles/:id
 * @checkpoint profil-fetched, configuration SMTP reçue
 */

/**
 * @action Le profil SMTP est récupéré avec toutes ses informations de configuration
 * @checkpoint profil-fetched, configuration SMTP reçue
 * 
 * **Note** : Pas d'historique d'envoi ni de stats. Seule la configuration est affichée et modifiable.
 */

/**
 * @action Stocker les données dans le store page
 * @checkpoint data-stored, profil disponible pour édition
 */

/**
 * @action Afficher le contenu avec l'onglet 'Configuration' actif
 * @checkpoint content-rendered, formulaire de configuration affiché
 */
```

## Mockups de référence

- `specs/mockups/settings-smtp-detail.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `profil-id-extracted` | `console.log('[WORKFLOW.settings-smtp-detail-initial-load] START: Extraction ID profil depuis URL')` |
| `loading-shown` | `console.log('[WORKFLOW.settings-smtp-detail-initial-load] STEP: Affichage spinner chargement')` |
| `profil-fetch-start` | `console.log('[WORKFLOW.settings-smtp-detail-initial-load] STEP: Appel API GET /api/smtp-profiles/:id')` |
| `profil-fetched` | `console.log('[WORKFLOW.settings-smtp-detail-initial-load] DATA: Profil SMTP reçu:', profil)` |
| `data-stored` | `console.log('[WORKFLOW.settings-smtp-detail-initial-load] STEP: Stockage profil dans store page')` |
| `tab-activate-config` | `console.log('[WORKFLOW.settings-smtp-detail-initial-load] STEP: Activation onglet Configuration')` |
| `form-rendered` | `console.log('[WORKFLOW.settings-smtp-detail-initial-load] STEP: Rendu formulaire de configuration')` |
| `content-rendered` | `console.log('[WORKFLOW.settings-smtp-detail-initial-load] STEP: Affichage contenu complet')` |
| `loading-complete` | `console.log('[WORKFLOW.settings-smtp-detail-initial-load] END: Détail profil SMTP chargé en', duree, 'ms')` |
| `loading-error` | `console.error('[WORKFLOW.settings-smtp-detail-initial-load] ERROR:', error)` |
