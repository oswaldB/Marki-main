# Scénarios de Test - Cell: {{cell_name}}

## Scénario 1: Chargement initial avec données
**Workflow**: initial-load
**Description**: Vérifie que la cell charge correctement les données utilisateur au démarrage
**Priorité**: Critique (bloquant)

### Préconditions (Mock Data)
- localStorage:
  - `auth_token`: "mock-token-12345"
  - `user_id`: "user_001"
- PouchDB (collection "users"):
  - `{"_id": "user_001", "name": "John Doe", "email": "john@example.com"}`

### Actions
1. Charger la page `/{{cell_name}}`
2. Attendre 3 secondes
3. Vérifier que le workflow s'est exécuté automatiquement

### Vérifications Attendues
- Console contient: "initial-load started"
- Console contient: "user loaded: John Doe"
- Console contient: "initial-load completed"
- Pas d'erreur contenant "is not defined"
- Alpine.data contient: `user.name === "John Doe"`

---

## Scénario 2: Action utilisateur via bouton
**Workflow**: save-data
**Description**: Vérifie qu'un clic sur le bouton déclenche le workflow correctement
**Priorité**: Haute
**Dépendance**: Scénario 1 (requiert user chargé)

### Préconditions
- État Alpine: `user` est défini avec `user_id: "user_001"`
- localStorage: `auth_token` présent

### Actions
1. Remplir champ `#input-title` avec "Nouveau Titre"
2. Cliquer sur `#btn-save`
3. Attendre 2 secondes

### Vérifications Attendues
- Console contient: "save-data started with input:"
- Console contient: `"title": "Nouveau Titre"`
- Console contient: "save-data completed"
- Alpine.data.lastSaved contient `"title": "Nouveau Titre"`
- Pas d'erreur dans la console

---

## Scénario 3: Gestion d'erreur
**Workflow**: fetch-external
**Description**: Vérifie la gestion des erreurs réseau
**Priorité**: Moyenne
**Mock**: Simuler erreur réseau

### Préconditions
- Intercepter les requêtes vers `/api/external` → retourner 500

### Actions
1. Cliquer sur `#btn-fetch`
2. Attendre 3 secondes

### Vérifications Attendues
- Console contient: "fetch-external started"
- Console contient: "Network error" OU "API error"
- Alpine.data.error est défini et non vide
- Le DOM affiche un message d'erreur (classe `.error-message` présente)

---

## Guide d'écriture des scénarios

### Format des préconditions
- **localStorage**: paires clé-valeur injectées avant le chargement
- **PouchDB**: documents insérés dans la base locale avant le test
- **État Alpine**: propriétés attendues dans le data Alpine
- **Mocks réseau**: interception de fetch/XHR pour simuler des réponses

### Format des actions
- `Charger la page [url]` - Navigation
- `Attendre [N] secondes` - Pause
- `Remplir champ [selector] avec "[valeur]"` - Input
- `Cliquer sur [selector]` - Interaction
- `Vérifier que [condition]` - Assertion implicite

### Format des vérifications
- `Console contient: "[texte]"` - Vérification log
- `Pas d'erreur contenant "[texte]"` - Vérification absence d'erreur
- `Alpine.data contient: [expression]` - Vérification état
- `Le DOM contient [selector] avec texte "[texte]"` - Vérification DOM
- `Le DOM affiche [description] (classe .[class])` - Vérification visuelle

### Gestion des échecs
Si un scénario échoue:
- **Erreur critique** ("is not defined", crash): corriger le code source directement
- **Erreur fonctionnelle** (comportement inattendu): ajuster le scénario ou le code
- **Erreur structurelle** (sélecteurs manquants, workflows absents): mettre à jour le scénario et régénérer
