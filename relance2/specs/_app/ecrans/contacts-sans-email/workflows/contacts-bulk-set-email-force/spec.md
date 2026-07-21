# Workflow Backend: contacts-bulk-set-email-force

## Objectifs

Mettre à jour le champ `email_force` pour plusieurs contacts simultanément via une opération bulk. Cette opération permet aux utilisateurs de définir un email de relance forcé pour des contacts qui n'ont pas d'email principal.

**Fonctionnalités:**
- Validation du format email côté serveur
- Vérification de l'existence de chaque contact
- Mise à jour partielle (les contacts valides sont mis à jour même si certains échouent)
- Support de la suppression de l'email forcé (email_force vide/null)
- Retour détaillé des succès et erreurs par contact

---

## Route API

```
POST /api/contacts/bulk-set-email-force
```

**Headers requis:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

---

## Modèles Pydantic

### Requête

```python
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional

class ContactsBulkSetEmailForceRequest(BaseModel):
    """Requête pour mettre à jour en masse l'email_force des contacts"""
    contact_ids: List[str] = Field(
        ..., 
        min_items=1,
        description="Liste des IDs des contacts à mettre à jour"
    )
    email_force: Optional[str] = Field(
        None,
        description="Email forcé à attribuer. None ou chaîne vide pour supprimer l'email forcé"
    )
    
    @validator('email_force')
    def validate_email_format(cls, v):
        """Validation du format email si fourni et non vide"""
        if v is not None and v.strip():
            import re
            pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(pattern, v.strip()):
                raise ValueError('Format email invalide')
        return v.strip() if v else None
```

### Réponse

```python
from pydantic import BaseModel
from typing import List, Dict, Any

class ContactError(BaseModel):
    """Détail d'une erreur sur un contact spécifique"""
    contact_id: str
    error: str

class ContactsBulkSetEmailForceResponse(BaseModel):
    """Réponse de la mise à jour en masse des emails forcés"""
    success: bool = Field(
        ..., 
        description="True si au moins une mise à jour a réussi"
    )
    updated: int = Field(
        ..., 
        ge=0,
        description="Nombre de contacts mis à jour avec succès"
    )
    errors: List[ContactError] = Field(
        default_factory=list,
        description="Liste des erreurs par contact"
    )
```

---

## Requêtes SQL

### 1. Vérifier l'existence d'un contact

```sql
SELECT 
    id,
    email_force
FROM contacts 
WHERE id = ?
```

**Paramètres:** `contact_id` (TEXT)

**Retour:**
- 1 ligne si le contact existe
- 0 ligne si le contact n'existe pas

---

### 2. Mettre à jour l'email_force d'un contact

```sql
UPDATE contacts 
SET 
    email_force = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?
```

**Paramètres:**
1. `email_force` (TEXT | NULL) - Nouvel email forcé ou NULL pour suppression
2. `contact_id` (TEXT) - ID du contact

**Retour:** Nombre de lignes affectées (0 ou 1)

---

### 3. Récupérer les emails forcés actuels (pour audit/log)

```sql
SELECT 
    id,
    email_force as old_email_force
FROM contacts 
WHERE id IN ({placeholders})
```

**Paramètres:** Liste de `contact_ids` (TEXT[])

**Note:** `placeholders` = `?` répété pour chaque ID (utilisation de paramètres dynamiques)

---

## Logique d'implémentation

```python
import sqlite3
import re
from typing import List, Dict, Any, Optional
from datetime import datetime

# Configuration
DB_PATH = "app/data/marki.db"

# Regex pour validation email
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

def bulk_set_email_force(contact_ids: List[str], email_force: Optional[str]) -> Dict[str, Any]:
    """
    Met à jour en masse le champ email_force pour plusieurs contacts.
    
    Args:
        contact_ids: Liste des IDs de contacts
        email_force: Email forcé (None ou vide pour suppression)
    
    Returns:
        Dict avec success, updated count, et liste d'erreurs
    """
    
    # Normalisation de l'email
    normalized_email = email_force.strip() if email_force else None
    
    # Validation préliminaire du format email
    if normalized_email and not EMAIL_REGEX.match(normalized_email):
        return {
            "success": False,
            "updated": 0,
            "errors": [{"contact_id": "global", "error": "Format email invalide"}]
        }
    
    errors = []
    updated_count = 0
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    try:
        cursor = conn.cursor()
        
        # Traitement de chaque contact individuellement pour gestion granulaire des erreurs
        for contact_id in contact_ids:
            try:
                # Étape 1: Vérifier si le contact existe
                cursor.execute(
                    "SELECT id FROM contacts WHERE id = ?",
                    (contact_id,)
                )
                contact = cursor.fetchone()
                
                if not contact:
                    errors.append({
                        "contact_id": contact_id,
                        "error": "Contact introuvable"
                    })
                    continue
                
                # Étape 2: Mettre à jour le contact
                cursor.execute(
                    """
                    UPDATE contacts 
                    SET email_force = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (normalized_email, contact_id)
                )
                
                if cursor.rowcount > 0:
                    updated_count += 1
                else:
                    # Cas improbable mais géré (contact existe mais update échoue)
                    errors.append({
                        "contact_id": contact_id,
                        "error": "Échec de la mise à jour"
                    })
                
            except sqlite3.Error as e:
                errors.append({
                    "contact_id": contact_id,
                    "error": f"Erreur base de données: {str(e)}"
                })
        
        # Commit de la transaction
        conn.commit()
        
    except sqlite3.Error as e:
        conn.rollback()
        return {
            "success": False,
            "updated": 0,
            "errors": [{"contact_id": "global", "error": f"Erreur transaction: {str(e)}"}]
        }
    finally:
        conn.close()
    
    return {
        "success": updated_count > 0,
        "updated": updated_count,
        "errors": errors
    }
```

