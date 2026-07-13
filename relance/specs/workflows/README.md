# Workflows Marki Relance

## Structure

```
workflows/
├── frontend/          # Workflows liés aux écrans frontend (149 workflows)
│   ├── login/
│   ├── dashboard/
│   ├── impayes/
│   ├── impayes-payeur/
│   ├── impayes-detail/
│   ├── impayes-suspendus/
│   ├── relances/
│   ├── relances-calendrier/
│   ├── relances-validation/
│   ├── sequences/
│   ├── sequences-relance-detail/
│   ├── sequences-suivi-detail/
│   ├── contacts/
│   ├── settings-smtp/
│   ├── settings-smtp-detail/
│   ├── settings-utilisateurs/
│   ├── portail-mission/
│   ├── portail-client/
│   ├── evenements/
│   └── smart-marki/
└── backend/           # Workflows backend (14 workflows techniques)
    ├── auth-login/
    ├── contacts-toggle-blacklist/
    ├── generate-relances/
    ├── impayes-suspend/
    ├── impayes-unsuspend/
    ├── portail-client/
    ├── relances-cancel/
    ├── relances-validate/
    ├── send-emails/
    ├── smtp-profiles/
    ├── sync-data/
    └── users-management/
```

---

## Frontend Workflows

### Nombre de workflows par écran

| Écran | Nb Workflows |
|-------|--------------|
| login | 1 |
| dashboard | 5 |
| impayes | 11 |
| impayes-payeur | 6 |
| impayes-detail | 10 |
| impayes-suspendus | 1 |
| relances | 10 |
| relances-calendrier | 8 |
| relances-validation | 11 |
| sequences | 8 |
| sequences-relance-detail | 16 |
| sequences-suivi-detail | 14 |
| contacts | 11 |
| settings-smtp | 7 |
| settings-smtp-detail | 3 |
| settings-utilisateurs | 4 |
| portail-mission | 4 |
| portail-client | 7 |
| evenements | 6 |
| smart-marki | 5 |

**Total : 149 workflows frontend**

### Format des fichiers frontend

Chaque fichier `.md` suit ce format :

```markdown
# Workflow : [Nom de l'action]

## Écran
`[fichier-html.html]`

## Élément déclencheur
[Description du bouton/élément]

## Action
[Description de l'action]

## Description
- [Détail 1]
- [Détail 2]

## Navigation (optionnel)
- **Cible** : [route ou élément]
- **Condition** : [si applicable]
```

---

## Backend Workflows

### Architecture : Flat Files DB (LokiJS + YAML)

Les workflows backend utilisent un système **Flat Files DB** avec:
- **LokiJS** : Base de données NoSQL en mémoire avec indexes
- **YAML** : Persistance des données (1 fichier = 1 entité)
- **proper-lockfile** : Gestion des accès concurrents

### Structure des données

```
data/
├── users/                 # Utilisateurs système
├── contacts/              # Contacts (anciennement payeurs)
├── factures/              # Factures impayées
├── relances/              # Relances générées
├── sequences/             # Séquences de relance/suivi
├── smtp_profiles/         # Profils SMTP
├── missions/              # Missions
├── interventions/         # Interventions manuelles
├── activites/             # Journal d'activité
└── db.json                # Fichier LokiJS
```

### Liste des workflows backend

| Workflow | Description | Collection(s) |
|----------|-------------|---------------|
| `auth-login` | Authentification utilisateur (JWT) | `users` |
| `contacts-toggle-blacklist` | Blacklister/déblacklister un contact | `contacts`, `relances` |
| `generate-relances` | Génération auto des relances avec IA (Ollama) | `impayes`, `relances`, `sequences` |
| `impayes-suspend` | Suspendre une facture | `impayes`, `relances` |
| `impayes-unsuspend` | Réactiver une facture suspendue | `impayes` |
| `portail-client` | Authentification et données portail client | `contacts`, `impayes`, `missions` |
| `relances-cancel` | Annuler une relance programmée | `relances` |
| `relances-validate` | Valider une relance en attente | `relances` |
| `send-emails` | Envoi des emails de relance (SMTP) | `relances`, `contacts`, `smtp_profiles` |
| `smtp-profiles` | Gestion des profils SMTP | `smtp_profiles` |
| `sync-data` | Synchronisation depuis SQLite | `impayes`, `contacts` |
| `users-management` | CRUD utilisateurs et rôles | `users` |

**Total : 12 workflows backend**

### Pattern de code type

#### Lecture (pas de lock nécessaire)
```javascript
const collection = db.getCollection('factures');
const facture = collection.findOne({ id: factureId });
const factures = collection.find({ statut: "non payée" });
```

#### Écriture (avec lock obligatoire)
```javascript
const lockfile = require('proper-lockfile');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

async function saveFacture(facture) {
  const lockFile = path.join(LOCK_DIR, `facture_${facture.id}.yml.lock`);
  const filePath = path.join(FACTURES_DIR, `facture_${facture.id}.yml`);
  
  try {
    await lockfile.lock(lockFile, { stale: 5000 });
    
    // Mettre à jour LokiJS
    const collection = db.getCollection('factures');
    const existing = collection.findOne({ id: facture.id });
    if (existing) {
      collection.update(facture);
    } else {
      collection.insert(facture);
    }
    
    // Sauvegarder YAML
    fs.writeFileSync(filePath, yaml.dump(facture, { sortKeys: true }));
    
    await lockfile.unlock(lockFile);
    return { success: true };
  } catch (err) {
    await lockfile.unlock(lockFile).catch(() => {});
    return { success: false, error: err.message };
  }
}
```

### Format des fichiers backend

```markdown
# Workflow Backend : [Nom]

## Objectifs
[Description des objectifs]

## Data Model (Flat Files)
[Structure YAML et collections LokiJS]

## Start
### Route
[Endpoints HTTP et cURL examples]

### Entry Data
[Paramètres d'entrée]

## Process
### 00-master.js
#### Operations
[Étapes détaillées avec code Flat Files]

#### Output
[Format de la réponse]

## Error Handling
[Tableau des codes d'erreur]
```

---

## Récapitulatif Global

| Catégorie | Nombre |
|-----------|--------|
| Workflows Frontend | 149 |
| Workflows Backend | 12 |
| **Total** | **161** |
