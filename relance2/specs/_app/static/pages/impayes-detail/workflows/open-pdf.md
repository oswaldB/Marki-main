# Workflow : Ouvrir le PDF facture

## Écran
`impayes-detail.html`

## Élément déclencheur
Bouton avec `@click="openPdf()"`

## Action
Ouvrir le PDF de la facture impayée

## Description
- Appelle un workflow backend pour obtenir une URL sécurisée
- Ouvre le PDF dans un nouvel onglet ou un viewer intégré
- Le backend vérifie les permissions et génère un token temporaire si nécessaire

## Data Model

**Page Function:** `impayesDetailPage()`

**Données:**
- `impaye` - impayé en cours de visualisation (contient `url_pdf`)

**États UI:**
- `loading`
- `error`
- `pdfViewerOpen`
- `pdfUrl` - URL finale du PDF (avec token si nécessaire)

## State Changes

**Modifications:**
- `pdfUrl` ← URL sécurisée obtenue du backend
- `pdfViewerOpen` ← `true` (ou nouvel onglet)

## API Calls

**Endpoint:** `GET /api/workflows/generate-pdf-url?impaye_id=:id`

**Description:** Génère une URL temporaire sécurisée pour accéder au PDF

**Table:** `impayes` (lecture du champ `url_pdf`)

**Response:** `ApiResponse<{ pdfUrl: string, token?: string, expiresAt?: string }>`

## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-detail/
        ├── index.html
        └── js/
            └── open-pdf.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes-detail/js/open-pdf.js`

```javascript
// frontend/app/impayes-detail/js/open-pdf.js
export function openPdf() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async openPdf(impayeId) {
  this.loading = true;
  
  try {
    // 1. Call backend to get secure PDF URL
    const response = await fetch(`/api/workflows/generate-pdf-url?impaye_id=${impayeId}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Erreur lors de la génération du lien PDF');
    }
    
    // 2. Open PDF in new tab
    if (data.data?.pdfUrl) {
      window.open(data.data.pdfUrl, '_blank');
    } else {
      throw new Error('URL PDF non disponible');
    }
    
    // Alternative: Open in integrated viewer
    // this.pdfUrl = data.data.pdfUrl;
    // this.pdfViewerOpen = true;
    
  } catch (error) {
    console.error('Erreur ouverture PDF:', error);
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}

// Alternative - Viewer intégré
openPdfViewer(impayeId) {
  this.selectedImpayeId = impayeId;
  this.pdfViewerOpen = true;
  
  // Charger l'URL dans un iframe
  this.loadPdfUrl(impayeId);
}

async loadPdfUrl(impayeId) {
  try {
    const response = await fetch(`/api/workflows/generate-pdf-url?impaye_id=${impayeId}`);
    const data = await response.json();
    
    if (data.success && data.data?.pdfUrl) {
      this.pdfUrl = data.data.pdfUrl;
    }
  } catch (error) {
    console.error('Erreur chargement PDF:', error);
  }
}
```

## Backend (workflow)

Le workflow backend doit :
1. Vérifier que l'utilisateur a accès à l'impayé
2. Lire `url_pdf` depuis la table `impayes`
3. Générer un token temporaire si nécessaire (pour les URLs protégées)
4. Retourner l'URL finale

```javascript
// Exemple backend
async generatePdfUrl(impayeId, userContext) {
  // Vérifier accès
  const impaye = await db.readSecure('impayes', impayeId, userContext);
  
  if (!impaye.url_pdf) {
    throw new Error('PDF non disponible');
  }
  
  // Optionnel: générer une URL signée avec expiration
  const signedUrl = generateSignedUrl(impaye.url_pdf, { expiresIn: '1h' });
  
  return { pdfUrl: signedUrl };
}
```

## Notes

- L'appel backend permet de vérifier les permissions avant d'exposer l'URL
- L'URL peut être signée avec une expiration (sécurité)
- Le PDF peut s'ouvrir dans un nouvel onglet ou dans un viewer intégré (iframe)

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-detail-open-pdf] START: Ouverture du PDF facture', { impayeId })` |
| `api-call-start` | `console.log('[WORKFLOW.impayes-detail-open-pdf] STEP: Appel API GET /api/workflows/generate-pdf-url?impaye_id=', impayeId)` |
| `api-response` | `console.log('[WORKFLOW.impayes-detail-open-pdf] DATA: Réponse API reçue', response)` |
| `pdf-loaded` | `console.log('[WORKFLOW.impayes-detail-open-pdf] STEP: URL PDF sécurisée obtenue', { pdfUrl, token, expiresAt })` |
| `window-opened` | `console.log('[WORKFLOW.impayes-detail-open-pdf] STEP: Ouverture du PDF dans un nouvel onglet')` |
| `state-updated` | `console.log('[WORKFLOW.impayes-detail-open-pdf] STATE: pdfUrl mis à jour, pdfViewerOpen =', this.pdfViewerOpen)` |
| `end` | `console.log('[WORKFLOW.impayes-detail-open-pdf] SUCCESS: PDF ouvert en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-detail-open-pdf] ERROR:', error)` |
