# Workflow : Supprimer groupe de variables (PouchDB)

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="supprimerGroupe(gIdx)"`

## Action
Supprimer un groupe de variables

## Description
- Supprime le groupe personnalisé de la séquence
- Les variables restent disponibles
- Sauvegarde immédiate dans PouchDB

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `sequence` - séquence depuis PouchDB
- `etapes`
- `modeles`
- `groupesVariables` - groupes personnalisés
- `activeTab`
- `draggingEtape`
- `editingEtape`
- `editorInstance`
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `saving`
- `hasChanges`
- `showEtapeModal`
- `showModeleModal`
- `showDeleteEtapeModal`

## State Changes

**Modifications:**
- `sequence.groupesVariables` ← groupe supprimé
- Sauvegarde immédiate dans PouchDB

## PouchDB Operations

**Action:** Supprimer un groupe de variables de la séquence dans PouchDB.

**Méthodes utilisées:**
1. `db.get('sequence:' + id)` - Récupérer le document avec sa révision
2. Supprimer le groupe du tableau
3. `db.put(doc)` - Sauvegarder le document modifié

**Sync:** La modification est automatiquement synchronisée avec CouchDB.

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-relance-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── supprimer-groupe.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/supprimer-groupe.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/supprimer-groupe.js
export async function supprimerGroupe() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async supprimerGroupe(gIdx) {
  // 1. Confirm action
  if (!confirm('Supprimer ce groupe ?')) return;
  
  this.loading = true;
  
  try {
    // 2. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('sequence:' + this.sequenceId);
    
    // 3. Supprimer le groupe du tableau
    doc.groupes_variables.splice(gIdx, 1);
    doc.updated_at = new Date().toISOString();
    
    // 4. Sauvegarder dans PouchDB
    const response = await db.put(doc);
    
    // 5. Mettre à jour l'UI
    this.sequence = { ...doc, _rev: response.rev };
    this.groupesVariables = [...doc.groupes_variables];
    
    this.toast('Groupe supprimé', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.error = 'Conflit de version, veuillez réessayer';
      this.toast('Conflit de version', 'error');
    } else {
      this.error = error.message;
      this.toast(error.message, 'error');
    }
  } finally {
    this.loading = false;
  }
}
```

## Notes

- **Suppression immédiate** : Le groupe est supprimé et sauvegardé dans PouchDB
- **Synchronisation** : Les changements sont synchronisés avec CouchDB
- **Pas de soft delete** : Suppression physique du groupe (pas de flag `actif`)

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Suppression | Côté client uniquement | `db.get()` + `db.put()` |
| Persistance | Non persistante | Persistante dans PouchDB |
| Latence | Instantanée | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
