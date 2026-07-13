# Workflow Backend : Application des Règles d'Attribution Automatique

## Objectifs
- Attribuer automatiquement des séquences de relance aux impayés selon des règles configurables
- Permettre une segmentation automatique des impayés (par montant, type, etc.)
- Éviter l'attribution manuelle pour les cas standard

## Type de Workflow
**Service utilitaire** - Ce workflow n'est pas exécuté directement mais est appelé par d'autres workflows (comme `import-invoice`, `sync-data`).

## Process (méga-fonction)

La fonction `appliquerReglesAttributionAutomatique(impaye)` analyse un impayé et tente de lui attribuer une séquence automatique :

### Étape 1 : Vérification Préalable
- Vérifie si l'impayé a déjà une séquence attribuée
- Si oui → retourne `null` (pas de changement)

### Étape 2 : Récupération des Séquences
- Récupère les séquences avec `attribution_automatique = true`
- Filtre uniquement les séquences `publiee = true`

### Étape 3 : Évaluation des Règles
Pour chaque séquence candidate :
- Récupère les `groupes_regles` de la séquence
- Évalue chaque groupe selon sa logique (`ET` ou `OU`)

### Étape 4 : Évaluation des Groupes
**Logique ET** : Toutes les règles du groupe doivent être valides
**Logique OU** : Au moins une règle du groupe doit être valide

### Étape 5 : Évaluation des Règles
Pour chaque règle dans un groupe :
- `champ` : Champ de l'impayé à évaluer
- `operateur` : `egal`, `different`, `superieur`, `inferieur`
- `valeur` : Valeur(s) de référence

### Étape 6 : Attribution
- Si tous les groupes sont valides → attribue la séquence à l'impayé
- Crée un log de l'opération
- Retourne la séquence attribuée

## Data Model

### Collection: `impayes`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `sequence_id` | string | Séquence attribuée (si règle match) |

### Collection: `sequences`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `attribution_automatique` | boolean | Active l'attribution auto |
| `publiee` | boolean | Seulement si publiée |
| `groupes_regles` | object[] | Règles d'attribution |

### Structure des Groupes de Règles

```javascript
{
  "groupes_regles": [
    {
      "logique": "ET",  // ou "OU"
      "regles": [
        {
          "champ": "montant_total",
          "operateur": "superieur",
          "valeur": [1000]
        },
        {
          "champ": "type_facture",
          "operateur": "egal",
          "valeur": ["Facture", "Avoir"]
        }
      ]
    }
  ]
}
```

### Collection: `AppliquerReglesAttributionAutomatiqueLog` (Logs)

| Champ | Type | Description |
|-------|------|-------------|
| `started_at` | datetime | Début du traitement |
| `finished_at` | datetime | Fin du traitement |
| `duration_ms` | number | Durée en ms |
| `impaye_id` | string | ID de l'impayé traité |
| `sequence_id` | string | ID de la séquence attribuée |
| `status` | string | `"success"` ou `"failed"` |
| `message` | string | Message d'échec (si applicable) |

---

## Organisation des fichiers

```
/backend/
└── appliquer-regles-attribution/
    ├── index.js        # Point d'entrée + logique métier
    └── logs/           # Logs
```

**Chemin complet:** `/backend/appliquer-regles-attribution/`

---

## Utilisation

Ce workflow n'est pas appelé directement. Il est utilisé comme module :

```javascript
const { appliquerReglesAttributionAutomatique } = require(
  "./appliquer-regles-attribution"
);

// Dans un autre workflow (ex: import-invoice)
async function processImpaye(impaye) {
  // ... création de l'impayé ...
  
  // Tentative d'attribution automatique
  const sequence = await appliquerReglesAttributionAutomatique(impaye);
  
  if (sequence) {
    console.log(`Séquence ${sequence.id} attribuée automatiquement`);
  } else {
    console.log("Aucune séquence ne correspond - attribution manuelle nécessaire");
  }
}
```

## Process

### index.js

**Objectif:** Évaluer les règles et attribuer une séquence si match.

