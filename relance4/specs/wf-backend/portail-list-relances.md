# Workflow Backend : Portail - Lister Relances

## Objectifs
- Lister les relances (emails de rappel) envoyées au contact
- Afficher l'historique complet des communications
- Montrer le statut de chaque relance

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Tables** : `relances`, `relance_impayes`, `impayes`

## Process

```javascript
/**
 * Lister les relances d'un contact
 * @param {string} contactId - ID du contact
 * @param {Object} options - Options de pagination/filtrage
 * @returns {Object} Liste des relances avec pagination
 */
async function listPortailRelances(contactId, options = {}) {
  const { limit = 50, offset = 0, statut } = options;
  
  // Construire la requête
  let whereClause = 'WHERE r.contact_id = ?';
  const params = [contactId];
  
  if (statut) {
    whereClause += ' AND r.statut = ?';
    params.push(statut);
  }
  
  // Récupérer les relances
  const relances = db.query(`
    SELECT 
      r.id,
      r.statut,
      r.date_envoi,
      r.date_programmation,
      r.sujet,
      r.corps,
      r.email_envoye_a,
      r.email_sent,
      r.valide,
      r.erreur_count,
      r.last_error,
      r.scenario,
      r.email_index,
      r.created_at,
      s.nom as sequence_nom,
      sp.nom as smtp_profile_nom
    FROM relances r
    LEFT JOIN sequences s ON r.sequence_id = s.id
    LEFT JOIN smtp_profiles sp ON r.smtp_profile_id = sp.id
    ${whereClause}
    ORDER BY r.date_programmation DESC, r.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  
  // Compter le total
  const countResult = db.query(`
    SELECT COUNT(*) as total
    FROM relances r
    ${whereClause}
  `, params);
  
  const total = countResult[0]?.total || 0;
  
  // Pour chaque relance, récupérer les impayés associés
  const relancesAvecImpayes = await Promise.all(
    relances.map(async (r) => {
      const impayes = db.query(`
        SELECT 
          i.id,
          i.nfacture as numero_facture,
          i.reste_a_payer
        FROM impayes i
        JOIN relance_impayes ri ON i.id = ri.impaye_id
        WHERE ri.relance_id = ?
      `, [r.id]);
      
      // Déterminer le statut affichable
      let statutAffichage = r.statut;
      if (r.email_sent) {
        statutAffichage = 'envoyee';
      } else if (r.date_programmation && new Date(r.date_programmation) > new Date()) {
        statutAffichage = 'programmee';
      }
      
      return {
        id: r.id,
        statut: statutAffichage,
        statutOriginal: r.statut,
        dateEnvoi: r.date_envoi,
        dateProgrammation: r.date_programmation,
        sujet: r.sujet,
        scenario: r.scenario,
        emailIndex: r.email_index,
        sequence: r.sequence_nom,
        envoyeeA: r.email_envoye_a,
        estValidee: r.valide === 1,
        erreurs: r.erreur_count > 0 ? {
          count: r.erreur_count,
          derniereErreur: r.last_error
        } : null,
        impayes: impayes.map(i => ({
          id: i.id,
          numeroFacture: i.numero_facture,
          montant: i.reste_a_payer
        })),
        createdAt: r.created_at
      };
    })
  );
  
  // Calculer les statistiques
  const stats = {
    envoyees: relancesAvecImpayes.filter(r => r.statut === 'envoyee').length,
    programmees: relancesAvecImpayes.filter(r => r.statut === 'programmee').length,
    brouillons: relancesAvecImpayes.filter(r => r.statut === 'brouillon').length,
    enErreur: relancesAvecImpayes.filter(r => r.erreurs).length
  };
  
  return {
    relances: relancesAvecImpayes,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    },
    stats
  };
}
```

## Route API

```bash
GET /api/portail/relances

# cURL
curl -X GET \
  -H "Authorization: Bearer $PORTAIL_TOKEN" \
  "http://localhost:5000/api/portail/relances?limit=20&offset=0"
```

## Query Parameters

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `limit` | integer | 50 | Nombre de résultats par page |
| `offset` | integer | 0 | Offset pour pagination |
| `statut` | string | - | Filtrer par statut (`brouillon`, `validee`, `programmee`, `envoyee`, `annulee`) |

## Output

```json
{
  "success": true,
  "relances": [
    {
      "id": "rel_001",
      "statut": "envoyee",
      "statutOriginal": "validee",
      "dateEnvoi": "2026-07-15T10:30:00Z",
      "dateProgrammation": "2026-07-15T10:00:00Z",
      "sujet": "Relance facture impayée - FACT-2026-001",
      "scenario": "relance",
      "emailIndex": 1,
      "sequence": "Relance Standard",
      "envoyeeA": "jean.dupont@example.com",
      "estValidee": true,
      "erreurs": null,
      "impayes": [
        {
          "id": "impaye_001",
          "numeroFacture": "FACT-2026-001",
          "montant": 5420.00
        }
      ],
      "createdAt": "2026-07-10T14:22:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  },
  "stats": {
    "envoyees": 3,
    "programmees": 1,
    "brouillons": 0,
    "enErreur": 0
  }
}
```

## Statuts Affichés

| Statut | Description |
|--------|-------------|
| `envoyee` | Email envoyé avec succès |
| `programmee` | Programmée pour envoi futur |
| `brouillon` | En cours de rédaction |
| `validee` | Validée, en attente d'envoi |
| `annulee` | Relance annulée |

## Codes Erreur

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Token portail invalide |
| `CONTACT_NOT_FOUND` | Contact non trouvé |

## Notes

- Les relances sont triées par date de programmation décroissante
- Le champ `erreurs` est null si aucune erreur
- Les relances d'un contact blacklisté peuvent être filtrées côté client
