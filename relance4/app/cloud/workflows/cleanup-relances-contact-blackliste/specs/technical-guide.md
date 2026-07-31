# Guide Technique - cleanup-relances-contact-blackliste

## Vue d'ensemble

Workflow backend pour supprimer les relances non envoyées dont le contact est blacklisté.

## Déclenchement

- **CRON** : Toutes les heures (`0 * * * *`)
- **Manuel** : `Parse.Cloud.run('cleanupRelancesBlacklist')`
- **Trigger** : Lorsqu'un contact est blacklisté

## Paramètres Cloud Function

```javascript
{
  "contactId": "string|null"  // Optionnel: nettoyer un seul contact
}
```

## Checkpoints

1. `contacts-blacklist-fetched` - Liste des contacts blacklistés récupérée
2. `relances-fetched` - Relances à supprimer identifiées
3. `relances-deleted` - Suppression effectuée
4. `log-written` - Log final écrit

## Dépendances

- Parse Server (classes Contact, Relance)
- node-cron (planification)

## TODO

- [ ] Implémenter `fetchBlacklistedContacts()`
- [ ] Implémenter `fetchRelancesToDelete()`
- [ ] Implémenter `deleteRelances()`
- [ ] Implémenter `writeCleanupLog()`
- [ ] Tester le scénario nominal
- [ ] Tester avec contactId spécifique
