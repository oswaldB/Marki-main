# Workflow : Télécharger facture mission (PouchDB)

## Écran
`portail-mission.html`

## Élément déclencheur
Bouton avec `@click="downloadFacture()"`

## Action
Télécharger le PDF de la facture de l'impayé

## Description
- Récupère les données de l'impayé depuis PouchDB
- Génère un lien signé HMAC via Cloud Function pour accéder au PDF
- Lance le téléchargement du PDF

## Data Model
**Page Function:** `portailMissionPage()`

**Données (depuis PouchDB):**
- `impaye` - l'impayé/facture en cours de consultation (depuis PouchDB)
- `mission` - mission liée (depuis PouchDB)
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `loading` → `true` → `false`
- `error` ← message si échec

## PouchDB Operations

**Action:** Les données de l'impayé et de la mission sont récupérées depuis PouchDB.

**Méthodes utilisées:**
- `db.get('facture:' + impayeId)` - Récupérer les détails de l'impayé
- `db.get('mission:' + missionId)` - Récupérer les détails de la mission (optionnel)

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
    └── portail-mission/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── download-facture.js
```

### Fichier principal
- **HTML** : `frontend/app/portail-mission/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/portail-mission/js/download-facture.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/portail-mission/js/download-facture.js
export function downloadFacture() {
  // Implementation avec données PouchDB
}
```

## Implementation

```javascript
async downloadFacture() {
  // 1. Set loading state
  this.loading = true;
  this.error = null;
  
  try {
    // 2. Optionnel: Récupérer/récupérer les données depuis PouchDB
    // const impayeDoc = await db.get('facture:' + this.impaye.id);
    // const impayeData = impayeDoc;
    
    // 3. Call Cloud Function to generate signed link
    // Note: Cet appel API est conservé car les PDFs ne sont pas stockés dans PouchDB
    const response = await fetch('/functions/generatePdfLink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ impayelId: this.impaye.id })
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

## Notes

- **Données JSON** : Les métadonnées de l'impayé/mission sont stockées dans PouchDB
- **Fichiers PDF** : Les PDFs binaires restent sur le backend et sont générés à la demande via Cloud Function
- Le lien PDF est signé avec HMAC-SHA256 et expire après 24h
- Le secret utilisé est `PDF_SIGNING_SECRET` (côté backend)
- Si le lien est expiré, le serveur retourne une erreur 403

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Données impayé/mission | API backend | PouchDB local |
| Téléchargement PDF | Cloud Function | **Conservé** - Cloud Function |
| Affichage métadonnées | API `/api/impayes/{id}` | Données PouchDB déjà chargées |
| Latence affichage | ~200-500ms | ~10-50ms |
| Offline | ❌ Impossible | ✅ Métadonnées consultables offline, PDF nécessite connexion |
