# Guide Technique - cleanup-all-relances-paid-impayes

## Vue d'ensemble

Workflow backend pour nettoyer les relances dont les impayés associés ont été réglés (soldés).

**Logique spéciale** : Si une relance contient plusieurs impayés et qu'au moins un est réglé :
- On **retire uniquement les impayés réglés** de la relance
- Si des impayés non réglés restent : la relance est **mise à jour** (sans les impayés réglés)
- Si **tous** les impayés sont réglés : la relance est **supprimée**

Un impayé est considéré comme réglé si :
- `solde === true`
- `facture_soldee === true`
- `reste_a_payer === 0`

## Déclenchement

- **CRON** : Tous les jours à 17h00
- **Manuel** : `Parse.Cloud.run('cleanupAllRelancesPaidImpayes')`

## Fonctionnement

1. Récupère **TOUTES** les relances qui ont un champ `impayes`
2. Pour chaque relance :
   - Récupère les objets Impaye complets
   - Sépare les impayés réglés et non réglés
   - Si au moins un impayé est réglé :
     - **Cas A** : Tous les impayés sont réglés → **supprime la relance**
     - **Cas B** : Certains impayés restent non réglés → **met à jour la relance** en retirant les impayés réglés
3. Génère un rapport détaillé avec les 3 catégories : supprimées, mises à jour, impayés retirés

## Paramètres Cloud Function

Aucun paramètre requis.

```javascript
{}
```

## Checkpoints

1. `cleanup-start` - Début du workflow
2. `db-connected` - Classes Parse initialisées
3. `relances-fetched` - Relances récupérées pour analyse
4. `cleanup-completed` - Workflow terminé
5. `cleanup-error` - Erreur rencontrée
6. `log-written` - Rapport écrit

## Dépendances

- Parse Server (classes Impaye, Relance)
- Node.js fs et path modules (pour les logs)

## Réponse

```javascript
{
  "success": boolean,
  "processedCount": number,      // Nombre total de relances analysées
  "deletedCount": number,        // Relances supprimées (tous impayés réglés)
  "updatedCount": number,        // Relances mises à jour (impayés réglés retirés)
  "deletedRelanceIds": string[], // IDs des relances supprimées
  "updatedRelanceIds": string[], // IDs des relances mises à jour
  "removedImpayeIds": string[],  // IDs des impayés réglés retirés
  "message": string
}
```

## Exemple d'utilisation

```javascript
// Appel manuel
await Parse.Cloud.run('cleanupAllRelancesPaidImpayes');
```

## Scénarios

### Scénario 1 : Relance avec tous les impayés réglés
```
Relance R1 → [Impayé A (réglé), Impayé B (réglé)]
Résultat : R1 est SUPPRIMÉE
```

### Scénario 2 : Relance avec certains impayés réglés
```
Relance R2 → [Impayé C (réglé), Impayé D (non réglé), Impayé E (non réglé)]
Résultat : R2 est MISE À JOUR → [Impayé D (non réglé), Impayé E (non réglé)]
```

### Scénario 3 : Relance sans impayés réglés
```
Relance R3 → [Impayé F (non réglé), Impayé G (non réglé)]
Résultat : Aucune action
```

## Configuration CRON

Déjà configuré dans `cron.js` pour s'exécuter tous les jours à 17h00.

## Différences avec les autres workflows

- **cleanup-relances-contact-blackliste** : Supprime les relances **non envoyées** pour contacts blacklistés
- **cleanup-all-relances-contact-blackliste** : Supprime **TOUTES** les relances pour contacts blacklistés
- **cleanup-all-relances-paid-impayes** : **Nettoie intelligemment** les relances pour impayés réglés (mise à jour ou suppression selon le cas)
