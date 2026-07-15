# Workflow : Afficher les impayés à réparer

## Écran
`impayes-reparer.html`

## Élément déclencheur
Navigation depuis le lien "À réparer" dans `impayes.html`

## Action
Afficher la liste des impayés qui nécessitent une intervention

## Description
- Charge uniquement les impayés avec des problèmes (ex: sans payeur)
- Affiche un tableau simple sans actions de correction
- Permet de consulter la liste pour information

## Problèmes détectés

| Problème | Critère |
|----------|---------|
| Payeur manquant | `payer_id = null` ou `payer_id = ''` |
| Dossier manquant | `numero_dossier = null` ou `numero_dossier = ''` |

## Data Model

**Page Function:** `impayesReparerPage()`

**Données:**
- `impayesAReparer` - liste des impayés à réparer

**Structure d'un impayé à réparer:**
```javascript
{
  id: string,
  nfacture: string,
  numero_dossier: string | null,
  montant_total: number,
  date_echeance: string,
  date_import: string,
  probleme: string  // Description du problème
}
```

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `impayesAReparer` ← données chargées depuis l'API
- `loading` ← `true` → `false`

## API Calls

**Endpoint:** `GET /api/impayes?facture_soldee=0&statut=impaye

**Query Param:**
- `a_reparer=true` - filtre les impayés avec problèmes

**Table:** `impayes`

**Backend (SQLite):**
```javascript
db.query('impayes')
  .where(f => !f.payer_id || f.payer_id === '')
  .orWhere(f => !f.numero_dossier || f.numero_dossier === '')
  .data();
```

**Response:** `ApiResponse<Impaye[]>`

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
export function viewReparer() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async loadImpayesAReparer() {
  this.loading = true;
  this.error = null;
  
  try {
    const response = await fetch('/api/impayes?a_reparer=true');
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // Ajouter le libellé du problème
    this.impayesAReparer = data.data.map(impaye => {
      let probleme = [];
      if (!impaye.payer_id) probleme.push('Payeur manquant');
      if (!impaye.numero_dossier) probleme.push('Dossier manquant');
      
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

## Notes

- **Affichage uniquement** : Cet écran ne propose pas d'actions de correction
- **Pour corriger** : L'utilisateur doit se rendre dans la liste principale des impayés
- La colonne "Nature du problème" indique quel(s) champ(s) sont manquants
- La correction se fait via les workflows `associer-payeur` ou édition directe

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-reparer-view-reparer] START: Chargement des impayés à réparer')` |
| `data-loaded` | `console.log('[WORKFLOW.impayes-reparer-view-reparer] STEP: Données chargées depuis /api/impayes?a_reparer=true', { count: this.impayesAReparer.length })` |
| `view-rendered` | `console.log('[WORKFLOW.impayes-reparer-view-reparer] STEP: Tableau des impayés à réparer rendu dans le DOM')` |
| `state-applied` | `console.log('[WORKFLOW.impayes-reparer-view-reparer] DATA: État après chargement:', { impayesAReparer: this.impayesAReparer, loading: this.loading, error: this.error })` |
| `end` | `console.log('[WORKFLOW.impayes-reparer-view-reparer] SUCCESS: Vue des impayés à réparer affichée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-reparer-view-reparer] ERROR:', error)` |
