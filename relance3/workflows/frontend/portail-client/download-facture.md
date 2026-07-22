# Workflow : Télécharger facture client

## Écran
`portail-client.html`

## Élément déclencheur
Bouton avec `@click="downloadFacture(facture)"`

## Action
Télécharger le PDF facture

## Description
- Récupère les données de la facture depuis PouchDB (affichage)
- Génère un lien signé via la Cloud Function
- Lance le téléchargement du PDF
- Format PDF

## Data Model
**Page Function:** `portailClientPage()`

**Données (depuis PouchDB):**
- `client` - données du client
- `factures` - liste des factures du client
- `documents` - documents associés
- `factureAPayer` - facture sélectionnée
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `showPaiementModal`

## State Changes

**Modifications:**
- `loading` → `true` → `false`
- `error` ← message si échec
- `data` ← résultat API (lien signé)

## PouchDB Operations

**Action:** Récupérer les données de la facture depuis PouchDB pour affichage.

**Méthodes utilisées:**
- `db.get('facture:' + factureId)` - Récupérer les détails de la facture

**Note importante :** Les fichiers PDF binaires ne sont pas stockés dans PouchDB. Seules les métadonnées JSON le sont. Le téléchargement PDF passe toujours par la Cloud Function.

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
  "url": "https://dev.markidiags.com/api/pdf/imp_abc123?sig=a1b2c3...&expires=1720692000",
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
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/portail-client/js/download-facture.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/portail-client/js/download-facture.js
export function downloadFacture() {
  // Implementation avec PouchDB pour les données, Cloud Function pour PDF
}
```

## Implementation

```javascript
async downloadFacture(facture) {
  // 1. Set loading state
  this.loading = true;
  this.error = null;
  
  try {
    // 2. Optionnel: Vérifier/récupérer les données depuis PouchDB
    // const doc = await db.get('facture:' + facture.id);
    // const factureData = doc;
    
    // 3. Call Cloud Function to generate signed link
    // Note: Cet appel API est conservé car les PDFs ne sont pas stockés dans PouchDB
    const response = await fetch('/functions/generatePdfLink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ impayelId: facture.id })
    });
    
    const data = await response.json();
    
    if (!data.success || !data.data?.url) {
      throw new Error(data.error?.message || 'Impossible de générer le lien de téléchargement');
    }
    
    // 4. Open PDF in new tab or trigger download
    window.open(data.data.url, '_blank');
    
    // 5. Notify success
    this.toast('Téléchargement du PDF...', 'success');
    
  } catch (error) {
    this.error = error.message;
    this.toast(error.message, 'error');
  } finally {
    // 6. Reset loading
    this.loading = false;
  }
}
```

## Chargement des factures depuis PouchDB

```javascript
// Dans le workflow initial-load du portail client
async loadClientFactures(clientId) {
  try {
    // Récupérer toutes les factures du client depuis PouchDB
    const result = await db.allDocs({
      startkey: 'facture:',
      endkey: 'facture:\ufff0',
      include_docs: true
    });
    
    // Filtrer par client
    this.factures = result.rows
      .map(row => row.doc)
      .filter(f => f.client_id === clientId);
      
  } catch (error) {
    console.error('Erreur chargement factures:', error);
    this.error = error.message;
  }
}
```

## Notes

- **Données JSON** : Les métadonnées des factures (montant, date, statut) sont stockées dans PouchDB
- **Fichiers PDF** : Les PDFs binaires restent sur le backend et sont générés à la demande via Cloud Function
- Le lien PDF est signé avec HMAC-SHA256 et expire après 24h
- Le secret utilisé est `PDF_SIGNING_SECRET` (côté backend)
- Si le lien est expiré, le serveur retourne une erreur 403

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Données facture | API backend | PouchDB local |
| Téléchargement PDF | Cloud Function | **Conservé** - Cloud Function |
| Affichage liste | API `/api/factures` | `db.allDocs()` local |
| Latence affichage | ~200-500ms | ~10-50ms |
| Offline | ❌ Impossible | ✅ Liste consultable offline, PDF nécessite connexion |
