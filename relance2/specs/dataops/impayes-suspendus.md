# Routes API - Écran Impayés Suspendus

Spécification des routes REST pour la gestion des impayés suspendus (blacklist).

---

## Route 1: Lister les impayés suspendus

**Titre** : Récupération de la liste des impayés en blacklist

**Description** : Retourne la liste des factures dont le payeur est en blacklist. Supporte la recherche par numéro de facture, nom ou email du payeur, et le filtrage par motif de blacklist.

**Méthode HTTP** : `GET`

**Endpoint** : `/api/impayes/suspended`

**Paramètres d'entrée (Query String)** :

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `search` | string | Non | Recherche sur numero, payeur_nom, payeur_email |
| `motif` | string | Non | Filtre sur blacklist_motif (litige, erreur, demande, contentieux) |
| `limit` | integer | Non | Limite de résultats (défaut: 50) |
| `offset` | integer | Non | Offset pour pagination (défaut: 0) |

**Réponse JSON (200 OK)** :

```json
{
  "success": true,
  "data": {
    "impayes": [
      {
        "id": "imp-001",
        "numero": "FAC-2024-045",
        "statutLabel": "Suspendue",
        "payeur": "Consulting Pro",
        "email": "boss@consulting.fr",
        "echeance": "2024-06-15",
        "montant": 12500.00,
        "montantFormatted": "12 500,00 €",
        "blacklistMotif": "Litige en cours",
        "blacklistDate": "2024-06-10",
        "blacklistDateFormatted": "Blacklisté le 10/06/2024",
        "resteAPayer": 12500.00
      }
    ],
    "total": 3,
    "limit": 50,
    "offset": 0
  }
}
```

**Requête SQL exacte** :

```sql
SELECT 
    i.id,
    i.nfacture as numero,
    i.statut as statutLabel,
    COALESCE(i.payeur_nom, 'N/A') as payeur,
    COALESCE(i.payeur_email, '') as email,
    i.date_echeance as echeance,
    i.montant_ttc as montant,
    i.reste_a_payer as resteAPayer,
    i.blacklist_motif as blacklistMotif,
    i.blacklist_date as blacklistDate
FROM impayes i
WHERE i.is_blacklisted = 1
    AND i.facture_soldee = 0
    AND i.statut = 'impaye'
    AND (
        :search IS NULL OR 
        :search = '' OR
        LOWER(i.nfacture) LIKE '%' || LOWER(:search) || '%' OR
        LOWER(COALESCE(i.payeur_nom, '')) LIKE '%' || LOWER(:search) || '%' OR
        LOWER(COALESCE(i.payeur_email, '')) LIKE '%' || LOWER(:search) || '%'
    )
    AND (
        :motif IS NULL OR 
        :motif = '' OR
        LOWER(i.blacklist_motif) LIKE '%' || LOWER(:motif) || '%'
    )
ORDER BY i.date_echeance ASC
LIMIT :limit OFFSET :offset;
```

**Requête SQL - Comptage total** :

```sql
SELECT COUNT(*) as total
FROM impayes i
WHERE i.is_blacklisted = 1
    AND i.facture_soldee = 0
    AND i.statut = 'impaye'
    AND (
        :search IS NULL OR 
        :search = '' OR
        LOWER(i.nfacture) LIKE '%' || LOWER(:search) || '%' OR
        LOWER(COALESCE(i.payeur_nom, '')) LIKE '%' || LOWER(:search) || '%' OR
        LOWER(COALESCE(i.payeur_email, '')) LIKE '%' || LOWER(:search) || '%'
    )
    AND (
        :motif IS NULL OR 
        :motif = '' OR
        LOWER(i.blacklist_motif) LIKE '%' || LOWER(:motif) || '%'
    );
```

---

## Route 2: Récupérer les motifs de blacklist uniques

**Titre** : Extraction des motifs de suspension disponibles

**Description** : Retourne la liste des motifs de blacklist distincts présents dans les impayés suspendus. Permet de peupler le filtre dropdown du mockup.

**Méthode HTTP** : `GET`

**Endpoint** : `/api/impayes/suspended/motifs`

**Paramètres d'entrée** : Aucun

**Réponse JSON (200 OK)** :

```json
{
  "success": true,
  "data": {
    "motifs": [
      { "value": "litige", "label": "Litige en cours" },
      { "value": "erreur", "label": "Erreur de facturation" },
      { "value": "demande", "label": "Demande client" },
      { "value": "contentieux", "label": "Contentieux" }
    ]
  }
}
```

**Requête SQL exacte** :

```sql
SELECT DISTINCT 
    LOWER(TRIM(i.blacklist_motif)) as value,
    i.blacklist_motif as label
FROM impayes i
WHERE i.is_blacklisted = 1
    AND i.blacklist_motif IS NOT NULL
    AND i.blacklist_motif != ''
ORDER BY i.blacklist_motif ASC;
```

---

## Route 3: Réactiver un impayé suspendu

**Titre** : Réactivation d'une facture suspendue

**Description** : Retire l'impayé de la blacklist, réactive les relances automatiques pour ce payeur, et retourne la facture au cycle de relance normal.

**Méthode HTTP** : `POST`

