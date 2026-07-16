# Audit API - Page Login

**Date**: 2024-07-16
**Page**: login

## Workflows et Appels API

| Workflow | Endpoint | Méthode | Statut |
|----------|----------|---------|--------|
| initial-load | `/api/auth/me` | GET | ✅ Route existante (auth.md) |
| auth-submit | `/api/auth/login` | POST | ✅ Route existante (auth.md) |

## Routes Utilisées

- `GET /api/auth/me` - Vérification session (routes/auth.md)
- `POST /api/auth/login` - Authentification (routes/auth.md)

## Couverture

✅ **100%** - Tous les appels API ont des routes backend définies.

## Notes

- Le workflow `initial-load` vérifie le token en localStorage avant d'appeler `/api/auth/me`
- Le workflow `auth-submit` utilise `POST /api/auth/login` et stocke le token JWT reçu
