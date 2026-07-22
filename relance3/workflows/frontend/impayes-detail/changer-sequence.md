# Workflow : Changer de séquence (PouchDB)

## Écran
`impayes-detail.html`

## Élément déclencheur
Sélecteur avec `@change="changerSequence($event.target.value)"`

## Action
Modifier la séquence de relance associée à un impayé

## Description
- Affiche un sélecteur avec les séquences disponibles (chargées depuis PouchDB)
- Met à jour `sequence_id` dans le document PouchDB de l'impayé
- Relance l'index à 0 (redémarre la séquence depuis le début)
- La modification est synchronisée automatiquement avec CouchDB

## Data Model

**Page Function:** `impayesDetailPage()`

**Données (depuis PouchDB):**
- `impaye` - impayé en cours de visualisation (document PouchDB)
- `sequences` - liste des séquences disponibles (chargées depuis PouchDB)
- `selectedSequenceId` - ID de la séquence sélectionnée
- `db` - instance PouchDB

**Champs modifiés dans le document PouchDB:**
- `sequence_id` ← ID de la nouvelle séquence (ou `null` pour aucune)
- `email_index` ← `0` (reset de l'étape de relance)
- `updated_at` ← date actuelle

**États UI:**
- `loading`
- `error`
- `sequences` - liste des séquences disponibles

## State Changes

**Modifications:**
- `impaye.sequence_id` ← nouvelle séquence ID
- `impaye.email_index` ← `0` (reset)

## PouchDB Operations

**Chargement des séquences:**
- `dbSequences.allDocs()` ou `dbSequences.find({ selector: { actif: true } })`

**Mise à jour de l'impayé:**
1. `db.get('facture:' + impayeId)` - Récupérer le document avec sa révision
2. Modifier `sequence_id` et `email_index`
3. `db.put(doc)` - Sauvegarder le document modifié

**Sync:** La modification est automatiquement synchronisée avec CouchDB.



## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-detail/
        ├── index.html
        └── js/
            └── changer-sequence.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes-detail/js/changer-sequence.js`

```javascript
// frontend/app/impayes-detail/js/changer-sequence.js
export async function changerSequence() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
// Chargement initial des séquences depuis PouchDB
async loadSequences() {
  try {
    const result = await dbSequences.allDocs({
      startkey: 'sequence:',
      endkey: 'sequence:\ufff0',
      include_docs: true
    });
    
    // Filtrer les séquences actives
    this.sequences = result.rows
      .map(row => row.doc)
      .filter(seq => seq.actif === true)
      .sort((a, b) => a.ordre - b.ordre);
      
  } catch (error) {
    console.error('Erreur chargement séquences:', error);
  }
}

// Alternative avec Mango Query
async loadSequencesMango() {
  try {
    const result = await dbSequences.find({
      selector: {
        type: { $eq: 'sequence' },
        actif: { $eq: true }
      },
      sort: [{ ordre: 'asc' }]
    });
    
    this.sequences = result.docs;
  } catch (error) {
    console.error('Erreur chargement séquences:', error);
  }
}

// Changer la séquence
async changerSequence(impayeId, sequenceId) {
  this.loading = true;
  
  try {
    // 1. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('facture:' + impayeId);
    
    // 2. Modifier les champs
    doc.sequence_id = sequenceId || null;
    doc.email_index = 0; // Reset à la première étape
    doc.updated_at = new Date().toISOString();
    
    // 3. Sauvegarder dans PouchDB (crée une nouvelle révision)
    const response = await db.put(doc);
    // response: { ok: true, id: 'facture:...', rev: '2-xxx...' }
    
    // 4. Update local (le changes listener mettra aussi à jour)
    this.impaye.sequence_id = sequenceId;
    this.impaye.email_index = 0;
    this.impaye._rev = response.rev;
    
    this.toast('Séquence mise à jour', 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.error = 'Conflit de version, veuillez réessayer';
      this.toast('Conflit de version, veuillez réessayer', 'error');
    } else {
      this.error = error.message;
      this.toast(error.message, 'error');
    }
  } finally {
    this.loading = false;
  }
}

// Gestion des conflits avec retry
async changerSequenceWithRetry(impayeId, sequenceId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const doc = await db.get('facture:' + impayeId);
      
      doc.sequence_id = sequenceId || null;
      doc.email_index = 0;
      doc.updated_at = new Date().toISOString();
      
      await db.put(doc);
      
      this.impaye.sequence_id = sequenceId;
      this.impaye.email_index = 0;
      
      this.toast('Séquence mise à jour', 'success');
      return;
      
    } catch (error) {
      if (error.status === 409 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 100 * attempt));
        continue;
      }
      throw error;
    }
  }
}
```

## Structure du document PouchDB (séquence)

```javascript
{
  "_id": "sequence:550e8400-...",
  "_rev": "1-abc123...",
  "type": "sequence",
  "id": "seq-001",
  "nom": "Séquence Standard",
  "actif": true,
  "ordre": 1,
  "etapes": [
    { "niveau": 1, "delai_jours": 7, "template_id": "tpl-001" },
    { "niveau": 2, "delai_jours": 14, "template_id": "tpl-002" },
    { "niveau": 3, "delai_jours": 30, "template_id": "tpl-003" }
  ]
}
```

## Structure du document PouchDB (impayé après changement)

```javascript
{
  "_id": "facture:550e8400-...",
  "_rev": "2-abc123...",  // Nouvelle révision
  "type": "facture",
  "id": "F123",
  "sequence_id": "seq-001",  // Nouvelle séquence
  "email_index": 0,  // Reset
  "updated_at": "2026-07-21T16:45:00.000Z",
  ...
}
```

## Notes

- Le changement de séquence reset `email_index` à 0 pour recommencer depuis le début
- Si `sequence_id` est `null`, l'impayé n'est plus dans aucune séquence de relance
- Les séquences disponibles sont filtrées sur `actif: true` (côté client)
- La modification est immédiatement disponible localement et sera sync avec CouchDB

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Chargement séquences | `GET /api/sequences?actif=true` | `dbSequences.allDocs()` ou `dbSequences.find()` |
| Mise à jour | `PUT /api/impayes/:id` | `db.get()` puis `db.put()` |
| Payload | `{ sequence_id, email_index, updated_at }` | Modification directe du doc |
| Réponse | `ApiResponse<Impaye>` | `{ ok, id, rev }` |
| Gestion conflits | Verrouillage optimiste serveur | Détection `_rev` côté client |
| Latence | ~100-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline, sync reportée |
