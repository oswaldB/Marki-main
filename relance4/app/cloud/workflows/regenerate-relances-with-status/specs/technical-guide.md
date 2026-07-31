# Guide Technique - regenerate-relances-with-status

## Vue d'ensemble

Workflow backend pour **régénérer les relances** marquées avec le statut "À regénérer".

Ce workflow travaille en tandem avec `cleanup-all-relances-paid-impayes` :
1. `cleanup-all-relances-paid-impayes` → retire les impayés réglés et met le statut à "À regénérer"
2. `regenerate-relances-with-status` → trouve ces relances et les régénère

## Déclenchement

- **CRON** : Peut être configuré pour s'exécuter après `cleanup-all-relances-paid-impayes`
- **Manuel** : `Parse.Cloud.run('regenerateRelancesWithStatus')`

## Fonctionnement

1. Trouve toutes les relances avec `statut = "À regénérer"`
2. Pour chaque relance :
   - Récupère le contact associé
   - Supprime la relance existante (celle avec le statut "À regénérer")
   - Appelle `regenerateRelancesContact(contactId)` pour recréer les relances pour ce contact
   - La nouvelle relance sera créée avec le statut "pret pour envoi"
3. Génère un rapport détaillé

## Paramètres Cloud Function

Aucun paramètre requis.

```javascript
{}
```

## Checkpoints

1. `regenerate-start` - Début du workflow
2. `db-connected` - Classes Parse initialisées
3. `relances-fetched` - Relances à régénérer récupérées
4. `regenerate-completed` - Workflow terminé
5. `regenerate-error` - Erreur rencontrée
6. `log-written` - Rapport écrit

## Dépendances

- Parse Server (classe Relance)
- Le workflow `regenerate-relances-contact` (réutilisé pour la logique de régénération)
- Node.js fs et path modules (pour les logs)

## Réponse

```javascript
{
  "success": boolean,
  "processedCount": number,        // Nombre de relances à régénérer
  "regeneratedCount": number,     // Nombre de relances régénérées avec succès
  "regeneratedRelanceIds": string[], // IDs des relances régénérées
  "errors": Array,                // Liste des erreurs
  "message": string
}
```

## Exemple d'utilisation

```javascript
// Appel manuel
await Parse.Cloud.run('regenerateRelancesWithStatus');
```

## Configuration CRON recommandée

Pour une exécution automatique, configurez ce workflow pour s'exécuter **après** `cleanup-all-relances-paid-impayes`. Par exemple :

```javascript
// Exécuter 10 minutes après cleanup-all-relances-paid-impayes
cron.schedule('10 17 * * *', async () => {
  await Parse.Cloud.run('regenerateRelancesWithStatus');
});
```

## Workflow chaîne complète

1. **cleanup-all-relances-paid-impayes** (17h00) : Nettoie les impayés réglés, met statut à "À regénérer"
2. **regenerate-relances-with-status** (17h10) : Régénère les relances marquées
3. **send-emails** (19h00) : Envoie les relances prêtes

## Différence avec regenerate-relances-contact

- **regenerate-relances-contact** : Régénère toutes les relances pour un contact spécifique (appelé manuellement)
- **regenerate-relances-with-status** : Régénère automatiquement TOUTES les relances avec statut "À regénérer"
