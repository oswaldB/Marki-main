# Page Specs - test-bun

> **DOCUMENT DE RÉFÉRENCE PRIORITAIRE**
> 
> Ce fichier définit les règles immuables du projet. 
> **LIT EN PRIORITÉ ABSOLUE avant toute modification de code.**

## Partie 1 : Use Cases (Gherkin)

```gherkin
Feature: test-bun Page
  En tant qu'utilisateur
  Je veux pouvoir interagir avec la page test-bun
  Afin de réaliser mes tâches

  Scenario: Chargement initial de la page
    Given je suis sur la page test-bun
    When la page se charge
    Then les données initiales sont chargées via le workflow "initial-load"
    And l'interface est prête à l'emploi

  Scenario: Interaction utilisateur
    Given je suis sur la page test-bun
    When je clique sur un bouton d'action
    Then le workflow correspondant est déclenché
    And le workflow appelle l'API Bun.js pour mettre à jour SQLite
```

## Partie 2 : Choix Techniques et Règles du Projet

### Stack Technique
- **Frontend** : Alpine.js 3 + HTML statique
- **Backend** : Bun.js avec API HTTP/WebSocket
- **Database** : SQLite via `bun:sqlite` (côté serveur)
- **Communication** : Workflows frontend appelant l'API HTTP Bun.js
- **Style** : TailwindCSS via CDN

### Règles Absolues (Pas d'Exception)

1. **Passage de paramètres URL** : Utiliser uniquement le hash (`#`)
   - Exemple : `http://dev.markidiags.com/test-bun#userId=123`
   - Jamais de query params (`?userId=123`)

2. **Appel des Workflows** : Chaque bouton appelle UN workflow
   - Via `runWorkflow('nom-du-workflow')` dans Alpine.js
   - Les workflows sont dans `./workflows/*.js`
   - Les workflows appellent l'API Bun.js via `fetch()` pour lire/écrire dans SQLite

3. **Structure Alpine.js** :
   - Fonction principale dans `main.js` : `test-bunPage()`
   - Dans `index.html` : `x-data="test-bunPage()"`
   - Pas de store global, tout est dans la fonction de la page

4. **Data et Persistence** :
   - Toutes les données sont dans SQLite (côté serveur)
   - Les workflows appellent l'API Bun.js pour accéder aux données
   - Pas d'accès direct à SQLite depuis le frontend
   - Les workflows mettent à jour le state Alpine après réponse API

5. **Séparation des Concerns** :
   - `index.html` : structure + Alpine bindings
   - `main.js` : logique Alpine + appel des workflows
   - `workflows/*.js` : logique métier + appels API vers Bun.js/SQLite
   - `api/` côté Bun.js : endpoints REST + requêtes SQL

6. **IDs des Boutons** : Chaque bouton DOIT avoir un ID unique au format `btn-{action}`
   - Exemple : `id="btn-submit"`, `id="btn-cancel"`
   - Jamais d'ID vide ou dupliqué
   - Format obligatoire : commence toujours par `btn-`

7. **Pixel Perfect** : L'implémentation HTML/CSS doit correspondre EXACTEMENT aux mockups
   - Les assets (images,...) sont dans le folder `app/site/assets/`

## Partie 3 : Implémentation

### Workflows Frontend
1. **initial-load** : Appelle l'API pour charger les données
2. **create** : Appelle POST /api/... pour créer
3. **update** : Appelle PUT /api/... pour modifier  
4. **delete** : Appelle DELETE /api/... pour supprimer

### Navigation
- Paramètres via hash : `location.hash`
- Lecture : `new URLSearchParams(location.hash.slice(1))`

## Partie 4 : Data Mapping

### Tables utilisées depuis marki.db
- `_User`
- `_Session`
- `SmtpProfile`
- `Sequence`
- `SequenceMessage`
- `SequenceGroupeRegles`
- `Contact`
- `Contact_Employes`
- `LienPaiement`
- `Impaye`
- `Relance`
- `Suivi`
- `OptionsDynamiques`
- `Event`

### Flux de données
```
SQLite (marki.db)
    ↑ ↓
Bun.js API (localhost:3001)
    ↑ ↓
Caddy (dev.markidiags.com/api/*)
    ↑ ↓
fetch('/api/...') dans workflows
    ↑ ↓
Alpine.js State (réactif)
    ↑ ↓
Composant UI (HTML/Tailwind)
```

### Contexte analysé
Fichiers trouvés: mockup.html
