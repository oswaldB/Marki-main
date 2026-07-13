# Workflow Backend : Régénération des Relances (Statut "À regénérer") +> e statut est "refaire". Mais avant toute chose est-ce nécessaire car on a deja generate relances et generate suivi. %% met ta réponse ici %% 
## Objectifs
- Trouver toutes les relances avec le statut `"À regénérer"`
- Régénérer le contenu de ces relances en utilisant la logique existante de `regenerate-relances-contact`
- Nettoyer les anciennes relances et créer de nouvelles avec le contenu actualisé

## Process (méga-fonction)

La méga-fonction `regenerateRelancesWithStatus()` exécute les étapes suivantes :

### Étape 1 : Recherche
- Récupère toutes les relances avec `statut = "À regénérer"`
- Filtre uniquement celles qui ont encore des impayés associés

### Étape 2 : Traitement
Pour chaque relance trouvée :
1. **Extraction du contact** : Récupère le `contact_id` de la relance
2. **Suppression** : Supprime la relance avec statut "À regénérer"
3. **Régénération** : Appelle `regenerateRelancesContact(contactId)` pour recréer les relances de ce contact
4. **Résultat** : La régénération crée de nouvelles relances avec le contenu actualisé

## Data Model

### Collection: `relances`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `contact_id` | string | Contact destinataire |
| `statut` | string | Filtre: `"À regénérer"` |
| `impaye_ids` | string[] | Impayés liés (doit exister) |

---

## Organisation des fichiers

```
/backend/
├── regenerate-relances-with-status/
│   ├── index.js              # Point d'entrée
│   ├── logs/
│   │   ├── regenerate-relances-YYYY-MM-DD.log
│   │   └── regenerate-report-YYYY-MM-DDTHH-mm-ss.md
│   └── specs/
│       └── spec.md           # Documentation
```

**Chemin complet:** `/backend/regenerate-relances-with-status/`

---

## Start

### Cloud Function

```bash
POST /functions/regenerateRelancesWithStatus
```

### Cron (quotidien)

```javascript
cron.schedule("0 4 * * *", () => {
  {});
});
```

## Process

### index.js

**Objectif:** Régénérer les relances marquées comme "À regénérer".

```javascript
const { regenerateRelancesContact } = require("../regenerate-relances-contact/index");

async function regenerateRelancesWithStatus() {
  // 1. Trouver les relances avec statut "À regénérer"
  const relancesToRegenerate = db.query('relances')
    .where('statut', 'À regénérer')
    .where('impaye_ids').exists()
    .limit(1000)
    .data();
  
  let regeneratedCount = 0;
  const errors = [];
  
  for (const relance of relancesToRegenerate) {
    try {
      const contactId = relance.contact_id;
      
      if (!contactId) {
        errors.push({ relanceId: relance.id, error: "Pas de contact" });
        continue;
      }
      
      // 2. Supprimer la relance existante
      await db.delete('relances', relance.id);
      
      // 3. Appeler regenerateRelancesContact pour régénérer
      const result = await regenerateRelancesContact(contactId, null);
      
      if (result.success && result.createdCount > 0) {
        regeneratedCount++;
      } else {
        errors.push({ 
          relanceId: relance.id, 
          error: result.message || "Aucune relance générée" 
        });
      }
      
    } catch (error) {
      errors.push({ relanceId: relance.id, error: error.message });
    }
  }
  
  return {
    processedCount: relancesToRegenerate.length,
    regeneratedCount,
    errors
  };
}
```

#### Output

```javascript
{
  "success": true,
  "processedCount": 45,
  "regeneratedCount": 42,
  "regeneratedRelanceIds": ["rel_001", "rel_002", ...],
  "errors": [
    { "relanceId": "rel_043", "error": "Pas de contact associé" }
  ],
  "message": "42 relance(s) régénérée(s) sur 45 traitée(s), 1 erreur(s)"
}
```

## Checkpoints

| Checkpoint | Description |
|------------|-------------|
| `regenerate-start` | Démarrage du workflow |
| `db-connected` | Connexion Parse OK |
| `relances-fetched` | Relances à régénérer récupérées |
| `regenerate-completed` | Traitement terminé |
| `log-written` | Rapport généré |
| `regenerate-error` | Erreur fatale |

## Chaîne de Workflows

Ce workflow fait partie d'une chaîne avec `cleanup-all-relances-paid-impayes` :

1. **Facture payée** → Impayé marqué comme réglé
2. **`cleanup-all-relances-paid-impayes`** → Retire l'impayé des relances et marque `"À regénérer"`
3. **`regenerate-relances-with-status`** → Supprime les relances marquées et régénère le contenu

## Dépendances

Ce workflow dépend de `regenerate-relances-contact` pour la logique de régénération :
```javascript
const { regenerateRelancesContact } = require("../regenerate-relances-contact/index");
```
