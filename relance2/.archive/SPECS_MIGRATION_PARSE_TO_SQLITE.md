# Spécifications - Script de Migration Parse → SQLite

## Objectif
Créer un script Python qui migre l'intégralité des données d'une base Parse Server vers la base SQLite `app/data/marki.db`.

## Source des données
- **URL Base Parse**: `http://localhost:1556/api/parse`
- **Application ID**: `adti-marki`
- **Master Key**: `e2f4e4e89056af61dd95a71226fa0e51917313e09b68aca8bf434e5eb9bd8aa9`
- **Endpoint API**: `/classes/{ClassName}` pour récupérer les données

## Schéma SQLite à créer/modifier

Avant la migration, le script doit s'assurer que toutes les tables et colonnes existent:

```sql
-- Table events (compléter)
ALTER TABLE events ADD COLUMN who_id TEXT REFERENCES contacts(id);
ALTER TABLE events ADD COLUMN by_marki INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN metadata TEXT;

-- Table relances (compléter)
ALTER TABLE relances ADD COLUMN smtp_profile_id TEXT REFERENCES smtp_profiles(id);
ALTER TABLE relances ADD COLUMN cc TEXT;  -- emails en copie, pas une FK

-- Table sequences (compléter)
ALTER TABLE sequences ADD COLUMN scenario TEXT;
ALTER TABLE sequences ADD COLUMN emails_json TEXT;  -- stockage JSON du tableau emails complet
ALTER TABLE sequences ADD COLUMN regles_json TEXT;  -- stockage JSON des règles
ALTER TABLE sequences ADD COLUMN groupes_regles_json TEXT;  -- stockage JSON des groupes de règles

-- Table impayes (compléter)
ALTER TABLE impayes ADD COLUMN proprietaire_id TEXT REFERENCES contacts(id);
ALTER TABLE impayes ADD COLUMN donneur_ordre_id TEXT REFERENCES contacts(id);

-- Table de liaison pour many-to-many Relance ↔ Impaye
CREATE TABLE IF NOT EXISTS relance_impayes (
    relance_id TEXT REFERENCES relances(id) ON DELETE CASCADE,
    impaye_id TEXT REFERENCES impayes(id) ON DELETE CASCADE,
    PRIMARY KEY (relance_id, impaye_id)
);

-- Table de liaison pour many-to-many Suivi ↔ Impaye
CREATE TABLE IF NOT EXISTS suivi_impayes (
    suivi_id TEXT REFERENCES suivis(id) ON DELETE CASCADE,
    impaye_id TEXT REFERENCES impayes(id) ON DELETE CASCADE,
    PRIMARY KEY (suivi_id, impaye_id)
);


```

## Mapping des Classes Parse → Tables SQLite

### 1. `_User` → `users`
| Parse | SQLite | Transformation |
|-------|--------|----------------|
| `objectId` | `id` | Direct |
| `username` | `username` | Direct |
| `email` | `email` | Direct |
| `password` | `password_hash` | Renommage |
| `createdAt` | `created_at` | **DATETIME** - Format ISO 8601 |
| `updatedAt` | `updated_at` | **DATETIME** - Format ISO 8601 |
| `emailVerified` | - | Ignoré |
| `authData` | - | Ignoré |
| - | `role` | Valeur par défaut: 'user' |
| - | `is_active` | Valeur par défaut: 1 |

> **Note sur les dates**: SQLite stocke les dates au format ISO 8601 (ex: `2024-01-15T10:30:00.000Z`) dans des colonnes de type DATETIME (alias pour TEXT en SQLite).

### 2. `Contact` → `contacts`
| Parse | SQLite | Transformation |
|-------|--------|----------------|
| `objectId` | `id` | Direct |
| `nom` | `nom` | Direct - **NOT NULL** (valeur par défaut "Inconnu" si vide) |
| `prenom` | `prenom` | Direct |
| `email` | `email` | Direct |
| `telephone` | `telephone` | Direct |
| `type_personne` | `type_personne` | Direct (valeur par défaut "P") |
| `civilite` | `civilite` | Direct |
| `isBlacklisted` | `is_blacklisted` | Booléen → INTEGER (0/1) |
| `blacklistedAt` | `blacklist_date` | **DATETIME** |
| `createdAt` | `created_at` | **DATETIME** |
| `updatedAt` | `updated_at` | **DATETIME** |
| `externe_id` | `code` | Mapping (code externe) |
| `entreprise` (Pointer) | `societe` | **FK sur contacts.id** - Extraction de l'objectId du Pointer |

