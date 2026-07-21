# Routes API Backend - Marki SQLite

**Emplacement** : `/specs/workflows/backend/`  
**Date** : 2026-07-14  
**DB** : SQLite (`backend/data/marki.db`)

---

## 🔐 Authentification

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/auth/login` | [auth-login](./auth-login.md) | Authentification utilisateur (JWT) |
| POST | `/api/auth/logout` | [auth-login](./auth-login.md) | Déconnexion (supprime session) |
| GET | `/api/auth/me` | [auth-login](./auth-login.md) | Profil utilisateur connecté |

---

## 👥 Utilisateurs

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| GET | `/api/users` | [users-management](./users-management.md) | Liste des utilisateurs (pagination) |
| GET | `/api/users/:id` | [users-management](./users-management.md) | Détail d'un utilisateur |
| POST | `/api/users` | [users-management](./users-management.md) | Créer un utilisateur (admin) |
| PUT | `/api/users/:id` | [users-management](./users-management.md) | Modifier un utilisateur |
| DELETE | `/api/users/:id` | [users-management](./users-management.md) | Désactiver un utilisateur (admin) |
| POST | `/api/users/:id/reset-password` | [users-management](./users-management.md) | Réinitialiser le mot de passe (admin) |

---

## 📋 Contacts

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| GET | `/api/contacts` | [contacts](./contacts-blacklist.md) | Liste des contacts (filtres: `?statut=actif&is_blacklisted=0`) |
| GET | `/api/contacts/:id` | [contacts](./contacts-blacklist.md) | Détail d'un contact |
| POST | `/api/contacts` | [contacts](./contacts-blacklist.md) | Créer un contact |
| PUT | `/api/contacts/:id` | [contacts](./contacts-blacklist.md) | Modifier un contact |
| DELETE | `/api/contacts/:id` | [contacts](./contacts-blacklist.md) | Supprimer un contact |
| GET | `/api/contacts/:id/impayes` | [get-contact-impayes](./get-contact-impayes.md) | Impayés d'un contact |
| POST | `/api/contacts/:id/blacklist` | [contacts-blacklist](./contacts-blacklist.md) | Basculer blacklist |
| POST | `/api/contacts/:id/notes` | [contacts-blacklist](./contacts-blacklist.md) | Ajouter une note |

---

## 💶 Impayés

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| GET | `/api/impayes` | [import-invoice](./import-invoice.md) | Liste des impayés (filtres: `?statut=impaye&facture_soldee=0`) |
| GET | `/api/impayes/:id` | [import-invoice](./import-invoice.md) | Détail d'un impayé |
| POST | `/api/impayes` | [import-invoice](./import-invoice.md) | Créer un impayé (import) |
| PUT | `/api/impayes/:id` | [import-invoice](./import-invoice.md) | Modifier un impayé |
| POST | `/api/impayes/:id/suspend` | [impayes-suspend](./impayes-suspend.md) | Suspendre un impayé |
| POST | `/api/impayes/:id/unsuspend` | [impayes-unsuspend](./impayes-unsuspend.md) | Réactiver un impayé |
| POST | `/api/impayes/:id/change-sequence` | [change-sequence-restart](./change-sequence-restart.md) + [change-sequence-continue](./change-sequence-continue.md) | Changer la séquence avec mode `restart` ou `continue` |

---

## 📧 Relances

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| GET | `/api/relances` | [generate-relances](./generate-relances.md) | Liste des relances |
| GET | `/api/relances/a-valider` | [generate-relances](./generate-relances.md) | Relances en attente de validation |
| GET | `/api/relances/a-envoyer` | [send-emails](./send-emails.md) | Relances programmées pour envoi |
| GET | `/api/relances/:id` | [generate-relances](./generate-relances.md) | Détail d'une relance |
| POST | `/api/relances` | [generate-relances](./generate-relances.md) | Créer une relance manuelle |
| PUT | `/api/relances/:id` | [generate-relances](./generate-relances.md) | Modifier une relance |
| DELETE | `/api/relances/:id` | [generate-relances](./generate-relances.md) | Supprimer une relance |
| POST | `/api/relances/:id/validate` | [generate-relances](./generate-relances.md) | Valider une relance |
| POST | `/api/relances/generate` | [generate-relances](./generate-relances.md) | Générer les relances automatiques |
| POST | `/api/relances/regenerate` | [regenerate-relances-contact](./regenerate-relances-contact.md) | Régénérer les relances d'un contact |
| POST | `/api/relances/regenerate-with-status` | [regenerate-relances-with-status](./regenerate-relances-with-status.md) | Régénérer avec statut spécifique |

---

## 📨 Envoi d'Emails

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/emails/send` | [send-emails](./send-emails.md) | Envoyer les relances programmées |

---

