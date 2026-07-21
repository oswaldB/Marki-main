# Workflow : Créer une relance

## Écran
`relances.html`

## Élément déclencheur
Bouton avec `@click="createRelance()"` dans le modal de nouvelle relance

## Action
Créer une nouvelle relance en base de données

## Description
- Valide les données du formulaire
- Crée la relance via API
- Rafraîchit la liste des relances
- Ferme le modal

## Data Model
**Page Function:** `relancesPage()`

**Données:**
- `newRelance` - données du formulaire (contact_id, sequence_id, impayes_ids, etc.)

**États UI:**
- `loading`
- `error`
- `showNewRelanceModal`

## State Changes

**Modifications:**
- `loading` → `true` → `false`
- `relances` ← nouvelle relance ajoutée
- `showNewRelanceModal` → `false`

## API Calls

**`POST /api/relances`** - Crée une nouvelle relance

**Payload:**
```json
{
  "contact_id": "cont_abc123",
  "sequence_id": "seq_def456",
  "impaye_ids": ["imp_001", "imp_002"],
  "statut": "brouillon",
  "objet": "Relance factures impayées",
  "corps": "Contenu de l'email...",
  "created_at": "2026-07-12T10:00:00Z"
}
```

**Response:** `ApiResponse<Relance>`

## Organisation des fichiers

```
frontend/
└── app/
    └── relances/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── create-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances/js/create-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances/js/create-relance.js
export function createRelance() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async createRelance() {
  // 1. Validate form
  if (!this.newRelance.contact_id || !this.newRelance.sequence_id) {
    Alpine.store('ui').addToast('Veuillez remplir tous les champs obligatoires', 'error');
    return;
  }
  
  // 2. Set loading
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Prepare payload
    const payload = {
      ...this.newRelance,
      statut: 'brouillon',
      created_at: new Date().toISOString()
    };
    
    // 4. Call API
    const response = await fetch('/api/relances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Erreur lors de la création');
    }
    
    // 5. Update local array
    this.relances.unshift(data.data);
    
    // 6. Close modal
    this.showNewRelanceModal = false;
    this.newRelance = this.getInitialState();
    
    // 7. Notify
    Alpine.store('ui').addToast('Relance créée avec succès', 'success');
    
  } catch (error) {
    this.error = error.message;
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}
```

## Notes

- La relance est créée avec le statut `brouillon` par défaut
- L'utilisateur peut ensuite l'éditer avant envoi
- Voir workflow `send-relance.md` pour l'envoi effectif