> **Résolution des Pointers**: Un Pointer Parse `{"__type": "Pointer", "className": "Contact", "objectId": "xxx"}` est transformé en simple FK (le `objectId` devient la valeur de la colonne FK).

### 3. `Sequence` → `sequences` + `sequences_emails` + `sequences_scenarios`
La classe `Sequence` contient des tableaux JSON complexes à normaliser.

**Table `sequences`**:
| Parse | SQLite | Transformation |
|-------|--------|----------------|
| `objectId` | `id` | Direct |
| `nom` | `nom` | Direct |
| `type` | `type_sequence` | Renommage |
| `publiee` | `actif` | Booléen → INTEGER (0/1) |
| `validation_obligatoire` | `validation_obligatoire` | Booléen → INTEGER (0/1) |
| `attribution_automatique` | `attribution_automatique` | Booléen → INTEGER (0/1) |
| `lien_paiement` | `lien_paiement` | Direct |
| `createdAt` | `created_at` | **DATETIME** |
| `updatedAt` | `updated_at` | **DATETIME** |
| - | `scenario` | **À ajouter** - Stockage du champ scenario global |
| - | `emails` | **À ajouter** - Stockage JSON du tableau `emails` complet |
| - | `regles` | **À ajouter** - Stockage JSON du tableau `regles` |
| - | `groupes_regles` | **À ajouter** - Stockage JSON du tableau `groupes_regles` |

> **Note**: Les tableaux `emails`, `regles` et `groupes_regles` sont stockés en JSON dans la table `sequences` (colonnes `emails_json`, `regles_json`, `groupes_regles_json`). Pas de normalisation en tables séparées.

### 4. `SmtpProfile` → `smtp_profiles`
| Parse | SQLite | Transformation |
|-------|--------|----------------|
| `objectId` | `id` | Direct |
| `nom` | `nom` | Direct |
| `host` | `host` | Direct |
| `port` | `port` | INTEGER |
| `username` | `username` | Direct |
| `password` | `password` | Direct |
| `email_from` | `from_email` | Renommage |
| `nom_affiche` | `from_name` | Renommage |
| `signature_html` | `signature_html` | Direct (HTML) |
| `createdAt` | `created_at` | **DATETIME** |
| `updatedAt` | `updated_at` | **DATETIME** |
| - | `secure` | Défaut: 1 si port=465, sinon 0 |
| - | `actif` | Valeur par défaut: 1 |
| - | `is_default` | Valeur par défaut: 0 |

### 5. `Impaye` → `impayes`
Les champs Pointer vers Contact deviennent des FK:

