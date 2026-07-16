# Audit API - Page Contacts

**Date**: 2024-07-16
**Page**: contacts

## Workflows et Appels API

| Workflow | Endpoint | Méthode | Statut |
|----------|----------|---------|--------|
| initial-load | `/api/contacts` | GET | ✅ Route existante (contacts.md) |
| toggle-blacklist | `/api/contacts/{id}/blacklist` | POST | ✅ Route existante (contacts.md) |
| pagination-next | Frontend uniquement | - | ✅ State local |
| pagination-prev | Frontend uniquement | - | ✅ State local |
| sort-by-* | Frontend uniquement | - | ✅ State local |
| view-contact | Frontend uniquement | - | ✅ State local |

## Routes Utilisées

- `GET /api/contacts` - Liste des contacts (routes/contacts.md)
- `POST /api/contacts/{id}/blacklist` - Toggle blacklist (routes/contacts.md)

## Couverture

✅ **100%** - Tous les appels API ont des routes backend définies.

## Notes

- La plupart des workflows sont des opérations frontend (tri, pagination, filtres)
- Seul `toggle-blacklist` fait un appel API pour modifier le statut
