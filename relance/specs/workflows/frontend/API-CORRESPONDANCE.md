# Correspondance Appels API Frontend → Backend

**Date** : 2026-07-13

Ce document mappe tous les appels API décrits dans les workflows frontend vers :
- **Routes API Backend** (workflows spécifiques)
- **Opérations CRUD** via `flat-file-db.js` (GET/POST/PUT/DELETE standard)

---

## 📊 Récapitulatif Global

| Type | Nombre | Description |
|------|--------|-------------|
| **Workflows Backend** | 30 routes | Workflows métier spécifiques (ROUTES.md) |
| **CRUD Standard** | 8 collections | Opérations natives via flat-file-db.js |

### Collections CRUD disponibles (flat-file-db.js)
- `contacts` - Contacts/payeurs
- `impayes` - Impayés/factures
- `relances` - Relances emails
- `sequences` - Séquences de relance (contient les templates et étapes en clé)
- `smtp_profiles` - Profils SMTP
- `users` - Utilisateurs
- `sessions` - Sessions auth
- `smart_marki` - Suggestions/actions IA (Smart Marki)
- `payment_links` - Configuration liens de paiement (portail client)

---

## 🔐 AUTHENTIFICATION

### Login
| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `login/auth-submit.md` | POST | `/api/auth/login` | **Workflow Backend** → [auth-login](../backend/auth-login.md) |
| `login/initial-load.md` | GET | `/api/auth/me` | **CRUD** → `users.readSecure()` |

---

## 👥 UTILISATEURS

| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `settings-utilisateurs/initial-load.md` | GET | `/api/users` | **CRUD** → `users.query()` |
| `settings-utilisateurs/create-user.md` | POST | `/api/users` | **Workflow Backend** → [users-management](../backend/users-management.md) |
| `settings-utilisateurs/update-user.md` | PUT | `/api/users/:id` | **CRUD** → `users.updateSecure()` |

---

## 📋 IMPAYÉS

### Liste & Filtres
| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `impayes/initial-load.md` | GET | `/api/impayes?facture_soldee=false` | **CRUD** → `impayes.query()` |
| `impayes/sort-by-*.md` (x5) | GET | `/api/impayes?sort=xxx` | **CRUD** → `impayes.query()` |
| `impayes/pagination-*.md` | GET | `/api/impayes?skip=:skip` | **CRUD** → `impayes.query()` |
| `dashboard/initial-load.md` | GET | `/api/impayes?status=unpaid` | **CRUD** → `impayes.query()` |
| `dashboard/initial-load.md` | GET | `/api/impayes?is_new=true` | **CRUD** → `impayes.query()` |
| `impayes-reparer/view-reparer.md` | GET | `/api/impayes?a_reparer=true` | **CRUD** → `impayes.query()` |
| `impayes-suspendus/initial-load.md` | GET | `/api/impayes?is_suspended=true` | **CRUD** → `impayes.query()` |
| `portail-client/initial-load.md` | GET | `/api/impayes?payer_id=:id` | **CRUD** → `impayes.query()` |

### Détail & Modification
| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `impayes-detail/initial-load.md` | GET | `/api/impayes/:id` | **CRUD** → `impayes.read()` |
| `impayes/open-detail.md` | GET | `/api/impayes/:id` | **CRUD** → `impayes.read()` |
| `impayes-detail/changer-sequence.md` | PUT | `/api/impayes/:id` | **CRUD** → `impayes.update()` |
| `impayes-detail/blacklist-facture.md` | PUT | `/api/impayes/:id` | **CRUD** → `impayes.update()` |
| `impayes/save-note.md` | PUT | `/api/impayes/:id` | **CRUD** → `impayes.update()` |
| `impayes/suspend-facture.md` | PUT | `/api/impayes/:id` | **CRUD** → `impayes.update()` |
| `impayes/unsuspend-facture.md` | PUT | `/api/impayes/:id` | **CRUD** → `impayes.update()` |