| Parse | SQLite | Transformation |
|-------|--------|----------------|
| `objectId` | `id` | Direct |
| `payeur` (Pointer) | `payer_id` | **FK sur contacts.id** |
| `contact_relance` (Pointer) | `contact_relance_id` | **FK sur contacts.id** |
| `apporteur` (Pointer) | `apporteur_id` | **FK sur contacts.id** |
| `proprietaire` (Pointer) | `proprietaire_id` | **FK sur contacts.id** - **À AJOUTER** |
| `donneur_ordre` (Pointer) | `donneur_ordre_id` | **FK sur contacts.id** - **À AJOUTER** |
| `sequence` (Pointer) | `sequence_id` | **FK sur sequences.id** |
| `nfacture` | `nfacture` | Cast en TEXT |
| `date_piece` | `date_piece` | **DATETIME** |
| `date_echeance` | `date_echeance` | **DATETIME** |
| `reste_a_payer` | `reste_a_payer` | REAL |
| `total_ttc` | `montant_ttc` | Renommage (REAL) |
| `total_ht` | `total_ht` | REAL - **À AJOUTER** |
| `isBlacklisted` | `is_blacklisted` | Booléen → INTEGER (0/1) |
| `blacklistedAt` | `blacklist_date` | **DATETIME** |
| `blacklistMotif` | `blacklist_motif` | Direct |
| `facture_soldee` | `facture_soldee` | Booléen → INTEGER (0/1) |
| `solde` | `solde` | Booléen → INTEGER (0/1) - **À AJOUTER** |
| `solde_le` | `solde_le` | **DATETIME** - **À AJOUTER** |
| `id_dossier` | `id_dossier` | Direct |
| `numero_dossier` | `numero_dossier` | Cast en TEXT |
| `reference` | `reference` | Direct - **À AJOUTER** |
| `reference_externe` | `reference_externe` | Direct - **À AJOUTER** |
| `statut_dossier` | `statut_dossier` | Direct - **À AJOUTER** |
| `adresse_bien` | `adresse_bien` | Direct |
| `code_postal` | `code_postal` | Direct |
| `ville` | `ville` | Direct |
| `etage` | `etage` | Direct - **À AJOUTER** |
| `entree` | `entree` | Direct - **À AJOUTER** |
| `escalier` | `escalier` | Direct - **À AJOUTER** |
| `porte` | `porte` | Direct - **À AJOUTER** |
| `numero_lot` | `numero_lot` | Direct - **À AJOUTER** |
| `payeur_nom` | `payeur_nom` | Direct |
| `payeur_prenom` | `payeur_prenom` | Direct |
| `payeur_email` | `payeur_email` | Direct |
| `payeur_telephone` | `payeur_telephone` | Direct |
| `payeur_civilite` | `payeur_civilite` | Direct - **À AJOUTER** |
| `payeur_type` | `payeur_type` | Direct - **À AJOUTER** |
| `payeur_type_personne` | `payeur_type_personne` | Direct - **À AJOUTER** |
| `proprietaire_nom` | `proprietaire_nom` | Direct - **À AJOUTER** |
| `proprietaire_prenom` | `proprietaire_prenom` | Direct - **À AJOUTER** |
| `proprietaire_email` | `proprietaire_email` | Direct - **À AJOUTER** |
| `proprietaire_telephone` | `proprietaire_telephone` | Direct - **À AJOUTER** |
| `proprietaire_civilite` | `proprietaire_civilite` | Direct - **À AJOUTER** |
| `proprietaire_type_personne` | `proprietaire_type_personne` | Direct - **À AJOUTER** |
| `apporteur_nom` | `apporteur_nom` | Direct - **À AJOUTER** |
| `apporteur_prenom` | `apporteur_prenom` | Direct - **À AJOUTER** |
| `apporteur_email` | `apporteur_email` | Direct - **À AJOUTER** |
| `apporteur_telephone` | `apporteur_telephone` | Direct - **À AJOUTER** |
| `apporteur_civilite` | `apporteur_civilite` | Direct - **À AJOUTER** |
| `donneur_ordre_nom` | `donneur_ordre_nom` | Direct - **À AJOUTER** |
| `donneur_ordre_prenom` | `donneur_ordre_prenom` | Direct - **À AJOUTER** |
| `donneur_ordre_email` | `donneur_ordre_email` | Direct - **À AJOUTER** |
| `donneur_ordre_telephone` | `donneur_ordre_telephone` | Direct - **À AJOUTER** |
| `donneur_ordre_civilite` | `donneur_ordre_civilite` | Direct - **À AJOUTER** |
| `syndic_nom` | `syndic_nom` | Direct - **À AJOUTER** |
| `syndic_email` | `syndic_email` | Direct - **À AJOUTER** |
| `syndic_telephone` | `syndic_telephone` | Direct - **À AJOUTER** |
| `syndic_civilite` | `syndic_civilite` | Direct - **À AJOUTER** |
| `notaire_nom` | `notaire_nom` | Direct - **À AJOUTER** |
| `notaire_prenom` | `notaire_prenom` | Direct - **À AJOUTER** |
| `notaire_email` | `notaire_email` | Direct - **À AJOUTER** |
| `notaire_telephone` | `notaire_telephone` | Direct - **À AJOUTER** |
| `notaire_civilite` | `notaire_civilite` | Direct - **À AJOUTER** |
| `locataire_entrant_nom` | `locataire_entrant_nom` | Direct - **À AJOUTER** |
| `locataire_entrant_prenom` | `locataire_entrant_prenom` | Direct - **À AJOUTER** |
| `locataire_entrant_email` | `locataire_entrant_email` | Direct - **À AJOUTER** |
| `locataire_entrant_telephone` | `locataire_entrant_telephone` | Direct - **À AJOUTER** |
| `locataire_entrant_civilite` | `locataire_entrant_civilite` | Direct - **À AJOUTER** |
| `locataire_sortant_nom` | `locataire_sortant_nom` | Direct - **À AJOUTER** |
| `locataire_sortant_prenom` | `locataire_sortant_prenom` | Direct - **À AJOUTER** |
| `locataire_sortant_email` | `locataire_sortant_email` | Direct - **À AJOUTER** |
| `locataire_sortant_telephone` | `locataire_sortant_telephone` | Direct - **À AJOUTER** |
| `locataire_sortant_civilite` | `locataire_sortant_civilite` | Direct - **À AJOUTER** |
| `acquereur_nom` | `acquereur_nom` | Direct - **À AJOUTER** |
| `acquereur_prenom` | `acquereur_prenom` | Direct - **À AJOUTER** |
| `acquereur_email` | `acquereur_email` | Direct - **À AJOUTER** |
| `acquereur_telephone` | `acquereur_telephone` | Direct - **À AJOUTER** |
| `acquereur_civilite` | `acquereur_civilite` | Direct - **À AJOUTER** |
| `employe_intervention` | `employe_intervention` | Direct - **À AJOUTER** |
| `commentaire_dossier` | `commentaire_dossier` | Direct - **À AJOUTER** |
| `commentaire_piece` | `commentaire_piece` | Direct - **À AJOUTER** |
| `cadre_mission` | `cadre_mission` | Direct - **À AJOUTER** |
| `url_pdf` | `url_pdf` | Direct |
| `createdAt` | `created_at` | **DATETIME** |
| `updatedAt` | `updated_at` | **DATETIME** |

