# Routes API - Vérification Finale

**Date**: 2024-07-16  
**Status**: ⚠️ Routes manquantes identifiées - Workflows frontend à corriger

---

## ❌ Routes INEXISTANTES - Workflows à corriger

### 1. `/api/contacts/:id/blacklist` (POST)
- **Référencé dans**: `contacts/workflows/toggle-blacklist.md`
- **Route réelle**: `PUT /api/contacts/:id` avec body `{blacklist: true/false}`
- **Action**: Corriger le workflow pour utiliser PUT

### 2. `/api/sequences/:id/publier` (POST)
- **Référencé dans**: `sequences_relance_detail/workflows/toggle-publication.md`
- **Route réelle**: `PUT /api/sequences/:id` avec body `{active: true/false}`
- **Action**: Corriger le workflow pour utiliser PUT

### 3. `/api/sequences/:id/validation` (POST)
- **Référencé dans**: `sequences_relance_detail/workflows/toggle-validation.md`
- **Route réelle**: `PUT /api/sequences/:id` avec body `{validation: true/false}`
- **Action**: Corriger le workflow pour utiliser PUT

### 4. `/api/sequences/:id/tester` (POST)
- **Référencé dans**: `sequences_*_detail/workflows/tester-email.md`
- **Route réelle**: AUCUNE - Tester un email doit passer par un workflow backend
- **Action**: Utiliser `POST /api/workflows/test-email-sequence` ou créer cette route

### 5. `/api/portail/factures/:id/pdf` (GET)
- **Référencé dans**: `portail_client/workflows/download-facture.md`
- **Route réelle**: AUCUNE dans portail.md
- **Action**: Nécessite création route ou changement d'approche

### 6. `/api/portail/factures/:id/payer` (POST)
- **Référencé dans**: `portail_client/workflows/regler-facture.md`
- **Route réelle**: AUCUNE dans portail.md
- **Action**: Nécessite création route ou changement d'approche

---

## ✅ Correction Immédiate - Pattern CRUD

Les workflows suivants doivent être mis à jour :

| Workflow | Ancien Endpoint | Nouveau Endpoint | Méthode |
|----------|-----------------|------------------|---------|
| toggle-blacklist | `/api/contacts/:id/blacklist` | `/api/contacts/:id` | PUT |
| toggle-publication | `/api/sequences/:id/publier` | `/api/sequences/:id` | PUT |
| toggle-validation | `/api/sequences/:id/validation` | `/api/sequences/:id` | PUT |

---

## 🔧 Routes à Créer (si nécessaire)

| Endpoint | Méthode | Usage | Priorité |
|----------|---------|-------|----------|
| `/api/workflows/test-email-sequence` | POST | Tester un email de séquence | 🟡 Moyenne |
| `/api/portail/factures/:id/pdf` | GET | Télécharger PDF facture | 🔴 Haute |
| `/api/portail/factures/:id/payer` | POST | Redirection paiement | 🔴 Haute |

---

## ✅ Routes CRUD Existantes (à utiliser)

```
PUT /api/contacts/:id       ← Pour blacklist
PUT /api/sequences/:id      ← Pour publication/validation
PUT /api/impayes/:id          ← Pour suspendre/réactiver
PUT /api/smtp-profiles/:id    ← Pour modifier profil SMTP
PUT /api/users/:id            ← Pour modifier utilisateur
```

---

## Notes

- Les routes PUT existantes permettent de modifier n'importe quel champ
- Les workflows frontend doivent utiliser ces routes CRUD génériques
- Les routes spécifiques comme `/publier`, `/blacklist` n'existent pas