```javascript
async function appliquerReglesAttributionAutomatique(impaye, options = {}) {
  const { logActivity = true } = options;
  
  // 1. Vérifier si déjà une séquence
  if (impaye.get("sequence")) {
    return null;
  }
  
  // 2. Récupérer les séquences avec attribution auto
  const sequences = db.query('sequences')
    .where('attribution_automatique', true)
    .where('publiee', true)
    .data();
  
  // 3. Tester chaque séquence
  for (const sequence of sequences) {
    const groupesRegles = sequence.get("groupes_regles") || [];
    let tousGroupesValides = true;
    
    // 4. Évaluer chaque groupe
    for (const groupe of groupesRegles) {
      const logiqueGroupe = groupe.logique || "ET";
      const regles = groupe.regles || [];
      let groupeValide = false;
      
      if (logiqueGroupe === "ET") {
        // Toutes les règles doivent être valides
        groupeValide = true;
        for (const regle of regles) {
          if (!evaluerRegle(impaye, regle)) {
            groupeValide = false;
            break;
          }
        }
      } else if (logiqueGroupe === "OU") {
        // Au moins une règle valide
        groupeValide = false;
        for (const regle of regles) {
          if (evaluerRegle(impaye, regle)) {
            groupeValide = true;
            break;
          }
        }
      }
      
      // 5. Mettre à jour validation globale
      if (logiqueGroupe === "ET" && !groupeValide) {
        tousGroupesValides = false;
        break;
      } else if (logiqueGroupe === "OU" && groupeValide) {
        tousGroupesValides = true;
        break;
      }
    }
    
    // 6. Attribution si tous groupes valides
    if (tousGroupesValides) {
      impaye.set("sequence", sequence);
      await impaye.save({ useMasterKey: true });
      
      // Log
      if (logActivity) {
        await creerLog({
          impaye_id: impaye.id,
          sequence_id: sequence.id,
          status: "success"
        });
      }
      
      return sequence;
    }
  }
  
  // Aucune séquence ne correspond
  if (logActivity) {
    await creerLog({
      impaye_id: impaye.id,
      status: "failed",
      message: "Aucune règle correspondante"
    });
  }
  
  return null;
}

function evaluerRegle(impaye, regle) {
  const champ = regle.champ;
  const operateur = regle.operateur || "egal";
  const valeur = regle.valeur || [];
  const valeurImpaye = impaye.get(champ);
  
  switch (operateur) {
    case "egal":
      return valeur.includes(valeurImpaye);
    case "different":
      return !valeur.includes(valeurImpaye);
    case "superieur":
      return valeurImpaye > valeur[0];
    case "inferieur":
      return valeurImpaye < valeur[0];
    default:
      return false;
  }
}
```

#### Output

```javascript
// Succès - séquence attribuée
{
  "id": "seq_abc123",
  "name": "Relance Standard",
  "attribution_automatique": true,
  // ... autres champs de la séquence
}

// Échec - aucune correspondance
null
```

## Opérateurs Disponibles

| Opérateur | Description | Exemple |
|-----------|-------------|---------|
| `egal` | Valeur dans la liste | `{"operateur": "egal", "valeur": ["Facture", "Avoir"]}` |
| `different` | Valeur hors de la liste | `{"operateur": "different", "valeur": ["Devis"]}` |
| `superieur` | Strictement supérieur | `{"operateur": "superieur", "valeur": [1000]}` |
| `inferieur` | Strictement inférieur | `{"operateur": "inferieur", "valeur": [500]}` |

## Exemples de Règles

### Règle Simple (Montant élevé)
```javascript
{
  "groupes_regles": [
    {
      "logique": "ET",
      "regles": [
        { "champ": "montant_total", "operateur": "superieur", "valeur": [5000] }
      ]
    }
  ]
}
```
→ Attribue cette séquence aux impayés > 5000€

### Règle Complexe (Type ET Montant)
```javascript
{
  "groupes_regles": [
    {
      "logique": "ET",
      "regles": [
        { "champ": "type_facture", "operateur": "egal", "valeur": ["Facture"] },
        { "champ": "montant_total", "operateur": "superieur", "valeur": [1000] }
      ]
    }
  ]
}
```
→ Attribue aux factures > 1000€

### Règle Alternative (Type OU Client)
```javascript
{
  "groupes_regles": [
    {
      "logique": "OU",
      "regles": [
        { "champ": "type_facture", "operateur": "egal", "valeur": ["Facture"] },
        { "champ": "client_type", "operateur": "egal", "valeur": ["VIP"] }
      ]
    }
  ]
}
```
→ Attribue aux factures OU aux clients VIP

## Workflows Utilisant ce Service

- `import-invoice` : Attribution automatique après import
- `sync-data` : Attribution lors de la synchronisation
- Autres workflows créant des impayés

## Avantages

1. **Automatisation** : Pas d'intervention manuelle pour les cas standards
2. **Flexibilité** : Règles configurables sans code
3. **Priorité** : Premier impayé sans séquence → première règle qui match
4. **Traçabilité** : Logs détaillés de chaque attribution
