# Workflow : Exporter les contacts

## Écran
`contacts.html`

## Élément déclencheur
Bouton avec `@click="exportData()"`

## Action
Exporter la liste des contacts

## Description
- Génère un fichier Excel côté client avec xlsx.js
- Inclut tous les contacts filtrés
- Affiche un loader pendant la génération
- Télécharge automatiquement le fichier

## Libraries
**xlsx.js** - Génération du fichier Excel côté frontend

## Data Model
**Page Function:** `contactsPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `contacts`
- `stats`
- `searchQuery`
- `filterType`
- `filterClientType`
- `sortColumn`
- `sortDirection`
- `page`
- `perPage`
- `selectedContacts`

**États UI:**
- `loading`
- `error`
- `showContactModal`
- `editingContact`
- `exportLoading`

## State Changes

**Modifications:**
- `exportLoading` passe à true pendant l'export
- `exportLoading` repasse à false après l'export

## API Calls

**Pas d'appel API** - Génération côté client uniquement via xlsx.js

## Organisation des fichiers

```
frontend/
└── app/
    └── contacts/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── export-data.js
```

### Fichier principal
- **HTML** : `frontend/app/contacts/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/contacts/js/export-data.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/contacts/js/export-data.js
export function exportData() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async exportData() {
  // 1. Set loading state
  this.exportLoading = true;
  
  // 2. Show loading toast
  Alpine.store('ui').addToast('Génération de l\'export...', 'loading');
  
  try {
    // 3. Prepare data for export (filtered contacts)
    const dataToExport = this.getFilteredContacts();
    
    // 4. Generate Excel with xlsx.js
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    
    // 5. Download file
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `contacts_${date}.xlsx`);
    
    // 6. Show success toast
    Alpine.store('ui').addToast('Export téléchargé', 'success');
    
  } catch (error) {
    this.error = error.message;
    Alpine.store('ui').addToast('Erreur lors de l\'export : ' + error.message, 'error');
  } finally {
    this.exportLoading = false;
  }
}
```
