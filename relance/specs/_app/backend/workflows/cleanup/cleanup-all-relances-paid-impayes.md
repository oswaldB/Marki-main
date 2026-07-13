# Workflow Backend : Nettoyage des Relances (Impayés Réglés)

## Objectifs
- Nettoyer les relances dont les impayés associés ont été réglés (payés)
- Gérer les relances avec plusieurs impayés (partiellement réglés)
- Marquer les relances modifiées comme "À regénérer" pour le workflow `regenerate-relances-with-status`

## Process (méga-fonction)

La méga-fonction `cleanupAllRelancesPaidImpayes()` analyse toutes les relances et applique la logique suivante :

### Logique de Traitement

Pour chaque relance ayant des impayés :

1. **Vérification des impayés** : Pour chaque impayé lié, vérifie s'il est réglé (`solde === true` && `facture_soldee === true` && `reste_a_payer === 0`)

2. **Cas 1 : Tous les impayés sont réglés**
   - La relance n'a plus de sens
   - **Action** : Supprimer la relance

3. **Cas 2 : Certains impayés réglés, d'autres non**
   - La relance doit être mise à jour
   - **Action** :
     - Retirer les impayés réglés de la liste
     - Mettre à jour la relance avec les impayés restants
     - Changer le statut en `"À regénérer"` +> le bon statut c'est 'refaire'
     - Le workflow `regenerate-relances-with-status` s'occupera de régénérer le contenu +> je crois que le generate relance et generate suivi le font sans passer par regernerate-relance-with-status. Dis moi ici ta réponse %% ta réponse ici %%

4. **Cas 3 : Aucun impayé réglé**
   - La relance reste inchangée
   - **Action** : Aucune

## Data Model

### Collection: `relances`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `impaye_ids` | string[] | IDs des impayés liés |
| `statut` | string | `"À regénérer"` si impayés retirés |

### Collection: `impayes`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `solde` | boolean | `true` si payé |
| `facture_soldee` | boolean | `true` si soldée |
| `reste_a_payer` | number | `0` si payé |

---

## Organisation des fichiers

```
/backend/
├── cleanup-all-relances-paid-impayes/
│   ├── index.js              # Point d'entrée
│   ├── logs/
│   │   ├── cleanup-all-relances-YYYY-MM-DD.log
│   │   └── cleanup-all-report-YYYY-MM-DDTHH-mm-ss.md
│   └── specs/
│       └── spec.md           # Documentation
```

**Chemin complet:** `/backend/cleanup-all-relances-paid-impayes/`

---

## Start

### Cloud Function

```bash
POST /functions/cleanupAllRelancesPaidImpayes
```

### Cron (quotidien)

```javascript
cron.schedule("0 3 * * *", () => {
  {});
});
```

## Process

### index.js

**Objectif:** Analyser et nettoyer les relances avec impayés réglés.

```javascript
async function cleanupAllRelancesPaidImpayes() {
  // 1. Récupérer TOUTES les relances avec impayés
  const allRelances = db.query('relances')
    .where('impaye_ids').exists()
    .limit(1000)
    .data();
  
  let deletedCount = 0;
  let toRegenerateCount = 0;
  const removedImpayeIds = [];
  
  for (const relance of allRelances) {
    const impayeIds = relance.impaye_ids;
    
    // 2. Récupérer les impayés complets
    const impayes = await Promise.all(
      impayeIds.map(id => db.read('impayes', id).catch(() => null))
    );
    
    // 3. Séparer réglés / non réglés
    const isImpayeRegle = (imp) => 
      imp.solde === true && 
      imp.facture_soldee === true && 
      imp.reste_a_payer === 0;
    
    const impayesRegles = impayes.filter(isImpayeRegle);
    const impayesNonRegles = impayes.filter(imp => !isImpayeRegle(imp));
    
    // 4. Traiter selon le cas
    if (impayesRegles.length > 0) {
      removedImpayeIds.push(...impayesRegles.map(i => i.id));
      
      if (impayesNonRegles.length === 0) {
        // Cas 1 : Tous réglés → supprimer
        await db.delete('relances', relance.id);
        deletedCount++;
      } else {
        // Cas 2 : Partiellement réglés → mettre à jour
        await db.update('relances', relance.id, {
          impaye_ids: impayesNonRegles.map(i => i.id),
          statut: 'À regénérer'
        });
        toRegenerateCount++;
      }
    }
    // Cas 3 : Aucun réglé → ne rien faire
  }
  
  return {
    processedCount: allRelances.length,
    deletedCount,
    toRegenerateCount,
    removedImpayeIds
  };
}
```

#### Output

```javascript
{
  "success": true,
  "processedCount": 1547,
  "deletedCount": 23,
  "toRegenerateCount": 45,
  "removedImpayeIds": ["imp_001", "imp_002", ...],
  "message": "23 relance(s) supprimée(s), 45 relance(s) à régénérer, 68 impayé(s) réglé(s) retiré(s) sur 1547 analysée(s)"
}
```

## Checkpoints

| Checkpoint | Description |
|------------|-------------|
| `cleanup-start` | Démarrage du workflow |
| `db-connected` | Connexion Parse OK |
| `relances-fetched` | Relances récupérées |
| `cleanup-completed` | Traitement terminé |
| `log-written` | Rapport généré |
| `cleanup-error` | Erreur fatale |

## Rapport Markdown

Un fichier Markdown est généré avec :
- Nombre de relances analysées/supprimées/à régénérer
- Liste des IDs des relances supprimées
- Liste des IDs des relances à régénérer
- Liste des IDs des impayés réglés retirés

## Workflow Lié

Ce workflow est conçu pour fonctionner avec `regenerate-relances-with-status` :
1. `cleanup-all-relances-paid-impayes` retire les impayés réglés et marque `"À regénérer"`
2. `regenerate-relances-with-status` trouve les relances avec ce statut et régénère leur contenu
