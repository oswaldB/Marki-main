# impayes.py - Routes impayés

**Fichier** : `app/routes/impayes.py`  
**Blueprint** : `impayes_bp` (préfixe `/api/impayes`)

## Logs (print) - OBLIGATOIRE POUR CHAQUE ROUTE

Chaque fonction de route doit contenir les `print()` suivants:

| Route | Ligne | Instruction | Description |
|-------|-------|-------------|-------------|
| `GET /api/impayes` | 1 | `print(f"[API.IMPAYES.LIST] START: params={dict(request.args)}")` | Début avec params |
| `GET /api/impayes` | 2 | `print(f"[API.IMPAYES.LIST] STEP: Application filtres (statut={statut}, contact={contact_id})")` | Filtres |
| `GET /api/impayes` | 3 | `print(f"[API.IMPAYES.LIST] STEP: Requête count exécutée, total={total}")` | Count |
| `GET /api/impayes` | 4 | `print(f"[API.IMPAYES.LIST] SUCCESS: {len(impayes)} impayés retournés (page {page}/{total_pages})")` | Résultat |
| `GET /api/impayes/:id` | 1 | `print(f"[API.IMPAYES.GET] START: id={id}")` | Début |
| `GET /api/impayes/:id` | 2 | `print(f"[API.IMPAYES.GET] STEP: Recherche impayé id={id}")` | Recherche |
| `GET /api/impayes/:id` | 3 | `print(f"[API.IMPAYES.GET] SUCCESS: Impayé trouvé" if impaye else "[API.IMPAYES.GET] ERROR: Impayé non trouvé")` | Résultat |
| `POST /api/impayes` | 1 | `print(f"[API.IMPAYES.CREATE] START: data={request.get_json()}")` | Début |
| `POST /api/impayes` | 2 | `print(f"[API.IMPAYES.CREATE] STEP: Génération UUID")` | Génération ID |
| `POST /api/impayes` | 3 | `print(f"[API.IMPAYES.CREATE] STEP: Insertion en base")` | Insertion |
| `POST /api/impayes` | 4 | `print(f"[API.IMPAYES.CREATE] SUCCESS: Impayé créé avec id={new_id}")` | Succès |
| `PUT /api/impayes/:id` | 1 | `print(f"[API.IMPAYES.UPDATE] START: id={id}, data={request.get_json()}")` | Début |
| `PUT /api/impayes/:id` | 2 | `print(f"[API.IMPAYES.UPDATE] STEP: Mise à jour impayé id={id}")` | Mise à jour |
| `PUT /api/impayes/:id` | 3 | `print(f"[API.IMPAYES.UPDATE] SUCCESS: Impayé mis à jour")` | Succès |

## Routes

### GET `/api/impayes`

Liste des impayés avec filtres.

**Query params:**
- `statut` (string): impaye, suspendu, archive
- `contact_id` (int): Filtrer par contact
- `date_debut`, `date_fin`: Plage de dates
- `montant_min`, `montant_max`: Fourchette montant
- `page`, `per_page`: Pagination

**Response:**
```json
{
  "impayes": [
    {
      "id": 1,
      "contact_id": 5,
      "contact_nom": "DUPONT Jean",
      "montant": 1250.00,
      "date_facture": "2024-01-10",
      "date_echeance": "2024-02-10",
      "statut": "impaye",
      "suspendu": false
    }
  ],
  "total": 45,
  "page": 1
}
```

### GET `/api/impayes/:id`

Détail d'un impayé.

### POST `/api/impayes`

Créer un impayé (manuel ou import).

### PUT `/api/impayes/:id`

Modifier un impayé (montant, notes, etc.).
