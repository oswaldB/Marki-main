# API Marki - Documentation des Routes

> Base de données: SQLite (`data/marki.db`)
> Port par défaut: 5000

---

## Démarrage

```bash
cd backend
npm install
npm start
```

---

## Authentification

Toutes les routes (sauf `/api/auth/login`) nécessitent un token JWT dans le header:

```
Authorization: Bearer <token>
```

### Obtenir un token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marki.fr","password":"votre-mot-de-passe"}'
```

Réponse:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_xxx",
    "username": "admin",
    "email": "admin@marki.fr",
    "role": "admin"
  }
}
```

---

## Routes disponibles

### 🔐 Authentification

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/api/auth/login` | Connexion | ❌ |
| POST | `/api/auth/logout` | Déconnexion | ✅ |
| GET | `/api/auth/me` | Profil utilisateur connecté | ✅ |

### 👥 Utilisateurs (admin uniquement pour POST/PUT/DELETE)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/users` | Liste des utilisateurs (pagination: `?limit=50&offset=0`) |
| GET | `/api/users/:id` | Détail d'un utilisateur |
| POST | `/api/users` | Créer un utilisateur |
| PUT | `/api/users/:id` | Modifier un utilisateur |
| DELETE | `/api/users/:id` | Désactiver un utilisateur |
| POST | `/api/users/:id/reset-password` | Réinitialiser le mot de passe |

### 📋 Contacts

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/contacts` | Liste des contacts (filtres: `?statut=actif`, `?is_blacklisted=0`) |
| GET | `/api/contacts/:id` | Détail d'un contact |
| GET | `/api/contacts/:id/impayes` | Impayés d'un contact (`?solde=true` pour tous) |
| POST | `/api/contacts` | Créer un contact |
| PUT | `/api/contacts/:id` | Modifier un contact |
| DELETE | `/api/contacts/:id` | Supprimer un contact (si pas d'impayés) |
| POST | `/api/contacts/:id/blacklist` | Basculer blacklist |
| POST | `/api/contacts/:id/notes` | Ajouter une note |

### 💶 Impayés

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/impayes` | Liste des impayés (filtres: `?statut=impaye`, `?facture_soldee=0`) |
| GET | `/api/impayes/:id` | Détail d'un impayé |
| POST | `/api/impayes` | Créer un impayé (import) |
| PUT | `/api/impayes/:id` | Modifier un impayé |
| POST | `/api/impayes/:id/suspend` | Suspendre + annuler relances |
| POST | `/api/impayes/:id/unsuspend` | Réactiver |

### 📧 Relances

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/relances` | Liste des relances (filtres: `?statut=brouillon`, `?valide=0`) |
| GET | `/api/relances/a-valider` | Relances en attente de validation |
| GET | `/api/relances/a-envoyer` | Relances programmées pour envoi |
| GET | `/api/relances/:id` | Détail d'une relance |
| POST | `/api/relances` | Créer une relance |
| PUT | `/api/relances/:id` | Modifier une relance |
| POST | `/api/relances/:id/validate` | Valider une relance |
| DELETE | `/api/relances/:id` | Supprimer une relance |

### 🔄 Séquences

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/sequences` | Liste des séquences actives (`?type=relances` ou `suivi`) |
| GET | `/api/sequences/:id` | Détail avec emails configurés |
| POST | `/api/sequences` | Créer une séquence (admin) |
| PUT | `/api/sequences/:id` | Modifier une séquence (admin) |
| DELETE | `/api/sequences/:id` | Désactiver une séquence (admin) |

### 📨 SMTP Profiles

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/smtp-profiles` | Liste des profils actifs |
| GET | `/api/smtp-profiles/:id` | Détail d'un profil |
| POST | `/api/smtp-profiles` | Créer un profil (admin) |
| PUT | `/api/smtp-profiles/:id` | Modifier un profil (admin) |
| DELETE | `/api/smtp-profiles/:id` | Désactiver un profil (admin) |

### 🔔 Événements

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/events` | Liste des événements (filtre: `?read=0`) |
| GET | `/api/events/non-lus` | Événements non lus |
| POST | `/api/events` | Créer un événement |
| POST | `/api/events/:id/lu` | Marquer comme lu |
| POST | `/api/events/marquer-lus` | Marquer plusieurs comme lus (body: `{ids: [...]}`) |

### 📊 Dashboard

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/dashboard/stats` | Statistiques globales |

---

## Exemples d'utilisation

### Contacts

```bash
# Liste avec pagination
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/contacts?limit=20&offset=0"

# Créer un contact
curl -X POST http://localhost:5000/api/contacts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Dupont",
    "prenom": "Marie",
    "email": "marie@example.com",
    "type_personne": "P"
  }'

# Toggle blacklist
curl -X POST http://localhost:5000/api/contacts/cont_xxx/blacklist \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"motif": "Ne plus relancer"}'
```

### Impayés

```bash
# Impayés non soldés
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/impayes?facture_soldee=0"

# Suspendre un impayé
curl -X POST http://localhost:5000/api/impayes/imp_xxx/suspend \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"motif": "Client en vacances"}'
```

### Relances

```bash
# Relances à valider
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/relances/a-valider

# Valider une relance
curl -X POST http://localhost:5000/api/relances/rel_xxx/validate \
  -H "Authorization: Bearer $TOKEN"

# Créer une relance manuelle
curl -X POST http://localhost:5000/api/relances \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "cont_xxx",
    "sequence_id": "seq_xxx",
    "sujet": "Relance facture impayée",
    "corps": "<html>...</html>",
    "manuelle": 1
  }'
```

### Dashboard

```bash
# Stats globales
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/dashboard/stats
```

---

## Codes HTTP

| Code | Signification |
|------|---------------|
| 200 | Succès |
| 201 | Créé |
| 204 | Succès sans contenu |
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Permission refusée |
| 404 | Non trouvé |
| 409 | Conflit (doublon) |
| 500 | Erreur serveur |

---

## Pagination

Toutes les routes de liste supportent la pagination via query params:

- `limit` - Nombre d'éléments (max 500, défaut 50)
- `offset` - Décalage (début à 0)

Réponse paginée:
```json
{
  "contacts": [...],
  "total": 1250,
  "limit": 50,
  "offset": 0
}
```

---

## Filtres courants

### Contacts
- `?statut=actif` - Contacts actifs
- `?is_blacklisted=1` - En blacklist
- `?type_personne=P` - Personnes physiques
- `?type_personne=M` - Personnes morales

### Impayés
- `?facture_soldee=0` - Non soldés
- `?statut=impaye` - Statut impayé
- `?order_by=date_echeance&order=ASC` - Tri par date d'échéance

### Relances
- `?statut=brouillon` - Brouillons
- `?statut=pret%20pour%20envoi` - Prêtes à envoyer
- `?valide=0` - Non validées

---

## Notes techniques

### Gestion des dates
- Format ISO 8601: `2026-07-14T15:30:00Z`
- Stockage en UTC dans SQLite

### Booléens
- SQLite stocke les booléens comme INTEGER: `0` = false, `1` = true

### JSON dans SQLite
- Les champs JSON (ex: `contacts.notes`) sont stockés comme TEXT
- Sérialisation/désérialisation automatique dans les routes

### IDs
- Format: `{type}_{timestamp}_{random}`
- Exemples: `user_123456_abc123`, `cont_123456_def456`
