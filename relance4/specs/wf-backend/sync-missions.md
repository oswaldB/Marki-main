# Workflow Backend : Synchronisation des Missions ADTI

## Description
Synchronise les missions d'un dossier spécifique depuis la base ADTI (`/home/arthur/adti/sync.db`) vers la base Marki (`/app/data/marki.db`).

## Objectifs
- Lire les missions du dossier concerné depuis la base ADTI
- Récupérer les informations de l'intervenant (prénom et nom)
- Insérer ou mettre à jour les missions dans la table `missions`

## Base de données source (ADTI)
- **Chemin** : `/home/arthur/adti/sync.db`
- **Tables** : `missions`, `agents`

```sql
-- Structure table missions ADTI
CREATE TABLE missions (
    id INTEGER PRIMARY KEY,
    numero_dossier TEXT NOT NULL,
    type_mission TEXT NOT NULL,      -- 'vente', 'location', 'repérage amiante', etc.
    libelle TEXT NOT NULL,            -- Libellé de la mission
    date_intervention TEXT,           -- Date d'intervention
    description TEXT,
    statut TEXT,                      -- 'planifiée', 'réalisée', 'annulée'
    agent_id INTEGER,                 -- Référence vers agents.id
    created_at TEXT,
    updated_at TEXT
);

-- Structure table agents ADTI
CREATE TABLE agents (
    id INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT,
    email TEXT,
    telephone TEXT
);
```

