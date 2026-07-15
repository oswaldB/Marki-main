---
id: sequences-relance-detail-initial-load
type: frontend
folder: specs/workflows/frontend/sequences-relance-detail/
description: Charger le détail d'une séquence de relance avec ses étapes
depends_on: [auth-check]
screen: sequences-relance-detail
global: false
mockup_entry: specs/mockups/sequences-relance-detail.html
---

# sequences-relance-detail-initial-load : Chargement initial Détail Séquence Relance

## Description

Charger les détails complets d'une séquence de relance : étapes, modèles d'email, règles et aperçu.

## Étapes

```javascript
/**
 * @action Extraire l'ID de la séquence depuis l'URL (/sequences/relance/:id)
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
 * @checkpoint etapes-extracted, liste ordonnée des étapes disponible
 */

/**
 * @action Extraire les modèles d'email depuis la clé `modeles_email` de la réponse
 * @checkpoint modeles-extracted, modèles disponibles pour la séquence
 */

/**
 * @action Extraire les règles d'attribution depuis la clé `regles_attribution` de la réponse
 * @checkpoint regles-extracted, configuration de la séquence disponible
 */

/**
 * @action Récupérer les liens de paiement actifs via GET /api/liens-paiement?statut=actif
 * @checkpoint liens-fetched, liens de paiement actifs reçus
 */

/**
 * @action Stocker toutes les données dans le store page
 * @checkpoint data-stored, sequence complète avec étapes et modèles
 */

/**
 * @action Afficher le contenu avec l'onglet 'Étapes' actif par défaut
 * @checkpoint content-rendered, timeline des étapes visible
 */
```

## Mockups de référence

- `specs/mockups/sequences-relance-detail.html`

## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `sequence-id-extracted` | `console.log('[WORKFLOW.sequences-relance-detail-initial-load] STEP: ID séquence extrait depuis URL:', sequenceId)` |
| `loading-shown` | `console.log('[WORKFLOW.sequences-relance-detail-initial-load] START: Affichage spinner chargement')` |
| `sequence-fetch-start` | `console.log('[WORKFLOW.sequences-relance-detail-initial-load] STEP: Appel API GET /api/sequences/' + sequenceId)` |
| `sequence-fetched` | `console.log('[WORKFLOW.sequences-relance-detail-initial-load] DATA: Séquence reçue:', {id: sequence.id, nom: sequence.nom})` |
| `etapes-extracted` | `console.log('[WORKFLOW.sequences-relance-detail-initial-load] DATA: Étapes extraites:', {count: etapes.length})` |
| `modeles-extracted` | `console.log('[WORKFLOW.sequences-relance-detail-initial-load] DATA: Modèles email extraits:', {count: modeles.length})` |
| `regles-extracted` | `console.log('[WORKFLOW.sequences-relance-detail-initial-load] DATA: Règles attribution extraites:', {count: regles.length})` |
| `liens-fetch-start` | `console.log('[WORKFLOW.sequences-relance-detail-initial-load] STEP: Appel API GET /api/liens-paiement?statut=actif')` |
| `liens-fetched` | `console.log('[WORKFLOW.sequences-relance-detail-initial-load] DATA: Liens paiement actifs reçus:', {count: liens.length})` |
| `data-stored` | `console.log('[WORKFLOW.sequences-relance-detail-initial-load] STEP: Données stockées dans le store page')` |
| `tab-etapes-active` | `console.log('[WORKFLOW.sequences-relance-detail-initial-load] STEP: Onglet Étapes activé par défaut')` |
| `timeline-rendered` | `console.log('[WORKFLOW.sequences-relance-detail-initial-load] DATA: Timeline des étapes rendue')` |
| `content-rendered` | `console.log('[WORKFLOW.sequences-relance-detail-initial-load] SUCCESS: Contenu séquence rendu')` |
| `loading-complete` | `console.log('[WORKFLOW.sequences-relance-detail-initial-load] END: Détail séquence chargé en', duree, 'ms')` |
| `loading-error` | `console.error('[WORKFLOW.sequences-relance-detail-initial-load] ERROR:', error)` |
