# events.py - Routes événements

**Fichier** : `app/routes/events.py`  
**Blueprint** : `events_bp` (préfixe `/api/events`)

## Logs (print) - OBLIGATOIRE POUR CHAQUE ROUTE

Chaque fonction de route doit contenir les `print()` suivants:

| Route | Ligne | Instruction | Description |
|-------|-------|-------------|-------------|
| `GET /api/events` | 1 | `print(f"[API.EVENTS.LIST] START: params={dict(request.args)}")` | Début |
| `GET /api/events` | 2 | `print(f"[API.EVENTS.LIST] STEP: Filtre type={type}, contact={contact_id}")` | Filtres |
| `GET /api/events` | 3 | `print(f"[API.EVENTS.LIST] SUCCESS: {len(events)} événements retournés")` | Résultat |
| `POST /api/events` | 1 | `print(f"[API.EVENTS.CREATE] START: data={request.get_json()}")` | Début |
| `POST /api/events` | 2 | `print(f"[API.EVENTS.CREATE] STEP: Création event type={event_type}")` | Création |
| `POST /api/events` | 3 | `print(f"[API.EVENTS.CREATE] SUCCESS: Event créé id={new_id}")` | Succès |

## Routes

### GET `/api/events`

Liste des événements (logs d'activité).

**Query params:**
- `type` (string): email, relance, system
- `contact_id`: Filtrer par contact
- `date_debut`, `date_fin`: Plage

**Response:**
```json
{
  "events": [
    {
      "id": 1,
      "type": "email",
      "description": "Relance envoyée à DUPONT",
      "contact_id": 5,
      "created_at": "2024-03-15T10:30:00",
      "metadata": {...}
    }
  ]
}
```

### POST `/api/events`

Créer un événement (log manuel).
