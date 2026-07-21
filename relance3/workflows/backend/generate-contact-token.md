# Workflow Backend : Générer Token Contact

## Objectifs
- Générer un lien magique temporaire pour le portail client
- Durée de validité courte (3 minutes)

## Base de données
- **SQLite** : `backend/data/marki.db`

## Process

```javascript
const jwt = require('jsonwebtoken');

async function generateContactToken(contactId) {
  const contact = db.read('contacts', contactId);
  if (!contact) throw new Error('Contact non trouvé');
  
  // Token valide 3 minutes
  const token = jwt.sign(
    { contactId, type: 'magic_link' },
    process.env.JWT_SECRET,
    { expiresIn: '3m' }
  );
  
  const url = `${process.env.FRONTEND_URL}/portail?token=${token}`;
  
  return {
    token,
    url,
    expiresAt: new Date(Date.now() + 3 * 60 * 1000).toISOString()
  };
}
```

## Route API

```bash
POST /api/tokens/contact
```

## Output

```json
{
  "token": "eyJhbGci...",
  "url": "https://marki.fr/portail?token=eyJhbGci...",
  "expiresAt": "2026-07-14T15:33:00Z"
}
```