### Workflows Suspend/Unsuspend
| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `impayes-detail/suspend-facture.md` | POST | `/api/impayes/:id/suspend` | **Workflow Backend** → [impayes-suspend](../backend/impayes-suspend.md) |
| `impayes-detail/unsuspend-facture.md` | POST | `/api/impayes/:id/unsuspend` | **Workflow Backend** → [impayes-unsuspend](../backend/impayes-unsuspend.md) |
| `impayes-suspendus/reactivate-impaye.md` | POST | `/api/impayes/:id/unsuspend` | **Workflow Backend** → [impayes-unsuspend](../backend/impayes-unsuspend.md) |

---

## 📧 RELANCES

### Liste
| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `relances/initial-load.md` | GET | `/api/relances` | **CRUD** → `relances.query()` |
| `relances-calendrier/initial-load.md` | GET | `/api/relances` | **CRUD** → `relances.query()` |
| `relances-validation/initial-load.md` | GET | `/api/relances?valide=false` | **CRUD** → `relances.query()` |
| `dashboard/initial-load.md` | GET | `/api/relances?date=today` | **CRUD** → `relances.query()` |
| `impayes-detail/initial-load.md` | GET | `/api/relances?impaye_ids=:id` | **CRUD** → `relances.query()` |

### CRUD
| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `relances/create-relance.md` | POST | `/api/relances` | **CRUD** → `relances.create()` |
| `relances-validation/save-changes.md` | PUT | `/api/relances/:id` | **CRUD** → `relances.update()` |
| `relances-validation/valider-relance.md` | PUT | `/api/relances/:id` | **CRUD** → `relances.update()` |
| `relances-calendrier/save-edit.md` | PUT | `/api/relances/:id` | **CRUD** → `relances.update()` |
| `relances/cancel-relance.md` | DELETE | `/api/relances/:id` | **CRUD** → `relances.delete()` |
| `relances-validation/supprimer-relance.md` | DELETE | `/api/relances/:id` | **CRUD** → `relances.delete()` |

### Workflows Backend
| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `relances-validation/suspendre-relance.md` | POST | `/api/relances/:id/suspend` | **Workflow Backend** → [impayes-suspend](../backend/impayes-suspend.md) |
| `relances-validation/blacklister-relance.md` | POST | `/api/contacts/:id/blacklist` | **Workflow Backend** → [contacts-blacklist](../backend/contacts-blacklist.md) |

---

## 📬 SUIVIS

### Génération & Envoi
| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| *(génération automatique)* | POST | `/api/suivis/generate` | **Workflow Backend** → [generate-suivi](../backend/generate-suivi.md) |
| *(envoi automatique)* | POST | `/api/suivis/send` | **Workflow Backend** → [send-suivi](../backend/send-suivi.md) |

---

## 👤 CONTACTS

### Liste & Stats
| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `contacts/initial-load.md` | GET | `/api/contacts?include=facturesCount` | **CRUD** → `contacts.query()` + count |
| `contacts/initial-load.md` | GET | `/api/contacts/stats` | **CRUD** → `contacts.query()` (agrégation) |
| `impayes-payeur/initial-load.md` | GET | `/api/contacts` | **CRUD** → `contacts.query()` |
| `impayes-payeur/initial-load.md` | GET | `/api/impayes` | **CRUD** → `impayes.query()` |

### Détail & Modification
| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `impayes-detail/initial-load.md` | GET | `/api/contacts/:payer_id` | **CRUD** → `contacts.read()` |
| `portail-mission/initial-load.md` | GET | `/api/contacts/:payer_id` | **CRUD** → `contacts.read()` |
| `contacts/set-email-force.md` | PUT | `/api/contacts/:id` | **CRUD** → `contacts.update()` |
| `impayes-payeur/save-note.md` | PUT | `/api/contacts/:id` | **CRUD** → `contacts.update()` |

### Workflow Backend
| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `sync-contacts.md` | POST | `/api/sync/contacts` | **Workflow Backend** → [sync-contacts](../backend/sync-contacts.md) |

