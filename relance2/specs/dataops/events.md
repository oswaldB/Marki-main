# DataOps - Routes API REST pour l'écran Événements

Analyse basée sur : `mockups/evenements.html` + workflows frontend dans `../app/templates/events/workflows/`

---

## 1. Lister les événements (avec pagination)

**Description** : Récupère la liste paginée des événements pour l'utilisateur connecté. Supporte le filtrage par type et statut de lecture.

**Méthode HTTP** : `GET`

**Endpoint** : `/api/events`

**Paramètres d'entrée (Query)** :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `page` | integer | Non | Numéro de page (défaut: 1) |
| `per_page` | integer | Non | Éléments par page (défaut: 20, max: 100) |
| `type` | string | Non | Filtrer par type ('sync', 'payment', 'relance', 'alert', 'import') |
| `unread_only` | boolean | Non | Si true, retourne uniquement les non-lus |
| `search` | string | Non | Recherche textuelle sur titre/description |

**Réponse JSON (200)** :
```json
{
  "events": [
    {
      "id": "uuid",
      "type": "alert",
      "category": "alert",
      "icon": "fa-exclamation-circle",
      "title": "Nouveau contact sans email",
      "description": "Le contact 'Dupont SAS' n'a pas d'adresse email configurée",
      "time": "2024-01-15T14:30:00Z",
      "user": "Système",
      "read": false,
      "entity_type": "contact",
      "entity_id": "contact-uuid",
      "who_id": "contact-uuid",
      "by_marki": 1,
      "metadata": "{\"contact_name\":\"Dupont SAS\"}"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 156,
    "has_more": true
  },
  "unread_count": 23
}
```

**Requête SQL** :
```sql
SELECT 
    e.id,
    e.type,
    e.type as category,
    COALESCE(e.icon, 'fa-bell') as icon,
    e.titre as title,
    e.description,
    e.created_at as time,
    CASE 
        WHEN e.by_marki = 1 THEN 'Système'
        ELSE u.username
    END as user,
    e.read,
    e.entity_type,
    e.entity_id,
    e.who_id,
    e.by_marki,
    e.metadata
FROM events e
LEFT JOIN contacts c ON e.who_id = c.id
LEFT JOIN users u ON e.created_by = u.id
WHERE 1=1
    AND (:type IS NULL OR e.type = :type)
    AND (:unread_only = 0 OR e.read = 0)
    AND (
        :search IS NULL 
        OR e.titre LIKE '%' || :search || '%' 
        OR e.description LIKE '%' || :search || '%'
    )
ORDER BY e.created_at DESC
LIMIT :per_page OFFSET :offset;
```

---

## 2. Obtenir le détail d'un événement

**Description** : Récupère les détails complets d'un événement spécifique.

**Méthode HTTP** : `GET`

**Endpoint** : `/api/events/{id}`

**Paramètres d'entrée (Path)** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | ID de l'événement |

**Réponse JSON (200)** :
```json
{
  "id": "uuid",
  "type": "alert",
  "category": "alert",
  "icon": "fa-exclamation-circle",
  "title": "Nouveau contact sans email",
  "description": "Le contact 'Dupont SAS' n'a pas d'adresse email configurée",
  "time": "2024-01-15T14:30:00Z",
  "user": "Système",
  "read": false,
  "entity_type": "contact",
  "entity_id": "contact-uuid",
  "who_id": "contact-uuid",
  "by_marki": 1,
  "metadata": {"contact_name": "Dupont SAS"},
  "created_at": "2024-01-15T14:30:00Z"
}
```

**Requête SQL** :
```sql
SELECT 
    e.id,
    e.type,
    e.type as category,
    COALESCE(e.icon, 'fa-bell') as icon,
    e.titre as title,
    e.description,
    e.created_at as time,
    CASE 
        WHEN e.by_marki = 1 THEN 'Système'
        ELSE u.username
    END as user,
    e.read,
    e.entity_type,
    e.entity_id,
    e.who_id,
    e.by_marki,
    e.metadata,
    e.created_at
FROM events e
LEFT JOIN users u ON e.created_by = u.id
WHERE e.id = :id;
```

---

## 3. Marquer un événement comme lu

**Description** : Marque un événement spécifique comme lu. Appelé lors du clic sur un événement ou via le bouton "Marquer comme lu".

**Méthode HTTP** : `PATCH`

**Endpoint** : `/api/events/{id}/read`

**Paramètres d'entrée (Path)** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | ID de l'événement |

**Body** : Aucun (ou `{ "read": true }` pour être RESTful)

**Réponse JSON (200)** :
```json
{
  "id": "uuid",
  "read": true,
  "unread_count": 22
}
```

**Requête SQL** :
```sql
UPDATE events 
SET read = 1 
WHERE id = :id;

-- Retourner le nouveau compte de non-lus
SELECT COUNT(*) as unread_count 
FROM events 
WHERE read = 0;
```

---

## 4. Basculer le statut lu/non lu

