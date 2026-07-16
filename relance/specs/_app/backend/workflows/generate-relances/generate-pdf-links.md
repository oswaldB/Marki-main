# Workflow Backend : Générer Liens PDF Sécurisés

## Objectifs
- Générer des liens temporaires vers les PDF factures
- Durée de validité 24h

## Base de données
- **SQLite** : `backend/data/marki.db`

## Process

```javascript
const jwt = require('jsonwebtoken');

async function generatePdfLink(impayeId) {
  const impaye = db.read('impayes', impayeId);
  if (!impaye) throw new Error('Impayé non trouvé');
  
  // Token valide 24h
  const token = jwt.sign(
    { impayeId, type: 'pdf_access' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  // Sauvegarder token
  db.update('impayes', impayeId, { url_pdf_token: token });
  
  const url = `${process.env.API_URL}/api/pdf/${impayeId}?token=${token}`;
  
  return { url, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };
}

async function generatePdfLinksBatch(impayeIds) {
  const links = [];
  for (const id of impayeIds) {
    links.push(await generatePdfLink(id));
  }
  return links;
}
```

## Routes API

```bash
POST /api/tokens/pdf       # Générer un lien
POST /api/tokens/pdf/batch # Générer plusieurs liens
```
