# Workflow Backend : Synchronisation des Contacts sync.db → marki.db

## Objectifs
- Synchroniser les contacts depuis la base externe `sync.db` (table `_ADN_RG_Interlocuteur`) vers la base Marki `marki.db` (table `contacts`)
- **Mettre à jour UNIQUEMENT les contacts existants** dans Marki avec les données de la base externe
- Ignorer les interlocuteurs de sync.db qui n'existent pas déjà dans marki.db
- Marquer les contacts synchronisés avec `lastSyncAt` dans marki.db
- Pas de mode dryRun.

## Process (méga-fonction)

La méga-fonction `sync_contacts_master()` exécute les étapes suivantes :

### Étape 1 : Récupération des Interlocuteurs depuis sync.db
- Query la table `_ADN_RG_Interlocuteur` dans `/home/arthur/adti/sync.db`
- Sélection des champs : `idInterlocuteur`, `typePersonne`, `nom`, `prenom`, `email`, `telephoneMobile`, `titre`, `adresse1`, `codePostal`, `ville`, `dateMaj`
- Optionnel : filtre `since` pour les interlocuteurs modifiés depuis une date (`dateMaj`)
- Optionnel : filtre `interlocuteur_id` pour un seul interlocuteur
- Limite : 10 000 interlocuteurs

### Étape 2 : Vérification des Contacts existants dans marki.db
- Connexion à la base Marki (`marki.db`)
- Vérifier et créer si besoin les colonnes `externe_id` et `lastSyncAt`
- Récupérer tous les contacts existants avec leur `externe_id`
- Construire un mapping `externe_id` → `contact_id` pour identifier les contacts à créer vs mettre à jour

### Étape 3 : Mise à jour des Contacts existants dans marki.db
- Pour chaque interlocuteur de sync.db :
  - Vérifier si le contact existe dans marki.db (via `externe_id`)
  - Si existe : UPDATE avec COALESCE pour préserver les valeurs non-null
  - Si n'existe pas : **ignorer** (ne pas créer)
  - Nettoyer les valeurs `'None'` en `NULL`
  - Construire le nom complet : `prenom + nom`
  - Mapper les champs et mettre à jour `lastSyncAt` + `source = 'sync_db'`
- Exécution en transaction SQL

### Étape 4 : Logging dans events
- Crée un événement dans la table `events` avec :
  - `type: 'sync'`
  - `titre`: "Synchronisation contacts terminée"
  - `description`: stats détaillées
  - `by_marki: 1` (système)
  - `metadata`: stats complètes (updated, failed, skipped, duration_ms)

## Data Model

### Table: `_ADN_RG_Interlocuteur` (Source sync.db)
**Stockage:** `/home/arthur/adti/sync.db`

| Champ | Type | Description |
|-------|------|-------------|
| `idInterlocuteur` | number | ID SQLite (clé primaire) - mappé vers `externe_id` |
| `typePersonne` | string | Type personne (P/M) |
| `nom` | string | Nom |
| `prenom` | string | Prénom |
| `email` | string | Email |
| `telephoneMobile` | string | Téléphone mobile |
| `titre` | string | Civilité (M., Mme, etc.) |
| `adresse1` | string | Adresse ligne 1 |
| `codePostal` | string | Code postal |
| `ville` | string | Ville |
| `dateMaj` | ISO date | Date de dernière modification dans sync.db |

### Table: `contacts` (Destination marki.db)
**Stockage:** `~/marki/relance2/app/data/marki.db`

| Champ | Type | Mise à jour | Description |
|-------|------|-------------|-------------|
| `id` | string | Clé primaire | ID Marki (`cont_{idInterlocuteur}`) |
| `externe_id` | string | Non | ID dans sync.db (pour lien) |
| `nom` | string | Oui | Nom complet (nom + prénom) OU nom de l'entreprise si type_personne='M' |
| `prenom` | string | Oui | Prénom (vide pour les entreprises) |
| `email` | string | Oui | Email |
| `telephone` | string | Oui | Téléphone |
| `type_personne` | string | Oui | Type (P=personne physique, M=personne morale/entreprise) |
| `civilite` | string | Oui | Civilité |
| `adresse_rue` | string | Oui | Adresse |
| `adresse_code_postal` | string | Oui | Code postal |
| `adresse_ville` | string | Oui | Ville |
| `source` | string | Oui | `'sync_db'` |
| `lastSyncAt` | ISO date | **Ajouté** | Date dernière synchro |
| `created_at` | ISO date | Oui | Date création |
| `updated_at` | ISO date | Oui | Date mise à jour |

