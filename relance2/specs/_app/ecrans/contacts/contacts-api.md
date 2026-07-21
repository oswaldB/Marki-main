# Workflow Backend: contacts-api

## Titre
API de gestion des contacts (CRUD, statistiques, blacklist et export)

## Objectifs
Ce workflow backend expose une API REST complète pour la gestion des contacts dans Marki :
1. **Lister les contacts** avec leurs relations et nombre d'impayés associés
2. **Calculer les statistiques** (total, entreprises, personnes, impayés, blacklist, sans email)
3. **Mettre à jour l'email forcé** d'un contact
4. **Gérer le blacklisting** (ajouter/retirer avec motif)
5. **Exporter les contacts** au format Excel

---

## Route API

### 1. Liste des contacts
- **Méthode:** GET
- **Endpoint:** `/api/contacts`
- **Description:** Récupère la liste des contacts avec leurs relations et compteurs d'impayés

### 2. Statistiques des contacts
- **Méthode:** GET
- **Endpoint:** `/api/contacts/stats`
- **Description:** Retourne les statistiques agrégées pour les badges et filtres

### 3. Mise à jour email forcé
- **Méthode:** PUT
- **Endpoint:** `/api/contacts/{id}`
- **Description:** Met à jour le champ `email_force` d'un contact

### 4. Blacklist
- **Méthode:** PUT
- **Endpoint:** `/api/contacts/{id}/blacklist`
- **Description:** Active/désactive le blacklisting d'un contact avec motif

### 5. Export Excel
- **Méthode:** POST
- **Endpoint:** `/api/contacts/export`
- **Description:** Génère un fichier Excel avec les contacts filtrés

---

## Requêtes SQL

Chemin de la base de données: `app/data/marki.db`

### 1. Liste des contacts (GET /api/contacts)

```sql
-- Requête principale avec comptage d'impayés
SELECT 
    c.id,
    c.nom,
    c.prenom,
    c.email,
    c.email_force,
    c.telephone,
    c.type,
    c.type_personne,
    c.statut,
    c.is_blacklisted,
    c.blacklist_date,
    c.blacklist_motif,
    c.civilite,
    c.code,
    c.activite_societe,
    c.adresse_rue,
    c.adresse_ville,
    c.adresse_code_postal,
    c.adresse_pays,
    c.notes,
    c.externe_id,
    c.created_at,
    c.updated_at,
    COUNT(DISTINCT i.id) as impayes_count
FROM contacts c
LEFT JOIN impayes i ON (
    i.payer_id = c.id 
    OR i.contact_relance_id = c.id 
    OR i.proprietaire_id = c.id 
    OR i.apporteur_id = c.id
    OR i.donneur_ordre_id = c.id
    OR i.locataire_entrant_id = c.id
    OR i.locataire_sortant_id = c.id
    OR i.notaire_id = c.id
    OR i.syndic_id = c.id
    OR i.acquereur_id = c.id
)
WHERE 1=1
    AND (:search IS NULL OR 
        c.nom LIKE '%' || :search || '%' OR 
        c.prenom LIKE '%' || :search || '%' OR 
        c.email LIKE '%' || :search || '%' OR
        c.email_force LIKE '%' || :search || '%')
    AND (:type IS NULL OR c.type = :type)
GROUP BY c.id
ORDER BY c.nom, c.prenom
LIMIT :limit
```

```sql
-- Récupération des relations d'un contact
SELECT 
    cr.id,
    cr.contact_cible_id as contact_id,
    cr.type_relation,
    cr.date_debut,
    cr.date_fin,
    cr.est_actif,
    cr.notes,
    c.nom,
    c.prenom,
    c.email,
    c.type as contact_type,
    c.type_personne
FROM contact_relations cr
JOIN contacts c ON cr.contact_cible_id = c.id
WHERE cr.contact_source_id = :contact_id
    AND cr.est_actif = 1
```

