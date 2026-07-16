# Workflow : Blacklister la facture

## Écran
`impayes-detail.html`

## Élément déclencheur
Bouton avec `@click="openBlacklistModal()"`

## Action
Blacklister un impayé pour désactiver les relances automatiques

## Description
- Ouvre un modal pour saisir le motif de blacklist
- Met à jour les champs `is_blacklisted`, `blacklist_date`, `blacklist_motif` dans la table `impayes`
- Empêche les futures relances automatiques sur cette facture

## Data Model

**Page Function:** `impayesDetailPage()`

**Données:**
- `impaye` - impayé en cours de visualisation
- `blacklistMotif` - motif saisi par l'utilisateur

**Champs modifiés dans `impayes`:**
- `is_blacklisted` ← `true`
- `blacklist_date` ← date actuelle (ISO)
- `blacklist_motif` ← texte saisi

**États UI:**
- `loading`
- `error`
- `showBlacklistModal`
- `blacklistMotif`

## State Changes

**Modifications:**
- `impaye.is_blacklisted` ← `true`
- `impaye.blacklist_date` ← date
- `impaye.blacklist_motif` ← texte

## API Calls

**Endpoint:** `PUT /api/impayes/:id`

**Payload:**
```json
{
  "is_blacklisted": true,
  "blacklist_date": "2026-07-10T15:30:00Z",
  "blacklist_motif": "string",
  "updated_at": "2026-07-10T15:30:00Z"
}
```

**Table:** `impayes`

**Response:** `ApiResponse<Impaye>`

## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-detail/
        ├── index.html
        └── js/
            └── blacklist-facture.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes-detail/js/blacklist-facture.js`

```javascript
// frontend/app/impayes-detail/js/blacklist-facture.js
export function blacklistFacture() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async blacklistFacture(impayeId, motif) {
  // 1. Validate
  if (!motif.trim()) {
    Alpine.store('ui').addToast('Le motif est obligatoire', 'error');
    return;
  }
  
  // 2. Set loading
  this.loading = true;
  
  try {
    // 3. Call API
    const response = await fetch(`/api/impayes/${impayeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_blacklisted: true,
        blacklist_date: new Date().toISOString(),
        blacklist_motif: motif.trim(),
        updated_at: new Date().toISOString()
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 4. Update local
    this.impaye.is_blacklisted = true;
    this.impaye.blacklist_date = data.data.blacklist_date;
    this.impaye.blacklist_motif = motif.trim();
    
    // 5. Close modal
    this.showBlacklistModal = false;
    this.blacklistMotif = '';
    
    // 6. Notify
    Alpine.store('ui').addToast('Facture blacklistée', 'success');
    
  } catch (error) {
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}
```

## Notes

- Une facture blacklistée ne recevra plus de relances automatiques
- Le motif est obligatoire pour tracer la raison du blacklisting
- Pour retirer de la blacklist, mettre `is_blacklisted: false` (avec motif de dé-blacklist optionnel)
