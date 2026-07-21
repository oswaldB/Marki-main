# Workflow Backend: contacts-export

## Titre
Export des contacts avec métriques d'impayés et relations

---

## Objectifs

Ce workflow permet d'exporter les contacts filtrés dans un fichier Excel ou CSV, incluant :
- Les informations de base du contact (nom, prénom, email, téléphone, etc.)
- Le nombre d'impayés associés à chaque contact
- Les relations du contact avec d'autres contacts
- Les contacts blacklistés sont inclus par défaut

Le fichier généré est stocké temporairement et accessible via une URL de téléchargement.

---

## Route API

| Attribut | Valeur |
|----------|--------|
| **Méthode** | POST |
| **Endpoint** | `/api/contacts/export` |
| **Content-Type** | application/json |
| **Chemin BDD** | `app/data/marki.db` |

---

## Requêtes SQL

### 1. Recherche des contacts filtrés

```sql
SELECT 
    c.id,
    c.nom,
    c.prenom,
    c.email,
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
    c.created_at,
    c.updated_at,
    c.externe_id,
    c.email_force
FROM contacts c
WHERE 
    (:search IS NULL OR :search = '' 
        OR c.nom LIKE '%' || :search || '%' 
        OR c.prenom LIKE '%' || :search || '%' 
        OR c.email LIKE '%' || :search || '%'
    )
ORDER BY c.nom ASC, c.prenom ASC
LIMIT 10001
```

**Paramètres:**
- `:search` (string, optional) - Terme de recherche pour filtrer nom, prénom ou email

**Note:** La limite de 10001 permet de détecter si le résultat dépasse les 10 000 contacts autorisés.

---

### 2. Comptage des impayés par contact

```sql
SELECT 
    COUNT(i.id) as nb_impayes,
    COALESCE(SUM(i.reste_a_payer), 0) as total_reste_a_payer
FROM impayes i
WHERE i.payeur_id = :contact_id
    AND i.statut = 'impaye'
    AND i.is_blacklisted = 0
    AND i.facture_soldee = 0
```

**Paramètres:**
- `:contact_id` (string) - ID du contact

---

### 3. Récupération des relations d'un contact

```sql
SELECT 
    cr.id as relation_id,
    cr.contact_cible_id,
    c_cible.nom as cible_nom,
    c_cible.prenom as cible_prenom,
    cr.type_relation,
    crt.nom as type_relation_nom,
    cr.date_debut,
    cr.date_fin,
    cr.est_actif,
    cr.notes as relation_notes
FROM contact_relations cr
LEFT JOIN contact_relation_types crt ON cr.type_relation = crt.code
LEFT JOIN contacts c_cible ON cr.contact_cible_id = c_cible.id
WHERE cr.contact_source_id = :contact_id
    AND cr.est_actif = 1
ORDER BY crt.ordre_affichage ASC, cible_nom ASC
```

**Paramètres:**
- `:contact_id` (string) - ID du contact source

---

### 4. Insertion du fichier temporaire (table de tracking optionnelle)

```sql
INSERT INTO export_temp_files (
    id,
    filename,
    filepath,
    created_at,
    expires_at
) VALUES (
    :file_id,
    :filename,
    :filepath,
    CURRENT_TIMESTAMP,
    datetime('now', '+30 minutes')
)
```

**Paramètres:**
- `:file_id` (string) - UUID du fichier
- `:filename` (string) - Nom du fichier généré
- `:filepath` (string) - Chemin absolu du fichier temporaire

---

### 5. Nettoyage des fichiers expirés

```sql
DELETE FROM export_temp_files 
WHERE expires_at < CURRENT_TIMESTAMP
```

---

## Modèles Pydantic

### Request Models

```python
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal


class ContactsExportRequest(BaseModel):
    """Modèle de requête pour l'export des contacts"""
    
    search: Optional[str] = Field(
        default=None,
        description="Terme de recherche filtrant nom, prénom, email",
        max_length=255
    )
    
    include_blacklist: bool = Field(
        default=True,
        description="Inclure les contacts blacklistés (toujours true pour ce workflow)"
    )
    
    format: Literal["xlsx", "csv"] = Field(
        default="xlsx",
        description="Format d'export: 'xlsx' ou 'csv'"
    )
    
    @field_validator('search')
    @classmethod
    def sanitize_search(cls, v: Optional[str]) -> Optional[str]:
        """Nettoie le terme de recherche"""
        if v is None:
            return None
        v = v.strip()
        if len(v) < 2:
            return None  # Recherche trop courte ignorée
        return v
    
    @field_validator('format')
    @classmethod
    def validate_format(cls, v: str) -> str:
        """Valide le format d'export"""
        if v not in ["xlsx", "csv"]:
            raise ValueError("Le format doit être 'xlsx' ou 'csv'")
        return v
```

### Response Models

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ContactsExportResponse(BaseModel):
    """Modèle de réponse pour l'export des contacts"""
    
    success: bool = Field(
        default=True,
        description="Indique si l'export a réussi"
    )
    
    download_url: str = Field(
        description="URL relative de téléchargement du fichier"
    )
    
    filename: str = Field(
        description="Nom du fichier généré"
    )
    
    count: int = Field(
        ge=0,
        description="Nombre de contacts exportés"
    )
    
    expires_at: datetime = Field(
        description="Date et heure d'expiration du lien de téléchargement (ISO 8601)"
    )
    
    message: Optional[str] = Field(
        default=None,
        description="Message informatif additionnel"
    )


