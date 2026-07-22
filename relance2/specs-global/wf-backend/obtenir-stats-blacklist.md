# Workflow Backend : Obtenir Stats Blacklist

## Objectif
Calculer les statistiques globales des contacts blacklistés.

## Input
- `periode` : from, to (optionnel)

## Process

### Étape 1 : Récupérer tous les blacklistés
Query LokiJS sur collection payers.

### Étape 2 : Calculer totaux
- Nombre total de contacts
- Montant total suspendu

### Étape 3 : Répartition par motif
Compter par type : litige, arrangement, contestation, etc.

### Étape 4 : Durée moyenne
Calculer les jours moyens de blacklist.

### Étape 5 : Log
Enregistrer les statistiques.

## Output
```json
{
  "stats": {
    "total_contacts": number,
    "montant_total_suspendu": number,
    "duree_moyenne_jours": number,
    "repartition_motifs": {...}
  }
}
```

## Route API
```bash
GET /api/contacts/blacklist/stats
```

## Dépendances
- F-008 (Blacklist)
