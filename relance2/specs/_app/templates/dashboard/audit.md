# Audit API - Page Dashboard

**Date**: 2024-07-16
**Page**: dashboard

## Workflows et Appels API

| Workflow | Endpoint | Méthode | Statut |
|----------|----------|---------|--------|
| initial-load | `/api/impayes` | GET | ✅ Route existante (impayes.md) |
| initial-load | `/api/relances` | GET | ✅ Route existante (relances.md) |
| initial-load | `/api/contacts` | GET | ✅ Route existante (contacts.md) |
| initial-load | `/api/events` | GET | ✅ Route existante (events.md) |
| sync-data | `/api/impayes` | GET | ✅ Route existante (impayes.md) |

## Routes Utilisées

- `GET /api/impayes` - Liste des impayés (routes/impayes.md)
- `GET /api/relances` - Liste des relances (routes/relances.md)
- `GET /api/contacts` - Liste des contacts (routes/contacts.md)
- `GET /api/events` - Liste des événements (routes/events.md)

## Couverture

✅ **100%** - Tous les appels API ont des routes backend définies.

## Notes

- Le dashboard agrège les données de plusieurs APIs pour calculer les KPIs côté frontend
- Les workflows `switch-view-*` sont des opérations frontend uniquement
- `clear-events` est une opération frontend uniquement (nettoyage du state)