**Description** : Inverse le statut de lecture d'un événement (lu ↔ non lu). Appelé via le bouton icône enveloppe.

**Méthode HTTP** : `PATCH`

**Endpoint** : `/api/events/{id}/toggle-read`

**Paramètres d'entrée (Path)** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | ID de l'événement |

**Réponse JSON (200)** :
```json
{
  "id": "uuid",
  "read": false,
  "unread_count": 23
}
```

**Requête SQL** :
```sql
UPDATE events 
SET read = CASE WHEN read = 1 THEN 0 ELSE 1 END 
WHERE id = :id;

-- Retourner le nouveau statut et le compte
SELECT 
    id,
    read,
    (SELECT COUNT(*) FROM events WHERE read = 0) as unread_count
FROM events 
WHERE id = :id;
```

---

## 5. Marquer tous les événements comme lus

**Description** : Marque tous les événements non lus de l'utilisateur comme lus. Appelé via le bouton "Tout marquer comme lu".

**Méthode HTTP** : `POST`

**Endpoint** : `/api/events/mark-all-read`

**Body** : Aucun

**Réponse JSON (200)** :
```json
{
  "marked_count": 23,
  "unread_count": 0
}
```

**Requête SQL** :
```sql
-- D'abord compter combien vont être marqués
SELECT COUNT(*) as marked_count 
FROM events 
WHERE read = 0;

-- Puis mettre à jour
UPDATE events 
SET read = 1 
WHERE read = 0;

-- Retourner le compte final
SELECT COUNT(*) as unread_count 
FROM events 
WHERE read = 0;
```

---

## 6. Supprimer un événement

**Description** : Supprime un événement spécifique. Appelé via le bouton corbeille sur chaque ligne.

**Méthode HTTP** : `DELETE`

**Endpoint** : `/api/events/{id}`

**Paramètres d'entrée (Path)** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | ID de l'événement |

**Réponse JSON (200)** :
```json
{
  "deleted": true,
  "id": "uuid",
  "unread_count": 22
}
```

**Requête SQL** :
```sql
DELETE FROM events 
WHERE id = :id;

-- Retourner le nouveau compte de non-lus
SELECT COUNT(*) as unread_count 
FROM events 
WHERE read = 0;
```

---

## 7. Obtenir le compte des événements non lus

**Description** : Retourne le nombre total d'événements non lus (pour le badge dans l'UI).

**Méthode HTTP** : `GET`

**Endpoint** : `/api/events/unread-count`

**Réponse JSON (200)** :
```json
{
  "count": 23,
  "has_unread": true
}
```

**Requête SQL** :
```sql
SELECT 
    COUNT(*) as count,
    CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as has_unread
FROM events 
WHERE read = 0;
```

---

## Résumé des endpoints

| Méthode | Endpoint | Usage dans le mockup |
|---------|----------|---------------------|
| GET | `/api/events` | Chargement initial (initial-load.html) |
| GET | `/api/events/{id}` | Modal détail événement |
| PATCH | `/api/events/{id}/read` | Clic sur événement / bouton "Marquer comme lu" |
| PATCH | `/api/events/{id}/toggle-read` | Bouton icône enveloppe (mark-as-read.html) |
| POST | `/api/events/mark-all-read` | Bouton "Tout marquer comme lu" (mark-all-read.html) |
| DELETE | `/api/events/{id}` | Bouton corbeille |
| GET | `/api/events/unread-count` | Badge "Non lus" dans les filtres |

---

## Schéma de la table `events` (référence)

```sql
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,              -- 'sync', 'payment', 'relance', 'alert', 'import'
    titre TEXT NOT NULL,             -- titre de l'événement
    description TEXT,                -- description détaillée
    entity_type TEXT,                -- type d'entité liée (contact, impaye, etc.)
    entity_id TEXT,                  -- ID de l'entité liée
    who_id TEXT REFERENCES contacts(id),  -- contact concerné
    read INTEGER DEFAULT 0,          -- 0 = non lu, 1 = lu
    by_marki INTEGER DEFAULT 0,     -- 1 = événement système, 0 = utilisateur
    icon TEXT DEFAULT 'fa-bell',    -- icône FontAwesome
    metadata TEXT,                  -- JSON additionnel
    created_at TEXT NOT NULL        -- ISO 8601 timestamp
);
```

---

## Notes d'implémentation

1. **Pagination** : Les workflows frontend utilisent `page` et `per_page` avec une valeur par défaut de 20.

2. **Filtrage** : Le filtrage par recherche textuelle, type et statut "non lus" est géré côté frontend via `filteredEvents`, mais l'API supporte ces filtres pour réduire la charge.

3. **Optimistic UI** : Les workflows utilisent des mises à jour optimistes (ex: `markAsRead` met d'abord à jour le state local avant l'appel API).

4. **localStorage** : Les événements sont persistés dans `localStorage` côté client pour un affichage rapide, puis synchronisés avec l'API.

5. **Catégories** : Le mockup utilise `category` (frontend) qui correspond au champ `type` (backend).