```sql
-- Comptage total pour la pagination
SELECT COUNT(*) as total 
FROM contacts c
WHERE 1=1
    AND (:search IS NULL OR 
        c.nom LIKE '%' || :search || '%' OR 
        c.prenom LIKE '%' || :search || '%' OR 
        c.email LIKE '%' || :search || '%' OR
        c.email_force LIKE '%' || :search || '%')
    AND (:type IS NULL OR c.type = :type)
```

### 2. Statistiques (GET /api/contacts/stats)

```sql
-- Total des contacts
SELECT COUNT(*) as total FROM contacts
```

```sql
-- Nombre d'entreprises (type = 'M')
SELECT COUNT(*) as entreprises 
FROM contacts 
WHERE type = 'M'
```

```sql
-- Nombre de personnes (type = 'P')
SELECT COUNT(*) as personnes 
FROM contacts 
WHERE type = 'P'
```

```sql
-- Contacts avec impayés
SELECT COUNT(DISTINCT c.id) as avec_impayes
FROM contacts c
WHERE EXISTS (
    SELECT 1 FROM impayes i 
    WHERE i.payer_id = c.id 
       OR i.contact_relance_id = c.id 
       OR i.proprietaire_id = c.id 
       OR i.apporteur_id = c.id
       OR i.donneur_ordre_id = c.id
       OR i.locataire_entrant_id = c.id
       OR i.locataire_sortant_id = c.id
       OR i.notaire_id = c.id
       OR i.syndic_id = c.id
       OR i.acquereur_id = c.id
)
```

```sql
-- Contacts en blacklist
SELECT COUNT(*) as blacklist 
FROM contacts 
WHERE is_blacklisted = 1
```

```sql
-- Contacts sans email (ni email ni email_force)
SELECT COUNT(*) as sans_email 
FROM contacts 
WHERE (email IS NULL OR email = '') 
  AND (email_force IS NULL OR email_force = '')
```

### 3. Mise à jour email forcé (PUT /api/contacts/{id})

```sql
-- Vérification existence contact
SELECT id FROM contacts WHERE id = :id
```

```sql
-- Vérification unicité email_force (si contrainte applicable)
SELECT id FROM contacts 
WHERE email_force = :email_force 
  AND id != :id 
  AND :email_force IS NOT NULL 
  AND :email_force != ''
```

```sql
-- Mise à jour
UPDATE contacts 
SET 
    email_force = :email_force,
    updated_at = datetime('now')
WHERE id = :id
```

### 4. Blacklist (PUT /api/contacts/{id}/blacklist)

```sql
-- Vérification existence contact
SELECT id, is_blacklisted FROM contacts WHERE id = :id
```

```sql
-- Activer blacklist
UPDATE contacts 
SET 
    is_blacklisted = 1,
    blacklist_date = datetime('now'),
    blacklist_motif = :motif,
    updated_at = datetime('now')
WHERE id = :id
```

```sql
-- Désactiver blacklist (retrait de la blacklist)
UPDATE contacts 
SET 
    is_blacklisted = 0,
    blacklist_date = NULL,
    blacklist_motif = NULL,
    updated_at = datetime('now')
WHERE id = :id
```

### 5. Export Excel (POST /api/contacts/export)