---

## Gestion des erreurs

| Code HTTP | Situation | Message retourné |
|-----------|-----------|------------------|
| **200** | Succès partiel ou total | `{ "success": true, "updated": N, "errors": [...] }` |
| **400** | Liste contact_ids vide | `{"detail": "La liste des contacts ne peut pas être vide"}` |
| **400** | Format email invalide | `{"detail": "Format email invalide"}` |
| **401** | Non authentifié | `{"detail": "Non authentifié"}` |
| **403** | Permissions insuffisantes | `{"detail": "Permissions insuffisantes"}` |
| **422** | Validation Pydantic échouée | `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}` |
| **500** | Erreur serveur/base de données | `{"detail": "Erreur interne du serveur"}` |

### Détails des erreurs par contact

Les erreurs spécifiques à un contact sont retournées dans le tableau `errors` de la réponse, avec:
- `contact_id`: L'ID du contact concerné
- `error`: Description lisible du problème

**Types d'erreurs par contact:**
- `"Contact introuvable"` - L'ID ne correspond à aucun contact existant
- `"Échec de la mise à jour"` - La requête UPDATE n'a affecté aucune ligne
- `"Erreur base de données: ..."` - Erreur SQLite spécifique

---

## Exemples

### Exemple 1: Mise à jour réussie (total)

**Requête:**
```http
POST /api/contacts/bulk-set-email-force
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "contact_ids": ["contact_001", "contact_002", "contact_003"],
  "email_force": "relance@exemple.com"
}
```

**Réponse 200:**
```json
{
  "success": true,
  "updated": 3,
  "errors": []
}
```

---

### Exemple 2: Mise à jour partielle (certains contacts inexistants)

**Requête:**
```http
POST /api/contacts/bulk-set-email-force
Content-Type: application/json

{
  "contact_ids": ["contact_001", "contact_inexistant", "contact_002"],
  "email_force": "nouveau@exemple.com"
}
```

**Réponse 200:**
```json
{
  "success": true,
  "updated": 2,
  "errors": [
    {
      "contact_id": "contact_inexistant",
      "error": "Contact introuvable"
    }
  ]
}
```

---

### Exemple 3: Suppression des emails forcés

**Requête:**
```http
POST /api/contacts/bulk-set-email-force
Content-Type: application/json

{
  "contact_ids": ["contact_001", "contact_002"],
  "email_force": null
}
```

**Réponse 200:**
```json
{
  "success": true,
  "updated": 2,
  "errors": []
}
```

**Note:** L'email_force est mis à NULL en base, supprimant ainsi l'email de relance forcé.

---

### Exemple 4: Erreur - Format email invalide

**Requête:**
```http
POST /api/contacts/bulk-set-email-force
Content-Type: application/json

{
  "contact_ids": ["contact_001"],
  "email_force": "pas-un-email"
}
```

**Réponse 400:**
```json
{
  "detail": [
    {
      "loc": ["body", "email_force"],
      "msg": "Format email invalide",
      "type": "value_error"
    }
  ]
}
```

---

### Exemple 5: Erreur - Liste vide

**Requête:**
```http
POST /api/contacts/bulk-set-email-force
Content-Type: application/json

{
  "contact_ids": [],
  "email_force": "test@exemple.com"
}
```

**Réponse 422:**
```json
{
  "detail": [
    {
      "loc": ["body", "contact_ids"],
      "msg": "ensure this value has at least 1 items",
      "type": "value_error.list.min_items"
    }
  ]
}
```

---

## Notes d'implémentation

1. **Transactions:** Chaque contact est traité individuellement dans une transaction globale. Si une erreur survient pour un contact, les autres continuent à être traités.

2. **Performance:** Pour un très grand nombre de contacts (>1000), envisager une approche par batch ou une requête SQL unique avec `CASE`.

3. **Audit:** Logger les opérations bulk dans une table d'audit si nécessaire (qui a fait la modification, quand, anciennes valeurs).

4. **Permissions:** Vérifier que l'utilisateur a les droits de modification sur les contacts avant traitement.

5. **Cascade:** Cette modification n'a pas d'effet de cascade sur d'autres tables.
