# Workflow Backend: contacts-unblacklist

## Titre
Retrait d'un contact de la blacklist (Unblacklist Contact)

---

## Objectifs

Ce workflow permet de retirer un contact de la blacklist en effectuant les opérations suivantes :

1. **Vérification de l'existence** du contact via son ID
2. **Validation du statut actuel** - vérifier que le contact est bien en blacklist
3. **Mise à jour des champs** liés à la blacklist :
   - `is_blacklisted` → 0
   - `blacklist_date` → NULL
   - `blacklist_motif` → NULL
   - `updated_at` → timestamp actuel (ISO 8601)
4. **Retour du contact mis à jour** avec son nouveau statut

**Pourquoi ce workflow nécessite un backend :**
- Le statut de blacklist est partagé entre tous les utilisateurs et affecte la logique de relance automatique
- Les champs `is_blacklisted`, `blacklist_date` et `blacklist_motif` doivent être persistés dans SQLite
- Le système de relances automatiques vérifie ce statut avant d'envoyer des emails
- L'historique est conservé via les champs datés

---

## Route API

| Attribut | Valeur |
|----------|--------|
| **Méthode HTTP** | `PUT` |
| **Endpoint** | `/api/contacts/{id}/unblacklist` |
| **Description** | Retire un contact de la blacklist et réinitialise les champs associés |

### Paramètres de chemin (Path Parameters)

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `id` | `string` (UUID) | Oui | Identifiant unique du contact |

---

## Requêtes SQL

### 1. Vérification de l'existence du contact

```sql
SELECT 
    id,
    nom,
    prenom,
    is_blacklisted,
    blacklist_date,
    blacklist_motif,
    updated_at
FROM contacts
WHERE id = ?;
```

**Paramètres :**
- `?` : UUID du contact (string)

**Résultat attendu :**
- Retourne 1 ligne si le contact existe
- Retourne 0 ligne si le contact n'existe pas → Erreur 404

---

### 2. Vérification du statut de blacklist

Cette vérification est effectuée sur le résultat de la requête 1 :

```sql
-- Vérification logique dans le code
-- Si is_blacklisted != 1 OU is_blacklisted IS NULL → Erreur 400
```

**Condition :** Le contact doit avoir `is_blacklisted = 1` pour être retiré de la blacklist.

---

### 3. Mise à jour du contact (Retrait de la blacklist)

```sql
UPDATE contacts
SET 
    is_blacklisted = 0,
    blacklist_date = NULL,
    blacklist_motif = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?;
```

**Paramètres :**
- `?` : UUID du contact (string)

**Effets :**
- Réinitialise `is_blacklisted` à 0 (faux)
- Supprime la date de mise en blacklist (NULL)
- Supprime le motif de blacklist (NULL)
- Met à jour automatiquement le timestamp `updated_at`

---

### 4. Récupération du contact mis à jour

```sql
SELECT 
    id,
    nom,
    prenom,
    email,
    telephone,
    type,
    type_personne,
    statut,
    is_blacklisted,
    blacklist_date,
    blacklist_motif,
    civilite,
    code,
    activite_societe,
    adresse_rue,
    adresse_ville,
    adresse_code_postal,
    adresse_pays,
    notes,
    created_at,
    updated_at,
    externe_id,
    email_force,
    lastSyncAt
FROM contacts
WHERE id = ?;
```

**Paramètres :**
- `?` : UUID du contact (string)

---

## Modèles Pydantic

