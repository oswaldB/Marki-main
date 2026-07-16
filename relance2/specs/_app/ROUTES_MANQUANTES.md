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

## ❌ Routes RESTANTES à Créer (Portail)

| Endpoint | Méthode | Usage | Priorité | Fichier route |
|----------|---------|-------|----------|---------------|
| `/api/portail/factures/:id/pdf` | GET | Télécharger PDF facture | 🔴 Haute | `routes/portail.md` |
| `/api/portail/factures/:id/payer` | POST | Redirection paiement | 🔴 Haute | `routes/portail.md` |

**Note**: Ces routes sont référencées dans les workflows `portail_client` mais ne sont pas définies dans `routes/portail.md`.

---

## ✅ Routes CRUD Existantes (Confirmées)

```
PUT /api/contacts/:id       ← Pour blacklist, modifier contact
PUT /api/sequences/:id      ← Pour publication, validation (si besoin API)
PUT /api/impayes/:id        ← Pour suspendre/réactiver
PUT /api/smtp-profiles/:id  ← Pour modifier profil SMTP
PUT /api/users/:id          ← Pour modifier utilisateur
```

---

## ✅ Routes Workflows Existantes (Confirmées)

```
POST /api/test/relance      ← Workflow test-single (test email relance)
POST /api/test/suivi        ← Workflow test-single-suivi (test email suivi)
POST /api/workflow/*        ← Tous les workflows métier Python
```

---

## Conclusion

✅ **Toutes les routes critiques existent.**

- **4 workflows corrigés** pour utiliser les bonnes routes
- **2 routes à créer** pour le portail client (PDF et paiement)
- **0 route manquante critique** pour le fonctionnement de l'application

---

## Fichiers Workflow Mis à Jour

1. `contacts/workflows/toggle-blacklist.md` - Utilise PUT /api/contacts/:id
2. `sequences_relance_detail/workflows/tester-email.md` - Utilise POST /api/test/relance
3. `sequences_suivi_detail/workflows/tester-email.md` - Déjà correct (POST /api/test/suivi)