## Base de données cible (Marki)
- **Chemin** : `/app/data/marki.db`
- **Table** : `missions` (à créer si n'existe pas)

```sql
-- Création table missions dans marki.db
CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    impaye_id TEXT NOT NULL REFERENCES impayes(id) ON DELETE CASCADE,
    numero_dossier TEXT NOT NULL,
    type_mission TEXT NOT NULL,       -- Ex: 'vente', 'repérage amiante'
    libelle TEXT NOT NULL,            -- Ex: 'Diagnostic amiante', 'DPE'
    intervenant_nom TEXT,             -- Nom de l'intervenant
    intervenant_prenom TEXT,          -- Prénom de l'intervenant
    date_intervention TEXT,
    description TEXT,
    statut TEXT DEFAULT 'planifiee',
    source TEXT DEFAULT 'ADTI',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_missions_impaye_id ON missions(impaye_id);
CREATE INDEX IF NOT EXISTS idx_missions_dossier ON missions(numero_dossier);
```

## Process

```javascript
/**
 * Synchronise les missions d'un dossier depuis ADTI
 * @checkpoint SyncMissionsFromADTI
 */
async function syncMissionsFromADTI(impayeId, numeroDossier) {
  const sqlite3 = require('sqlite3').verbose();
  
  // Connexion à la base ADTI (lecture seule)
  const adtiDb = new sqlite3.Database('/home/arthur/adti/sync.db', sqlite3.OPEN_READONLY);
  
  // Connexion à la base Marki
  const markiDb = new sqlite3.Database('/app/data/marki.db');
  
  try {
    // 1. Récupérer les missions avec les infos de l'intervenant depuis ADTI
    const missionsADTI = await new Promise((resolve, reject) => {
      const query = `
        SELECT 
          m.id,
          m.numero_dossier,
          m.type_mission,
          m.libelle,
          m.date_intervention,
          m.description,
          m.statut,
          a.nom as agent_nom,
          a.prenom as agent_prenom,
          m.created_at,
          m.updated_at
        FROM missions m
        LEFT JOIN agents a ON m.agent_id = a.id
        WHERE m.numero_dossier = ?
        ORDER BY m.date_intervention DESC
      `;
      
      adtiDb.all(query, [numeroDossier], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // 2. Marquer les missions existantes comme obsolètes
    await new Promise((resolve, reject) => {
      markiDb.run(
        `UPDATE missions 
         SET statut = 'obsolete', 
             updated_at = CURRENT_TIMESTAMP 
         WHERE impaye_id = ?`,
        [impayeId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    // 3. Insérer ou mettre à jour les missions
    const insertedMissions = [];
    
    for (const mission of missionsADTI) {
      const missionId = `mission_${impayeId}_${mission.id}`;
      
      await new Promise((resolve, reject) => {
        const insertQuery = `
          INSERT INTO missions (
            id, impaye_id, numero_dossier, type_mission, libelle,
            intervenant_nom, intervenant_prenom,
            date_intervention, description, statut, source, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ADTI', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            type_mission = excluded.type_mission,
            libelle = excluded.libelle,
            intervenant_nom = excluded.intervenant_nom,
            intervenant_prenom = excluded.intervenant_prenom,
            date_intervention = excluded.date_intervention,
            description = excluded.description,
            statut = excluded.statut,
            updated_at = CURRENT_TIMESTAMP
        `;
        
        markiDb.run(insertQuery, [
          missionId,
          impayeId,
          mission.numero_dossier,
          mission.type_mission,
          mission.libelle,
          mission.agent_nom,
          mission.agent_prenom,
          mission.date_intervention,
          mission.description,
          mission.statut || 'planifiee'
        ], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      insertedMissions.push({
        id: missionId,
        typeMission: mission.type_mission,
        type: mission.libelle,
        intervenantNom: mission.agent_nom,
        intervenantPrenom: mission.agent_prenom,
        intervenant: mission.agent_prenom && mission.agent_nom 
          ? `${mission.agent_prenom} ${mission.agent_nom}` 
          : mission.agent_nom || 'Non assigné',
        dateIntervention: mission.date_intervention,
        description: mission.description,
        statut: mission.statut
      });
    }
    
    // 4. Créer un événement de sync
    await new Promise((resolve, reject) => {
      const eventQuery = `
        INSERT INTO events (id, type, titre, description, entity_type, entity_id, created_at)
        VALUES (?, 'sync', 'Synchronisation missions', ?, 'impaye', ?, CURRENT_TIMESTAMP)
      `;
      
      markiDb.run(eventQuery, [
        `evt_${Date.now()}`,
        `${insertedMissions.length} mission(s) synchronisée(s) depuis ADTI`,
        impayeId
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    return {
      success: true,
      data: {
        missionsSynced: insertedMissions.length,
        missions: insertedMissions
      }
    };
    
  } catch (error) {
    console.error('Erreur synchronisation missions:', error);
    throw error;
  } finally {
    adtiDb.close();
    markiDb.close();
  }
}
```

## Route API

```bash
POST /api/impayes/{id}/sync-missions
```

### Paramètres

| Nom | Type | Obligatoire | Description |
|-----|------|-------------|-------------|
| id | string | Oui | ID de l'impayé |

### Body

```json
{
  "numero_dossier": "D-2024-045"
}
```

### Réponse (200 OK)

```json
{
  "success": true,
  "data": {
    "missionsSynced": 3,
    "missions": [
      {
        "id": "mission_uuid_123",
        "typeMission": "vente",
        "type": "Diagnostic amiante",
        "intervenantNom": "Martin",
        "intervenantPrenom": "Pierre",
        "intervenant": "Pierre Martin",
        "dateIntervention": "2024-01-10",
        "description": "Diagnostic réglementaire avant travaux",
        "statut": "réalisée"
      }
    ]
  }
}
```

### Erreurs

| Code | Description |
|------|-------------|
| 404 | Impayé non trouvé |
| 500 | Erreur de connexion à la base ADTI |
| 403 | Accès refusé à la base ADTI |

## Notes

- La base ADTI est en lecture seule pour Marki
- Les missions sont identifiées par une clé composite: `mission_{impayeId}_{adtiMissionId}`
- Les missions non présentes dans ADTI sont marquées comme 'obsolete'
- Un événement est créé pour tracer chaque synchronisation
- L'intervenant est récupéré via une jointure LEFT JOIN avec la table `agents`
