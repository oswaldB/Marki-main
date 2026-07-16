# Audit API - Page Impayés

**Date**: 2024-07-16
**Page**: impayes

## Workflows et Appels API

| Workflow | Endpoint | Méthode | Statut |
|----------|----------|---------|--------|
| initial-load | `/api/impayes` | GET | ✅ Route existante (impayes.md) |
| sync-data | `/api/impayes` | GET | ✅ Route existante (impayes.md) |
| suspend-facture | `/api/impayes/{id}` | PUT | ✅ Route existante (impayes.md) |
| unsuspend-facture | `/api/impayes/{id}` | PUT | ✅ Route existante (impayes.md) |

## Routes Utilisées

- `GET /api/impayes` - Liste des impayés avec filtres (routes/impayes.md)
- `PUT /api/impayes/{id}` - Mise à jour statut (routes/impayes.md)

## Couverture

✅ **100%** - Tous les appels API ont des routes backend définies.

## Notes

- Les workflows de tri (`sort-by-*`) sont des opérations frontend uniquement (state local)
- La pagination est gérée côté frontend via les getters calculés
- Les workflows `suspend-facture` et `unsuspend-facture` utilisent le même endpoint `PUT /api/impayes/{id}` avec différents payloads