---

## 🔗 SÉQUENCES

| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `sequences/initial-load.md` | GET | `/api/sequences` | **CRUD** → `sequences.query()` |
| `impayes-detail/changer-sequence.md` | GET | `/api/sequences?actif=true` | **CRUD** → `sequences.query()` |
| `sequences-relance-detail/initial-load.md` | GET | `/api/sequences/:id` | **CRUD** → `sequences.read()` (contient `etapes` et `templates` en clé) |
| `sequences-suivi-detail/initial-load.md` | GET | `/api/sequences/:id` | **CRUD** → `sequences.read()` (contient `etapes` et `templates` en clé) |
| `sequences/create-sequence.md` | POST | `/api/sequences` | **CRUD** → `sequences.create()` (avec `etapes` et `templates` en clé) |
| `sequences/duplicate-sequence.md` | POST | `/api/sequences` | **CRUD** → `sequences.create()` (duplication avec `etapes` et `templates`) |
| `sequences-relance-detail/sauvegarder.md` | PUT | `/api/sequences/:id` | **CRUD** → `sequences.update()` (met à jour `etapes` et `templates` en clé) |
| `sequences-suivi-detail/sauvegarder.md` | PUT | `/api/sequences/:id` | **CRUD** → `sequences.update()` (met à jour `etapes` et `templates` en clé) |

> **Note** : Les templates d'emails et les étapes sont intégrés dans la collection `sequences` sous forme de clés (`etapes`, `templates`). Pas de routes `/api/templates` ou `/api/sequences/:id/etapes` séparées.

---

## ⚙️ SMTP PROFILES

| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `settings-smtp/initial-load.md` | GET | `/api/smtp-profiles` | **CRUD** → `smtp_profiles.query()` |
| `settings-smtp-detail/initial-load.md` | GET | `/api/smtp-profiles/:id` | **CRUD** → `smtp_profiles.read()` |
| `settings-smtp/create-profil.md` | POST | `/api/smtp-profiles` | **CRUD** → `smtp_profiles.create()` |
| `settings-smtp-detail/save-changes.md` | PUT | `/api/smtp-profiles/:id` | **CRUD** → `smtp_profiles.update()` |
| `settings-smtp/confirm-delete.md` | DELETE | `/api/smtp-profiles/:id` | **CRUD** → `smtp_profiles.delete()` |

### Workflows Backend
| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `settings-smtp/test-profil.md` | POST | `/api/smtp/test` | **Workflow Backend** → [test-smtp-profile](../backend/test-smtp-profile.md) |
| `settings-smtp-detail/tester-connexion.md` | POST | `/api/smtp/test` | **Workflow Backend** → [test-smtp-profile](../backend/test-smtp-profile.md) |

---

## 📊 ÉVÉNEMENTS

| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `dashboard/initial-load.md` | GET | `/api/events?limit=10` | **CRUD** → `events.query()` |
| `evenements/initial-load.md` | GET | `/api/events?limit=50` | **CRUD** → `events.query()` |
| `evenements/initial-load.md` | GET | `/api/events?type=sync` | **CRUD** → `events.query()` |
| `evenements/filter-unread.md` | GET | `/api/events?read=false` | **CRUD** → `events.query()` |
| `evenements/initial-load.md` | GET | `/api/events/types` | **CRUD** → `events.query()` (distinct) |
| `dashboard/initial-load.md` | GET | `/api/events?type=sync&limit=1` | **CRUD** → `events.query()` |

### Modification
| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `evenements/mark-as-read.md` | PATCH | `/api/events/:id/read` | **CRUD** → `events.update()` |
| `evenements/mark-all-read.md` | POST | `/api/events/mark-read` | **CRUD** → `events.update()` (batch) |
| `dashboard/clear-events.md` | POST | `/api/events/mark-read` | **CRUD** → `events.update()` (batch) |
| `dashboard/sync-data.md` | POST | `/api/events` | **CRUD** → `events.create()` |

---

## 🌐 PORTAIL CLIENT

| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `portail-client/initial-load.md` | GET | `/api/portail/verify?contactId=:id` | **Workflow Backend** → [portail-client](../backend/portail-client.md) |
| `portail-client/download-facture.md` | GET | `/api/pdf/:impayeId` | **Lien signé** → [generate-pdf-links](../backend/generate-pdf-links.md) |
| `portail-mission/initial-load.md` | GET | `/api/portail/verify?impayeId=:id` | **Workflow Backend** → [portail-client](../backend/portail-client.md) |
| `portail-mission/download-facture.md` | GET | `/api/pdf/:impayeId` | **Lien signé** → [generate-pdf-links](../backend/generate-pdf-links.md) |

### Tokens
| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| *(lien email)* | POST | `/api/tokens/contact` | **Workflow Backend** → [generate-contact-token](../backend/generate-contact-token.md) |
| *(lien PDF)* | POST | `/api/tokens/pdf` | **Workflow Backend** → [generate-pdf-links](../backend/generate-pdf-links.md) |

---

## 🔄 SYNCHRONISATION & IMPORT

| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `dashboard/sync-data.md` | POST | `/api/workflows/sync-orchestrator` | **Orchestrateur** → Appelle les workflows ci-dessous |
| `dashboard/sync-data.md` | POST | `/api/workflows/import-invoices` | **Workflow Backend** → [import-invoice](../backend/import-invoice.md) |
| `dashboard/sync-data.md` | POST | `/api/workflows/verify-paid-invoices` | **Workflow Backend** → [verify-paid-invoices](../backend/verify-paid-invoices.md) |
| `dashboard/sync-data.md` | POST | `/api/workflows/regels-attribution` | **Workflow Backend** → [appliquer-regles-attribution](../backend/appliquer-regles-attribution.md) |
| `impayes/sync-data.md` | POST | `/api/workflows/import-invoices` | **Workflow Backend** → [import-invoice](../backend/import-invoice.md) |
| `impayes-payeur/sync-data.md` | POST | `/api/workflows/import-invoices` | **Workflow Backend** → [import-invoice](../backend/import-invoice.md) |

---

## 🧹 CLEANUP

| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| *(maintenance)* | POST | `/api/cleanup/relances-blacklist` | **Workflow Backend** → [cleanup-relances-contact-blackliste](../backend/cleanup-relances-contact-blackliste.md) |
| *(maintenance)* | POST | `/api/cleanup/all-relances-blacklist` | **Workflow Backend** → [cleanup-all-relances-contact-blackliste](../backend/cleanup-all-relances-contact-blackliste.md) |
| *(maintenance)* | POST | `/api/cleanup/relances-paid` | **Workflow Backend** → [cleanup-all-relances-paid-impayes](../backend/cleanup-all-relances-paid-impayes.md) |
| *(maintenance)* | POST | `/api/cleanup/orphan-relances` | **Workflow Backend** → [cleanup-orphan-relances](../backend/cleanup-orphan-relances.md) |

---

## 🤖 SMART MARKI (CRUD existant - collection `smart_marki`)

| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `smart-marki/initial-load.md` | GET | `/api/smart_marki` | **CRUD** → `smart_marki.query()` (suggestions) |
| `smart-marki/initial-load.md` | GET | `/api/smart_marki/stats` | **À IMPLÉMENTER** (agrégation) |
| `smart-marki/initial-load.md` | GET | `/api/smart_marki/history` | **CRUD** → `smart_marki.query()` (filtre history) |
| `smart-marki/mark-all-read.md` | POST | `/api/smart-marki/mark-read/:id` | **Workflow/CRUD** → `smart_marki.update()` |
| `smart-marki/dismiss-insight.md` | POST | `/api/smart-marki/dismiss/:id` | **Workflow/CRUD** → `smart_marki.update()` |
| `smart-marki/apply-insight.md` | POST | `/api/smart-marki/apply/:id` | **Workflow Backend** → Action métier spécifique |

---

## 🧪 TESTS

| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `test-single.md` | POST | `/api/test/relance` | **Workflow Backend** → [test-single](../backend/test-single.md) |
| `test-single-suivi.md` | POST | `/api/test/suivi` | **Workflow Backend** → [test-single-suivi](../backend/test-single-suivi.md) |
| `sequences-relance-detail/tester-email.md` | POST | `/api/sequences-relance-detail/test` | **À IMPLÉMENTER** |
| `sequences-suivi-detail/tester-email.md` | POST | `/api/sequences-suivi-detail/test` | **À IMPLÉMENTER** |

---

## 🔗 LIENS DE PAIEMENT (CRUD existant - collection `payment_links`)

| Workflow Frontend | Méthode | Route | Type |
|-------------------|---------|-------|------|
| `portail-mission/regler-facture.md` | GET | `/api/payment_links` | **CRUD** → `payment_links.query()` |

---

## ❌ ROUTES CORRIGÉES ✅

Les incohérences suivantes ont été corrigées dans les workflows frontend :

| Route avant correction | Route corrigée | Fichiers modifiés |
|------------------------|----------------|-------------------|
| `POST /api/factures/:id/suspend` | `POST /api/impayes/:id/suspend` | `impayes-detail/suspend-facture.md` |
| `POST /api/factures/:id/unsuspend` | `POST /api/impayes/:id/unsuspend` | `impayes-detail/unsuspend-facture.md`, `impayes-suspendus/reactivate-impaye.md` |
| `PUT /api/settings-utilisateurs/:id` | `PUT /api/users/:id` | `settings-utilisateurs/update-user.md` |

---

## ⚠️ ROUTES À STANDARDISER

| Route actuelle | Problème | Route suggérée |
|----------------|----------|----------------|
| `POST /api/sequences-relance-detail/...` | Non standard | `PUT /api/sequences/:id` |
| `POST /api/sequences-suivi-detail/...` | Non standard | `PUT /api/sequences/:id` |

---

## 📋 Routes à Implémenter (2)

### SÉQUENCES - TEST (Workflows métier spécifiques)
- [ ] `POST /api/sequences/:id/test` - Tester envoi email (relance ou suivi)

### SMART MARKI - ACTIONS (Workflows métier spécifiques)
- [ ] `POST /api/smart-marki/:id/apply` - Appliquer une suggestion IA (workflow métier complexe)

> **Note** : Les collections `smart_marki` et `payment_links` existent déjà en CRUD. Les routes standards (GET/POST/PUT/DELETE) sont automatiquement disponibles via le pattern `/api/:collection`.

---

## ✅ Vérification Complète

Tous les appels API frontend sont couverts :
- ✅ **Routes backend documentées** : 30 workflows
- ✅ **CRUD flat-file-db.js** : 8 collections avec query/read/create/update/delete
- ✅ **Routes unifiées** : 3 incohérences corrigées
- ⚠️ **Routes à standardiser** : 2 endpoints (séquences)
- 🔴 **Routes à implémenter** : 2 endpoints (test séquences + smart-marki apply)

---

## 📝 Utilisation de flat-file-db.js

### Exemple d'implémentation des routes CRUD

```javascript
// GET /api/:collection
app.get('/api/:collection', async (req, res) => {
  const { collection } = req.params;
  const query = req.query;
  
  // Utilise db.query() avec chaînage LokiJS
  const results = db.query(collection)
    .find(query)
    .data();
    
  res.json(results);
});

// GET /api/:collection/:id
app.get('/api/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const result = await db.read(collection, id);
  res.json(result);
});

// POST /api/:collection
app.post('/api/:collection', async (req, res) => {
  const { collection } = req.params;
  const result = await db.createSecure(collection, req.body, req.user);
  res.json(result);
});

// PUT /api/:collection/:id
app.put('/api/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const result = await db.update(collection, id, req.body);
  res.json(result);
});

// DELETE /api/:collection/:id
app.delete('/api/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const result = await db.delete(collection, id);
  res.json(result);
});
```
