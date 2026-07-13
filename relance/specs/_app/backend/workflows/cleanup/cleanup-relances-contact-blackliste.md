# Workflow Backend : Nettoyage des Relances (Contacts Blacklistés)

## Objectifs
- Supprimer automatiquement les relances non envoyées liées aux contacts blacklistés
- Empêcher l'envoi d'emails à des contacts blacklistés
- Générer un rapport de suppression au format Markdown
- Support du mode manuel (contact spécifique) ou automatique (tous les blacklistés)

## Process (méga-fonction)

La méga-fonction `cleanupRelancesBlacklist()` est une fonction simple, un script Node.js.

### Étape 1 : Récupération des Contacts Blacklistés
- Si `contactId` fourni : récupère ce contact spécifique et vérifie qu'il est blacklisté
- Sinon : récupère tous les contacts avec `isBlacklisted === true`
- Limite : 1000 contacts
- +> pagination.

### Étape 2 : Recherche des Relances à Supprimer
- Query les relances où `contact` est dans la liste des contacts blacklistés
- Filtre uniquement les relances **non envoyées** :
  - `envoyee !== true`
  - `dateEnvoi` n'existe pas
- Limite : 1000 relances
- +> pagination.

### Étape 3 : Suppression des Relances
- Suppression via `db.delete()` pour chaque relance identifiée.

### Étape 4 : Génération du Rapport
- Création d'un fichier Markdown dans `logs/cleanup-report-{timestamp}.md`
- Contient : nombre de contacts traités, relances supprimées, IDs des relances

## Data Model

### Collection: `contacts`
**Stockage:** `/backend/data/contacts/{id}.yml`

| Champ | Type | Filtre | Description |
|-------|------|--------|-------------|
| `id` | string | | Identifiant |
| `is_blacklisted` | boolean | `=== true` | **Filtre principal** |

### Collection: `relances`
**Stockage:** `/backend/data/relances/{id}.yml`

| Champ | Type | Filtre | Description |
|-------|------|--------|-------------|
| `id` | string | | Identifiant |
| `contact_id` | string | `in [blacklisted_ids]` | Lien vers contact |
| `envoyee` | boolean | `!== true` | Non envoyée |
| `date_envoi` | date | `doesNotExist` | Pas encore envoyée |

---

## Organisation des fichiers

```
/backend/
├── cleanup-relances-contact-blackliste/
│   ├── index.js              # Point d'entrée (mega-fonction)
│   ├── logs/                 # Logs et rapports
│   │   ├── cleanup-relances-YYYY-MM-DD.log
│   │   └── cleanup-report-YYYY-MM-DDTHH-mm-ss.md
│   └── specs/
│       └── spec.md           # Documentation
```

**Chemin complet:** `/backend/cleanup-relances-contact-blackliste/`

---

## Start

### Cloud Function
```bash
# Tous les contacts blacklistés
POST /api/cleanup/relances-blacklist

# Contact spécifique
POST /api/cleanup/relances-blacklist
Body: { "contactId": "cont_abc123" }
```

### CLI
```bash
# Mode manuel sur contact spécifique
node index.js --contact-id=cont_abc123

# Mode automatique (tous les blacklistés)
node index.js
```

### Cron (quotidien)
```javascript
cron.schedule("0 2 * * *", () => {
  cleanupRelancesBlacklist();
});
```

## Process

### index.js
**Objectif :** Supprimer les relances non envoyées des contacts blacklistés.

#### Operations

```javascript
// 1. Récupérer les contacts blacklistés
let blacklistedContacts = [];

if (contactId) {
  // Mode manuel : un contact spécifique
  const contact = await db.read('contacts', contactId);
  if (contact && contact.is_blacklisted) {
    blacklistedContacts = [contact];
  } else {
    return {
      success: true,
      deletedCount: 0,
      message: "Contact non blacklisté"
    };
  }
} else {
  // Mode automatique : tous les blacklistés
  blacklistedContacts = db.query('contacts')
    .where('is_blacklisted').eq(true)
    .limit(1000)
    .data();
}

await log('info', `${blacklistedContacts.length} contact(s) blacklisté(s) trouvé(s)`);

if (blacklistedContacts.length === 0) {
  return {
    success: true,
    deletedCount: 0,
    message: "Aucun contact blacklisté"
  };
}

// 2. Récupérer les IDs des contacts
const blacklistedIds = blacklistedContacts.map(c => c.id);

// 3. Rechercher les relances non envoyées de ces contacts
const relancesToDelete = db.query('relances')
  .where('contact_id').in(blacklistedIds)
  .where('envoyee').ne(true)
  .where('date_envoi').exists(false)  // doesNotExist
  .limit(1000)
  .data();

await log('info', `${relancesToDelete.length} relance(s) à supprimer`);

if (relancesToDelete.length === 0) {
  return {
    success: true,
    deletedCount: 0,
    message: "Aucune relance à supprimer"
  };
}

// 4. Supprimer les relances
for (const relance of relancesToDelete) {
  await db.delete('relances', relance.id);
}

await log('info', `${relancesToDelete.length} relance(s) supprimée(s)`);

// 5. Générer le rapport Markdown
const reportPath = path.join(__dirname, 'logs', `cleanup-report-${new Date().toISOString().replace(/[:.]/g, '-')}.md`);

const reportContent = `# Nettoyage Relances Blacklist - ${new Date().toISOString()}

## Résumé

- **Contacts traités** : ${blacklistedContacts.length}
- **Relances supprimées** : ${relancesToDelete.length}
- **Mode** : ${contactId ? 'manuel' : 'cron'}
- **Contact spécifique** : ${contactId || 'Non'}

## Contacts

${blacklistedContacts.map(c => `- ${c.id}`).join('\n')}

## Relances supprimées

${relancesToDelete.map(r => `- ${r.id}`).join('\n')}
`;

await fs.writeFile(reportPath, reportContent);
await log('info', `Rapport généré: ${reportPath}`);

// 6. Retourner le résultat
return {
  success: true,
  deletedCount: relancesToDelete.length,
  contactsCount: blacklistedContacts.length,
  relanceIds: relancesToDelete.map(r => r.id),
  message: `${relancesToDelete.length} relance(s) supprimée(s) pour ${blacklistedContacts.length} contact(s)`
};
```

#### Output

```javascript
// Succès avec suppressions
{
  "success": true,
  "deletedCount": 45,
  "contactsCount": 12,
  "relanceIds": ["rel_abc123", "rel_def456", ...],
  "message": "45 relance(s) supprimée(s) pour 12 contact(s)"
}

// Succès sans suppression
{
  "success": true,
  "deletedCount": 0,
  "contactsCount": 0,
  "message": "Aucun contact blacklisté"
}

// Contact non blacklisté
{
  "success": true,
  "deletedCount": 0,
  "message": "Contact non blacklisté"
}
```

## Error Handling

| Code | Description |
|------|-------------|
| DB Error | Erreur requête → Throw error, log checkpoint `cleanup-error` |
| Pas de blacklistés | Résultat vide, log `cleanup-completed` |
| Pas de relances | Résultat vide, log `cleanup-completed` |

### Checkpoints

| Checkpoint | Description |
|------------|-------------|
| `cleanup-start` | Démarrage avec paramètres |
| `db-connected` | DB initialisée |
| `contacts-blacklist-fetched` | Contacts blacklistés récupérés |
| `relances-fetched` | Relances à supprimer identifiées |
| `relances-deleted` | Relances supprimées avec succès |
| `log-written` | Rapport Markdown généré |
| `cleanup-completed` | Terminé avec stats |
| `cleanup-error` | Erreur fatale |
