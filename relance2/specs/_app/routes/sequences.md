# sequences.py - Routes séquences

**Fichier** : `app/routes/sequences.py`  
**Blueprint** : `sequences_bp` (préfixe `/api/sequences`)

## Routes

### GET `/api/sequences`

Liste des séquences de relance.

**Response:**
```json
{
  "sequences": [
    {
      "id": 1,
      "nom": "Standard 30-60-90",
      "description": "Relance à 30, 60 et 90 jours",
      "active": true,
      "etapes_count": 3
    }
  ]
}
```

### GET `/api/sequences/:id`

Détail d'une séquence avec ses étapes.

**Response:**
```json
{
  "id": 1,
  "nom": "Standard 30-60-90",
  "etapes": [
    {
      "id": 1,
      "delai_jours": 30,
      "mode_envoi": "email",
      "template_sujet": "Rappel facture",
      "template_body": "..."
    }
  ]
}
```

### POST `/api/sequences`

Créer une séquence avec ses étapes.

### PUT `/api/sequences/:id`

Modifier une séquence.

### DELETE `/api/sequences/:id`

Supprimer une séquence (si pas utilisée).

## Logs (print) - OBLIGATOIRE POUR CHAQUE ROUTE

Chaque fonction de route doit contenir les `print()` suivants:

| Route | Ligne | Instruction | Description |
|-------|-------|-------------|-------------|
| `GET /api/sequences` | 1 | `print(f"[API.SEQUENCES.LIST] START: Récupération liste séquences")` | Début listing |
| `GET /api/sequences` | 2 | `print(f"[API.SEQUENCES.LIST] STEP: Requête DB SELECT * FROM sequences")` | Requête DB |
| `GET /api/sequences` | 3 | `print(f"[API.SEQUENCES.LIST] STEP: Sérialisation des séquences")` | Sérialisation |
| `GET /api/sequences` | 4 | `print(f"[API.SEQUENCES.LIST] ERROR: Erreur DB listing")` | Erreur DB |
| `GET /api/sequences` | 5 | `print(f"[API.SEQUENCES.LIST] SUCCESS: {count} séquences retournées")` | Succès avec count |
| `GET /api/sequences/:id` | 1 | `print(f"[API.SEQUENCES.GET] START: Récupération séquence id={sequence_id}")` | Début |
| `GET /api/sequences/:id` | 2 | `print(f"[API.SEQUENCES.GET] STEP: Recherche séquence id={sequence_id}")` | Recherche DB |
| `GET /api/sequences/:id` | 3 | `print(f"[API.SEQUENCES.GET] ERROR: Séquence id={sequence_id} non trouvée")` | Non trouvée |
| `GET /api/sequences/:id` | 4 | `print(f"[API.SEQUENCES.GET] STEP: Chargement des étapes")` | Chargement étapes |
| `GET /api/sequences/:id` | 5 | `print(f"[API.SEQUENCES.GET] STEP: Sérialisation séquence + étapes")` | Sérialisation |
| `GET /api/sequences/:id` | 6 | `print(f"[API.SEQUENCES.GET] ERROR: Erreur DB récupération")` | Erreur DB |
| `GET /api/sequences/:id` | 7 | `print(f"[API.SEQUENCES.GET] SUCCESS: Séquence id={sequence_id} '{nom}' retournée avec {etapes_count} étapes")` | Succès avec count étapes |
| `POST /api/sequences` | 1 | `print(f"[API.SEQUENCES.CREATE] START: Création séquence data={data}")` | Début |
| `POST /api/sequences` | 2 | `print(f"[API.SEQUENCES.CREATE] STEP: Validation données (nom, etapes)")` | Validation |
| `POST /api/sequences` | 3 | `print(f"[API.SEQUENCES.CREATE] ERROR: Validation échouée: {errors}")` | Validation failed |
| `POST /api/sequences` | 4 | `print(f"[API.SEQUENCES.CREATE] STEP: Insertion séquence en DB")` | Insert séquence |
| `POST /api/sequences` | 5 | `print(f"[API.SEQUENCES.CREATE] STEP: Insertion {etapes_count} étapes")` | Insert étapes |
| `POST /api/sequences` | 6 | `print(f"[API.SEQUENCES.CREATE] ERROR: Erreur DB création")` | Erreur DB |
| `POST /api/sequences` | 7 | `print(f"[API.SEQUENCES.CREATE] SUCCESS: Séquence id={sequence_id} créée avec {etapes_count} étapes")` | Succès avec count |
| `PUT /api/sequences/:id` | 1 | `print(f"[API.SEQUENCES.UPDATE] START: MAJ séquence id={sequence_id} data={data}")` | Début |
| `PUT /api/sequences/:id` | 2 | `print(f"[API.SEQUENCES.UPDATE] STEP: Recherche séquence id={sequence_id}")` | Recherche |
| `PUT /api/sequences/:id` | 3 | `print(f"[API.SEQUENCES.UPDATE] ERROR: Séquence id={sequence_id} non trouvée")` | Non trouvée |
| `PUT /api/sequences/:id` | 4 | `print(f"[API.SEQUENCES.UPDATE] STEP: Validation données MAJ")` | Validation |
| `PUT /api/sequences/:id` | 5 | `print(f"[API.SEQUENCES.UPDATE] ERROR: Validation échouée: {errors}")` | Validation failed |
| `PUT /api/sequences/:id` | 6 | `print(f"[API.SEQUENCES.UPDATE] STEP: Update DB séquence + étapes")` | Update DB |
| `PUT /api/sequences/:id` | 7 | `print(f"[API.SEQUENCES.UPDATE] ERROR: Erreur DB update")` | Erreur DB |
| `PUT /api/sequences/:id` | 8 | `print(f"[API.SEQUENCES.UPDATE] SUCCESS: Séquence id={sequence_id} mise à jour")` | Succès |
| `DELETE /api/sequences/:id` | 1 | `print(f"[API.SEQUENCES.DELETE] START: Suppression séquence id={sequence_id}")` | Début |
| `DELETE /api/sequences/:id` | 2 | `print(f"[API.SEQUENCES.DELETE] STEP: Vérification utilisation séquence (relances liées)")` | Check usage |
| `DELETE /api/sequences/:id` | 3 | `print(f"[API.SEQUENCES.DELETE] ERROR: Séquence id={sequence_id} utilisée par {usage_count} relances")` | Utilisée |
| `DELETE /api/sequences/:id` | 4 | `print(f"[API.SEQUENCES.DELETE] STEP: Suppression {etapes_count} étapes")` | Delete étapes |
| `DELETE /api/sequences/:id` | 5 | `print(f"[API.SEQUENCES.DELETE] STEP: Suppression séquence en DB")` | Delete séquence |
| `DELETE /api/sequences/:id` | 6 | `print(f"[API.SEQUENCES.DELETE] ERROR: Erreur DB suppression")` | Erreur DB |
| `DELETE /api/sequences/:id` | 7 | `print(f"[API.SEQUENCES.DELETE] SUCCESS: Séquence id={sequence_id} supprimée avec {etapes_count} étapes")` | Succès avec count |