```sql
-- Requête d'export avec tous les champs nécessaires
SELECT 
    c.id,
    c.nom,
    c.prenom,
    c.email,
    c.email_force,
    c.telephone,
    c.type,
    c.type_personne,
    c.statut,
    c.is_blacklisted,
    c.blacklist_motif,
    c.civilite,
    c.code,
    c.activite_societe,
    c.adresse_rue,
    c.adresse_ville,
    c.adresse_code_postal,
    c.adresse_pays,
    c.notes,
    c.externe_id,
    c.created_at,
    c.updated_at,
    COUNT(DISTINCT i.id) as nb_impayes
FROM contacts c
LEFT JOIN impayes i ON (
    i.payer_id = c.id 
    OR i.contact_relance_id = c.id 
    OR i.proprietaire_id = c.id 
    OR i.apporteur_id = c.id
    OR i.donneur_ordre_id = c.id
    OR i.locataire_entrant_id = c.id
    OR i.locataire_sortant_id = c.id
    OR i.notaire_id = c.id
    OR i.syndic_id = c.id
    OR i.acquereur_id = c.id
)
WHERE 1=1
    AND (:search IS NULL OR 
        c.nom LIKE '%' || :search || '%' OR 
        c.prenom LIKE '%' || :search || '%' OR 
        c.email LIKE '%' || :search || '%')
    AND (:type IS NULL OR c.type = :type)
    AND (:blacklist_only IS NULL OR c.is_blacklisted = :blacklist_only)
    AND (:avec_impayes IS NULL OR (:avec_impayes = 1 AND i.id IS NOT NULL))
GROUP BY c.id
ORDER BY c.nom, c.prenom
```

---

## Modèles Pydantic