**Note importante:** La colonne `societe` a été supprimée. Pour les entreprises (type_personne='M'), le nom est stocké dans `nom`. Les liens entre personnes physiques et entreprises se font via la table `contact_relations`.

---

## Organisation des fichiers

```
/app/workflows/
├── sync_contacts.py        # Point d'entrée et orchestrateur
```

**Chemin complet:** `/home/ubuntu/marki/relance2/app/workflows/sync_contacts.py`

---

## Start

### Route
```bash
POST /api/sync/contacts

# cURL - Synchronisation complète
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "https://dev.markidiags.com/api/sync/contacts"

# cURL - Depuis une date
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"since": "2026-07-01T00:00:00.000Z"}' \
  "https://dev.markidiags.com/api/sync/contacts"

# cURL - Interlocuteur spécifique
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"interlocuteurId": 12345}' \
  "https://dev.markidiags.com/api/sync/contacts"
```

### Cron (tous les jours à 01h00)
```python
scheduler.add_job(
    id='sync_contacts_daily',
    func=sync_contacts_job,
    trigger='cron',
    hour=1,
    minute=0,
    second=0,
    replace_existing=True
)
```

## Process

### sync_contacts.py
**Objectif :** Orchestrer la synchronisation sync.db → marki.db.

#### Operations

**Initialisation**
```python
import os
import json
import sqlite3
from datetime import datetime
from flask import current_app

SYNC_DB_PATH = '/home/arthur/adti/sync.db'


def log(level, message, data=None):
    """Logger structuré pour le workflow."""
    entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'level': level,
        'message': message,
        'data': data or {},
        'workflow': 'sync-contacts'
    }
    print(f"[SYNC-CONTACTS] {level.upper()}: {message}", flush=True)
    return entry


def get_marki_db():
    """Get Marki database connection."""
    db = sqlite3.connect(
        current_app.config['DATABASE'],
        detect_types=sqlite3.PARSE_DECLTYPES
    )
    db.row_factory = sqlite3.Row
    return db


def get_sync_db():
    """Get external sync database connection."""
    if not os.path.exists(SYNC_DB_PATH):
        raise FileNotFoundError(f"Base sync introuvable: {SYNC_DB_PATH}")
    
    db = sqlite3.connect(SYNC_DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def ensure_columns_exist(db):
    """S'assure que les colonnes externe_id et lastSyncAt existent."""
    try:
        cursor = db.execute("PRAGMA table_info(contacts)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'externe_id' not in columns:
            db.execute("ALTER TABLE contacts ADD COLUMN externe_id TEXT")
            log('info', 'Colonne externe_id ajoutée')
        
        if 'lastSyncAt' not in columns:
            db.execute("ALTER TABLE contacts ADD COLUMN lastSyncAt TEXT")
            log('info', 'Colonne lastSyncAt ajoutée')
            
        db.commit()
    except Exception as e:
        log('warn', f'Impossible d\'ajouter les colonnes: {str(e)}')
```

**Étape 1 : Récupération Interlocuteurs depuis sync.db**
```python
def etape_1_recuperer_interlocuteurs(sync_db, since=None, interlocuteur_id=None):
    """Récupère les interlocuteurs depuis la base externe."""
    query = """
    SELECT 
        idInterlocuteur,
        typePersonne,
        nom,
        prenom,
        email,
        telephoneMobile,
        titre,
        adresse1,
        codePostal,
        ville,
        dateMaj
    FROM _ADN_RG_Interlocuteur
    WHERE 1=1
    """
    params = []
    
    if interlocuteur_id:
        query += " AND idInterlocuteur = ?"
        params.append(interlocuteur_id)
    
    if since:
        query += " AND (dateMaj >= ? OR dateMaj IS NULL)"
        params.append(since)
    
    query += " LIMIT 10000"
    
    cursor = sync_db.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]
```

