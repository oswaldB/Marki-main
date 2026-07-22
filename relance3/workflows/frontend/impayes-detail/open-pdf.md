# Workflow : Ouvrir le PDF facture (PouchDB)

## Écran
`impayes-detail.html`

## Élément déclencheur
Bouton avec `@click="openPdf()"`

## Action
Ouvrir le PDF de la facture impayée

## Description
- Récupère l'URL PDF depuis le document PouchDB local (champ `url_pdf`)
- Ouvre le PDF dans un nouvel onglet ou un viewer intégré
- Si l'URL nécessite une authentification, utilise un token stocké dans PouchDB

## Data Model

**Page Function:** `impayesDetailPage()`

**Données (depuis PouchDB):**
- `impaye` - impayé en cours de visualisation (contient `url_pdf`)
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `pdfViewerOpen`
- `pdfUrl` - URL finale du PDF

## State Changes

**Modifications:**
- `pdfUrl` ← URL récupérée depuis PouchDB
- `pdfViewerOpen` ← `true` (ou nouvel onglet)

## PouchDB Operations

**Action:** Récupérer l'URL PDF depuis le document facture dans PouchDB.

**Méthodes utilisées:**
- `db.get('facture:' + impayeId)` - Récupérer le document avec l'URL PDF

**Sync:** Les données sont déjà synchronisées avec CouchDB.



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
  // Implementation avec PouchDB
}
```

## Implementation (PouchDB)

```javascript
async openPdf(impayeId) {
  this.loading = true;
  
  try {
    // 1. Récupérer le document depuis PouchDB
    const doc = await db.get('facture:' + impayeId);
    
    // 2. Vérifier que l'URL PDF existe
    if (!doc.url_pdf) {
      throw new Error('PDF non disponible pour cette facture');
    }
    
    // 3. Construire l'URL finale (avec token si nécessaire)
    // Option 1: URL directe depuis PouchDB
    const pdfUrl = doc.url_pdf;
    
    // Option 2: Si l'URL nécessite un token, le récupérer depuis PouchDB
    // const token = await this.getPdfToken(impayeId);
    // const pdfUrl = `${doc.url_pdf}?token=${token}`;
    
    // 4. Ouvrir le PDF dans un nouvel onglet
    window.open(pdfUrl, '_blank');
    
    // Alternative: Ouvrir dans un viewer intégré
    // this.pdfUrl = pdfUrl;
    // this.pdfViewerOpen = true;
    
  } catch (error) {
    console.error('Erreur ouverture PDF:', error);
    
    if (error.status === 404) {
      this.toast('Facture non trouvée dans PouchDB', 'error');
    } else {
      this.toast(error.message || 'Erreur lors de l\'ouverture du PDF', 'error');
    }
  } finally {
    this.loading = false;
  }
}

// Récupérer un token PDF depuis PouchDB (si stocké localement)
async getPdfToken(impayeId) {
  try {
    // Option: récupérer un token stocké dans un document séparé
    const tokenDoc = await dbTokens.get('pdf-token:' + impayeId);
    return tokenDoc.token;
  } catch (err) {
    console.warn('Token PDF non trouvé, utilisation URL directe');
    return null;
  }
}

// Alternative - Viewer intégré
openPdfViewer(impayeId) {
  this.selectedImpayeId = impayeId;
  this.pdfViewerOpen = true;
  
  // Charger l'URL depuis PouchDB
  this.loadPdfUrl(impayeId);
}

async loadPdfUrl(impayeId) {
  try {
    const doc = await db.get('facture:' + impayeId);
    
    if (doc.url_pdf) {
      this.pdfUrl = doc.url_pdf;
    } else {
      this.error = 'PDF non disponible';
    }
  } catch (error) {
    console.error('Erreur chargement PDF:', error);
    this.error = 'Erreur lors du chargement du PDF';
  }
}
```

## Structure du document PouchDB (facture avec URL PDF)

```javascript
{
  "_id": "facture:550e8400-...",
  "_rev": "1-abc123...",
  "type": "facture",
  "id": "F123",
  "nfacture": "F-2024-001",
  "url_pdf": "https://storage.marki.com/factures/F-2024-001.pdf",
  "url_pdf_signed": "https://storage.marki.com/factures/F-2024-001.pdf?token=abc123&expires=...",
  "reste_a_payer": 1500.00,
  "statut": "impaye",
  "contact_id": "contact:..."
}
```

## Gestion des URLs signées (optionnel)

Si les PDFs nécessitent des URLs signées avec expiration :

```javascript
// Stocker le token dans PouchDB lors de la sync
async storePdfToken(impayeId, signedUrl) {
  const tokenDoc = {
    _id: `pdf-token:${impayeId}`,
    type: 'pdf-token',
    impaye_id: impayeId,
    url: signedUrl,
    expires_at: new Date(Date.now() + 3600000).toISOString(), // 1h
    created_at: new Date().toISOString()
  };
  
  await dbTokens.put(tokenDoc);
}

// Vérifier et rafraîchir le token si nécessaire
async getOrRefreshPdfToken(impayeId) {
  try {
    const tokenDoc = await dbTokens.get(`pdf-token:${impayeId}`);
    
    // Vérifier expiration
    if (new Date(tokenDoc.expires_at) < new Date()) {
      // Token expiré, demander un nouveau (via sync CouchDB ou API)
      await this.refreshPdfTokenFromCouchDB(impayeId);
      const refreshedDoc = await dbTokens.get(`pdf-token:${impayeId}`);
      return refreshedDoc.url;
    }
    
    return tokenDoc.url;
  } catch (err) {
    // Token non trouvé, utiliser URL directe
    const doc = await db.get('facture:' + impayeId);
    return doc.url_pdf;
  }
}
```

## Template HTML (viewer intégré optionnel)

```html
<!-- Viewer PDF intégré -->
<div x-show="pdfViewerOpen" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div class="absolute inset-0 bg-slate-900/75" @click="pdfViewerOpen = false"></div>
  
  <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b">
      <h3 class="font-semibold text-slate-900">Facture PDF</h3>
      <button @click="pdfViewerOpen = false" class="text-slate-400 hover:text-slate-600">
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <!-- PDF Viewer -->
    <div class="flex-1 bg-slate-100">
      <iframe x-show="pdfUrl" :src="pdfUrl" class="w-full h-full" frameborder="0"></iframe>
      
      <!-- Loading -->
      <div x-show="!pdfUrl" class="flex items-center justify-center h-full">
        <i class="fas fa-spinner fa-spin text-slate-400 text-2xl"></i>
      </div>
    </div>
  </div>
</div>
```

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Source URL | `GET /api/workflows/generate-pdf-url` | `db.get('facture:' + id).url_pdf` |
| Vérification permissions | Backend | Déjà faite lors du chargement du doc |
| Token sécurisé | Généré par backend | Stocké dans PouchDB lors de la sync |
| Latence | ~100-300ms | ~5-20ms (local) |
| Offline | ❌ Impossible | ✅ Fonctionne si PDF déjà sync |

## Notes

- L'URL PDF est stockée dans le document facture dans PouchDB
- Si une URL signée avec expiration est nécessaire, elle peut être stockée dans un document séparé
- Le sync PouchDB met à jour automatiquement l'URL si elle change côté serveur
- Pour les PDFs protégés, considérer le stockage du token avec expiration dans PouchDB
