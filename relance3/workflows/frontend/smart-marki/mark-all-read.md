# Workflow : Tout marquer lu Smart Marki (PouchDB)

## Écran
`smart-marki.html`

## Élément déclencheur
Bouton avec `@click="markAllAsRead()"`

## Action
Marquer toutes les insights comme lues

## Description
- Marque toutes les suggestions non lues comme lues dans PouchDB
- Réinitialise les notifications
- Met à jour les compteurs
- Synchronise avec CouchDB

## Data Model
**Page Function:** `smartMarkiPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `suggestions` - suggestions IA depuis PouchDB
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `processing`
- `chatOpen`

## State Changes

**Modifications:**
- `suggestions` ← toutes marquées comme lues
- Notifications réinitialisées
- Compteurs mis à jour

## PouchDB Operations

**Action:** Mettre à jour toutes les suggestions non lues dans PouchDB.

**Méthodes utilisées:**
1. Filtrer les suggestions non lues
2. `bulkDocs()` pour mettre à jour en masse

**Sync:** La modification est automatiquement synchronisée avec CouchDB.

## Organisation des fichiers

```
frontend/
└── app/
    └── smart-marki/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── mark-all-read.js
```

### Fichier principal
- **HTML** : `frontend/app/smart-marki/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/smart-marki/js/mark-all-read.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/smart-marki/js/mark-all-read.js
export async function markAllRead() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async markAllAsRead() {
  try {
    // 1. Filtrer les suggestions non lues
    const unreadSuggestions = this.suggestions.filter(s => !s.lu);
    
    if (unreadSuggestions.length === 0) {
      return;
    }
    
    // 2. Préparer les documents pour bulk update
    const docsToUpdate = unreadSuggestions.map(suggestion => ({
      ...suggestion,
      lu: true,
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    // 3. Mettre à jour en masse dans PouchDB
    const response = await db.bulkDocs(docsToUpdate);
    
    // 4. Mettre à jour la liste locale
    this.suggestions = this.suggestions.map(s => ({
      ...s,
      lu: true,
      read_at: s.read_at || new Date().toISOString()
    }));
    
    // 5. Notify
    this.toast(`${unreadSuggestions.length} suggestion(s) marquée(s) comme lue(s)`, 'success');
    
  } catch (error) {
    this.toast(error.message, 'error');
  }
}
```

## Notes

- **Bulk update** : Utilise `bulkDocs()` pour mettre à jour plusieurs documents
- **Synchronisation** : Les changements sont synchronisés avec CouchDB
- **Performance** : Mise à jour en masse plus efficace que des updates individuels

---

## Migration depuis l'ancienne architecture

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `POST /api/smart-marki/mark-all-read` | `db.bulkDocs()` avec updates |
| Persistance | Backend SQLite | PouchDB local + sync |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
