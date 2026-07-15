# contacts.py - Routes contacts

**Fichier** : `app/routes/contacts.py`  
**Blueprint** : `contacts_bp` (préfixe `/api/contacts`)

## Logs (print) - OBLIGATOIRE POUR CHAQUE ROUTE

Chaque fonction de route doit contenir les `print()` suivants:

| Route | Ligne | Instruction | Description |
|-------|-------|-------------|-------------|
| `GET /api/contacts` | 1 | `print(f"[API.CONTACTS.LIST] START: params={dict(request.args)}")` | Début avec params |
| `GET /api/contacts` | 2 | `print(f"[API.CONTACTS.LIST] STEP: Recherche '{search}', blacklist={blacklist}")` | Filtres appliqués |
| `GET /api/contacts` | 3 | `print(f"[API.CONTACTS.LIST] STEP: Exécution requête count")` | Count total |
| `GET /api/contacts` | 4 | `print(f"[API.CONTACTS.LIST] STEP: Exécution requête avec LIMIT={per_page}, OFFSET={offset}")` | Requête paginée |
| `GET /api/contacts` | 5 | `print(f"[API.CONTACTS.LIST] SUCCESS: {len(contacts)} résultats (total={total}, page={page})")` | Résultat |
| `GET /api/contacts/:id` | 1 | `print(f"[API.CONTACTS.GET] START: id={id}")` | Début |
| `GET /api/contacts/:id` | 2 | `print(f"[API.CONTACTS.GET] STEP: Recherche contact id={id}")` | Recherche |
| `GET /api/contacts/:id` | 3 | `print(f"[API.CONTACTS.GET] SUCCESS: Contact trouvé" if contact else "[API.CONTACTS.GET] ERROR: Contact non trouvé")` | Résultat |
| `POST /api/contacts` | 1 | `print(f"[API.CONTACTS.CREATE] START: data={request.get_json()}")` | Début avec données |
| `POST /api/contacts` | 2 | `print(f"[API.CONTACTS.CREATE] STEP: Validation données")` | Validation |
| `POST /api/contacts` | 3 | `print(f"[API.CONTACTS.CREATE] STEP: Insertion en base")` | Insertion |
| `POST /api/contacts` | 4 | `print(f"[API.CONTACTS.CREATE] SUCCESS: Contact créé avec id={new_id}")` | Succès |
| `PUT /api/contacts/:id` | 1 | `print(f"[API.CONTACTS.UPDATE] START: id={id}, data={request.get_json()}")` | Début |
| `PUT /api/contacts/:id` | 2 | `print(f"[API.CONTACTS.UPDATE] STEP: Mise à jour contact id={id}")` | Mise à jour |
| `PUT /api/contacts/:id` | 3 | `print(f"[API.CONTACTS.UPDATE] SUCCESS: Contact mis à jour")` | Succès |
| `DELETE /api/contacts/:id` | 1 | `print(f"[API.CONTACTS.DELETE] START: id={id}")` | Début |
| `DELETE /api/contacts/:id` | 2 | `print(f"[API.CONTACTS.DELETE] STEP: Suppression contact id={id}")` | Suppression |
| `DELETE /api/contacts/:id` | 3 | `print(f"[API.CONTACTS.DELETE] SUCCESS: Contact supprimé")` | Succès |
| `GET /api/contacts/:id/impayes` | 1 | `print(f"[API.CONTACTS.IMPAYES] START: contact_id={id}")` | Début |
| `GET /api/contacts/:id/impayes` | 2 | `print(f"[API.CONTACTS.IMPAYES] STEP: Recherche contact")` | Recherche contact |
| `GET /api/contacts/:id/impayes` | 3 | `print(f"[API.CONTACTS.IMPAYES] STEP: Recherche {len(impayes)} impayés")` | Impayés trouvés |
| `GET /api/contacts/:id/impayes` | 4 | `print(f"[API.CONTACTS.IMPAYES] SUCCESS: Total impayé={total}")` | Résultat |

## Routes

### GET `/api/contacts`

Liste des contacts.

**Query params:**
- `search` (string): Recherche texte
- `blacklist` (bool): Filtrer par statut blacklist
- `page`, `per_page`: Pagination

### GET `/api/contacts/:id`

Détail d'un contact.

**Response:**
```json
{
  "id": 1,
  "nom": "DUPONT",
  "prenom": "Jean",
  "email": "jean@example.com",
  "telephone": "0123456789",
  "blacklist": false,
  "created_at": "2024-01-15T10:30:00"
}
```

### POST `/api/contacts`

Créer un contact.

### PUT `/api/contacts/:id`

Modifier un contact.

### DELETE `/api/contacts/:id`

Supprimer un contact.

### GET `/api/contacts/:id/impayes`

Liste des impayés d'un contact.

**Response:**
```json
{
  "contact": {...},
  "impayes": [...],
  "total_impaye": 1500.50
}
```
