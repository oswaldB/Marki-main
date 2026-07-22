# Workflow : Lancer attribution manuelle (PouchDB + API)

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="lancerAttribution()"`

## Action
Exécuter l'attribution des impayés via le backend

## Description

Déclenche l'attribution automatique des impayés en appelant le workflow backend `attribution-impayes`.
- Le backend parcourt les impayés non assignés
- Le backend applique les règles d'attribution
- Le backend assigne les impayés à cette séquence

**Note importante** : Cet appel API est **conservé** car l'attribution automatique nécessite:
- Un traitement complexe côté serveur
- Des calculs sur l'ensemble des impayés
- Des mises à jour en masse dans la base de données

Ces opérations ne peuvent pas être réalisées efficacement côté client avec PouchDB.

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `sequence` - séquence depuis PouchDB
- `etapes`
- `modeles`
- `activeTab`
- `draggingEtape`
- `editingEtape`
- `editorInstance`

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
- `processing` = `true` pendant l'exécution
- Toast 'Attribution en cours...' (info) au lancement
- Toast 'Attribution terminée' (succès) ou message d'erreur
- `processing` = `false` à la fin

## PouchDB Operations

**Aucun** - Ce workflow ne modifie pas directement PouchDB. Il délègue l'attribution au backend via API.

**Note** : Le backend met à jour les documents PouchDB (impayés) après l'attribution, et les changements sont synchronisés automatiquement vers le client via CouchDB.

## API Calls

**POST** `/api/workflows/attribution-impayes/execute`

**Conservé** car l'attribution automatique nécessite:
- Traitement complexe côté serveur
- Accès à l'ensemble des données pour calculer les attributions
- Mises à jour en masse atomiques

**Body:** `{ sequence_id: string }`

**Retour:** `{ success: boolean, assigned_count: number }`

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-relance-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── lancer-attribution.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/lancer-attribution.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/lancer-attribution.js
export async function lancerAttribution() {
  // Appel au workflow backend attribution-impayes (conservé)
}
```

## Implementation

```javascript
async lancerAttribution() {
  this.processing = true;
  this.toast('Attribution en cours...', 'info');
  
  try {
    // Appel au backend (conservé - nécessite traitement serveur)
    const response = await fetch('/api/workflows/attribution-impayes/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence_id: this.sequence._id })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Erreur lors de l\'attribution');
    }
    
    this.toast(`${data.assigned_count} impayés attribués`, 'success');
    
    // Les impayés modifiés seront automatiquement mis à jour via PouchDB sync
    
  } catch (error) {
    this.toast(error.message, 'error');
  } finally {
    this.processing = false;
  }
}
```

## Notes

- **API conservée** : L'attribution automatique est un traitement complexe qui nécessite le backend
- **Sync automatique** : Les impayés modifiés par le backend sont synchronisés vers PouchDB client
- **Pas de polling** : Les changements arrivent automatiquement via `db.changes()`

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB + API) |
|--------|-------|----------------------|
| Attribution | `POST /api/workflows/attribution-impayes/execute` | **Conservé** - Nécessite backend |
| Mise à jour impayés | Backend direct | Backend → PouchDB → Sync client |
| Réception résultat | Réponse API | API + `db.changes()` temps réel |
| Latence | ~1-5s (traitement) | ~1-5s (traitement) + sync |
| Offline | ❌ Impossible | ⚠️ Attribution nécessite connexion |
