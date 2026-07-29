# Scénario: Sync Loading

**Cell**: login
**Workflow**: sync-loading
**Description**: Vérifie le workflow sync-loading
**Priorité**: Moyenne

## Préconditions (Mock Data)
- localStorage:
  - `auth_token`: "mock-token-12345

## Actions
1. Déclencher le workflow sync-loading
2. Attendre 2 secondes

## Vérifications Attendues
- Console contient: "sync-loading started"
- Console contient: "sync-loading completed" 

## Historique des corrections
<!-- Les corrections automatiques seront ajoutées ici -->
