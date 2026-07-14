# Routes API Backend - Récapitulatif

**Emplacement** : `/specs/workflows/backend/`  
**Date** : 2026-07-13

Ce document liste toutes les routes API disponibles pour appeler les workflows backend.

---

## 🔐 Authentification

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/auth/login` | [auth-login](./auth-login.md) | Authentification utilisateur (JWT) |

---

## 👥 Utilisateurs

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| GET | `/api/users` | [users-management](./users-management.md) | Liste des utilisateurs |
| POST | `/api/users` | [users-management](./users-management.md) | Créer un utilisateur |
| POST | `/api/users/{id}/reset-password` | [users-management](./users-management.md) | Réinitialiser le mot de passe |

---

## 📥 Import & Synchronisation

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/import/invoices` | [import-invoice](./import-invoice.md) | Import des factures depuis SQLite |
| POST | `/api/sync/contacts` | [sync-contacts](./sync-contacts.md) | Synchronisation des contacts depuis Parse |

**Paramètres optionnels pour `/api/sync/contacts` :**
- `dryRun: true` - Mode simulation
- `contactId: "cont_abc123"` - Contact spécifique
- `since: "2026-07-01T00:00:00.000Z"` - Depuis une date

---

## 📋 Impayés

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/impayes/{id}/suspend` | [impayes-suspend](./impayes-suspend.md) | Suspendre un impayé + annuler relances |
| POST | `/api/impayes/{id}/unsuspend` | [impayes-unsuspend](./impayes-unsuspend.md) | Réactiver un impayé + régénérer relances |

---

## 📧 Relances

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/relances/generate` | [generate-relances](./generate-relances.md) | Générer les relances depuis les impayés |
| POST | `/api/relances/regenerate` | [regenerate-relances-contact](./regenerate-relances-contact.md) | Régénérer les relances d'un contact |
| POST | `/api/relances/regenerate-with-status` | [regenerate-relances-with-status](./regenerate-relances-with-status.md) | Régénérer les relances avec statut spécifique |

---

## 📨 Envoi d'Emails

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/emails/send` | [send-emails](./send-emails.md) | Envoyer les relances programmées |

---

## 📬 Suivis

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/suivis/generate` | [generate-suivi](./generate-suivi.md) | Générer les suivis depuis les événements |
| POST | `/api/suivis/send` | [send-suivi](./send-suivi.md) | Envoyer les suivis programmés |

---

## 🚫 Blacklist

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/contacts/{id}/blacklist` | [contacts-blacklist](./contacts-blacklist.md) | Basculer le statut blacklist d'un contact |

---

## 🧹 Cleanup & Maintenance

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/cleanup/relances-blacklist` | [cleanup-relances-contact-blackliste](./cleanup-relances-contact-blackliste.md) | Annuler les relances des contacts blacklistés |
| POST | `/api/cleanup/all-relances-blacklist` | [cleanup-all-relances-contact-blackliste](./cleanup-all-relances-contact-blackliste.md) | Annuler toutes les relances des contacts blacklistés (batch) |
| POST | `/api/cleanup/relances-paid` | [cleanup-all-relances-paid-impayes](./cleanup-all-relances-paid-impayes.md) | Nettoyer les relances des impayés soldés |
| POST | `/api/cleanup/orphan-relances` | [cleanup-orphan-relances](./cleanup-orphan-relances.md) | Nettoyer les relances orphelines |

---

## 🧪 Tests

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/test/relance` | [test-single](./test-single.md) | Tester la génération d'une relance unique |
| POST | `/api/test/suivi` | [test-single-suivi](./test-single-suivi.md) | Tester la génération d'un suivi unique |
| POST | `/api/smtp/test` | [test-smtp-profile](./test-smtp-profile.md) | Tester un profil SMTP |

---

## 🌐 Portail Client

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/portail/login` | [portail-client](./portail-client.md) | Authentification portail client (token) |
| GET | `/api/portail/data` | [portail-client](./portail-client.md) | Récupérer les données du portail |

---