**Étape 2 : Vérification Contacts existants dans marki.db**
```python
def etape_2_get_existing_contacts(marki_db):
    """Étape 2: Récupération des Contacts existants dans marki.db."""
    try:
        cursor = marki_db.execute("""
            SELECT id, externe_id, email, telephone 
            FROM contacts 
            WHERE externe_id IS NOT NULL
        """)
        
        existing = {}
        for row in cursor.fetchall():
            existing[str(row['externe_id'])] = {
                'id': row['id'],
                'email': row['email'],
                'telephone': row['telephone']
            }
        
        return existing
    except Exception as e:
        log('warn', f'Erreur récupération contacts existants: {str(e)}')
        return {}
```

**Étape 3 : Mise à jour des Contacts existants**
```python
def etape_3_sync_contacts(marki_db, interlocuteurs, existing_contacts):
    """Étape 3: Mise à jour des Contacts existants dans marki.db."""
    stats = {'updated': 0, 'failed': 0, 'skipped': 0}
    now = datetime.utcnow().isoformat()
    
    for interloc in interlocuteurs:
        externe_id = str(interloc['idInterlocuteur'])
        
        # Ne traiter que les contacts existants dans marki.db
        if externe_id not in existing_contacts:
            stats['skipped'] += 1
            continue
        
        # Construire le nom complet
        prenom = interloc.get('prenom', '') or ''
        nom = interloc.get('nom', '') or ''
        nom_complet = f"{prenom} {nom}".strip()
        nom_complet = nom_complet.replace('None', '').strip() if 'None' in nom_complet else nom_complet
        
        # Nettoyer les valeurs 'None'
        email = interloc.get('email')
        telephone = interloc.get('telephoneMobile')
        civilite = interloc.get('titre')
        adresse = interloc.get('adresse1')
        code_postal = interloc.get('codePostal')
        ville = interloc.get('ville')
        type_personne = interloc.get('typePersonne')
        
        if email == 'None':
            email = None
        if telephone == 'None':
            telephone = None
        
        try:
            # UPDATE uniquement - pas de création
            marki_db.execute("""
                UPDATE contacts SET
                    nom = COALESCE(?, nom),
                    prenom = COALESCE(?, prenom),
                    email = COALESCE(?, email),
                    telephone = COALESCE(?, telephone),
                    type_personne = COALESCE(?, type_personne),
                    civilite = COALESCE(?, civilite),
                    adresse_rue = COALESCE(?, adresse_rue),
                    adresse_code_postal = COALESCE(?, adresse_code_postal),
                    adresse_ville = COALESCE(?, adresse_ville),
                    source = 'sync_db',
                    lastSyncAt = ?,
                    updated_at = ?
                WHERE externe_id = ?
            """, (
                nom_complet if nom_complet else None,
                prenom if prenom else None,
                email,
                telephone,
                type_personne,
                civilite,
                adresse,
                code_postal,
                ville,
                now,
                now,
                externe_id
            ))
            stats['updated'] += 1
                
        except Exception as e:
            log('error', f"Erreur mise à jour interlocuteur {externe_id}: {str(e)}")
            stats['failed'] += 1
    
    return stats
```

**Étape 4 : Logging dans events**
```python
def etape_4_logger_resultat(marki_db, stats, duration_ms):
    """Étape 4: Logging du résultat dans events."""
    total = stats['updated']
    skipped = stats.get('skipped', 0)
    
    creer_evenement(
        marki_db,
        'sync',
        f"Synchronisation contacts terminée",
        f"{total} contacts mis à jour, {skipped} ignorés (non existants)",
        {
            'updated': stats['updated'],
            'failed': stats['failed'],
            'skipped': skipped,
            'duration_ms': duration_ms
        },
        'fa-sync'
    )
```

**Fonction utilitaire: Création d'événement**
```python
def creer_evenement(db, type_event, titre, description, data=None, icon='fa-sync'):
    """Crée un événement dans la base Marki."""
    try:
        event_id = f"evt_{datetime.utcnow().timestamp()}_{type_event}"
        db.execute("""
            INSERT INTO events (id, type, titre, description, by_marki, created_at, metadata, icon)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event_id,
            type_event,
            titre,
            description,
            1,  # by_marki = true
            datetime.utcnow().isoformat(),
            json.dumps(data) if data else None,
            icon
        ))
    except Exception as e:
        log('warn', f'Erreur création événement: {str(e)}')
```

