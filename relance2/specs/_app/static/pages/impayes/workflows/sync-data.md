# Workflow : Synchronisation des données impayés

## Écran
`impayes.html`

## Élément déclencheur
Bouton avec `@click="syncData()"`

## Action
Synchroniser les données impayés depuis la source externe (ADTI)

## Description
- Appelle le workflow backend `import-invoices` +> et ensuite verify-paid-invoices.
- Importe les nouvelles factures dans la table `impayes`
- Met à jour les factures existantes si modification
- Crée un event de type 'sync' après synchronisation

## Data Model

**Page Function:** `impayesPage()`

**Données:**
- `impayes` - liste des impayés
- `syncing` - état de synchronisation
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
- `impayes` ← rechargé après sync
- `lastSyncTime` ← date actuelle

## API Calls

**Endpoint:** `POST /api/import/invoices`

**Description:** Déclenche le workflow backend d'import des factures

**Tables impactées:**
- `impayes` - création/mise à jour des factures
- `events` - création d'un event de sync

**Response:** `ApiResponse<{ imported: number, updated: number }>`

## Organisation des fichiers

```
frontend/
└── app/
    └── impayes/
        ├── index.html
        └── js/
            └── sync-data.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes/js/sync-data.js`

```javascript
// frontend/app/impayes/js/sync-data.js
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
    
    // 5. Reload impayes
    await this.loadImpayes();
    
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
- Voir workflow backend `import-invoices` pour les détails

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-sync-data] START: Synchronisation des données impayés depuis la source externe (ADTI)')` |
| `already-syncing` | `console.log('[WORKFLOW.impayes-sync-data] SKIP: Synchronisation déjà en cours (syncing=true), arrêt')` |
| `button-disabled` | `console.log('[WORKFLOW.impayes-sync-data] STEP: Bouton sync désactivé, syncing=true, syncProgress=0, error=null')` |
| `api-call-start` | `console.log('[WORKFLOW.impayes-sync-data] STEP: Appel API POST /api/workflows/import-invoices')` |
| `api-response-received` | `console.log('[WORKFLOW.impayes-sync-data] DATA: Réponse API reçue:', {ok: response.ok, status: response.status})` |
| `api-response-parsed` | `console.log('[WORKFLOW.impayes-sync-data] DATA: Payload parsé:', {success: data.success, imported: data.data?.imported, updated: data.data?.updated})` |
| `sync-error-thrown` | `console.error('[WORKFLOW.impayes-sync-data] ERROR: data.success=false, message:', data.error?.message)` |
| `progress-updated` | `console.log('[WORKFLOW.impayes-sync-data] STEP: syncProgress mis à 100%')` |
| `lastSyncTime-updated` | `console.log('[WORKFLOW.impayes-sync-data] STEP: lastSyncTime mis à jour:', this.lastSyncTime)` |
| `load-impayes-start` | `console.log('[WORKFLOW.impayes-sync-data] STEP: Rechargement de la liste des impayés via loadImpayes()')` |
| `table-updated` | `console.log('[WORKFLOW.impayes-sync-data] DATA: Table impayés mise à jour:', {count: this.impayes.length})` |
| `toast-shown` | `console.log('[WORKFLOW.impayes-sync-data] STEP: Toast affiché:', {imported, updated})` |
| `end` | `console.log('[WORKFLOW.impayes-sync-data] SUCCESS: Synchronisation terminée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-sync-data] ERROR:', error)` |
| `finally` | `console.log('[WORKFLOW.impayes-sync-data] STEP: finally - syncing=false, syncProgress reset dans 500ms')` |
