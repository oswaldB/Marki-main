# Workflow : Télécharger facture client

## Écran
`portail-client.html`

## Élément déclencheur
Bouton avec `@click="downloadFacture(facture)"`

## Action
Télécharger le PDF facture

## Description
- Lance le téléchargement
- Format PDF

## Data Model
**Page Function:** `portailClientPage()`

**Données:**
- `client`
- `factures`
- `documents`
- `factureAPayer`

**États UI:**
- `loading`
- `error`
- `showPaiementModal`

## State Changes

**Modifications:**
- `loading` → `true` → `false`
- `error` ← message si échec
- `data` ← résultat API

## API Calls

**`POST /functions/generatePdfLink`** - Génère un lien signé pour télécharger le PDF

**Payload:**
```json
{
  "impayelId": "imp_abc123"
}
```

**Response:**
```json
{
  "url": "https://adti.api2.markidiags.com/api/pdf/imp_abc123?sig=a1b2c3...&expires=1720692000",
  "expires": 1720692000
}
```

**Note** : La Cloud Function est publique (pas d'auth requise). Le lien généré est valable 24h.

## Organisation des fichiers

```
frontend/
└── app/
    └── portail-client/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── download-facture.js
```

### Fichier principal
- **HTML** : `frontend/app/portail-client/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/portail-client/js/download-facture.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/portail-client/js/download-facture.js
export function downloadFacture() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async downloadFacture(facture) {
  // 1. Set loading state
  this.loading = true;
  this.error = null;
  
  try {
    // 2. Call Cloud Function to generate signed link
    const response = await fetch('/functions/generatePdfLink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ impayelId: facture.id })
    });
    
    const data = await response.json();
    
    if (!data.success || !data.data?.url) {
      throw new Error(data.error?.message || 'Impossible de générer le lien de téléchargement');
    }
    
    // 3. Open PDF in new tab or trigger download
    window.open(data.data.url, '_blank');
    
    // 4. Notify success
    Alpine.store('ui').addToast('Téléchargement du PDF...', 'success');
    
  } catch (error) {
    this.error = error.message;
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    // 5. Reset loading
    this.loading = false;
  }
}
```

## Notes

- Le lien PDF est signé avec HMAC-SHA256 et expire après 24h
- Le secret utilisé est `PDF_SIGNING_SECRET` (côté backend)
- Le lien pointe vers `/api/pdf/{impayeId}?sig=xxx&expires=xxx`
- Si le lien est expiré, le serveur retourne une erreur 403