```python
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ==================== ENUMS ====================

class ContactType(str, Enum):
    """Type de contact: M = Moral (Entreprise), P = Physique (Personne)"""
    ENTREPRISE = "M"
    PERSONNE = "P"


class StatutContact(str, Enum):
    """Statut du contact"""
    ACTIF = "actif"
    INACTIF = "inactif"
    PROSPECT = "prospect"


class TypePersonne(str, Enum):
    """Type de personne détaillé"""
    PARTICULIER = "particulier"
    PROFESSIONNEL = "professionnel"
    SOCIETE = "societe"


class TypeRelation(str, Enum):
    """Types de relations entre contacts"""
    COLLABORATEUR = "collaborateur"
    CLIENT = "client"
    FOURNISSEUR = "fournisseur"
    PARTENAIRE = "partenaire"
    FILIALE = "filiale"
    AUTRE = "autre"


# ==================== MODÈLES DE RÉPONSE ====================

class ContactRelationResponse(BaseModel):
    """Modèle de réponse pour une relation de contact"""
    id: str = Field(..., description="ID de la relation")
    contact_id: str = Field(..., description="ID du contact lié")
    nom: Optional[str] = Field(None, description="Nom du contact lié")
    prenom: Optional[str] = Field(None, description="Prénom du contact lié")
    email: Optional[str] = Field(None, description="Email du contact lié")
    type_relation: str = Field(..., description="Type de relation")
    contact_type: Optional[str] = Field(None, description="Type du contact lié")
    type_personne: Optional[str] = Field(None, description="Type de personne du contact lié")
    est_actif: int = Field(default=1, description="1 si actif, 0 sinon")

    class Config:
        from_attributes = True


class ContactResponse(BaseModel):
    """Modèle de réponse pour un contact"""
    id: str
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[str] = None
    email_force: Optional[str] = None
    telephone: Optional[str] = None
    type: Optional[str] = None  # 'M' ou 'P'
    type_personne: Optional[str] = None
    statut: Optional[str] = None
    is_blacklisted: int = Field(default=0)
    blacklist_date: Optional[str] = None
    blacklist_motif: Optional[str] = None
    civilite: Optional[str] = None
    code: Optional[str] = None
    activite_societe: Optional[str] = None
    adresse_rue: Optional[str] = None
    adresse_ville: Optional[str] = None
    adresse_code_postal: Optional[str] = None
    adresse_pays: Optional[str] = None
    notes: Optional[str] = None
    externe_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    impayes_count: int = Field(default=0, description="Nombre d'impayés associés")
    relations: List[ContactRelationResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ContactsListResponse(BaseModel):
    """Modèle de réponse pour la liste des contacts"""
    contacts: List[ContactResponse]
    total: int
    limit: int
    offset: int = 0


class ContactStatsResponse(BaseModel):
    """Modèle de réponse pour les statistiques des contacts"""
    total: int = Field(..., description="Nombre total de contacts")
    entreprises: int = Field(..., description="Nombre d'entreprises (type = 'M')")
    personnes: int = Field(..., description="Nombre de personnes (type = 'P')")
    avec_impayes: int = Field(..., description="Contacts ayant des impayés")
    blacklist: int = Field(..., description="Contacts en blacklist")
    sans_email: int = Field(..., description="Contacts sans email")


class ContactUpdateResponse(BaseModel):
    """Modèle de réponse après mise à jour"""
    success: bool
    message: str
    contact: Optional[ContactResponse] = None


class BlacklistUpdateResponse(BaseModel):
    """Modèle de réponse après mise à jour blacklist"""
    success: bool
    message: str
    is_blacklisted: bool
    blacklist_date: Optional[str] = None
    blacklist_motif: Optional[str] = None


class ExportResponse(BaseModel):
    """Modèle de réponse pour l'export"""
    success: bool
    message: str
    download_url: Optional[str] = None
    filename: Optional[str] = None
    count: int = Field(default=0, description="Nombre de contacts exportés")


# ==================== MODÈLES DE REQUÊTE ====================

class ContactListQuery(BaseModel):
    """Paramètres de requête pour la liste des contacts"""
    limit: int = Field(default=1000, ge=1, le=10000)
    offset: int = Field(default=0, ge=0)
    search: Optional[str] = None
    type: Optional[ContactType] = None
    order_by: str = Field(default="nom")
    order_direction: str = Field(default="asc", pattern="^(asc|desc)$")


class ContactUpdateRequest(BaseModel):
    """Requête de mise à jour d'un contact"""
    email_force: Optional[str] = Field(None, max_length=255)


class ContactUpdateEmailForceRequest(BaseModel):
    """Requête spécifique pour mise à jour de l'email forcé"""
    email_force: str = Field(..., max_length=255, description="Email forcé à définir")


class BlacklistRequest(BaseModel):
    """Requête pour le blacklisting"""
    motif: str = Field(..., min_length=1, max_length=500, description="Motif du blacklisting")
    action: str = Field(default="add", pattern="^(add|remove)$", description="add = blacklister, remove = retirer")


class BlacklistUpdateRequest(BaseModel):
    """Requête pour mise à jour blacklist (simplifié)"""
    motif: str = Field(..., min_length=1, max_length=500)


class ContactExportRequest(BaseModel):
    """Requête pour l'export des contacts"""
    search: Optional[str] = None
    type: Optional[ContactType] = None
    blacklist_only: bool = Field(default=False)
    avec_impayes: bool = Field(default=False)
    format: str = Field(default="xlsx", pattern="^(xlsx|csv)$")
    fields: Optional[List[str]] = Field(default=None, description="Champs à exporter (tous si None)")


# ==================== MODÈLES D'ERREUR ====================

class ErrorResponse(BaseModel):
    """Modèle d'erreur standard"""
    error: str
    message: str
    code: Optional[str] = None
    details: Optional[dict] = None


class ValidationErrorResponse(BaseModel):
    """Modèle d'erreur de validation"""
    error: str = "Validation Error"
    message: str
    errors: List[dict] = Field(default_factory=list)
```

---

## Gestion des erreurs

### Codes HTTP et messages

| Code HTTP | Cas | Message |
|-----------|-----|---------|
| **200** | Succès | Opération réussie |
| **201** | Création réussie | Contact créé (si POST implémenté) |
| **400** | Paramètres invalides | "Paramètres de requête invalides" |
| **404** | Contact non trouvé | `{"error": "Not Found", "message": "Contact non trouvé", "contact_id": "{id}"}` |
| **409** | Conflit email_force | `{"error": "Conflict", "message": "Cet email est déjà utilisé par un autre contact"}` |
| **422** | Données manquantes | `{"error": "Validation Error", "message": "Le motif est requis pour le blacklisting"}` |
| **500** | Erreur serveur | `{"error": "Internal Server Error", "message": "Erreur lors de la génération de l'export Excel"}` |

