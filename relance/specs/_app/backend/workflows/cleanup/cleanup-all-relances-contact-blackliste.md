# Workflow Backend : Nettoyage des Relances (Contacts Blacklistés)

## Objectifs
- Supprimer TOUTES les relances (y compris celles envoyées) pour les contacts blacklistés
- Fonctionne en mode batch (tous les contacts blacklistés) ou ciblé (un contact spécifique)
- Nettoie complètement les relances des contacts qui ne doivent plus recevoir de communications

## Différence avec `cleanup-relances-contact-blackliste`

| | `cleanup-relances-contact-blackliste` | `cleanup-all-relances-contact-blackliste` |
|--|--------------------------------------|------------------------------------------|
| Portée | Relances non envoyées (brouillons) | TOUTES les relances (y compris envoyées) |
| Statut | Statut actuel préservé | Suppression totale |
| Utilisation | Après blacklist d'un contact | Nettoyage complet/batch |

## Process (méga-fonction)

La méga-fonction `cleanupAllRelancesBlacklist(contactId)` exécute les étapes suivantes :

### Étape 1 : Récupération des Contacts Blacklistés
- **Mode ciblé** : Si `contactId` fourni, vérifie que ce contact est blacklisté
- **Mode batch** : Sinon, récupère tous les contacts avec `isBlacklisted = true`

### Étape 2 : Recherche des Relances
- Récupère TOUTES les relances pour ces contacts (pas de filtre sur le statut)
- Limite : 1000 relances par requête

### Étape 3 : Suppression
- Supprime toutes les relances trouvées via `db.delete()` en boucle

### Étape 4 : Logging
- Génère un rapport Markdown avec les contacts et relances supprimées

## Data Model

### Collection: `contacts`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `is_blacklisted` | boolean | Filtre: `true` |

### Collection: `relances`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `contact_id` | string | Contact destinataire |

---

## Organisation des fichiers

```
/backend/
├── cleanup-all-relances-contact-blackliste/
│   ├── index.js              # Point d'entrée
│   ├── logs/
│   │   ├── cleanup-all-relances-YYYY-MM-DD.log
│   │   └── cleanup-all-report-YYYY-MM-DDTHH-mm-ss.md
│   └── specs/
│       └── spec.md           # Documentation
```

**Chemin complet:** `/backend/cleanup-all-relances-contact-blackliste/`

---

## Start

### Route API (Mode Batch)

```bash
POST /api/cleanup/all-relances-blacklist
# Sans paramètre = tous les contacts blacklistés
```

### Route API (Mode Ciblé)

```bash
POST /api/cleanup/all-relances-blacklist
Body: { "contactId": "cont_abc123" }
```

### Cron (quotidien)

```javascript
cron.schedule("0 2 * * *", () => {
  {});
});
```

## Process

### index.js

**Objectif:** Supprimer toutes les relances des contacts blacklistés.

```javascript
async function cleanupAllRelancesBlacklist(contactId = null) {
  // 1. Récupérer les contacts blacklistés
  let blacklistedContacts;
  
  if (contactId) {
    // Mode ciblé
    const contact = await db.read('contacts', contactId);
    if (contact && contact.is_blacklisted) {
      blacklistedContacts = [contact];
    } else {
      return { success: true, deletedCount: 0, message: "Contact non blacklisté" };
    }
  } else {
    // Mode batch
    blacklistedContacts = db.query('contacts')
      .where('is_blacklisted', true)
      .limit(1000)
      .data();
  }
  
  // 2. Récupérer TOUTES les relances de ces contacts
  const contactIds = blacklistedContacts.map(c => c.id);
  const relancesToDelete = db.query('relances')
    .where('contact_id').in(contactIds)
    .limit(1000)
    .data();
  
  // 3. Supprimer les relances
  for (const relance of relancesToDelete) {
    await db.delete('relances', relance.id);
  }
  
  return {
    success: true,
    deletedCount: relancesToDelete.length,
    contactsCount: blacklistedContacts.length,
    message: `${relancesToDelete.length} relance(s) supprimée(s) pour ${blacklistedContacts.length} contact(s) blacklisté(s)`
  };
}
```

#### Output

```javascript
// Mode Batch
{
  "success": true,
  "deletedCount": 156,
  "contactsCount": 12,
  "relanceIds": ["rel_001", "rel_002", ...],
  "message": "156 relance(s) supprimée(s) pour 12 contact(s) blacklisté(s) (TOUTES les relances)"
}

// Mode Ciblé
{
  "success": true,
  "deletedCount": 8,
  "contactsCount": 1,
  "relanceIds": ["rel_045", "rel_046", ...],
  "message": "8 relance(s) supprimée(s) pour 1 contact(s) blacklisté(s) (TOUTES les relances)"
}
```

## Checkpoints

| Checkpoint | Description |
|------------|-------------|
| `cleanup-start` | Démarrage du workflow |
| `db-connected` | Connexion Parse OK |
| `contacts-blacklist-fetched` | Contacts blacklistés récupérés |
| `relances-fetched` | Relances à supprimer récupérées |
| `relances-deleted` | Relances supprimées |
| `log-written` | Rapport généré |
| `cleanup-completed` | Terminé |
| `cleanup-error` | Erreur fatale |

## Rapport Markdown

Le rapport généré contient :
- Nombre de contacts traités
- Nombre de relances supprimées
- Mode (manuel/cron)
- Contact spécifique (si applicable)
- Liste des IDs des contacts
- Liste des IDs des relances supprimées

## Attention

⚠️ **Ce workflow supprime TOUTES les relances**, y compris celles déjà envoyées. 
Utiliser `cleanup-relances-contact-blackliste` pour ne supprimer que les relances non envoyées (brouillons).
