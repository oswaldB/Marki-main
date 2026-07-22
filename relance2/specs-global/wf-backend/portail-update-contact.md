# Workflow Backend : Portail - Mettre à jour Contact

## Objectifs
- Permettre au client de mettre à jour ses coordonnées
- Valider les modifications avant sauvegarde
- Logger les changements pour audit

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Tables** : `contacts`, `portail_contact_updates`

## Data Models SQLite

### Table `portail_contact_updates`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (pupd_xxx) |
| `contact_id` | TEXT | ID du contact |
| `champ` | TEXT | Champ modifié |
| `ancienne_valeur` | TEXT | Valeur avant modification |
| `nouvelle_valeur` | TEXT | Valeur après modification |
| `statut` | TEXT | `en_attente`, `approuve`, `rejete` |
| `admin_note` | TEXT | Note de l'admin |
| `created_at` | TEXT | Date de création |
| `updated_at` | TEXT | Date de mise à jour |

## Process

```javascript
const { v4: uuidv4 } = require('uuid');

/**
 * Champs modifiables via le portail
 */
const EDITABLE_FIELDS = [
  'email',
  'telephone',
  'adresse_rue',
  'adresse_ville',
  'adresse_code_postal',
  'adresse_pays'
];

/**
 * Mettre à jour les coordonnées d'un contact
 * @param {string} contactId - ID du contact
 * @param {Object} updates - Modifications demandées
 * @param {boolean} requireApproval - Nécessite approbation admin
 * @returns {Object} Résultat de la mise à jour
 */
async function updateContactFromPortail(contactId, updates, requireApproval = true) {
  // Récupérer le contact actuel
  const contact = db.read('contacts', contactId);
  if (!contact) {
    throw new Error('CONTACT_NOT_FOUND');
  }
  
  // Filtrer les champs modifiables
  const filteredUpdates = {};
  const changes = [];
  
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) {
      const oldValue = contact[field] || '';
      const newValue = updates[field].trim();
      
      // Validation spécifique par champ
      if (field === 'email' && !isValidEmail(newValue)) {
        throw new Error('INVALID_EMAIL');
      }
      
      if (field === 'telephone' && !isValidPhone(newValue)) {
        throw new Error('INVALID_PHONE');
      }
      
      // Ne mettre à jour que si la valeur change
      if (oldValue !== newValue) {
        filteredUpdates[field] = newValue;
        changes.push({
          field,
          oldValue,
          newValue
        });
      }
    }
  }
  
  if (changes.length === 0) {
    return { success: true, updated: false, message: 'Aucune modification' };
  }
  
  if (requireApproval) {
    // Créer des demandes de modification en attente
    const updateRequests = [];
    
    for (const change of changes) {
      const updateId = `pupd_${uuidv4().slice(0, 8)}`;
      const now = new Date().toISOString();
      
      db.create('portail_contact_updates', {
        id: updateId,
        contact_id: contactId,
        champ: change.field,
        ancienne_valeur: change.oldValue,
        nouvelle_valeur: change.newValue,
        statut: 'en_attente',
        admin_note: null,
        created_at: now,
        updated_at: now
      });
      
      updateRequests.push({
        id: updateId,
        field: change.field,
        status: 'en_attente'
      });
    }
    
    // Notifier les admins
    notifyAdminsPendingUpdate(contact, changes);
    
    return {
      success: true,
      updated: false,
      pendingApproval: true,
      requests: updateRequests,
      message: 'Modifications soumises pour approbation'
    };
  } else {
    // Appliquer directement les modifications
    const now = new Date().toISOString();
    
    db.update('contacts', contactId, {
      ...filteredUpdates,
      updated_at: now
    });
    
    // Logger les changements
    for (const change of changes) {
      db.create('events', {
        id: `evt_${uuidv4().slice(0, 8)}`,
        type: 'contact_update',
        titre: `Modification ${change.field}`,
        description: `Ancien: ${change.oldValue} → Nouveau: ${change.newValue}`,
        entity_type: 'contact',
        entity_id: contactId,
        by_marki: 0,
        created_at: now
      });
    }
    
    return {
      success: true,
      updated: true,
      changes: changes.map(c => c.field),
      contact: await getContactPublicInfo(contactId)
    };
  }
}

/**
 * Approuver une demande de modification (admin)
 */
async function approveContactUpdate(updateId, adminId, note = null) {
  const update = db.read('portail_contact_updates', updateId);
  if (!update) {
    throw new Error('UPDATE_NOT_FOUND');
  }
  
  if (update.statut !== 'en_attente') {
    throw new Error('UPDATE_ALREADY_PROCESSED');
  }
  
  const now = new Date().toISOString();
  
  // Appliquer la modification
  db.update('contacts', update.contact_id, {
    [update.champ]: update.nouvelle_valeur,
    updated_at: now
  });
  
  // Mettre à jour le statut
  db.update('portail_contact_updates', updateId, {
    statut: 'approuve',
    admin_note: note,
    updated_at: now
  });
  
  // Logger
  db.create('events', {
    id: `evt_${uuidv4().slice(0, 8)}`,
    type: 'contact_update_approved',
    titre: `Modification ${update.champ} approuvée`,
    description: `Nouvelle valeur: ${update.nouvelle_valeur}`,
    entity_type: 'contact',
    entity_id: update.contact_id,
    by_marki: 1,
    created_at: now
  });
  
  return { success: true, approvedAt: now };
}

/**
 * Rejeter une demande de modification (admin)
 */
async function rejectContactUpdate(updateId, adminId, reason) {
  const update = db.read('portail_contact_updates', updateId);
  if (!update) {
    throw new Error('UPDATE_NOT_FOUND');
  }
  
  const now = new Date().toISOString();
  
  db.update('portail_contact_updates', updateId, {
    statut: 'rejete',
    admin_note: reason,
    updated_at: now
  });
  
  // Notifier le client
  db.create('events', {
    id: `evt_${uuidv4().slice(0, 8)}`,
    type: 'contact_update_rejected',
    titre: `Modification ${update.champ} rejetée`,
    description: reason,
    entity_type: 'contact',
    entity_id: update.contact_id,
    by_marki: 1,
    created_at: now
  });
  
  return { success: true, rejectedAt: now };
}

/**
 * Récupérer les infos publiques d'un contact
 */
async function getContactPublicInfo(contactId) {
  const contact = db.read('contacts', contactId);
  return {
    id: contact.id,
    nom: contact.nom,
    prenom: contact.prenom,
    email: contact.email,
    telephone: contact.telephone,
    adresse: {
      rue: contact.adresse_rue,
      ville: contact.adresse_ville,
      codePostal: contact.adresse_code_postal,
      pays: contact.adresse_pays
    }
  };
}

/**
 * Validation email
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validation téléphone (basique)
 */
function isValidPhone(phone) {
  const re = /^[\+\d\s\-\(\)]{8,20}$/;
  return re.test(phone);
}
```

