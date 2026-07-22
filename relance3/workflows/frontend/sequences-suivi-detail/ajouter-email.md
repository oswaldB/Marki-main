# Workflow : Ajouter email suivi (PouchDB)

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton avec `@click="ajouterEmail()"`

## Action
Ajouter un email à la séquence de suivi dans PouchDB

## Description
- Crée un nouvel email de suivi avec fréquence et contenu
- Ajoute l'email au tableau `emails` de la séquence
- Sauvegarde immédiatement dans PouchDB
- Synchronise avec CouchDB

## Data Model
**Page Function:** `sequencesSuiviDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `sequence` - séquence depuis PouchDB
- `etapes` - emails de la séquence
- `typeRelanceOptions`
- `selectedType`
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `saving`
- `hasChanges`

## State Changes

**Modifications:**
- `sequence.emails` ← nouvel email ajouté
- Sauvegarde immédiate dans PouchDB
- `hasChanges` ← `false`

## PouchDB Operations

**Action:** Ajouter un email au tableau `emails` de la séquence dans PouchDB.

**Méthodes utilisées:**
1. `db.get('sequence:' + id)` - Récupérer le document avec sa révision
2. Ajouter l'email au tableau avec un nouvel index
3. `db.put(doc)` - Sauvegarder le document modifié

**Sync:** La modification est automatiquement synchronisée avec CouchDB.

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-suivi-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── ajouter-email.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/ajouter-email.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/ajouter-email.js
export async function ajouterEmail() {
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async ajouterEmail() {
  this.loading = true;
  
  try {
    // 1. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('sequence:' + this.sequenceId);
    
    // 2. Créer le nouvel email de suivi
    const newEmail = {
      email_index: (doc.emails?.length || 0) + 1,
      delai: 7, // Délai par défaut en jours
      objet: 'Nouvel email de suivi',
      corps: '<p>Contenu...</p>',
      frequence: 'hebdomadaire', // quotidien | hebdomadaire | mensuel
      jour_semaine: 1, // 1-7 pour hebdomadaire
      jour_mois: 1, // 1-31 pour mensuel
      heure: '09:00',
      actif: true,
      scenarios: [
        { format: 'single', actif: true, objet: '', corps: '' },
        { format: 'multiple', actif: true, objet: '', corps: '' }
      ],
      created_at: new Date().toISOString()
    };
    
    // 3. Ajouter au tableau
    doc.emails = doc.emails || [];
    doc.emails.push(newEmail);
    doc.updated_at = new Date().toISOString();
    
    // 4. Sauvegarder dans PouchDB
    const response = await db.put(doc);
    // response: { ok: true, id: 'sequence:...', rev: '2-xxx...' }
    
    // 5. Mettre à jour l'UI
    this.sequence = { ...doc, _rev: response.rev };
    this.etapes = [...doc.emails];
    this.hasChanges = false;
    
    // 6. Notify
    this.toast('Email de suivi ajouté', 'success');
    
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

- **Email de suivi** : Différent d'un email de relance - il est envoyé régulièrement (quotidien/hebdomadaire/mensuel)
- **Fréquence configurable** : `frequence`, `jour_semaine`, `jour_mois`, `heure`
- **Sauvegarde immédiate** : L'email est persisté dans PouchDB immédiatement
- **Synchronisation** : Les changements sont synchronisés avec CouchDB

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Action | Côté client uniquement | `db.get()` + `db.put()` |
| Persistance | Non persistante | Persistante dans PouchDB |
| Latence | Instantanée | ~10-50ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
