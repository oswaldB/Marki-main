# Workflow : Synchronisation des données payeur

## Écran
`impayes-payeur.html`

## Élément déclencheur
Bouton avec `@click="syncData()"`

## Action
Synchroniser les données impayés depuis la source externe (ADTI) - affichage groupé par payeur

## Description
- Appelle le workflow backend `import-invoices` +> et ensuite verify-paid-invoices.
- Importe les nouvelles factures dans la table `impayes`
- Met à jour les factures existantes si modification  
- Crée un event de type 'sync' après synchronisation
- **Même logique que** `impayes/sync-data.md` mais affichage regroupé par payeur après reload

## Data Model

**Page Function:** `impayesPayeurPage()`

**Données:**
- `payeurs` - liste des payeurs avec leurs impayés (rechargée après sync)
- `syncing` - état de synchronisation
- `syncProgress` - progression (0-100)
- `lastSyncTime` - dernière date de sync

**États UI:**
- `loading`
- `error`
- `syncing`
- `syncProgress`

## State Changes

**Modifications:**
- `syncing` ← `true` → `false`
- `syncProgress` ← 0 → 100
- `payeurs` ← rechargé après sync (regroupé par contact)
- `lastSyncTime` ← date actuelle

## API Calls

**Endpoint:** `POST /api/workflows/import-invoices`

**Description:** Déclenche le workflow backend d'import des factures

**Tables impactées:**
- `impayes` - création/mise à jour des factures
- `events` - création d'un event de sync

**Response:** `ApiResponse<{ imported: number, updated: number }>`



## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-payeur/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── sync-data.js
```

### Fichier principal
- **HTML** : `frontend/app/impayes-payeur/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/impayes-payeur/js/sync-data.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/impayes-payeur/js/sync-data.js
export function syncData() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async syncData() {
  // 1. Check if already syncing
  if (this.syncing) return;
  
  // 2. Set states
  this.syncing = true;
  this.syncProgress = 0;
  this.error = null;
  
  try {
    // 3. Call sync workflow API
    const response = await fetch('/api/workflows/import-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 4. Update progress
    this.syncProgress = 100;
    this.lastSyncTime = new Date().toISOString();
    
    // 5. Reload payeurs (impayés regroupés par contact)
    await this.loadPayeurs();
    
    // 6. Notify
    const imported = data.data?.imported || 0;
    const updated = data.data?.updated || 0;
    Alpine.store('ui').addToast(
      `${imported} facture(s) importée(s), ${updated} mise(s) à jour`, 
      'success'
    );
    
  } catch (error) {
    this.error = error.message;
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.syncing = false;
    setTimeout(() => { this.syncProgress = 0; }, 500);
  }
}
```

## Dépendances backend

- Workflow `import-invoices` doit exister côté backend
- Table `impayes` pour stocker les factures importées
- Table `events` pour loguer la synchronisation

## Notes

- C'est une opération **asynchrone** longue (peut prendre plusieurs secondes)
- La progression peut être affichée via `syncProgress`
- **Différence avec impayes/sync-data.md** : après le reload, les données sont re-groupées par payeur côté client
- Voir workflow backend `import-invoices` pour les détails
