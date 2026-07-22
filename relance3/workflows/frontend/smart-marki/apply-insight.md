# Workflow : Appliquer insight (PouchDB)

## Écran
`smart-marki.html`

## Élément déclencheur
Bouton avec `@click="applyInsight(selectedInsight)"`

## Action
Appliquer la recommandation IA

## Description
- Enregistre l'insight appliqué dans PouchDB
- Exécute l'action suggérée
- Modifie les paramètres
- Crée la relance/séquence si nécessaire
- Synchronise avec CouchDB

## Data Model
**Page Function:** `smartMarkiPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `suggestions` - suggestions IA depuis PouchDB
- `historiqueActions` - historique des actions
- `stats` - statistiques
- `features` - features activées
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `processing`
- `chatOpen`

## State Changes

**Modifications:**
- `processing` ← true/false
- `suggestions` ← sans l'insight appliqué
- `historiqueActions` ← avec nouvelle action
- Sauvegarde dans PouchDB

## PouchDB Operations

**Action:** Enregistrer l'action appliquée dans PouchDB.

**Méthodes utilisées:**
1. Créer un document dans l'historique des actions
2. Mettre à jour le statut de la suggestion
3. `db.put()` pour sauvegarder

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
            └── apply-insight.js
```

### Fichier principal
- **HTML** : `frontend/app/smart-marki/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/smart-marki/js/apply-insight.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/smart-marki/js/apply-insight.js
export async function applyInsight() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async applyInsight(insight) {
  // 1. Set processing
  this.processing = true;
  
  try {
    // 2. Créer l'action dans l'historique
    const actionDoc = {
      _id: 'smart-action:' + Date.now(),
      type: 'smart-action',
      insight_id: insight._id,
      action_type: insight.action_type,
      status: 'applied',
      applied_at: new Date().toISOString(),
      user_id: this.currentUserId
    };
    
    await db.put(actionDoc);
    
    // 3. Mettre à jour la suggestion (suppression logique)
    const suggestionDoc = await db.get(insight._id);
    suggestionDoc.applied = true;
    suggestionDoc.applied_at = new Date().toISOString();
    await db.put(suggestionDoc);
    
    // 4. Remove from suggestions list
    this.suggestions = this.suggestions.filter(s => s._id !== insight._id);
    
    // 5. Add to history
    this.historiqueActions.unshift(actionDoc);
    
    // 6. Notify
    this.toast('Suggestion appliquée', 'success');
    
  } catch (error) {
    this.toast(error.message, 'error');
  } finally {
    this.processing = false;
  }
}
```

## Notes

- **Persistance** : L'action est enregistrée dans PouchDB pour historique
- **Synchronisation** : Les changements sont synchronisés avec CouchDB
- **Soft delete** : La suggestion est marquée comme appliquée, pas supprimée

---

## Migration depuis l'ancienne architecture

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Requête | `POST /api/smart-marki/apply/:id` | `db.put()` pour historique + update suggestion |
| Persistance | Backend SQLite | PouchDB local + sync |
| Latence | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