## 🔗 Tokens & Liens Sécurisés

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/tokens/contact` | [generate-contact-token](./generate-contact-token.md) | Générer un lien magique temporaire (3 min) |
| POST | `/api/tokens/pdf` | [generate-pdf-links](./generate-pdf-links.md) | Générer un lien PDF signé (24h) |
| POST | `/api/tokens/pdf/batch` | [generate-pdf-links](./generate-pdf-links.md) | Générer des liens PDF en batch |

---

## 👤 Contacts & Impayés

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| GET | `/api/contacts/{id}/impayes` | [get-contact-impayes](./get-contact-impayes.md) | Récupérer les impayés d'un contact |

---

## ✅ Vérification Factures

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/verify/paid-invoices` | [verify-paid-invoices](./verify-paid-invoices.md) | Vérifier manuellement les factures payées |

---

## 📊 Attribution Règles

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/attribution/apply` | [appliquer-regles-attribution](./appliquer-regles-attribution.md) | Appliquer les règles d'attribution automatique |

---

## 📝 Récapitulatif par catégorie

| Catégorie | Routes |
|-----------|--------|
| **Auth** | 1 route |
| **Utilisateurs** | 3 routes |
| **Import/Sync** | 2 routes |
| **Impayés** | 2 routes |
| **Relances** | 3 routes |
| **Emails** | 1 route |
| **Suivis** | 2 routes |
| **Blacklist** | 1 route |
| **Cleanup** | 4 routes |
| **Tests** | 3 routes |
| **Portail** | 2 routes |
| **Tokens** | 3 routes |
| **Contacts** | 1 route |
| **Vérification** | 1 route |
| **Attribution** | 1 route |

**Total : 30 routes API**

---

## 🔒 Authentification requise

| Type | Routes concernées |
|------|-------------------|
| **JWT Bearer** | Toutes les routes `/api/*` (sauf routes publiques) |
| **Publique** | `/api/auth/login`, `/api/tokens/contact`, `/api/tokens/pdf` (liens magiques) |

---

## 📖 Exemples d'appel

```bash
# Login (sans auth)
curl -X POST https://dev.markidiags.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}'

# Appel authentifié
curl -X POST https://dev.markidiags.com/api/relances/generate \
  -H "Authorization: Bearer $TOKEN"

# Générer un token contact (publique - lien magique)
curl -X POST https://dev.markidiags.com/api/tokens/contact \
  -H "Content-Type: application/json" \
  -d '{"contactId":"cont_abc123"}'

# Régénérer les relances d'un contact
curl -X POST https://dev.markidiags.com/api/relances/regenerate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contactId":"cont_abc123","reason":"manual"}'

# Vérifier les factures payées
curl -X POST https://dev.markidiags.com/api/verify/paid-invoices \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📁 Fichiers de documentation

Pour chaque workflow, consulter le fichier Markdown correspondant dans `/specs/workflows/backend/` :

### Core
- `auth-login.md`
- `users-management.md`

### Import & Sync
- `import-invoice.md`
- `sync-contacts.md`

### Impayés
- `impayes-suspend.md`
- `impayes-unsuspend.md`

### Relances
- `generate-relances.md`
- `regenerate-relances-contact.md`
- `regenerate-relances-with-status.md`
- `send-emails.md`

### Suivis
- `generate-suivi.md`
- `send-suivi.md`

### Blacklist & Cleanup
- `contacts-blacklist.md`
- `cleanup-relances-contact-blackliste.md`
- `cleanup-all-relances-contact-blackliste.md`
- `cleanup-all-relances-paid-impayes.md`
- `cleanup-orphan-relances.md`

### Tests
- `test-single.md`
- `test-single-suivi.md`
- `test-smtp-profile.md`

### Portail & Tokens
- `portail-client.md`
- `generate-contact-token.md`
- `generate-pdf-links.md`

### Contacts
- `get-contact-impayes.md`

### Vérification
- `verify-paid-invoices.md`

### Attribution
- `appliquer-regles-attribution.md`