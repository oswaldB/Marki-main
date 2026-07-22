# Workflow Backend : Lister Contacts Blacklist

## Objectif
Récupérer la liste paginée des contacts blacklistés avec filtres et calculs associés.

## Input
- `filters` : motif, dateFrom, dateTo, montantMin, montantMax
- `pagination` : page, limit

## Process

### Étape 1 : Query LokiJS
Récupérer les contacts avec `is_blacklisted = true`.

### Étape 2 : Calculer stats
Pour chaque contact : montant total des impayés, nombre d'impayés.

### Étape 3 : Appliquer filtres
Filtrer selon les critères fournis.

### Étape 4 : Pagination
Limiter les résultats selon page/limit.

### Étape 5 : Log
Enregistrer la consultation.

## Output
```json
{
  "contacts": [...],
  "pagination": { "page", "limit", "total", "pages" }
}
```

## Route API
```bash
GET /api/contacts/blacklist
```

## Dépendances
- F-008 (Blacklist)
