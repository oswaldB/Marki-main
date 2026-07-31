# Workflow Backend : Portail - Lister Documents

## Objectifs
- Lister les documents disponibles pour le contact (factures, PDFs)
- Générer des liens sécurisés temporaires pour téléchargement
- Filtrer par type de document

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Tables** : `impayes`, `documents`

## Data Models SQLite

### Table `documents` (optionnel - si table dédiée)

Ou utiliser les champs `url_pdf` et `url_pdf_token` de la table `impayes`.

## Process

```javascript
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'votre-secret';
const PDF_TOKEN_EXPIRES = '24h';

/**
 * Lister les documents d'un contact
 * @param {string} contactId - ID du contact
 * @param {Object} filters - Filtres optionnels
 * @returns {Array} Liste des documents
 */
async function listPortailDocuments(contactId, filters = {}) {
  // Récupérer les impayés avec documents du contact
  let query = `
    SELECT 
      i.id as impaye_id,
      i.nfacture as numero_facture,
      i.date_facture,
      i.montant_ttc,
      i.url_pdf,
      i.url_pdf_token,
      i.adresse_bien,
      i.code_postal,
      i.ville
    FROM impayes i
    WHERE i.contact_relance_id = ?
      AND i.url_pdf IS NOT NULL
      AND i.url_pdf != ''
  `;
  
  const params = [contactId];
  
  // Filtre: factures soldées ou non
  if (filters.solde !== undefined) {
    query += ` AND i.facture_soldee = ?`;
    params.push(filters.solde ? 1 : 0);
  }
  
  query += ` ORDER BY i.date_facture DESC`;
  
  const documents = db.query(query, params);
  
  // Générer des liens sécurisés pour chaque document
  const documentsFormattes = documents.map(doc => {
    // Générer un token de téléchargement
    const downloadToken = generateDownloadToken(doc.impaye_id, contactId);
    
    return {
      id: doc.impaye_id,
      type: 'facture',
      numero: doc.numero_facture,
      date: doc.date_facture,
      montant: doc.montant_ttc,
      bien: {
        adresse: doc.adresse_bien,
        codePostal: doc.code_postal,
        ville: doc.ville
      },
      lienTelechargement: `/api/portail/documents/${doc.impaye_id}/download?token=${downloadToken}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  });
  
  return {
    total: documentsFormattes.length,
    documents: documentsFormattes
  };
}

/**
 * Générer un token de téléchargement sécurisé
 */
function generateDownloadToken(impayeId, contactId) {
  return jwt.sign(
    {
      impayeId,
      contactId,
      type: 'pdf_download'
    },
    JWT_SECRET,
    { expiresIn: PDF_TOKEN_EXPIRES }
  );
}

/**
 * Télécharger un document (vérifie le token puis sert le fichier)
 */
async function downloadDocument(impayeId, token) {
  // Vérifier le token
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error('TOKEN_INVALID');
  }
  
  if (decoded.type !== 'pdf_download') {
    throw new Error('TOKEN_INVALID_TYPE');
  }
  
  if (decoded.impayeId !== impayeId) {
    throw new Error('TOKEN_MISMATCH');
  }
  
  // Récupérer l'impayé
  const impaye = db.read('impayes', impayeId);
  if (!impaye || !impaye.url_pdf) {
    throw new Error('DOCUMENT_NOT_FOUND');
  }
  
  // Vérifier que le contact correspond
  if (impaye.contact_relance_id !== decoded.contactId) {
    throw new Error('UNAUTHORIZED');
  }
  
  // Logger le téléchargement
  logDocumentDownload(decoded.contactId, impayeId);
  
  // Retourner l'URL ou le contenu
  return {
    url: impaye.url_pdf,
    filename: `facture_${impaye.nfacture}.pdf`
  };
}

/**
 * Logger un téléchargement
 */
function logDocumentDownload(contactId, impayeId) {
  db.create('events', {
    id: `evt_${uuidv4().slice(0, 8)}`,
    type: 'document_download',
    titre: 'Téléchargement document',
    description: `Facture ${impayeId} téléchargée`,
    entity_type: 'impaye',
    entity_id: impayeId,
    who_id: contactId,
    by_marki: 0,
    created_at: new Date().toISOString()
  });
}
```

## Routes API

```bash
# Lister les documents
GET /api/portail/documents

# Télécharger un document
GET /api/portail/documents/:impayeId/download?token=xxx
```

## cURL Examples

```bash
# Lister
curl -X GET \
  -H "Authorization: Bearer $PORTAIL_TOKEN" \
  "http://localhost:5000/api/portail/documents"

# Télécharger
curl -X GET \
  "http://localhost:5000/api/portail/documents/impaye_001/download?token=eyJhbGci..." \
  --output facture.pdf
```

## Output (Liste)

```json
{
  "success": true,
  "total": 3,
  "documents": [
    {
      "id": "impaye_001",
      "type": "facture",
      "numero": "FACT-2026-001",
      "date": "2026-06-01",
      "montant": 5420.00,
      "bien": {
        "adresse": "12 Rue de la Paix",
        "codePostal": "75002",
        "ville": "Paris"
      },
      "lienTelechargement": "/api/portail/documents/impaye_001/download?token=eyJhbG...",
      "expiresAt": "2026-07-22T12:00:00Z"
    }
  ]
}
```

## Query Parameters

| Paramètre | Type | Description |
|-----------|------|-------------|
| `solde` | boolean | Filtrer factures soldées (true) ou non (false) |

## Codes Erreur

| Code | Description |
|------|-------------|
| `TOKEN_INVALID` | Token de téléchargement invalide |
| `TOKEN_INVALID_TYPE` | Type de token incorrect |
| `TOKEN_MISMATCH` | Token ne correspond pas au document |
| `DOCUMENT_NOT_FOUND` | Document non trouvé |
| `UNAUTHORIZED` | Accès non autorisé |

## Sécurité

- Les liens de téléchargement expirent après 24h
- Chaque lien est unique et lié à un contact spécifique
- Log de tous les téléchargements
