# Workflow : Ignorer insight (PouchDB)

## Écran
`smart-marki.html`

## Élément déclencheur
Bouton avec `@click="dismissInsight(selectedInsight)"`

## Action
Rejeter la recommandation

## Description
- Marque la suggestion comme ignorée dans PouchDB
- Retire de la liste active
- Enregistre pour éviter similarité
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
- `suggestions` ← sans l'insight ignoré
- Sauvegarde dans PouchDB (statut ignoré)

## PouchDB Operations

**Action:** Marquer la suggestion comme ignorée dans PouchDB (suppression logique).

**Méthodes utilisées:**
1. `db.get(insight._id)` - Récupérer le document
2. Mettre à jour `dismissed: true`
3. `db.put(doc)` - Sauvegarder

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
            └── dismiss-insight.js
```

### Fichier principal
- **HTML** : `frontend/app/smart-marki/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/smart-marki/js/dismiss-insight.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/smart-marki/js/dismiss-insight.js
export async function dismissInsight() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async dismissInsight(insight) {
  try {
    // 1. Récupérer le document depuis PouchDB
    const doc = await db.get(insight._id);
    
    // 2. Marquer comme ignoré (suppression logique)
    doc.dismissed = true;
    doc.dismissed_at = new Date().toISOString();
    doc.updated_at = new Date().toISOString();
    
    // 3. Sauvegarder dans PouchDB
    await db.put(doc);
    
    // 4. Remove from list
    this.suggestions = this.suggestions.filter(item => item._id !== insight._id);
    
    // 5. Notify
    this.toast('Suggestion ignorée', 'info');
    
  } catch (error) {
    this.toast(error.message, 'error');
  }
}
```

## Notes

- **Suppression logique** : La suggestion est marquée comme `dismissed: true`
- **Synchronisation** : Les changements sont synchronisés avec CouchDB
- **Apprentissage** : L'information est conservée pour éviter suggestions similaires

---

## Migration depuis l'ancienne architecture

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `POST /api/smart-marki/dismiss/:id` | `db.get()` + `db.put()` avec `dismissed: true` |
| Persistance | Backend SQLite | PouchDB local + sync |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
