# relances.py - Routes relances

**Fichier** : `app/routes/relances.py`
**Blueprint** : `relances_bp` (préfixe `/api/relances`)

## Logs (print) - OBLIGATOIRE POUR CHAQUE ROUTE

Chaque fonction de route doit contenir les `print()` suivants:

| Route | Ligne | Instruction | Description |
|-------|-------|-------------|-------------|
| `GET /api/relances` | 1 | `print(f"[API.RELANCES.LIST] START: params={dict(request.args)}")` | Début |
| `GET /api/relances` | 2 | `print(f"[API.RELANCES.LIST] STEP: Filtres statut={statut}, contact={contact_id}")` | Filtres |
| `GET /api/relances` | 3 | `print(f"[API.RELANCES.LIST] SUCCESS: {len(relances)} relances retournées")` | Résultat |
| `GET /api/relances/:id` | 1 | `print(f"[API.RELANCES.GET] START: id={id}")` | Début |
| `GET /api/relances/:id` | 2 | `print(f"[API.RELANCES.GET] STEP: Recherche relance id={id}")` | Recherche |
| `GET /api/relances/:id` | 3 | `print(f"[API.RELANCES.GET] STEP: Recherche {len(impayes)} impayés liés")` | Impayés liés |
| `GET /api/relances/:id` | 4 | `print(f"[API.RELANCES.GET] SUCCESS: Relance trouvée")` | Succès |
| `POST /api/relances` | 1 | `print(f"[API.RELANCES.CREATE] START: data={request.get_json()}")` | Début |
| `POST /api/relances` | 2 | `print(f"[API.RELANCES.CREATE] STEP: Création relance contact_id={contact_id}")` | Création |
| `POST /api/relances` | 3 | `print(f"[API.RELANCES.CREATE] SUCCESS: Relance créée id={new_id}")` | Succès |
| `PUT /api/relances/:id` | 1 | `print(f"[API.RELANCES.UPDATE] START: id={id}")` | Début |
| `PUT /api/relances/:id` | 2 | `print(f"[API.RELANCES.UPDATE] STEP: Mise à jour statut={statut}")` | Update |
| `PUT /api/relances/:id` | 3 | `print(f"[API.RELANCES.UPDATE] SUCCESS: Relance mise à jour")` | Succès |
| `DELETE /api/relances/:id` | 1 | `print(f"[API.RELANCES.DELETE] START: id={id}")` | Début |
| `DELETE /api/relances/:id` | 2 | `print(f"[API.RELANCES.DELETE] SUCCESS: Relance supprimée")` | Succès |

## Routes

### GET `/api/relances`

Liste des relances.

**Query params:**
- `statut` (string): en_cours, envoyee, payee, annulee
- `contact_id`: Filtrer par contact
- `sequence_id`: Filtrer par séquence
- `date_debut`, `date_fin`: Dates de relance

**Response:**
```json
{
  "relances": [
    {
      "id": 1,
      "contact_id": 5,
      "contact_nom": "DUPONT Jean",
      "sequence_id": 2,
      "sequence_nom": "Standard",
      "statut": "en_cours",
      "montant_total": 1250.00,
      "prochaine_action": "2024-03-15",
      "created_at": "2024-02-01"
    }
  ]
}
```

### GET `/api/relances/:id`

Détail d'une relance avec ses impayés liés.

### POST `/api/relances`

Créer une relance manuelle.

### PUT `/api/relances/:id`

Modifier une relance (statut, notes).

### DELETE `/api/relances/:id`

Supprimer une relance.
