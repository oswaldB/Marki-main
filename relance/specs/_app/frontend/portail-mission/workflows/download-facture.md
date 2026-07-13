# Workflow : Télécharger facture mission

## Écran
`portail-mission.html`

## Élément déclencheur
Bouton avec `@click="downloadFacture()"`

## Action
Télécharger le PDF de la facture de l'impayé

## Description
- Génère un lien signé HMAC pour accéder au PDF
- Lance le téléchargement du PDF
- Même mécanisme que `portail-client/download-facture.md`

## Data Model
**Page Function:** `portailMissionPage()`

**Données:**
- `impaye` - l'impayé/facture en cours de consultation
- `mission`

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `loading` → `true` → `false`
- `error` ← message si échec

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
    └── portail-mission/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── download-facture.js
```

### Fichier principal
- **HTML** : `frontend/app/portail-mission/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/portail-mission/js/download-facture.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/portail-mission/js/download-facture.js
export function downloadFacture() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async downloadFacture() {
  // 1. Set loading state
  this.loading = true;
  this.error = null;
  
  try {
    // 2. Call Cloud Function to generate signed link
    const response = await fetch('/functions/generatePdfLink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ impayelId: this.impaye.id })
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
