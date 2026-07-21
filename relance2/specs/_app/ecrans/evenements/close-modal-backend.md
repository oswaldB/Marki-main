# Workflow Backend: close-modal

> **⚠️ Verdict : Aucune route API backend nécessaire**
>
> Ce workflow est une action purement côté client qui ne nécessite aucune communication avec le backend.

---

## 1. Titre

**close-modal** - Fermeture du modal de détail événement (frontend uniquement)

---

## 2. Objectifs

| Aspect | Description |
|--------|-------------|
| **Action principale** | Fermer le modal de détail sans marquer l'événement comme lu |
| **Scope** | Uniquement côté client (Alpine.js) |
| **Persistance** | Aucune - gestion d'état UI temporaire |

### State Changes (Frontend uniquement)

```javascript
closeModal() {
  this.showDetailModal = false;  // Masque le modal
  this.selectedEvent = null;      // Réinitialise l'événement sélectionné
  this.error = null;             // Efface les erreurs de validation
}
```

---

## 3. Route API

**Aucune route API requise.**

Ce workflow n'effectue aucun appel HTTP vers le backend. La fermeture du modal est gérée entièrement par le state Alpine.js du composant frontend.

---

## 4. Requêtes SQL

**Aucune requête SQL exécutée.**

Ce workflow ne lit ni n'écrit dans la base de données.

### Tables concernées indirectement

Bien que `close-modal` ne touche pas à la BDD, l'écran `evenements` utilise la table suivante pour l'affichage initial :

| Table | Colonne | Usage |
|-------|---------|-------|
| `events` | `read` | Statut lu/non-lu affiché dans la liste |

---

## 5. Modèles Pydantic

**Aucun modèle Pydantic requis.**

Aucune validation de requête ou de réponse n'est nécessaire côté backend.

---

## 6. Gestion des erreurs

**Aucune erreur HTTP côté backend.**

Les erreurs éventuelles sont gérées côté client :
- Erreurs de validation du state ( Alpine.js )
- Erreurs d'affichage du modal (CSS/DOM)

---

## 7. Implémentation Frontend

### Exemple d'implémentation Alpine.js

```html
<!-- Template HTML -->
<div x-data="eventDetailModal()">
  <!-- Modal -->
  <div x-show="showDetailModal" 
       @keydown.escape.window="closeModal()"
       class="modal-backdrop">
    <div class="modal-content">
      <!-- Contenu du modal -->
      
      <!-- Bouton fermer (close-modal) -->
      <button @click="closeModal()" 
              type="button"
              class="btn-close">
        Fermer
      </button>
    </div>
  </div>
</div>
```

```javascript
// Composant Alpine.js
function eventDetailModal() {
  return {
    showDetailModal: false,
    selectedEvent: null,
    error: null,
    
    /**
     * close-modal
     * Ferme le modal sans marquer comme lu
     */
    closeModal() {
      this.showDetailModal = false;
      this.selectedEvent = null;
      this.error = null;
    },
    
    /**
     * openModal
     * Ouvre le modal avec un événement
     */
    openModal(event) {
      this.selectedEvent = event;
      this.showDetailModal = true;
    }
  }
}
```

---

## 8. Action Complémentaire : mark-as-read

Si vous souhaitez ajouter une action **"Marquer comme lu et fermer"**, voici la spécification backend requise :

### 8.1 Route API

| Attribut | Valeur |
|----------|--------|
| **Méthode HTTP** | `PATCH` |
| **Endpoint** | `/api/events/{id}/read` |
| **Content-Type** | `application/json` |
| **Auth requise** | Oui (JWT) |

### 8.2 Paramètres

**Path Parameters :**

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `id` | `string` | Oui | UUID de l'événement (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) |

**Request Body :** Aucun (action implicite)

### 8.3 Requêtes SQL

#### 8.3.1 Mise à jour du statut "lu"

```sql
UPDATE events 
SET read = 1
WHERE id = :event_id;
```

