# Workflow Backend : Nettoyage des Relances Orphelines

## Objectifs
- Identifier et supprimer les relances liées à des impayés soldés (factures payées)
- Conserver les relances déjà envoyées pour l'historique
- Supprimer uniquement les relances non envoyées (brouillons, prêtes pour envoi, etc.)
- Exécution manuelle avec mode dry-run par défaut

## Process

Ce script Node.js standalone analyse toutes les relances et applique la logique suivante :

### Étape 1 : Récupération
- Récupère TOUTES les relances via l'API Parse (avec pagination)
- Inclut les données des impayés liés

### Étape 2 : Analyse
Pour chaque relance :
- Vérifie si elle a des impayés associés
- Récupère le statut de l'impayé (soldé ou non)
- Vérifie le statut de la relance

### Étape 3 : Décision
- **Supprimer** si : impayé soldé ET relance non envoyée
- **Conserver** si : impayé soldé MAIS relance déjà envoyée (historique)
- **Ignorer** si : impayé non soldé

## Data Model

### Collection: `relances`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `statut` | string | `"Envoyée"` préservé, autres supprimés |
| `impaye_ids` | string[] | Impayés liés |

### Collection: `impayes`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `solde` | boolean | `true` si payé |
| `facture_soldee` | boolean | `true` si soldée |
| `reste_a_payer` | number | `0` si payé |
| `nfacture` | string | Numéro de facture (logs) |

---

## Organisation des fichiers

```
/backend/
├── cleanup-orphan-relances/
│   └── cleanup-relances-paid-invoices.js  # Script standalone
```

**Chemin complet:** `/backend/cleanup-orphan-relances/cleanup-relances-paid-invoices.js`

---

## Start

### Mode Dry-Run (Simulation)

```bash
cd /home/ubuntu/prod/adti/backend/cloud/workflows/cleanup-orphan-relances
node cleanup-relances-paid-invoices.js
```

**Sortie exemple :**
```
============================================================
🧹 Nettoyage des relances - Factures payées
============================================================

🔍 Récupération de toutes les relances...
  Récupéré 1000 relances (total: 2547)

📊 Analyse de 2547 relances...

🗑️  Relance rel_abc123 (statut: "pret pour envoi") → IMPAYÉ SOLDÉ nfacture:F2024001 - À SUPPRIMER
📌 Relance rel_def456 (statut: "Envoyée") → IMPAYÉ SOLDÉ nfacture:F2024002 - CONSERVÉE (déjà envoyée)

------------------------------------------------------------
📋 RÉSUMÉ AVANT SUPPRESSION
------------------------------------------------------------
Total relances analysées: 2547
Relances sans impaye valide: 23
Relances liées à un impayé soldé: 156
Relances non envoyées à supprimer: 89
Relances déjà envoyées (conservées): 67

🏃 MODE DRY-RUN (simulation)
   Ajoutez --execute pour réellement supprimer les relances
```

### Mode Exécution Réelle

```bash
node cleanup-relances-paid-invoices.js --execute
```

**Sortie exemple :**
```
============================================================
⚠️  MODE EXÉCUTION RÉELLE - Suppression des relances...
============================================================

✅ Relance rel_abc123 supprimée
✅ Relance rel_ghi789 supprimée
...

============================================================
📊 RÉSULTAT FINAL
============================================================
Relances supprimées: 89
Erreurs: 0
============================================================
```

## Process

### cleanup-relances-paid-invoices.js

**Objectif:** Nettoyer les relances orphelines (impayés soldés).

```javascript
const STATUTS_A_CONSERVER = ["Envoyée"];

async function cleanupOrphanRelances() {
  // 1. Récupérer toutes les relances (pagination)
  const relances = [];
  let skip = 0;
  const limit = 1000;
  
  while (hasMore) {
    const batch = await fetchRelances({ limit, skip, include: "impayes" });
    relances.push(...batch);
    skip += limit;
    hasMore = batch.length === limit;
  }
  
  // 2. Analyser chaque relance
  const relancesASupprimer = [];
  const impayeCache = new Map();
  
  for (const relance of relances) {
    const impayeId = relance.impayes?.[0]?.objectId;
    if (!impayeId) continue;
    
    // Récupérer l'impayé (avec cache)
    let impaye = impayeCache.get(impayeId);
    if (!impaye) {
      impaye = await fetchImpaye(impayeId);
      impayeCache.set(impayeId, impaye);
    }
    
    // Vérifier si l'impayé est soldé
    const isSolde = impaye?.solde === true && 
                    impaye?.facture_soldee === true && 
                    impaye?.reste_a_payer === 0;
    
    if (isSolde) {
      // Vérifier si la relance doit être supprimée
      const isEnvoyee = relance.statut === "Envoyée";
      
      if (!isEnvoyee) {
        relancesASupprimer.push(relance);
      }
    }
  }
  
  // 3. Supprimer (si mode --execute)
  if (process.argv.includes("--execute")) {
    for (const relance of relancesASupprimer) {
      await deleteRelance(relance.objectId);
    }
  }
  
  return {
    totalRelances: relances.length,
    relancesASupprimer: relancesASupprimer.length,
    relancesSupprimees: process.argv.includes("--execute") 
      ? relancesASupprimer.length 
      : 0
  };
}
```

#### Output

```javascript
// Mode Dry-Run
{
  "totalRelances": 2547,
  "relancesSansImpaye": 23,
  "relancesAvecImpayeSolde": 156,
  "relancesNonEnvoyeesASupprimer": 89,
  "relancesGardees": 67,
  "mode": "dry-run"
}

// Mode Exécution
{
  "totalRelances": 2547,
  "relancesSupprimees": 89,
  "erreurs": 0,
  "mode": "execute"
}
```

## Différence avec les autres workflows cleanup

| Workflow | Supprime | Conserve | Déclenchement |
|----------|----------|----------|---------------|
| `cleanup-relances-contact-blackliste` | Relances non envoyées de contacts blacklistés | Relances envoyées | Cloud Function |
| `cleanup-all-relances-contact-blackliste` | TOUTES les relances de contacts blacklistés | Rien | Cloud Function |
| `cleanup-all-relances-paid-impayes` | Relances avec tous impayés réglés, marque partiellement réglées comme "À regénérer" | Relances partiellement réglées | Cloud Function |
| `cleanup-orphan-relances` | Relances non envoyées d'impayés soldés | Relances envoyées (historique) | Script manuel |

## Statistiques

Le script affiche :
- Total des relances analysées
- Relances sans impayé valide
- Relances liées à un impayé soldé
- Relances non envoyées à supprimer
- Relances déjà envoyées (conservées)

## Sécurité

- **Mode dry-run par défaut** : Aucune suppression sans `--execute`
- **Conservation historique** : Les relances envoyées ne sont jamais supprimées
- **Pagination** : Gère les grandes volumétries (1000 par requête)
- **Cache impayés** : Évite les appels API redondants
