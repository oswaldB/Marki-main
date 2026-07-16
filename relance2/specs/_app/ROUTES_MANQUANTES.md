# Routes API - Vérification Finale

**Date**: 2024-07-16  
**Status**: ✅ Toutes les routes utilisées par les workflows frontend existent

---

## ✅ Routes Vérifiées et Corrigées

### 1. `/api/contacts/:id` (PUT) - CORRIGÉ
- **Ancienne croyance**: `POST /api/contacts/:id/blacklist` inexistant
- **Réalité**: Route CRUD PUT existante
- **Workflow corrigé**: `contacts/workflows/toggle-blacklist.md`
- **Usage**: `PUT /api/contacts/:id` avec body `{is_blacklisted: true/false}`

### 2. `/api/sequences/:id` (PUT) - PAS D'APPEL API
- **Ancienne croyance**: `POST /api/sequences/:id/publier` inexistant
- **Réalité**: Les workflows `toggle-publication.md` et `toggle-validation.md` sont des actions frontend uniquement (state local)
- **Pas de correction nécessaire**

### 3. `/api/test/relance` (POST) - EXISTE ✅
- **Ancienne croyance**: Route manquante
- **Réalité**: Workflow backend `test-single` existe avec route `POST /api/test/relance`
- **Fichier spec**: `specs/workflows/backend/test-single.md`
- **Workflow corrigé**: `sequences_relance_detail/workflows/tester-email.md`

### 4. `/api/test/suivi` (POST) - EXISTE ✅
- **Ancienne croyance**: Route manquante  
- **Réalité**: Workflow backend `test-single-suivi` existe avec route `POST /api/test/suivi`
- **Fichier spec**: `specs/workflows/backend/test-single-suivi.md`
- **Workflow corrigé**: `sequences_suivi_detail/workflows/tester-email.md` (déjà OK)

---

## ✅ Routes Portail - DÉJÀ CORRECTES

### PDF Facture
- **Workflow**: `portail_client/workflows/download-facture.md`
- **Méthode**: `POST /functions/generatePdfLink` (Cloud Function)
- **Note**: Le PDF est généré via une Cloud Function, pas une route API classique. C'est correct ainsi.

### Paiement Facture - CORRIGÉ
- **Workflows**: `portail_client/workflows/regler-facture.md` et `portail_mission/workflows/regler-facture.md`
- **Champ utilisé**: `lien_paiement` (stocké dans la table `impayes`)
- **Méthode**: Récupération directe depuis les données de l'impayé retournées par `GET /api/portail/data`
- **Note**: Le lien est généré/géré côté backend (Stripe, PayPal, etc.) et stocké dans le champ `lien_paiement` de la table `impayes`. Le frontend utilise simplement ce lien pour rediriger l'utilisateur.

**Pas de routes à créer pour le portail** - Les workflows utilisent déjà les bonnes méthodes.

---

## ✅ Récapitulatif Final

| Endpoint | Méthode | Usage | Existe ? |
|----------|---------|-------|----------|
| `/api/contacts/:id` | PUT | Blacklist contact | ✅ Route CRUD |
| `/api/sequences/:id` | PUT | Modification séquence | ✅ Route CRUD |
| `/api/test/relance` | POST | Test email relance | ✅ Workflow backend |
| `/api/test/suivi` | POST | Test email suivi | ✅ Workflow backend |
| `/functions/generatePdfLink` | POST | Générer lien PDF | ✅ Cloud Function |
| `impayes.lien_paiement` | champ | Paiement externe | ✅ Champ DB |

---

## ✅ Conclusion

**Aucune route manquante.**

Tous les workflows frontend utilisent correctement :
- Routes CRUD standards existantes
- Cloud Functions pour les cas spécifiques (PDF)
- Champs de base de données (lien_paiement dans impayes)
- Workflows backend pour les opérations complexes (test email)

---

## Fichiers Workflow Finalisés

1. `contacts/workflows/toggle-blacklist.md` - ✅ Utilise PUT /api/contacts/:id
2. `sequences_relance_detail/workflows/tester-email.md` - ✅ Utilise POST /api/test/relance
3. `sequences_suivi_detail/workflows/tester-email.md` - ✅ Utilise POST /api/test/suivi
4. `portail_client/workflows/download-facture.md` - ✅ Utilise /functions/generatePdfLink
5. `portail_client/workflows/regler-facture.md` - ✅ Utilise impayes.lien_paiement
6. `portail_mission/workflows/regler-facture.md` - ✅ Utilise impayes.lien_paiement
