# Workflow Backend : Retirer Tous Contacts Blacklist

## Objectif
Vider la blacklist en retirant tous les contacts d'un coup (bulk action).

## Input
- `confirmation_token` : string (sécurité)
- `raison_globale` : string (optionnel)
- `regenerate_relances` : boolean

## Process

### Étape 1 : Vérifier confirmation
Valider le token de sécurité.

### Étape 2 : Récupérer tous les blacklistés
Query complète de la collection payers.

### Étape 3 : Traitement par lot
Pour chaque contact :
- Unblacklist
- Log individuel
- Compteur success/error

### Étape 4 : Régénération batch
Si demandé, régénérer les relances pour contacts avec impayés.

### Étape 5 : Rapport
Créer fichier rapport détaillé.

### Étape 6 : Log global
Enregistrer l'opération bulk.

## Output
```json
{
  "success": true,
  "summary": {
    "total_contacts": number,
    "processed": number,
    "failed": number,
    "relances_regenerated": number
  },
  "details": [...],
  "report_file": "string"
}
```

## Route API
```bash
POST /api/contacts/blacklist/clear/request  # Demande token
POST /api/contacts/blacklist/clear          # Exécution
```

## Dépendances
- F-008 (Blacklist)
- F-010 (Génération relances)

## Sécurité
- Token de confirmation requis
- Limite 100 contacts par opération
- Log audit complet
