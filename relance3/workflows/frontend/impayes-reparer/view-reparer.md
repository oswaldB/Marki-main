# Workflow : Afficher les impayés à réparer (PouchDB)

## Écran
`impayes-reparer.html`

## Élément déclencheur
Navigation depuis le lien "À réparer" dans `impayes.html`

## Action
Afficher la liste des impayés qui nécessitent une intervention depuis **PouchDB local**

## Description
- Charge uniquement les impayés avec des problèmes depuis PouchDB (ex: sans payeur)
- Affiche un tableau simple sans actions de correction
- Permet de consulter la liste pour information
- Les données sont synchronisées automatiquement avec CouchDB

## Problèmes détectés

| Problème | Critère |
|----------|---------|
| Payeur manquant | `payer_id = null` ou `payer_id = ''` |
| Dossier manquant | `numero_dossier = null` ou `numero_dossier = ''` |

## Data Model

**Page Function:** `impayesReparerPage()`

**Données (depuis PouchDB):**
- `impayesAReparer` - liste des impayés à réparer
- `db` - instance PouchDB

**Structure d'un impayé à réparer:**
```javascript
{
  _id: "facture:550e8400-...",
  _rev: "1-abc123...",
  type: "facture",
  id: string,
  nfacture: string,
  numero_dossier: string | null,
  montant_total: number,
  date_echeance: string,
  date_import: string,
  probleme: string  // Description du problème (calculé côté client)
}
```

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `impayesAReparer` ← données filtrées depuis PouchDB
- `loading` ← `true` → `false`

## PouchDB Operations

**Action:** Charger toutes les factures depuis PouchDB et filtrer côté client.

**Méthodes utilisées:**
- `db.allDocs({ startkey: 'facture:', endkey: 'facture:\ufff0' })` - Récupérer les documents
- Filtrage JavaScript sur `payer_id` et `numero_dossier`



## Organisation des fichiers

```
frontend/
└── app/
    └── impayes/
        ├── index.html
        ├── reparer.html
        └── js/
            └── view-reparer.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes/js/view-reparer.js`

```javascript
// frontend/app/impayes/js/view-reparer.js
export async function viewReparer() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async loadImpayesAReparer() {
  this.loading = true;
  this.error = null;
  
  try {
    // 1. Récupérer toutes les factures depuis PouchDB
    const result = await db.allDocs({
      startkey: 'facture:',
      endkey: 'facture:\ufff0',
      include_docs: true
    });
    
    // 2. Filtrer côté client les impayés à réparer
    const impayes = result.rows
      .map(row => row.doc)
      .filter(impaye => {
        const hasPayer = impaye.payer_id && impaye.payer_id !== '';
        const hasDossier = impaye.numero_dossier && impaye.numero_dossier !== '';
        // Garder seulement ceux qui ont un problème
        return !hasPayer || !hasDossier;
      });
    
    // 3. Ajouter le libellé du problème
    this.impayesAReparer = impayes.map(impaye => {
      let probleme = [];
      if (!impaye.payer_id || impaye.payer_id === '') {
        probleme.push('Payeur manquant');
      }
      if (!impaye.numero_dossier || impaye.numero_dossier === '') {
        probleme.push('Dossier manquant');
      }
      
      return {
        ...impaye,
        probleme: probleme.join(' + ') || 'Problème non identifié'
      };
    });
    
  } catch (error) {
    this.error = error.message;
    console.error('Erreur chargement impayés à réparer:', error);
  } finally {
    this.loading = false;
  }
}

// Option: Mango Query avec pouchdb-find
async loadImpayesAReparerMango() {
  this.loading = true;
  
  try {
    // Requête Mango pour les factures sans payeur OU sans dossier
    const result = await db.find({
      selector: {
        type: { $eq: 'facture' },
        $or: [
          { payer_id: { $eq: null } },
          { payer_id: { $eq: '' } },
          { numero_dossier: { $eq: null } },
          { numero_dossier: { $eq: '' } }
        ]
      }
    });
    
    // Ajouter le libellé du problème
    this.impayesAReparer = result.docs.map(impaye => {
      let probleme = [];
      if (!impaye.payer_id || impaye.payer_id === '') {
        probleme.push('Payeur manquant');
      }
      if (!impaye.numero_dossier || impaye.numero_dossier === '') {
        probleme.push('Dossier manquant');
      }
      
      return {
        ...impaye,
        probleme: probleme.join(' + ') || 'Problème non identifié'
      };
    });
    
  } catch (error) {
    this.error = error.message;
    console.error('Erreur chargement impayés à réparer:', error);
  } finally {
    this.loading = false;
  }
}

// Formatters
formatMoney(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
}

formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}
```

## Live Sync (optionnel)

```javascript
// Écouter les changements sur les factures
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc.type === 'facture') {
    const hasPayer = change.doc.payer_id && change.doc.payer_id !== '';
    const hasDossier = change.doc.numero_dossier && change.doc.numero_dossier !== '';
    const hasProblem = !hasPayer || !hasDossier;
    
    // Mettre à jour la liste si nécessaire
    const existingIndex = this.impayesAReparer.findIndex(i => i._id === change.doc._id);
    
    if (hasProblem && existingIndex === -1) {
      // Ajouter à la liste
      this.impayesAReparer.push({
        ...change.doc,
        probleme: this.detectProblem(change.doc)
      });
    } else if (!hasProblem && existingIndex !== -1) {
      // Retirer de la liste (corrigé)
      this.impayesAReparer.splice(existingIndex, 1);
    }
  }
});

detectProblem(impaye) {
  let probleme = [];
  if (!impaye.payer_id || impaye.payer_id === '') {
    probleme.push('Payeur manquant');
  }
  if (!impaye.numero_dossier || impaye.numero_dossier === '') {
    probleme.push('Dossier manquant');
  }
  return probleme.join(' + ') || 'Problème non identifié';
}
```

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Endpoint | `GET /api/impayes?a_reparer=true` | `db.allDocs()` + filtrage côté client |
| Filtrage | Backend SQLite | Côté client JavaScript |
| Paramètre | `a_reparer=true` | Pas de paramètre, filtrage mémoire |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |

## Notes

- **Affichage uniquement** : Cet écran ne propose pas d'actions de correction
- **Pour corriger** : L'utilisateur doit se rendre dans la liste principale des impayés
- La colonne "Nature du problème" indique quel(s) champ(s) sont manquants
- La correction se fait via les workflows `associer-payeur` ou édition directe dans PouchDB
