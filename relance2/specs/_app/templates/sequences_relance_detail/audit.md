# Audit API - Page Séquences Relance Détail

**Date**: 2024-07-16
**Page**: sequences_relance_detail

## Workflows et Appels API

| Workflow | Endpoint | Méthode | Statut | Notes |
|----------|----------|---------|--------|-------|
| initial-load | `/api/sequences/{id}` | GET | ✅ Route à vérifier | Chargement de la séquence |
| sauvegarder | `/api/sequences/{id}` | PUT | ✅ Route à vérifier | Sauvegarde modifications |
| toggle-validation | `/api/sequences/{id}/validation` | POST | ⚠️ Route manquante? | Activer/désactiver validation |
| toggle-publication | `/api/sequences/{id}/publier` | POST | ✅ Route existante | Publier/dépublier |
| ajouter-email | Frontend uniquement | - | ✅ State local | Ajouter étape email |
| supprimer-email | Frontend uniquement | - | ✅ State local | Supprimer étape |
| tester-email | `/api/sequences/{id}/tester` | POST | ⚠️ Route manquante? | Envoi email test |
| select-scenario-* | Frontend uniquement | - | ✅ State local | Sélection scénario |
| toggle-attribution-auto | Frontend uniquement | - | ✅ State local | Toggle attributions |
| lancer-attribution | `/api/sequences/{id}/attribution` | POST | ⚠️ Route manquante? | Lancer attribution auto |
| open-chatgpt | Externe (OpenAI) | - | ✅ External API | Ouverture ChatGPT |
| open-ia-modal | Frontend uniquement | - | ✅ State local | Modal IA |
| copy-variable | Frontend uniquement | - | ✅ State local | Copie presse-papiers |
| copy-lien | Frontend uniquement | - | ✅ State local | Copie presse-papiers |
| open-liens-paiement | Frontend uniquement | - | ✅ State local | Navigation |
| supprimer-groupe | Frontend uniquement | - | ✅ State local | Suppression groupe |
| toggle-email | Frontend uniquement | - | ✅ State local | Toggle type email |

## Routes Requises (à vérifier dans routes/sequences.md)

### Routes CRUD de base (probablement existantes)
- `GET /api/sequences/{id}` - Récupérer une séquence
- `PUT /api/sequences/{id}` - Modifier une séquence

### Routes spécifiques (à vérifier/créer)
- `POST /api/sequences/{id}/validation` - Toggle validation
- `POST /api/sequences/{id}/publier` - Toggle publication  
- `POST /api/sequences/{id}/tester` - Tester email
- `POST /api/sequences/{id}/attribution` - Lancer attribution

## Couverture

⚠️ **À VÉRIFIER** - Routes CRUD probablement OK, mais routes spécifiques à confirmer.

## Actions Requises

1. Vérifier dans `routes/sequences.md` si les routes spécifiques existent
2. Si manquantes, créer les routes dans le backend
3. Sinon, utiliser des routes workflow existantes (`/api/workflow/*`)