#### Méga-fonction orchestratrice
```python
def sync_contacts_master(since=None, interlocuteur_id=None):
    """
    Méga-fonction de synchronisation des contacts.
    Met à jour uniquement les contacts existants (pas de création).
    
    @checkpoint sync-start
    @checkpoint step-1-complete
    @checkpoint step-2-complete
    @checkpoint step-3-complete
    @checkpoint step-4-complete
    @checkpoint sync-complete
    """
    stats = {
        'interlocuteurs_loaded': 0,
        'contacts_updated': 0,
        'contacts_failed': 0,
        'contacts_skipped': 0,
        'errors': []
    }
    
    start_time = datetime.utcnow()
    marki_db = None
    sync_db = None
    
    try:
        # @checkpoint sync-start
        log('info', 'Démarrage synchronisation contacts')
        
        marki_db = get_marki_db()
        sync_db = get_sync_db()
        
        # S'assurer que les colonnes existent
        ensure_columns_exist(marki_db)
        
        # Étape 1: Récupération des interlocuteurs
        log('info', 'Étape 1: Récupération des interlocuteurs')
        interlocuteurs = etape_1_recuperer_interlocuteurs(sync_db, since, interlocuteur_id)
        stats['interlocuteurs_loaded'] = len(interlocuteurs)
        log('info', f'{len(interlocuteurs)} interlocuteurs à synchroniser')
        
        if len(interlocuteurs) == 0:
            return {
                'success': True,
                'stats': stats,
                'message': 'Aucun interlocuteur à synchroniser'
            }
        
        # Étape 2: Récupération des contacts existants
        log('info', 'Étape 2: Récupération des contacts existants')
        existing = etape_2_get_existing_contacts(marki_db)
        log('info', f'{len(existing)} contacts existants dans marki.db')
        
        # @checkpoint step-1-complete
        # @checkpoint step-2-complete
        
        # Étape 3: Mise à jour des contacts existants uniquement
        log('info', 'Étape 3: Mise à jour des contacts existants')
        sync_stats = etape_3_sync_contacts(marki_db, interlocuteurs, existing)
        stats['contacts_updated'] = sync_stats['updated']
        stats['contacts_failed'] = sync_stats['failed']
        stats['contacts_skipped'] = sync_stats['skipped']
        log('info', f"{sync_stats['updated']} mis à jour, {sync_stats['skipped']} ignorés, {sync_stats['failed']} échecs")
        
        # Commit des transactions
        marki_db.commit()
        
        # @checkpoint step-3-complete
        
        # Étape 4: Logging
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        log('info', 'Étape 4: Logging du résultat')
        etape_4_logger_resultat(marki_db, stats, duration_ms)
        marki_db.commit()
        
        # @checkpoint step-4-complete
        # @checkpoint sync-complete
        
        log('info', 'Synchronisation terminée avec succès', {'duration_ms': duration_ms})
        
        return {
            'success': True,
            'stats': stats,
            'duration_ms': duration_ms
        }
        
    except Exception as e:
        log('error', f'Erreur lors de la synchronisation: {str(e)}')
        stats['errors'].append(str(e))
        return {
            'success': False,
            'stats': stats,
            'error': str(e)
        }
    finally:
        if marki_db:
            marki_db.close()
        if sync_db:
            sync_db.close()
```

#### Output
```python
{
    "success": True,
    "stats": {
        "interlocuteurs_loaded": 1547,
        "contacts_updated": 1502,
        "contacts_failed": 0,
        "contacts_skipped": 45
    },
    "duration_ms": 3200
}
```
```

## Error Handling

| Code | Description |
|------|-------------|
| SQLite | Erreur connexion sync.db → Erreur fatale |
| SQLite | Erreur connexion marki.db → Erreur fatale |
| Import | Échec création/mise à jour contact → Logué, continue avec autres |
| Sync | Échec marquage `lastSyncAt` → Logué, stats ajustées |

### Gestion des erreurs
- Les erreurs de connexion aux bases sont fatales et arrêtent le workflow
- Les échecs de création/mise à jour de contacts sont logués mais ne bloquent pas les autres
- Le marquage `lastSyncAt` est fait pour tous les contacts traités (même en cas d'échecs partiels)
- Un événement est toujours créé pour tracer le déroulement de la synchro
