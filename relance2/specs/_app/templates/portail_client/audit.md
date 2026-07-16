# Audit API - Page Portail Client

**Date**: 2024-07-16
**Page**: portail_client

## Workflows et Appels API

| Workflow | Endpoint | Méthode | Statut |
|----------|----------|---------|--------|
| initial-load | `/api/portail/client` | GET | ✅ Route existante (portail.md) |
| download-facture | `/api/portail/factures/{id}/pdf` | GET | ✅ Route existante (portail.md) |
| regler-facture | `/api/portail/factures/{id}/payer` | POST | ✅ Route existante (portail.md) |
| switch-tab-* | Frontend uniquement | - | ✅ State local |
| logout | Frontend uniquement | - | ✅ State local (clear token) |

## Routes Utilisées

- `GET /api/portail/client` - Données du portail client (routes/portail.md)
- `GET /api/portail/factures/{id}/pdf` - Téléchargement PDF (routes/portail.md)
- `POST /api/portail/factures/{id}/payer` - Paiement (routes/portail.md)

## Authentification

**Token passé en URL**: `?token={jwt_token}`
- Le token est stocké dans localStorage (`client_token`)
- Envoyé dans le header `Authorization: Bearer {token}`

## Couverture

✅ **100%** - Tous les appels API ont des routes backend définies.

## Notes

- Le portail utilise une authentification par token (pas de session classique)
- Le logout est une opération frontend uniquement (suppression du token)