class ContactsExportErrorResponse(BaseModel):
    """Modèle de réponse en cas d'erreur"""
    
    success: bool = Field(default=False)
    error: str = Field(description="Code d'erreur")
    message: str = Field(description="Message d'erreur détaillé")
    details: Optional[dict] = Field(default=None, description="Détails techniques")
```

---

## Gestion des Erreurs

| Code HTTP | Cas | Message |
|-----------|-----|---------|
| **200** | Aucun contact trouvé | `{"success": true, "count": 0, "message": "Aucun contact ne correspond aux critères"}` |
| **400** | Paramètre format invalide | `{"error": "INVALID_FORMAT", "message": "Le format doit être 'xlsx' ou 'csv'"}` |
| **413** | Trop de contacts (>10 000) | `{"error": "EXPORT_TOO_LARGE", "message": "L'export est limité à 10 000 contacts"}` |
| **500** | Erreur génération fichier | `{"error": "EXPORT_FAILED", "message": "Erreur lors de la génération du fichier"}` |
| **500** | Erreur base de données | `{"error": "DATABASE_ERROR", "message": "Erreur lors de l'accès aux données"}` |
| **500** | Erreur disque/serveur | `{"error": "SERVER_ERROR", "message": "Erreur serveur, réessayez plus tard"}` |

---

## Exemples

### Exemple de Requête

```http
POST /api/contacts/export HTTP/1.1
Content-Type: application/json

{
  "search": "Dupont",
  "include_blacklist": true,
  "format": "xlsx"
}
```

### Exemple de Réponse - Succès

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "download_url": "/api/contacts/export/download/a1b2c3d4e5f6",
  "filename": "contacts_2024-06-15_143052.xlsx",
  "count": 42,
  "expires_at": "2024-06-15T14:35:52Z",
  "message": null
}
```

### Exemple de Réponse - Aucun contact

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "download_url": "",
  "filename": "",
  "count": 0,
  "expires_at": null,
  "message": "Aucun contact ne correspond aux critères de recherche"
}
```

### Exemple de Réponse - Export trop volumineux

```http
HTTP/1.1 413 Payload Too Large
Content-Type: application/json

{
  "success": false,
  "error": "EXPORT_TOO_LARGE",
  "message": "L'export est limité à 10 000 contacts. Veuillez affiner votre recherche.",
  "details": {
    "found": 15420,
    "limit": 10000
  }
}
```

### Exemple de Réponse - Erreur serveur

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "success": false,
  "error": "EXPORT_FAILED",
  "message": "Erreur lors de la génération du fichier Excel",
  "details": {
    "exception": "PermissionError",
    "info": "Cannot write to /tmp/exports/"
  }
}
```

---

## Structure du fichier Excel généré

Le fichier Excel contient une feuille unique "Contacts" avec les colonnes suivantes :

| Colonne | Source | Description |
|---------|--------|-------------|
| ID | contacts.id | Identifiant unique |
| Code | contacts.code | Code client |
| Civilité | contacts.civilite | M., Mme, etc. |
| Nom | contacts.nom | Nom de famille |
| Prénom | contacts.prenom | Prénom |
| Email | contacts.email | Adresse email |
| Téléphone | contacts.telephone | Numéro de téléphone |
| Type | contacts.type | Type de contact |
| Type Personne | contacts.type_personne | Physique ou Morale |
| Statut | contacts.statut | Statut du contact |
| Activité Société | contacts.activite_societe | Activité si pro |
| Adresse | contacts.adresse_rue | Rue |
| Code Postal | contacts.adresse_code_postal | CP |
| Ville | contacts.adresse_ville | Ville |
| Pays | contacts.adresse_pays | Pays |
| Blacklisté | contacts.is_blacklisted | Oui/Non |
| Motif Blacklist | contacts.blacklist_motif | Raison du blacklist |
| Nb Impayés | Calculé | Nombre d'impayés actifs |
| Total Reste à Payer | Calculé | Somme des restes à payer |
| Relations | Calculé | Liste des relations (nom - type) |
| Notes | contacts.notes | Notes libres |
| Externe ID | contacts.externe_id | ID externe |
| Créé le | contacts.created_at | Date de création |
| Mis à jour le | contacts.updated_at | Date de modification |

---

## Notes d'implémentation

1. **Stockage temporaire**: Les fichiers sont stockés dans `app/temp/exports/` avec une durée de vie de 30 minutes

2. **Génération Excel**: Utiliser `openpyxl` pour les fichiers .xlsx et `csv` module standard pour .csv

3. **Sécurité**: L'URL de téléchargement doit contenir un token aléatoire unique (UUID) non prédictible

4. **Nettoyage**: Un job périodique (toutes les 5 minutes) supprime les fichiers expirés

5. **Pagination interne**: Pour les exports volumineux (>1000 contacts), utiliser une pagination interne pour éviter les pics mémoire

6. **Encodage CSV**: Le fichier CSV doit être encodé en UTF-8 avec BOM pour compatibilité Excel