### Modèle de réponse - ContactUnblacklistResponse

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ContactUnblacklistResponse(BaseModel):
    """
    Modèle de réponse pour le retrait d'un contact de la blacklist.
    Retourne le contact avec son nouveau statut et les champs réinitialisés.
    """
    id: str = Field(..., description="Identifiant unique du contact (UUID)")
    nom: Optional[str] = Field(None, description="Nom du contact")
    prenom: Optional[str] = Field(None, description="Prénom du contact")
    email: Optional[str] = Field(None, description="Adresse email du contact")
    telephone: Optional[str] = Field(None, description="Numéro de téléphone")
    type: Optional[str] = Field(None, description="Type de contact")
    type_personne: Optional[str] = Field(None, description="Type de personne (physique/morale)")
    statut: Optional[str] = Field(None, description="Statut du contact")
    is_blacklisted: int = Field(0, description="Statut blacklist (0 = non blacklisté)")
    blacklist_date: Optional[str] = Field(None, description="Date de mise en blacklist (NULL après retrait)")
    blacklist_motif: Optional[str] = Field(None, description="Motif de la blacklist (NULL après retrait)")
    civilite: Optional[str] = Field(None, description="Civilité du contact")
    code: Optional[str] = Field(None, description="Code interne du contact")
    activite_societe: Optional[str] = Field(None, description="Activité de la société")
    adresse_rue: Optional[str] = Field(None, description="Rue de l'adresse")
    adresse_ville: Optional[str] = Field(None, description="Ville")
    adresse_code_postal: Optional[str] = Field(None, description="Code postal")
    adresse_pays: Optional[str] = Field(None, description="Pays")
    notes: Optional[str] = Field(None, description="Notes sur le contact")
    created_at: str = Field(..., description="Date de création (ISO 8601)")
    updated_at: str = Field(..., description="Date de dernière mise à jour (ISO 8601)")
    externe_id: Optional[str] = Field(None, description="ID externe de référence")
    email_force: Optional[str] = Field(None, description="Email forcé")
    lastSyncAt: Optional[str] = Field(None, description="Date de dernière synchronisation")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "nom": "Petit",
                "prenom": "Lucas",
                "email": "lucas.petit@example.com",
                "telephone": "+33123456789",
                "type": "client",
                "type_personne": "physique",
                "statut": "actif",
                "is_blacklisted": 0,
                "blacklist_date": None,
                "blacklist_motif": None,
                "civilite": "M.",
                "code": "C001234",
                "activite_societe": None,
                "adresse_rue": "123 Rue de Paris",
                "adresse_ville": "Paris",
                "adresse_code_postal": "75001",
                "adresse_pays": "France",
                "notes": "Client régulier",
                "created_at": "2024-01-10T08:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
                "externe_id": None,
                "email_force": None,
                "lastSyncAt": None
            }
        }
```

### Modèle d'erreur - HTTPErrorResponse

```python
from pydantic import BaseModel, Field

class HTTPErrorResponse(BaseModel):
    """
    Modèle de réponse pour les erreurs HTTP.
    """
    error: str = Field(..., description="Message d'erreur explicite")
    code: str = Field(..., description="Code d'erreur technique")
    details: Optional[str] = Field(None, description="Détails additionnels (optionnel)")

    class Config:
        json_schema_extra = {
            "example": {
                "error": "Contact non trouvé",
                "code": "CONTACT_NOT_FOUND",
                "details": "Aucun contact trouvé avec l'ID: 550e8400-e29b-41d4-a716-446655440000"
            }
        }
```

---

## Gestion des erreurs

### Codes HTTP et cas d'erreur

| Code HTTP | Code interne | Message | Cas déclencheur |
|-----------|--------------|---------|-----------------|
| **200** | `SUCCESS` | "Contact retiré de la blacklist avec succès" | Succès de l'opération |
| **400** | `CONTACT_NOT_BLACKLISTED` | "Le contact n'est pas en blacklist" | `is_blacklisted != 1` |
| **404** | `CONTACT_NOT_FOUND` | "Contact non trouvé" | L'ID n'existe pas dans `contacts` |
| **500** | `DATABASE_ERROR` | "Erreur de base de données" | Problème SQLite |

### Détail des erreurs

#### Erreur 400 - Contact non blacklisté

```json
{
  "error": "Le contact n'est pas en blacklist",
  "code": "CONTACT_NOT_BLACKLISTED",
  "details": "Le contact avec l'ID 550e8400-e29b-41d4-a716-446655440000 n'est pas actuellement blacklisté (is_blacklisted=0)"
}
```

**Logique :** Si le contact existe mais n'est pas en blacklist (`is_blacklisted = 0` ou `NULL`), retourner 400. Cela évite les appels redondants et signale au frontend que l'opération n'était pas nécessaire.

#### Erreur 404 - Contact non trouvé

```json
{
  "error": "Contact non trouvé",
  "code": "CONTACT_NOT_FOUND",
  "details": "Aucun contact trouvé avec l'ID: 550e8400-e29b-41d4-a716-446655440000"
}
```

**Logique :** Si la requête SQL 1 ne retourne aucune ligne, le contact n'existe pas.

#### Erreur 500 - Erreur base de données

```json
{
  "error": "Erreur lors de la mise à jour du contact",
  "code": "DATABASE_ERROR",
  "details": "SQLite error: database is locked"
}
```

---

## Exemples

### Exemple de requête

```http
PUT /api/contacts/550e8400-e29b-41d4-a716-446655440000/unblacklist
Content-Type: application/json
Authorization: Bearer <token>
```

**Body :** Aucun body requis pour cette opération (PUT sans payload)

---

### Exemple de réponse succès (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nom": "Petit",
  "prenom": "Lucas",
  "email": "lucas.petit@example.com",
  "telephone": "+33123456789",
  "type": "client",
  "type_personne": "physique",
  "statut": "actif",
  "is_blacklisted": 0,
  "blacklist_date": null,
  "blacklist_motif": null,
  "civilite": "M.",
  "code": "C001234",
  "activite_societe": null,
  "adresse_rue": "123 Rue de Paris",
  "adresse_ville": "Paris",
  "adresse_code_postal": "75001",
  "adresse_pays": "France",
  "notes": "Client régulier",
  "created_at": "2024-01-10T08:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "externe_id": null,
  "email_force": null,
  "lastSyncAt": null
}
```