### 6. `Relance` → `relances` + `relance_impayes`

**Table `relances`**:
| Parse | SQLite | Transformation |
|-------|--------|----------------|
| `objectId` | `id` | Direct |
| `contact` (Pointer) | `contact_id` | **FK sur contacts.id** - **NOT NULL** |
| `sequence` (Pointer) | `sequence_id` | **FK sur sequences.id** |
| `smtpProfil` (Pointer) | `smtp_profile_id` | **FK sur smtp_profiles.id** - **À AJOUTER** |
| `statut` | `statut` | Direct (ex: "Envoyée", "brouillon") |
| `date_envoi_prevue` | `date_programmation` | Renommage - **DATETIME** |
| `dateEnvoi` | `date_envoi` | **DATETIME** |
| `sujet` / `objet` | `sujet` | Prendre `sujet` sinon `objet` |
| `corps` / `contenu` | `corps` | Prendre `corps` sinon `contenu` |
| `cc` | `cc` | Champ texte (emails) - **À AJOUTER** |
| `valide` | `valide` | Booléen → INTEGER (0/1) |
| `manuelle` | `manuelle` | Booléen → INTEGER (0/1) |
| `scenario` | `scenario` | Direct ("single", "multiple") - **À AJOUTER** |
| `email_index` | `email_index` | INTEGER - **À AJOUTER** |
| `emailSent` | `email_sent` | Booléen → INTEGER (0/1) - **À AJOUTER** |
| `erreur_count` | `erreur_count` | INTEGER - **À AJOUTER** |
| `lastError` | `last_error` | TEXT - **À AJOUTER** |
| `createdAt` | `created_at` | **DATETIME** |
| `updatedAt` | `updated_at` | **DATETIME** |

