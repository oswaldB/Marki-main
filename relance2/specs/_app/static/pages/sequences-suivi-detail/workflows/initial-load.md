---
id: sequences-suivi-detail-initial-load
type: frontend
folder: specs/workflows/frontend/sequences-suivi-detail/
description: Charger le détail d'une séquence de suivi avec ses étapes
depends_on: [auth-check]
screen: sequences-suivi-detail
global: false
mockup_entry: specs/mockups/sequences-suivi-detail.html
---

# sequences-suivi-detail-initial-load : Chargement initial Détail Séquence Suivi

## Description

Charger les détails complets d'une séquence de suivi : étapes éducatives, modèles et règles d'envoi.

## Étapes

```javascript
/**
 * @action Extraire l'ID de la séquence depuis l'URL (/sequences/suivi/:id)
 * @checkpoint sequence-id-extracted, paramètre URL récupéré
 */

/**
 * @action Afficher le spinner de chargement
 * @checkpoint loading-shown, overlay sur la page
 */

/**
 * @action Récupérer la séquence via GET /api/sequences/:id
 * @checkpoint sequence-fetched, données de la séquence reçues
 */

/**
 * @action Extraire les étapes depuis la clé `etapes` de la réponse
 * @checkpoint etapes-extracted, étapes de suivi disponibles
 */

/**
 * @action Extraire les modèles d'email depuis la clé `modeles_email` de la réponse
 * @checkpoint modeles-extracted, modèles éducatifs disponibles
 */

/**
 * @action Stocker les données dans le store page
 * @checkpoint data-stored, séquence de suivi complète
 */

/**
 * @action Afficher le contenu avec l'onglet 'Étapes' actif
 * @checkpoint content-rendered, interface de suivi éducatif affichée
 */
```

## Mockups de référence

- `specs/mockups/sequences-suivi-detail.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `workflow-start` | `console.log('[WORKFLOW.sequences-suivi-detail-initial-load] START: Chargement détail séquence de suivi')` |
| `sequence-id-extracted` | `console.log('[WORKFLOW.sequences-suivi-detail-initial-load] STEP: ID séquence extrait de l\'URL:', sequenceId)` |
| `auth-verified` | `console.log('[WORKFLOW.sequences-suivi-detail-initial-load] STEP: Token auth vérifié')` |
| `loading-shown` | `console.log('[WORKFLOW.sequences-suivi-detail-initial-load] STEP: Affichage spinner de chargement')` |
| `sequence-fetch-start` | `console.log('[WORKFLOW.sequences-suivi-detail-initial-load] STEP: Appel API GET /api/sequences/${sequenceId}')` |
| `sequence-fetched` | `console.log('[WORKFLOW.sequences-suivi-detail-initial-load] DATA: Séquence reçue:', {id: sequence.id, nom: sequence.nom})` |
| `etapes-extract-start` | `console.log('[WORKFLOW.sequences-suivi-detail-initial-load] STEP: Extraction des étapes depuis la clé etapes')` |
| `etapes-extracted` | `console.log('[WORKFLOW.sequences-suivi-detail-initial-load] DATA: Étapes extraites:', {count: etapes.length})` |
| `modeles-extract-start` | `console.log('[WORKFLOW.sequences-suivi-detail-initial-load] STEP: Extraction des modèles email depuis la clé modeles_email')` |
| `modeles-extracted` | `console.log('[WORKFLOW.sequences-suivi-detail-initial-load] DATA: Modèles extraits:', {count: modelesEmail.length})` |
| `data-store-start` | `console.log('[WORKFLOW.sequences-suivi-detail-initial-load] STEP: Stockage des données dans le store page')` |
| `data-stored` | `console.log('[WORKFLOW.sequences-suivi-detail-initial-load] DATA: Séquence de suivi complète stockée')` |
| `content-render-start` | `console.log('[WORKFLOW.sequences-suivi-detail-initial-load] STEP: Affichage contenu avec onglet Étapes actif')` |
| `content-rendered` | `console.log('[WORKFLOW.sequences-suivi-detail-initial-load] SUCCESS: Interface de suivi éducatif affichée')` |
| `loading-hidden` | `console.log('[WORKFLOW.sequences-suivi-detail-initial-load] STEP: Masquage du spinner de chargement')` |
| `workflow-complete` | `console.log('[WORKFLOW.sequences-suivi-detail-initial-load] END: Détail séquence de suivi chargé en', duree, 'ms')` |
| `workflow-error` | `console.error('[WORKFLOW.sequences-suivi-detail-initial-load] ERROR:', error)` |
