# Workflow : Ouvrir insight (PouchDB)

## Écran
`smart-marki.html`

## Élément déclencheur
Carte avec `@click="openInsightDetail(insight)"`

## Action
Afficher le détail de l'insight IA

## Description
- Récupère l'insight depuis PouchDB pour la dernière version
- Ouvre le panneau détail
- Montre l'analyse complète
- Propose actions recommandées

## Data Model
**Page Function:** `smartMarkiPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `suggestions` - suggestions IA depuis PouchDB
- `selectedInsight` - insight sélectionné
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `processing`
- `chatOpen`

## State Changes

**Modifications:**
- `selectedInsight` ← insight sélectionné (avec dernière version)
- Panneau de détail ouvert

## PouchDB Operations

**Lecture** - Récupérer l'insight depuis PouchDB pour avoir la dernière version.

**Note** : Cette étape est optionnelle si les données sont déjà à jour localement.

## Organisation des fichiers

```
frontend/
└── app/
    └── smart-marki/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── open-insight.js
```

### Fichier principal
- **HTML** : `frontend/app/smart-marki/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/smart-marki/js/open-insight.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/smart-marki/js/open-insight.js
export async function openInsight(insight) {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async openInsightDetail(insight) {
  try {
    // 1. Optionnel: récupérer la dernière version depuis PouchDB
    // Si les données sont déjà fraîches localement, on peut utiliser la copie
    const doc = await db.get(insight._id);
    
    // 2. Set selected insight avec la dernière version
    this.selectedInsight = doc;
    
    // 3. Optionnel: marquer comme lu si non lu
    if (!doc.lu) {
      doc.lu = true;
      doc.read_at = new Date().toISOString();
      await db.put(doc);
      
      // Mettre à jour la liste locale
      const index = this.suggestions.findIndex(s => s._id === doc._id);
      if (index >= 0) {
        this.suggestions[index] = { ...doc };
      }
    }
    
  } catch (error) {
    // En cas d'erreur, utiliser la copie locale
    this.selectedInsight = insight;
    console.error('Erreur chargement insight:', error);
  }
}
```

## Notes

- **Récupération optionnelle** : On peut récupérer la dernière version depuis PouchDB
- **Marquage automatique** : L'insight est automatiquement marqué comme lu à l'ouverture
- **Fallback** : En cas d'erreur, on utilise la copie locale

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Chargement | Props/Store | `db.get()` optionnel pour fraîcheur |
| Marquage lu | `POST /api/smart-marki/mark-read/:id` | `db.put()` avec `lu: true` |
| Persistance | Non persistante (affichage) | **Partiel** - Marquage lu persistant |
| Latence | Instantanée | ~10-50ms si récupération PouchDB |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