**Table `relance_impayes`** (relation many-to-many):
Le champ `impayes` dans Parse est un tableau de Pointers vers Impaye:
```json
[
  {"__type": "Pointer", "className": "Impaye", "objectId": "xxx"},
  {"__type": "Pointer", "className": "Impaye", "objectId": "yyy"}
]
```

Chaque élément génère un enregistrement dans la table de liaison:
| Champ | Description |
|-------|-------------|
| `relance_id` | FK vers `relances.id` |
| `impaye_id` | FK vers `impayes.id` |

### 7. `Activite` → `events`

| Parse | SQLite | Transformation |
|-------|--------|----------------|
| `objectId` | `id` | Direct |
| `type` | `type` | Direct (ex: "sync_impaye", "paiement") |
| `operation` | `titre` | Concaténation contextuelle |
| `description` | `description` | Direct |
| `impaye` (Pointer) | `entity_id` | FK - ID de l'impayé |
| `impaye_id` | `entity_id` | Fallback si pas de Pointer |
| `relance` (Pointer) | `entity_id` | Fallback si pas d'impayé |
| - | `entity_type` | "Impaye" ou "Relance" selon le pointer |
| `who` (Pointer) | `who_id` | **FK sur contacts.id** - **À AJOUTER** |
| `isSystem` | `by_marki` | Booléen → INTEGER (0/1) - **À AJOUTER** |
| `metadata` | `metadata` | JSON texte - **À AJOUTER** |
| `timestamp` | `created_at` | **DATETIME** |
| `createdAt` | - | Utilisé si timestamp absent |

### 8. `Suivi` → `suivis`
La classe `Suivi` stocke les suivis d'envoi de relances. Elle a les mêmes champs que `Relance`.

**Table `suivis`**:
| Parse | SQLite | Transformation |
|-------|--------|----------------|
| `objectId` | `id` | Direct |
| `contact` (Pointer) | `contact_id` | **FK sur contacts.id** |
| `sequence` (Pointer) | `sequence_id` | **FK sur sequences.id** |
| `smtpProfil` (Pointer) | `smtp_profile_id` | **FK sur smtp_profiles.id** |
| `statut` | `statut` | Direct (ex: "Envoyée", "brouillon") |
| `date_envoi_prevue` | `date_programmation` | Renommage - **DATETIME** |
| `dateEnvoi` | `date_envoi` | **DATETIME** |
| `sujet` / `objet` | `sujet` | Prendre `sujet` sinon `objet` |
| `corps` / `contenu` | `corps` | Prendre `corps` sinon `contenu` |
| `cc` | `cc` | Champ texte (emails) |
| `valide` | `valide` | Booléen → INTEGER (0/1) |
| `manuelle` | `manuelle` | Booléen → INTEGER (0/1) |
| `scenario` | `scenario` | Direct ("single", "multiple") |
| `format` | `format` | Direct |
| `email_index` | `email_index` | INTEGER |
| `emailSent` | `email_sent` | Booléen → INTEGER (0/1) |
| `erreur_count` | `erreur_count` | INTEGER |
| `lastError` | `last_error` | TEXT |
| `createdAt` | `created_at` | **DATETIME** |
| `updatedAt` | `updated_at` | **DATETIME** |

> **Note**: La table `suivis` est créée automatiquement si elle n'existe pas. Elle a les mêmes champs que `relances`. Elle peut aussi avoir une relation many-to-many avec `impayes` via une table `suivi_impayes` si nécessaire.
## Gestion des relations

### Relations Many-to-One (Pointers)
Les champs de type Pointer dans Parse (`{"__type": "Pointer", "className": "X", "objectId": "xxx"}`) sont transformés en clés étrangères simples:
- Extraire l'`objectId` du Pointer
- Stocker cet ID dans la colonne FK de SQLite
- Ex: `contact.objectId` → `relances.contact_id`

### Relations Many-to-Many (Array de Pointers)
Les champs contenant un tableau de Pointers nécessitent une table de liaison:
- **Relance.impayes** → Table `relance_impayes`
- **Contact.employes** → Table `contact_employes` (si migration nécessaire)