### Détails des erreurs par endpoint

#### GET /api/contacts
- **400**: `limit` > 10000 ou négatif
- **400**: Paramètre `type` invalide (différent de 'M' ou 'P')

#### PUT /api/contacts/{id}
- **404**: Contact avec l'ID fourni n'existe pas
- **409**: L'email_force existe déjà pour un autre contact (si contrainte d'unicité)
- **422**: Format d'email invalide (si validation stricte)

#### PUT /api/contacts/{id}/blacklist
- **404**: Contact avec l'ID fourni n'existe pas
- **422**: Champ `motif` manquant ou vide lors de l'ajout à la blacklist
- **422**: Motif > 500 caractères

#### POST /api/contacts/export
- **500**: Erreur d'écriture du fichier Excel
- **500**: Erreur de requête SQL lors de l'export
- **400**: Format d'export non supporté (ni 'xlsx' ni 'csv')

---

## Exemples

### 1. Liste des contacts

#### Requête
```http
GET /api/contacts?limit=50&search=Dupont&type=P HTTP/1.1
Host: localhost:8000
Accept: application/json
```

#### Réponse 200
```json
{
  "contacts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nom": "Dupont",
      "prenom": "Jean",
      "email": "jean.dupont@email.com",
      "email_force": "jean.pro@email.com",
      "telephone": "+33 6 12 34 56 78",
      "type": "P",
      "type_personne": "particulier",
      "statut": "actif",
      "is_blacklisted": 0,
      "blacklist_date": null,
      "blacklist_motif": null,
      "civilite": "M.",
      "code": "CLI-001",
      "activite_societe": null,
      "adresse_rue": "12 Rue de Paris",
      "adresse_ville": "Lyon",
      "adresse_code_postal": "69001",
      "adresse_pays": "France",
      "notes": "Client fidèle",
      "externe_id": null,
      "created_at": "2024-01-15T10:30:00",
      "updated_at": "2024-06-20T14:45:00",
      "impayes_count": 3,
      "relations": [
        {
          "id": "rel-001",
          "contact_id": "550e8400-e29b-41d4-a716-446655440001",
          "nom": "ACME Corporation",
          "prenom": null,
          "email": "contact@acme.com",
          "type_relation": "collaborateur",
          "contact_type": "M",
          "type_personne": "societe",
          "est_actif": 1
        }
      ]
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

### 2. Statistiques

#### Requête
```http
GET /api/contacts/stats HTTP/1.1
Host: localhost:8000
Accept: application/json
```

#### Réponse 200
```json
{
  "total": 150,
  "entreprises": 45,
  "personnes": 105,
  "avec_impayes": 23,
  "blacklist": 5,
  "sans_email": 12
}
```

---

### 3. Mise à jour email forcé

#### Requête
```http
PUT /api/contacts/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "email_force": "nouveau.email@exemple.com"
}
```

#### Réponse 200
```json
{
  "success": true,
  "message": "Email forcé mis à jour avec succès",
  "contact": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@email.com",
    "email_force": "nouveau.email@exemple.com",
    "telephone": "+33 6 12 34 56 78",
    "type": "P",
    "type_personne": "particulier",
    "statut": "actif",
    "is_blacklisted": 0,
    "impayes_count": 3,
    "relations": []
  }
}
```

#### Réponse 404
```json
{
  "error": "Not Found",
  "message": "Contact non trouvé",
  "contact_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Réponse 409
```json
{
  "error": "Conflict",
  "message": "Cet email est déjà utilisé par un autre contact",
  "email_force": "nouveau.email@exemple.com"
}
```

---

### 4. Blacklist

#### Requête - Ajouter à la blacklist
```http
PUT /api/contacts/550e8400-e29b-41d4-a716-446655440000/blacklist HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "motif": "Client injoignable, emails rejetés"
}
```

#### Réponse 200
```json
{
  "success": true,
  "message": "Contact ajouté à la blacklist",
  "is_blacklisted": true,
  "blacklist_date": "2024-06-21T10:15:30",
  "blacklist_motif": "Client injoignable, emails rejetés"
}
```

#### Réponse 422
```json
{
  "error": "Validation Error",
  "message": "Le motif est requis pour le blacklisting",
  "field": "motif"
}
```

---

### 5. Export Excel

#### Requête
```http
POST /api/contacts/export HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "search": "Dupont",
  "type": "P",
  "format": "xlsx",
  "fields": ["nom", "prenom", "email", "telephone", "type"]
}
```

#### Réponse 200
```json
{
  "success": true,
  "message": "Export généré avec succès",
  "download_url": "/api/exports/contacts_20240621_101530.xlsx",
  "filename": "contacts_20240621_101530.xlsx",
  "count": 42
}
```

#### Réponse 500
```json
{
  "error": "Internal Server Error",
  "message": "Erreur lors de la génération de l'export Excel",
  "details": {
    "error_type": "PermissionError",
    "error_message": "Cannot write to export directory"
  }
}
```

---

## Implémentation FastAPI suggérée

```python
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.responses import FileResponse
import sqlite3
from typing import Optional, List
from datetime import datetime
import pandas as pd
import os

app = FastAPI()
DB_PATH = "app/data/marki.db"

# Dependency: Database connection
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


@app.get("/api/contacts", response_model=ContactsListResponse)
async def list_contacts(
    limit: int = Query(1000, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None,
    type: Optional[str] = Query(None, regex="^[MP]$"),
    db: sqlite3.Connection = Depends(get_db)
):
    """Liste les contacts avec leurs relations et nombre d'impayés"""
    # Requête principale
    query = """
        SELECT 
            c.*,
            COUNT(DISTINCT i.id) as impayes_count
        FROM contacts c
        LEFT JOIN impayes i ON (
            i.payer_id = c.id OR i.contact_relance_id = c.id OR 
            i.proprietaire_id = c.id OR i.apporteur_id = c.id OR
            i.donneur_ordre_id = c.id OR i.locataire_entrant_id = c.id OR
            i.locataire_sortant_id = c.id OR i.notaire_id = c.id OR
            i.syndic_id = c.id OR i.acquereur_id = c.id
        )
        WHERE 1=1
            AND (? IS NULL OR c.nom LIKE '%' || ? || '%' OR c.prenom LIKE '%' || ? || '%')
            AND (? IS NULL OR c.type = ?)
        GROUP BY c.id
        ORDER BY c.nom, c.prenom
        LIMIT ? OFFSET ?
    """
    
    cursor = db.execute(query, (search, search, search, type, type, limit, offset))
    rows = cursor.fetchall()
    
    contacts = []
    for row in rows:
        contact_dict = dict(row)
        
        # Récupérer les relations
        rel_query = """
            SELECT cr.*, c.nom, c.prenom, c.email, c.type as contact_type, c.type_personne
            FROM contact_relations cr
            JOIN contacts c ON cr.contact_cible_id = c.id
            WHERE cr.contact_source_id = ? AND cr.est_actif = 1
        """
        rel_cursor = db.execute(rel_query, (contact_dict['id'],))
        relations = [dict(r) for r in rel_cursor.fetchall()]
        contact_dict['relations'] = relations
        
        contacts.append(ContactResponse(**contact_dict))
    
    # Comptage total
    count_query = """
        SELECT COUNT(*) as total FROM contacts c
        WHERE (? IS NULL OR c.nom LIKE '%' || ? || '%' OR c.prenom LIKE '%' || ? || '%')
        AND (? IS NULL OR c.type = ?)
    """
    total = db.execute(count_query, (search, search, search, type, type)).fetchone()[0]
    
    return ContactsListResponse(contacts=contacts, total=total, limit=limit, offset=offset)


@app.get("/api/contacts/stats", response_model=ContactStatsResponse)
async def get_contacts_stats(db: sqlite3.Connection = Depends(get_db)):
    """Retourne les statistiques des contacts"""
    stats = {}
    
    # Total
    stats['total'] = db.execute("SELECT COUNT(*) FROM contacts").fetchone()[0]
    
    # Entreprises
    stats['entreprises'] = db.execute("SELECT COUNT(*) FROM contacts WHERE type = 'M'").fetchone()[0]
    
    # Personnes
    stats['personnes'] = db.execute("SELECT COUNT(*) FROM contacts WHERE type = 'P'").fetchone()[0]
    
    # Avec impayés
    stats['avec_impayes'] = db.execute("""
        SELECT COUNT(DISTINCT c.id) FROM contacts c
        WHERE EXISTS (
            SELECT 1 FROM impayes i 
            WHERE i.payer_id = c.id OR i.contact_relance_id = c.id 
               OR i.proprietaire_id = c.id OR i.apporteur_id = c.id
        )
    """).fetchone()[0]
    
    # Blacklist
    stats['blacklist'] = db.execute("SELECT COUNT(*) FROM contacts WHERE is_blacklisted = 1").fetchone()[0]
    
    # Sans email
    stats['sans_email'] = db.execute("""
        SELECT COUNT(*) FROM contacts 
        WHERE (email IS NULL OR email = '') AND (email_force IS NULL OR email_force = '')
    """).fetchone()[0]
    
    return ContactStatsResponse(**stats)


@app.put("/api/contacts/{contact_id}", response_model=ContactUpdateResponse)
async def update_contact(
    contact_id: str,
    request: ContactUpdateEmailForceRequest,
    db: sqlite3.Connection = Depends(get_db)
):
    """Met à jour l'email forcé d'un contact"""
    # Vérifier existence
    cursor = db.execute("SELECT id FROM contacts WHERE id = ?", (contact_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail={
            "error": "Not Found",
            "message": "Contact non trouvé",
            "contact_id": contact_id
        })
    
    # Vérifier unicité si applicable
    if request.email_force:
        cursor = db.execute(
            "SELECT id FROM contacts WHERE email_force = ? AND id != ?",
            (request.email_force, contact_id)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail={
                "error": "Conflict",
                "message": "Cet email est déjà utilisé par un autre contact"
            })
    
    # Mise à jour
    db.execute("""
        UPDATE contacts SET email_force = ?, updated_at = datetime('now') WHERE id = ?
    """, (request.email_force, contact_id))
    db.commit()
    
    # Récupérer le contact mis à jour
    cursor = db.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,))
    contact = dict(cursor.fetchone())
    
    return ContactUpdateResponse(
        success=True,
        message="Email forcé mis à jour avec succès",
        contact=ContactResponse(**contact)
    )


@app.put("/api/contacts/{contact_id}/blacklist", response_model=BlacklistUpdateResponse)
async def update_blacklist(
    contact_id: str,
    request: BlacklistUpdateRequest,
    db: sqlite3.Connection = Depends(get_db)
):
    """Met à jour le statut de blacklist d'un contact"""
    # Vérifier existence
    cursor = db.execute("SELECT id, is_blacklisted FROM contacts WHERE id = ?", (contact_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail={
            "error": "Not Found",
            "message": "Contact non trouvé",
            "contact_id": contact_id
        })
    
    is_blacklisted = row['is_blacklisted']
    
    if is_blacklisted:
        # Retirer de la blacklist
        db.execute("""
            UPDATE contacts 
            SET is_blacklisted = 0, blacklist_date = NULL, blacklist_motif = NULL, 
                updated_at = datetime('now')
            WHERE id = ?
        """, (contact_id,))
        message = "Contact retiré de la blacklist"
        is_blacklisted = False
        blacklist_date = None
        blacklist_motif = None
    else:
        # Ajouter à la blacklist
        if not request.motif or not request.motif.strip():
            raise HTTPException(status_code=422, detail={
                "error": "Validation Error",
                "message": "Le motif est requis pour le blacklisting",
                "field": "motif"
            })
        
        db.execute("""
            UPDATE contacts 
            SET is_blacklisted = 1, blacklist_date = datetime('now'), 
                blacklist_motif = ?, updated_at = datetime('now')
            WHERE id = ?
        """, (request.motif, contact_id))
        message = "Contact ajouté à la blacklist"
        is_blacklisted = True
        blacklist_date = datetime.now().isoformat()
        blacklist_motif = request.motif
    
    db.commit()
    
    return BlacklistUpdateResponse(
        success=True,
        message=message,
        is_blacklisted=is_blacklisted,
        blacklist_date=blacklist_date,
        blacklist_motif=blacklist_motif
    )


@app.post("/api/contacts/export", response_model=ExportResponse)
async def export_contacts(
    request: ContactExportRequest,
    db: sqlite3.Connection = Depends(get_db)
):
    """Exporte les contacts au format Excel ou CSV"""
    try:
        # Requête d'export
        query = """
            SELECT c.*, COUNT(DISTINCT i.id) as nb_impayes
            FROM contacts c
            LEFT JOIN impayes i ON (
                i.payer_id = c.id OR i.contact_relance_id = c.id OR 
                i.proprietaire_id = c.id OR i.apporteur_id = c.id
            )
            WHERE 1=1
                AND (? IS NULL OR c.nom LIKE '%' || ? || '%')
                AND (? IS NULL OR c.type = ?)
            GROUP BY c.id
            ORDER BY c.nom, c.prenom
        """
        
        df = pd.read_sql_query(query, db, params=(
            request.search, request.search, request.type, request.type
        ))
        
        # Filtrer les champs si spécifiés
        if request.fields:
            df = df[request.fields]
        
        # Générer le fichier
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"contacts_{timestamp}.{request.format}"
        export_dir = "app/exports"
        os.makedirs(export_dir, exist_ok=True)
        filepath = os.path.join(export_dir, filename)
        
        if request.format == "xlsx":
            df.to_excel(filepath, index=False, engine='openpyxl')
        else:
            df.to_csv(filepath, index=False)
        
        return ExportResponse(
            success=True,
            message="Export généré avec succès",
            download_url=f"/api/exports/{filename}",
            filename=filename,
            count=len(df)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error": "Internal Server Error",
            "message": "Erreur lors de la génération de l'export Excel",
            "details": {"error_message": str(e)}
        })


@app.get("/api/exports/{filename}")
async def download_export(filename: str):
    """Télécharge un fichier d'export"""
    filepath = os.path.join("app/exports", filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    return FileResponse(filepath, filename=filename)
```

---

## Notes d'implémentation

1. **Base de données SQLite**: Utiliser `sqlite3` avec `row_factory = sqlite3.Row` pour un accès facile aux colonnes par nom.

2. **Jointure impayés**: La jointure avec `impayes` est complexe car un contact peut apparaître dans plusieurs champs (payer_id, proprietaire_id, etc.). Utiliser `COUNT(DISTINCT i.id)` pour éviter les doublons.

3. **Relations**: Les relations sont récupérées dans une requête séparée pour chaque contact (N+1 query) ou via une requête groupée si optimisation nécessaire.

4. **Export Excel**: Nécessite `pandas` et `openpyxl` (`pip install pandas openpyxl`).

5. **Transactions**: Toujours utiliser `db.commit()` après les modifications (UPDATE, DELETE).

6. **Injection SQL**: Utiliser des paramètres `?` pour toutes les valeurs dynamiques.
