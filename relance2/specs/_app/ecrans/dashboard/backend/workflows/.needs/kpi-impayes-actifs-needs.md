## Besoin Backend pour "kpi-impayes-actifs"

### Route API (Workflow Backend) identifiée
- **Nom fichier suggéré:** `list-impayes-echues.md`
- **Méthode HTTP:** `GET`
- **Endpoint:** `/api/impayes`
- **Tables concernées:** `impayes`

### Description
Récupérer la liste des factures impayées dont la date d'échéance est dépassée. Cette route doit filtrer les enregistrements de la table `impayes` où `date_echeance < NOW()` et `reste_a_payer > 0`, puis retourner les données nécessaires au calcul du KPI côté frontend.

### Paramètres d'entrée (Query String)
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `date_echeance_lt` | string (ISO 8601) | non | Filtre : date d'échéance strictement inférieure à cette valeur (ex: `2024-01-15T00:00:00Z`) |
| `reste_a_payer_gt` | number | non | Filtre : reste à payer strictement supérieur à cette valeur (ex: `0`) |
| `statut` | string | non | Filtre par statut (ex: `impaye`) |
| `fields` | string | non | Champs à retourner, séparés par virgule (ex: `id,nfacture,date_echeance,reste_a_payer`) |
| `limit` | integer | non | Limite de résultats (par défaut: 1000) |

### Réponse attendue (JSON)
```json
{
  "data": [
    {
      "id": "uuid-1",
      "nfacture": "F-2024-001",
      "date_echeance": "2024-01-15",
      "reste_a_payer": 1500.00
    }
  ],
  "meta": {
    "total": 28,
    "limit": 1000,
    "offset": 0
  }
}
```

### Cas particuliers
- **401 Unauthorized** : Token JWT manquant ou invalide → retourner erreur d'authentification
- **403 Forbidden** : Utilisateur sans droits suffisants sur les impayés
- **500 Internal Server Error** : Erreur SQLite ou exception serveur
- **Résultat vide** : Retourner `data: []` et `meta.total: 0` (pas d'erreur)
- **Paramètres invalides** : Retourner 400 avec message d'erreur explicite

### Analyse
- **Nécessite workflow backend (route API):** **OUI**
- **Justification:** 
  - La table `impayes` contient les données persistantes des factures (champs `date_echeance`, `reste_a_payer`, `statut`)
  - Le filtrage par date et montant doit être effectué côté serveur pour des raisons de performance et de sécurité (éviter de charger toutes les factures en mémoire)
  - Le calcul du total (`meta.total`) nécessite une requête SQL `COUNT(*)` sur la base SQLite
  - Cette route est déjà référencée dans le workflow frontend (`GET /api/factures?date_echeance_lt=now&reste_a_payer_gt=0`) et constitue le point d'accès unique aux données financières persistantes