### Relations "Relation" de Parse
Les champs de type `Relation` (comme `Contact.employes`) nécessitent une requête séparée:
```
GET /classes/Contact/{objectId}/employes
```
Ces relations sont transformées en tables de liaison.

## Architecture du Script

### Structure des fichiers
```
migration/
├── migrate_parse_to_sqlite.py    # Script principal (monofichier)
└── README.md                     # Documentation
```

### Flux de traitement
1. **Préparation**: Création des colonnes et tables manquantes
2. **Récupération Parse**: Pagination par batch de 1000
3. **Transformation**: Mapping par entité avec conversion des types
4. **Insertion**: `INSERT OR REPLACE` pour l'idempotence
5. **Rapport**: Comptage et validation

### Gestion des types Parse

#### Dates
- **Parse**: Format spécial `{"__type": "Date", "iso": "2024-01-15T10:30:00.000Z"}`
- **SQLite**: Stockage au format ISO 8601 dans colonnes DATETIME

#### Pointers (FK Many-to-One)
- **Parse**: `{"__type": "Pointer", "className": "Contact", "objectId": "xxx"}`
- **SQLite**: Stockage de l'`objectId` dans la colonne FK (TEXT)

#### Tableaux
- **Séquences**: Stockage JSON dans les colonnes `emails_json`, `regles_json`, `groupes_regles_json`
- **Relations M2M**: Tables de liaison (`relance_impayes`)
- **Données complexes**: Stockage JSON dans colonnes TEXT

#### Booléens
- **Parse**: `true`/`false`
- **SQLite**: `1`/`0` (INTEGER)

### Ordre de migration (respect des dépendances FK)
1. `_User` (pas de dépendances)
2. `Contact` (peut référencer un autre Contact via `entreprise`)
3. `Sequence` (pas de dépendances FK)
4. `SmtpProfile` (pas de dépendances FK)
5. `Impaye` (dépend de Contact, Sequence)
6. `Relance` (dépend de Contact, Sequence, SmtpProfile)
7. `Activite` (dépend de Impaye, Relance, Contact)
8. `Suivi` (dépend éventuellement de Relance/Contact)

## Interface CLI

```bash
# Migration complète avec création des tables nécessaires
python migrate_parse_to_sqlite.py --setup

# Migration d'une seule table
python migrate_parse_to_sqlite.py --table Contact

# Mode simulation (dry-run)
python migrate_parse_to_sqlite.py --dry-run

# Verbose avec logs détaillés
python migrate_parse_to_sqlite.py --verbose

# Combiner les options
python migrate_parse_to_sqlite.py --setup --verbose
```

## Vérifications post-migration

1. **Comptage**:
   ```sql
   SELECT 'users', COUNT(*) FROM users
   UNION ALL SELECT 'contacts', COUNT(*) FROM contacts
   UNION ALL SELECT 'sequences', COUNT(*) FROM sequences
   UNION ALL SELECT 'smtp_profiles', COUNT(*) FROM smtp_profiles
   UNION ALL SELECT 'impayes', COUNT(*) FROM impayes
   UNION ALL SELECT 'relances', COUNT(*) FROM relances
   UNION ALL SELECT 'relance_impayes', COUNT(*) FROM relance_impayes
   UNION ALL SELECT 'suivis', COUNT(*) FROM suivis
   UNION ALL SELECT 'suivi_impayes', COUNT(*) FROM suivi_impayes
   UNION ALL SELECT 'events', COUNT(*) FROM events;
   ```

2. **Validation des FK**:
   ```sql
   -- Vérifier les relances sans contact
   SELECT COUNT(*) FROM relances WHERE contact_id IS NULL;
   
   -- Vérifier les impayes sans payeur
   SELECT COUNT(*) FROM impayes WHERE payer_id IS NULL;
   ```

3. **Échantillon de données**:
   ```sql
   -- Exemple: 5 dernières activités
   SELECT * FROM events ORDER BY created_at DESC LIMIT 5;
   ```

## Dépendances
- Python 3.8+
- Standard library uniquement: `urllib`, `sqlite3`, `json`, `uuid`, `argparse`, `logging`