**Endpoint** : `/api/impayes/:id/unsuspend`

**Paramètres d'entrée (URL)** :

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `id` | string | Oui | ID de l'impayé à réactiver |

**Paramètres d'entrée (Body JSON - optionnel)** :

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `motif_reactivation` | string | Non | Motif de la réactivation (log) |

**Réponse JSON (200 OK)** :

```json
{
  "success": true,
  "data": {
    "id": "imp-001",
    "statut": "impaye",
    "isBlacklisted": false,
    "dateReactivation": "2024-07-21T14:30:00Z",
    "message": "Impayé réactivé avec succès, les relances automatiques sont réactivées"
  }
}
```

**Réponse JSON (404 Not Found)** :

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Impayer non trouvé ou non suspendu"
  }
}
```

**Requête SQL exacte - Vérification** :

```sql
SELECT 
    i.id,
    i.is_blacklisted,
    i.payer_id,
    i.blacklist_motif,
    i.blacklist_date
FROM impayes i
WHERE i.id = :id AND i.is_blacklisted = 1;
```

**Requête SQL exacte - Mise à jour impayé** :

```sql
UPDATE impayes 
SET 
    is_blacklisted = 0,
    blacklist_date = NULL,
    blacklist_motif = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :id AND is_blacklisted = 1;
```

**Requête SQL - Réactivation du contact payeur** :

```sql
UPDATE contacts 
SET 
    is_blacklisted = 0,
    blacklist_date = NULL,
    blacklist_motif = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE id = (
    SELECT payer_id FROM impayes WHERE id = :id
) AND is_blacklisted = 1;
```

**Requête SQL - Création d'un événement (optionnel, pour l'historique)** :

```sql
INSERT INTO events (
    id,
    type,
    titre,
    description,
    entity_type,
    entity_id,
    created_at,
    by_marki,
    metadata
) VALUES (
    lower(hex(randomblob(16))),
    'impaye_unsuspend',
    'Impayé réactivé',
    'L\'impayé ' || :nfacture || ' a été retiré de la blacklist',
    'impaye',
    :id,
    CURRENT_TIMESTAMP,
    0,
    json_object(
        'previous_motif', :previous_motif,
        'previous_date', :previous_date,
        'reactivation_motif', COALESCE(:motif_reactivation, 'Manuel')
    )
);
```

---

## Route 4: Réactiver plusieurs impayés (batch)

**Titre** : Réactivation en masse des impayés suspendus

**Description** : Réactive plusieurs impayés suspendus simultanément. Utilisé si l'UI implémente une sélection multiple.

**Méthode HTTP** : `POST`

**Endpoint** : `/api/impayes/unsuspend-batch`

**Paramètres d'entrée (Body JSON)** :

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `ids` | array[string] | Oui | Liste des IDs d'impayés à réactiver |
| `motif_reactivation` | string | Non | Motif commun de réactivation |

**Réponse JSON (200 OK)** :

```json
{
  "success": true,
  "data": {
    "reactived": ["imp-001", "imp-002"],
    "failed": [],
    "count": 2,
    "message": "2 impayés réactivés avec succès"
  }
}
```

**Réponse JSON (207 Partial Content - si certains échouent)** :

```json
{
  "success": true,
  "data": {
    "reactived": ["imp-001"],
    "failed": [
      {
        "id": "imp-002",
        "error": "Impayer non trouvé ou déjà réactivé"
      }
    ],
    "count": 1,
    "message": "1 impayé réactivé, 1 échec"
  }
}
```

**Requête SQL exacte - Mise à jour batch** :

```sql
UPDATE impayes 
SET 
    is_blacklisted = 0,
    blacklist_date = NULL,
    blacklist_motif = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE id IN (:ids) AND is_blacklisted = 1;
```

---

## Notes d'implémentation

### Champs du mockup vs Schema SQL

| Mockup | Champ SQL | Notes |
|--------|-----------|-------|
| `id` | `impayes.id` | Primary key |
| `numero` | `impayes.nfacture` | Numéro de facture |
| `statutLabel` | `'Suspendue'` | Valeur fixe côté frontend |
| `payeur` | `impayes.payeur_nom` | Nom du payeur |
| `email` | `impayes.payeur_email` | Email du payeur |
| `echeance` | `impayes.date_echeance` | Date d'échéance (format ISO) |
| `montant` | `impayes.montant_ttc` | Montant TTC |
| `blacklistMotif` | `impayes.blacklist_motif` | Motif de blacklist |
| `blacklistDate` | `impayes.blacklist_date` | Date de blacklist |

### Logique métier

1. **Filtre des suspendus** : Un impayé est considéré comme "suspendu" si `is_blacklisted = 1` ET `facture_soldee = 0` ET `statut = 'impaye'`

2. **Réactivation** : Lors de la réactivation, il faut:
   - Mettre à jour la facture (`is_blacklisted = 0`)
   - Mettre à jour le contact payeur (`is_blacklisted = 0`)
   - Créer un événement d'historique
   - Notifier le système de relance que ce payeur est de nouveau éligible

3. **Motifs de blacklist** : Les valeurs possibles sont libres dans la DB mais le mockup suggère: "Litige en cours", "Erreur de facturation", "Demande client", "Contentieux"
