# Scénario: Soumission Auth Submit

**Cell**: login
**Workflow**: auth-submit
**Description**: Vérifie que le workflow auth-submit s'exécute correctement
**Priorité**: Haute

## Préconditions (Mock Data)
- localStorage:
  - `auth_token`: "mock-token-12345"
- État Alpine: données du formulaire initialisées

## Actions
1. Remplir les champs du formulaire
2. Cliquer sur `#btn-auth-submit`
3. Attendre 2 secondes

## Vérifications Attendues
- Console contient: "auth-submit started"
- Console contient: "auth-submit completed"
- Pas d'erreur dans la console

## Historique des corrections
<!-- Les corrections automatiques seront ajoutées ici -->