## Routes API

```bash
# Récupérer ses infos
GET /api/portail/contact

# Mettre à jour ses infos
PUT /api/portail/contact

# Voir les demandes de modif en attente
GET /api/portail/contact/updates

# Approuver une modif (admin)
POST /api/admin/portail/contact-updates/:updateId/approve

# Rejeter une modif (admin)
POST /api/admin/portail/contact-updates/:updateId/reject
```

## cURL Examples

```bash
# Voir ses infos
curl -X GET \
  -H "Authorization: Bearer $PORTAIL_TOKEN" \
  "http://localhost:5000/api/portail/contact"

# Mettre à jour
curl -X PUT \
  -H "Authorization: Bearer $PORTAIL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "telephone": "+33612345679",
    "adresse_ville": "Lyon"
  }' \
  "http://localhost:5000/api/portail/contact"
```

## Input (Update)

```json
{
  "email": "nouveau.email@example.com",
  "telephone": "+33612345679",
  "adresse_rue": "25 Avenue des Champs",
  "adresse_ville": "Lyon",
  "adresse_code_postal": "69001",
  "adresse_pays": "France"
}
```

## Output (Update - Pending)

```json
{
  "success": true,
  "updated": false,
  "pendingApproval": true,
  "requests": [
    {
      "id": "pupd_abc123",
      "field": "email",
      "status": "en_attente"
    },
    {
      "id": "pupd_def456",
      "field": "telephone",
      "status": "en_attente"
    }
  ],
  "message": "Modifications soumises pour approbation"
}
```

## Output (Update - Direct)

```json
{
  "success": true,
  "updated": true,
  "changes": ["telephone", "adresse_ville"],
  "contact": {
    "id": "contact_xxx",
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@example.com",
    "telephone": "+33612345679",
    "adresse": {
      "rue": "12 Rue de la Paix",
      "ville": "Lyon",
      "codePostal": "75002",
      "pays": "France"
    }
  }
}
```

## Champs Modifiables

| Champ | Validation | Approbation Requise |
|-------|------------|---------------------|
| `email` | Format email | Oui |
| `telephone` | 8-20 caractères | Non |
| `adresse_rue` | - | Non |
| `adresse_ville` | - | Non |
| `adresse_code_postal` | - | Non |
| `adresse_pays` | - | Non |

## Codes Erreur

| Code | Description |
|------|-------------|
| `CONTACT_NOT_FOUND` | Contact non trouvé |
| `INVALID_EMAIL` | Format email invalide |
| `INVALID_PHONE` | Format téléphone invalide |
| `UPDATE_NOT_FOUND` | Demande de modif non trouvée |
| `UPDATE_ALREADY_PROCESSED` | Déjà traitée |

## Notes

- Les modifications d'email nécessitent une approbation admin
- Les autres champs peuvent être modifiés directement
- Historique complet des modifications conservé
