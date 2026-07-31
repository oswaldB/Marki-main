# Workflow Backend : Retirer Contact Blacklist

## Objectif
Retirer un contact spécifique de la blacklist et régénérer ses relances.

## Input
- `contact_id` : string
- `raison` : string (optionnel)

## Process

### Étape 1 : Vérifier contact
Confirmer existence et statut blacklist.

### Étape 2 : Unblacklist
Mettre à jour : `is_blacklisted = false`, `unblacklist_date = now()`.

### Étape 3 : Vérifier impayés
Récupérer les impayés non soldés du contact.

### Étape 4 : Régénérer relances
Si impayés actifs, appeler `regenerate-relances-contact`.

### Étape 5 : Log
Créer log `[CHECKPOINT] contact-unblacklisted`.

## Output
```json
{
  "success": true,
  "contact": {...},
  "relances_regenerated": number,
  "impayes_actifs": number
}
```

## Route API
```bash
POST /api/contacts/:id/unblacklist
```

## Dépendances
- F-008 (Blacklist)
- F-010 (Génération relances)