## 📬 Suivis

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/suivis/generate` | [generate-suivi](./generate-suivi.md) | Générer les suivis agences |
| POST | `/api/suivis/send` | [send-suivi](./send-suivi.md) | Envoyer les suivis programmés |

---

## 🔄 Séquences

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| GET | `/api/sequences` | [generate-relances](./generate-relances.md) | Liste des séquences actives |
| GET | `/api/sequences/:id` | [generate-relances](./generate-relances.md) | Détail d'une séquence |
| POST | `/api/sequences` | [generate-relances](./generate-relances.md) | Créer une séquence (admin) |
| PUT | `/api/sequences/:id` | [generate-relances](./generate-relances.md) | Modifier une séquence (admin) |
| DELETE | `/api/sequences/:id` | [generate-relances](./generate-relances.md) | Désactiver une séquence (admin) |

---

## 📤 SMTP Profiles

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| GET | `/api/smtp-profiles` | [send-emails](./send-emails.md) | Liste des profils SMTP |
| GET | `/api/smtp-profiles/:id` | [send-emails](./send-emails.md) | Détail d'un profil |
| POST | `/api/smtp-profiles` | [send-emails](./send-emails.md) | Créer un profil (admin) |
| PUT | `/api/smtp-profiles/:id` | [send-emails](./send-emails.md) | Modifier un profil (admin) |
| DELETE | `/api/smtp-profiles/:id` | [send-emails](./send-emails.md) | Désactiver un profil (admin) |

---

## 🔔 Événements

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| GET | `/api/events` | - | Liste des événements |
| GET | `/api/events/non-lus` | - | Événements non lus |
| POST | `/api/events` | - | Créer un événement |
| POST | `/api/events/:id/lu` | - | Marquer comme lu |
| POST | `/api/events/marquer-lus` | - | Marquer plusieurs comme lus |

---

## 📊 Dashboard

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| GET | `/api/dashboard/stats` | - | Statistiques globales |

---

## 📥 Import & Synchronisation

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/import/invoices` | [import-invoice](./import-invoice.md) | Import des factures depuis SQLite externe |
| POST | `/api/sync/contacts` | - | Synchronisation des contacts |
| POST | `/api/verify/paid-invoices` | [verify-paid-invoices](./verify-paid-invoices.md) | Vérifier les factures payées |

---

## 🧹 Cleanup & Maintenance

| Méthode | Route | Workflow | Description |
|---------|-------|----------|-------------|
| POST | `/api/cleanup/relances-blacklist` | [cleanup-relances-contact-blackliste](./cleanup-relances-contact-blackliste.md) | Annuler relances des contacts blacklistés |
| POST | `/api/cleanup/all-relances-blacklist` | [cleanup-all-relances-contact-blackliste](./cleanup-all-relances-contact-blackliste.md) | Annuler toutes les relances blacklistées (batch) |
| POST | `/api/cleanup/relances-paid` | [cleanup-all-relances-paid-impayes](./cleanup-all-relances-paid-impayes.md) | Nettoyer les relances des impayés soldés |
| POST | `/api/cleanup/orphan-relances` | [cleanup-orphan-relances](./cleanup-orphan-relances.md) | Nettoyer les relances orphelines |
| POST | `/api/attribution/apply` | [appliquer-regles-attribution](./appliquer-regles-attribution.md) | Appliquer les règles d'attribution automatique |

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

## 📝 Récapitulatif par catégorie

| Catégorie | Routes |
|-----------|--------|
| **Auth** | 3 routes |
| **Utilisateurs** | 5 routes |
| **Contacts** | 8 routes |
| **Impayés** | 7 routes |
| **Relances** | 10 routes |
| **Emails** | 1 route |
| **Suivis** | 2 routes |
| **Séquences** | 5 routes |
| **SMTP** | 4 routes |
| **Events** | 5 routes |
| **Dashboard** | 1 route |
| **Import/Sync** | 3 routes |
| **Cleanup** | 5 routes |
| **Portail** | 2 routes |
| **Tokens** | 3 routes |

**Total : 64 routes API**

---

## 🔒 Authentification requise

| Type | Routes concernées |
|------|-------------------|
| **JWT Bearer** | Toutes les routes `/api/*` sauf `/api/auth/login` |
| **Publique** | `/api/auth/login` |
| **Portail** | `/api/portail/*` (token spécifique) |

---

## 📖 Exemples d'appel

```bash
# Login (sans auth)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}'

# Appel authentifié
curl -X GET http://localhost:5000/api/contacts \
  -H "Authorization: Bearer $TOKEN"

# Pagination
curl -X GET "http://localhost:5000/api/contacts?limit=50&offset=100" \
  -H "Authorization: Bearer $TOKEN"

# Filtres
curl -X GET "http://localhost:5000/api/impayes?facture_soldee=0&statut=impaye" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🗄️ Schéma SQLite

Les tables SQLite sont documentées dans `/specs/data-models.md`.

Principales tables:
- `users` - Utilisateurs
- `sessions` - Sessions JWT
- `contacts` - Contacts
- `impayes` - Impayés
- `relances` - Relances
- `sequences` - Séquences
- `sequences_emails` - Emails des séquences
- `smtp_profiles` - Profils SMTP
- `events` - Événements
