# Guide Technique - cleanup-all-relances-contact-blackliste

## Vue d'ensemble

Workflow backend pour supprimer **TOUTES** les relances (y compris celles déjà envoyées) dont le contact est blacklisté.

**Différence avec `cleanup-relances-contact-blackliste`** : Ce workflow supprime toutes les relances sans distinction d'état (envoyées ou non), alors que l'autre ne supprime que les relances non envoyées.

## Déclenchement

- **CRON** : Peut être configuré pour s'exécuter régulièrement (ex: `0 * * * *`)
- **Manuel** : `Parse.Cloud.run('cleanupAllRelancesBlacklist')`
- **Trigger** : Lorsqu'un contact est blacklisté (à configurer)

## Paramètres Cloud Function

```javascript
{
  "contactId": "string|null"  // Optionnel: nettoyer un seul contact spécifique
}
```

## Fonctionnement

1. Récupère tous les contacts avec `isBlacklisted = true` (ou un contact spécifique si `contactId` est fourni)
2. Trouve TOUTES les relances (sans filtre sur `envoyee` ou `dateEnvoi`) qui ont un de ces contacts
3. Supprime toutes ces relances avec `Parse.Object.destroyAll()`
4. Génère un rapport de nettoyage en markdown

## Checkpoints

1. `cleanup-start` - Début du workflow
2. `db-connected` - Classes Parse initialisées
3. `contacts-blacklist-fetched` - Liste des contacts blacklistés récupérée
4. `relances-fetched` - Relances à supprimer identifiées
5. `relances-deleted` - Suppression effectuée
6. `log-written` - Log final écrit
7. `cleanup-completed` - Workflow terminé
8. `cleanup-error` - Erreur rencontrée

## Dépendances

- Parse Server (classes Contact, Relance)
- Node.js fs et path modules (pour les logs)

## Réponse

```javascript
{
  "success": boolean,
  "deletedCount": number,
  "contactsCount": number,
  "relanceIds": string[],
  "message": string
}
```

## Exemple d'utilisation

```javascript
// Appel manuel pour un contact spécifique
await Parse.Cloud.run('cleanupAllRelancesBlacklist', { contactId: 'abc123' });

// Appel manuel pour tous les contacts blacklistés
await Parse.Cloud.run('cleanupAllRelancesBlacklist');
```

## Configuration CRON

À ajouter dans votre fichier de configuration CRON :

```javascript
// Exécuter toutes les heures
cron.schedule('0 * * * *', async () => {
  await Parse.Cloud.run('cleanupAllRelancesBlacklist');
});
```