**Paramètres :**
- `:event_id` - TEXT (UUID de l'événement)

#### 8.3.2 Vérification de l'existence (optionnel)

```sql
SELECT id, read 
FROM events 
WHERE id = :event_id;
```

### 8.4 Modèles Pydantic

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ============ Request Models ============

class MarkEventReadRequest(BaseModel):
    """
    Modèle de requête pour marquer un événement comme lu.
    Aucun champ requis - l'action est implicite via le PATCH.
    """
    pass


class EventIdPathParams(BaseModel):
    """
    Paramètres de chemin pour l'identifiant d'événement.
    """
    id: str = Field(
        ...,
        description="UUID de l'événement",
        pattern=r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
        examples=["550e8400-e29b-41d4-a716-446655440000"]
    )


# ============ Response Models ============

class EventReadResponse(BaseModel):
    """
    Réponse après avoir marqué un événement comme lu.
    """
    success: bool = Field(
        default=True,
        description="Indique si l'opération a réussi"
    )
    event: "EventReadData" = Field(
        description="Données de l'événement mis à jour"
    )


class EventReadData(BaseModel):
    """
    Données essentielles de l'événement après mise à jour.
    """
    id: str = Field(
        description="UUID de l'événement"
    )
    read: int = Field(
        ge=0,
        le=1,
        description="Statut de lecture (0 = non lu, 1 = lu)"
    )


# ============ Error Response Models ============

class ErrorResponse(BaseModel):
    """
    Modèle d'erreur standard.
    """
    detail: str = Field(description="Message d'erreur détaillé")


class EventNotFoundResponse(BaseModel):
    """
    Réponse lorsque l'événement n'existe pas.
    """
    detail: str = Field(
        default="Event not found",
        description="L'événement avec l'ID spécifié n'existe pas"
    )
```

### 8.5 Gestion des erreurs

| Code HTTP | Condition | Message |
|-----------|-----------|---------|
| `200` | Succès | Événement marqué comme lu |
| `401` | Non authentifié | `{"detail": "Not authenticated"}` |
| `404` | Événement inexistant | `{"detail": "Event not found"}` |
| `422` | ID invalide (format UUID) | `{"detail": "Invalid event ID format"}` |
| `500` | Erreur serveur/SQLite | `{"detail": "Internal server error"}` |

### 8.6 Exemples

#### Requête

```bash
curl -X PATCH "https://api.example.com/api/events/550e8400-e29b-41d4-a716-446655440000/read" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"
```

#### Réponse succès (200 OK)

```json
{
  "success": true,
  "event": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "read": 1
  }
}
```

#### Réponse erreur - Événement non trouvé (404)

```json
{
  "detail": "Event not found"
}
```

### 8.7 Implémentation FastAPI

```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated
import sqlite3
from contextlib import contextmanager

router = APIRouter(prefix="/api/events", tags=["events"])

# Database path
DB_PATH = "app/data/marki.db"


@contextmanager
def get_db():
    """Context manager pour la connexion SQLite."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def get_current_user(token: str = Depends(oauth2_scheme)):
    """Récupère l'utilisateur courant depuis le token JWT."""
    # Implémentation de la vérification JWT
    pass


@router.patch(
    "/{id}/read",
    response_model=EventReadResponse,
    responses={
        404: {"model": EventNotFoundResponse},
        422: {"model": ErrorResponse}
    }
)
async def mark_event_as_read(
    path_params: Annotated[EventIdPathParams, Depends()],
    user: Annotated[dict, Depends(get_current_user)]
) -> EventReadResponse:
    """
    Marque un événement comme lu.
    
    - **id**: UUID de l'événement à marquer comme lu
    
    Retourne les données de l'événement mis à jour.
    """
    event_id = path_params.id
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Vérifier que l'événement existe
        cursor.execute(
            "SELECT id FROM events WHERE id = ?",
            (event_id,)
        )
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
        
        # Mettre à jour le statut "read"
        cursor.execute(
            """
            UPDATE events 
            SET read = 1
            WHERE id = ?
            """,
            (event_id,)
        )
        conn.commit()
        
        return EventReadResponse(
            success=True,
            event=EventReadData(
                id=event_id,
                read=1
            )
        )
```

---

## 9. Schéma de la Table `events`

Pour référence, voici les colonnes pertinentes de la table `events` :

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT PRIMARY KEY | UUID de l'événement |
| `type` | TEXT NOT NULL | Type d'événement |
| `titre` | TEXT NOT NULL | Titre de l'événement |
| `description` | TEXT | Description détaillée |
| `read` | INTEGER DEFAULT 0 | Statut lu (0=non lu, 1=lu) |
| `who_id` | TEXT | Référence vers contacts(id) |
| `by_marki` | INTEGER DEFAULT 0 | Créé par Marki |
| `metadata` | TEXT | Métadonnées JSON |
| `icon` | TEXT DEFAULT 'fa-bell' | Icône d'affichage |
| `created_at` | TEXT NOT NULL | Date de création (ISO 8601) |

---

## Résumé

| Workflow | Backend requis | Endpoint | Tables |
|----------|---------------|----------|--------|
| `close-modal` | ❌ Non | - | - |
| `mark-as-read` (optionnel) | ✅ Oui | `PATCH /api/events/{id}/read` | `events` |

**Conclusion :** Le workflow `close-modal` ne requiert **aucune spécification backend**. Il s'agit d'une gestion d'état UI pure (Alpine.js) sans persistance ni appel API. Si une fonctionnalité "Marquer comme lu" est souhaitée, implémenter le workflow complémentaire `mark-as-read` documenté ci-dessus.
