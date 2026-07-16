# Workflow Backend : Portail Client

## Objectifs
- Authentification via token magique
- Affichage des impayés du client
- Génération de liens de paiement

## Base de données
- **SQLite** : `backend/data/marki.db`

## Process

### Login Token
```javascript
const jwt = require('jsonwebtoken');

async function portailLogin(contactId) {
  const contact = db.read('contacts', contactId);
  if (!contact) throw new Error('Contact non trouvé');
  
  // Token valide 24h
  const token = jwt.sign(
    { contactId, type: 'portail' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  return { token, expiresIn: '24h' };
}
```

### Données Portail
```javascript
async function getPortailData(contactId) {
  const contact = db.read('contacts', contactId);
  const impayes = db.query(`
    SELECT * FROM impayes 
    WHERE contact_relance_id = ? 
    AND facture_soldee = 0
  `, [contactId]);
  
  const totalDu = impayes.reduce((sum, i) => sum + i.reste_a_payer, 0);
  
  return {
    contact: { nom: contact.nom, prenom: contact.prenom },
    impayes,
    total_du: totalDu
  };
}
```

## Routes API

```bash
POST /api/portail/login      # Token magique
GET  /api/portail/data       # Données client (avec token portail)
```
