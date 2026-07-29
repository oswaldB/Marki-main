# Scénario: Chargement initial

**Cell**: login
**Workflow**: initial-load
**Description**: Vérifie que la cell charge correctement les données au démarrage
**Priorité**: Critique

## Préconditions (Mock Data)
- localStorage:
  - `auth_token`: "mock-token-12345"
  - `user_id`: "user_001"
- PouchDB (collection "users"):
  - `{"_id": "user_001", "name": "John Doe", "email": "john@example.com"}`

## Actions
1. Charger la page `/{cell_name}`
2. Attendre 3 secondes
3. Vérifier que le workflow s'est exécuté automatiquement

## Vérifications Attendues
- Console contient: "initial-load started"
- Console contient: "user loaded: John Doe"
- Console contient: "initial-load completed"
- Pas d'erreur contenant "is not defined"
- Alpine.data contient: `user.name === "John Doe"`

## Historique des corrections
<!-- Les corrections automatiques seront ajoutées ici -->
