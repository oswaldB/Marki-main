# Workflow Backend : Portail - Récupérer Mission

## Objectifs
- Récupérer les détails de la mission (impayés) du contact connecté
- Calculer le total dû
- Retourner les informations de la séquence active

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Tables** : `contacts`, `impayes`, `relances`, `sequences`, `relance_impayes`

## Process

```javascript
/**
 * Récupérer la mission (impayés) d'un contact
 * @param {string} contactId - ID du contact connecté
 * @returns {Object} Données mission complètes
 */
async function getPortailMission(contactId) {
  // Récupérer le contact
  const contact = db.read('contacts', contactId);
  if (!contact) {
    throw new Error('CONTACT_NOT_FOUND');
  }
  
  // Récupérer les impayés non soldés du contact
  const impayes = db.query(`
    SELECT 
      i.*,
      s.nom as sequence_nom,
      s.lien_paiement as sequence_lien_paiement
    FROM impayes i
    LEFT JOIN sequences s ON i.sequence_id = s.id
    WHERE i.contact_relance_id = ? 
      AND i.facture_soldee = 0
      AND i.is_blacklisted = 0
    ORDER BY i.date_echeance ASC
  `, [contactId]);
  
  // Calculer le total dû
  const totalDu = impayes.reduce((sum, i) => sum + (i.reste_a_payer || 0), 0);
  
  // Récupérer les relances actives pour ces impayés
  const relances = db.query(`
    SELECT 
      r.*,
      GROUP_CONCAT(ri.impaye_id) as impaye_ids
    FROM relances r
    JOIN relance_impayes ri ON r.id = ri.relance_id
    WHERE r.contact_id = ?
      AND r.statut IN ('programmee', 'validee', 'brouillon')
      AND r.date_programmation >= date('now')
    GROUP BY r.id
    ORDER BY r.date_programmation ASC
  `, [contactId]);
  
  // Formater les impayés pour l'affichage
  const impayesFormattes = impayes.map(i => ({
    id: i.id,
    numeroFacture: i.nfacture,
    dateFacture: i.date_facture,
    dateEcheance: i.date_echeance,
    montantTTC: i.montant_ttc,
    resteAPayer: i.reste_a_payer,
    adresseBien: i.adresse_bien,
    codePostal: i.code_postal,
    ville: i.ville,
    numeroDossier: i.numero_dossier,
    sequence: i.sequence_nom ? {
      nom: i.sequence_nom,
      lienPaiement: i.sequence_lien_paiement
    } : null
  }));
  
  // Récupérer la séquence active
  const sequenceActive = impayes.find(i => i.sequence_id)?.sequence_nom || null;
  
  return {
    contact: {
      id: contact.id,
      nom: contact.nom,
      prenom: contact.prenom,
      email: contact.email,
      civilite: contact.civilite,
      telephone: contact.telephone
    },
    mission: {
      totalDu: totalDu,
      nombreFactures: impayes.length,
      sequenceActive: sequenceActive,
      impayes: impayesFormattes
    },
    relancesEnCours: relances.map(r => ({
      id: r.id,
      statut: r.statut,
      dateProgrammation: r.date_programmation,
      sujet: r.sujet
    }))
  };
}
```

## Route API

```bash
GET /api/portail/mission

# cURL
curl -X GET \
  -H "Authorization: Bearer $PORTAIL_TOKEN" \
  "http://localhost:5000/api/portail/mission"
```

## Output

```json
{
  "success": true,
  "contact": {
    "id": "contact_xxx",
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@example.com",
    "civilite": "M.",
    "telephone": "+33612345678"
  },
  "mission": {
    "totalDu": 15420.50,
    "nombreFactures": 3,
    "sequenceActive": "Relance Standard",
    "impayes": [
      {
        "id": "impaye_001",
        "numeroFacture": "FACT-2026-001",
        "dateFacture": "2026-06-01",
        "dateEcheance": "2026-07-01",
        "montantTTC": 5420.00,
        "resteAPayer": 5420.00,
        "adresseBien": "12 Rue de la Paix",
        "codePostal": "75002",
        "ville": "Paris",
        "numeroDossier": "DOSS-001",
        "sequence": {
          "nom": "Relance Standard",
          "lienPaiement": "https://paiement.marki.fr"
        }
      }
    ]
  },
  "relancesEnCours": [
    {
      "id": "rel_xxx",
      "statut": "programmee",
      "dateProgrammation": "2026-07-22T10:00:00Z",
      "sujet": "Relance facture FACT-2026-001"
    }
  ]
}
```

## Codes Erreur

| Code | Description |
|------|-------------|
| `CONTACT_NOT_FOUND` | Contact non trouvé |
| `UNAUTHORIZED` | Token portail invalide |

## Notes

- N'inclut que les impayés non soldés (`facture_soldee = 0`)
- N'inclut pas les impayés blacklistés
- Les impayés sont triés par date d'échéance croissante