---

### Exemple de réponse erreur 404

```json
{
  "error": "Contact non trouvé",
  "code": "CONTACT_NOT_FOUND",
  "details": "Aucun contact trouvé avec l'ID: 550e8400-e29b-41d4-a716-446655440000"
}
```

---

### Exemple de réponse erreur 400

```json
{
  "error": "Le contact n'est pas en blacklist",
  "code": "CONTACT_NOT_BLACKLISTED",
  "details": "Le contact avec l'ID 550e8400-e29b-41d4-a716-446655440000 n'est pas actuellement blacklisté (is_blacklisted=0)"
}
```

---

## Implémentation FastAPI suggérée

```python
from fastapi import FastAPI, HTTPException, Path
from fastapi.responses import JSONResponse
import sqlite3
from datetime import datetime
import uuid

app = FastAPI()
DB_PATH = "app/data/marki.db"

@app.put("/api/contacts/{id}/unblacklist", response_model=ContactUnblacklistResponse)
async def unblacklist_contact(
    id: str = Path(..., description="ID du contact à retirer de la blacklist")
):
    """
    Retire un contact de la blacklist.
    
    - Vérifie l'existence du contact
    - Vérifie que le contact est bien en blacklist
    - Met à jour is_blacklisted=0, blacklist_date=NULL, blacklist_motif=NULL
    - Retourne le contact mis à jour
    """
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 1. Vérifier l'existence du contact
        cursor.execute("""
            SELECT id, nom, prenom, is_blacklisted, blacklist_date, blacklist_motif
            FROM contacts 
            WHERE id = ?
        """, (id,))
        
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "Contact non trouvé",
                    "code": "CONTACT_NOT_FOUND",
                    "details": f"Aucun contact trouvé avec l'ID: {id}"
                }
            )
        
        contact = dict(row)
        
        # 2. Vérifier que le contact est bien en blacklist
        if not contact.get('is_blacklisted'):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Le contact n'est pas en blacklist",
                    "code": "CONTACT_NOT_BLACKLISTED",
                    "details": f"Le contact avec l'ID {id} n'est pas actuellement blacklisté (is_blacklisted={contact.get('is_blacklisted', 0)})"
                }
            )
        
        # 3. Mettre à jour le contact (retirer de la blacklist)
        cursor.execute("""
            UPDATE contacts
            SET 
                is_blacklisted = 0,
                blacklist_date = NULL,
                blacklist_motif = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (id,))
        
        conn.commit()
        
        # 4. Récupérer le contact mis à jour
        cursor.execute("""
            SELECT 
                id, nom, prenom, email, telephone, type, type_personne, statut,
                is_blacklisted, blacklist_date, blacklist_motif, civilite, code,
                activite_societe, adresse_rue, adresse_ville, adresse_code_postal,
                adresse_pays, notes, created_at, updated_at, externe_id, email_force, lastSyncAt
            FROM contacts
            WHERE id = ?
        """, (id,))
        
        updated_row = cursor.fetchone()
        updated_contact = dict(updated_row)
        
        return ContactUnblacklistResponse(**updated_contact)
        
    except HTTPException:
        raise
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Erreur lors de la mise à jour du contact",
                "code": "DATABASE_ERROR",
                "details": str(e)
            }
        )
    finally:
        if conn:
            conn.close()
```

---

## Notes d'implémentation

1. **Idempotence** : Cette opération n'est PAS idempotente. Un second appel sur un contact déjà non-blacklisté retournera une erreur 400.

2. **Transactions** : L'opération est atomique (UPDATE unique). Aucune transaction complexe n'est requise.

3. **Trigger possible** : Si besoin d'auditer les opérations de blacklist/unblacklist, envisager un trigger SQLite ou une table d'historique séparée.

4. **Cascade** : Le statut de blacklist d'un contact n'affecte pas directement les impayés liés (table `impayes` a son propre `is_blacklisted`). Si besoin de synchronisation, ajouter une logique métier supplémentaire.

5. **Performance** : Requête simple sur clé primaire indexée (`id`). Complexité O(1).

---

## Dépendances

- **Base de données** : SQLite 3.x (`app/data/marki.db`)
- **Table principale** : `contacts`
- **Framework** : FastAPI
- **Validation** : Pydantic v2
