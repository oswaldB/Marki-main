# Page Specs - {cell_name}

> **DOCUMENT DE RÉFÉRENCE PRIORITAIRE**
> 
> Ce fichier définit les règles immuables du projet. 
> **LIT EN PRIORITÉ ABSOLUE avant toute modification de code.**

## Partie 1 : Use Cases (Gherkin)

```gherkin
Feature: {cell_name} Page
  En tant qu'utilisateur
  Je veux pouvoir interagir avec la page {cell_name}
  Afin de réaliser mes tâches

  Scenario: Chargement initial de la page
    Given je suis sur la page {cell_name}
    When la page se charge
    Then les données initiales sont chargées via le workflow "initial-load"
    And l'interface est prête à l'emploi

  Scenario: Interaction utilisateur
    Given je suis sur la page {cell_name}
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
   - Exemple : `http://dev.markidiags.com/{cell_name}#userId=123`
   - Jamais de query params (`?userId=123`)

2. **Appel des Workflows** : Chaque bouton appelle UN workflow
   - Via `runWorkflow('nom-du-workflow')` dans Alpine.js
   - Les workflows sont dans `./workflows/*.js`
   - Les workflows appellent l'API Bun.js via `fetch()` pour lire/écrire dans SQLite

3. **Structure Alpine.js** :
   - Fonction principale dans `main.js` : `{cell_name}Page()`
   - Dans `index.html` : `x-data="{cell_name}Page()"`
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
   - `server.ts` ou `api/` côté Bun.js : endpoints REST + requêtes SQL

6. **IDs des Boutons** : Chaque bouton DOIT avoir un ID unique au format `btn-{action}`
   - Exemple : `id="btn-submit"`, `id="btn-cancel"`, `id="btn-refresh"`
   - Jamais d'ID vide ou dupliqué
   - Format obligatoire : commence toujours par `btn-`

7. **Pixel Perfect sur les Mockups** : L'implémentation HTML/CSS doit correspondre EXACTEMENT aux mockups
   - Organisation HTML : Respecter la structure du DOM des mockups (ordre des éléments, imbrication)
   - Classes CSS : Utiliser les mêmes classes Tailwind que dans les mockups pour garantir le rendu identique
   - Spacing et Layout : Reproduire pixel par pixel les marges, paddings, grids et flexbox des mockups
   - Responsive : Respecter les breakpoints et comportements responsive définis dans les mockups
   - Composants : Réutiliser les composants visuels (cards, modals, forms) exactement comme présentés
    - les assets (images,...) sont dans le folder `app/site/assets/`
## Partie 3 : Implémentation des Specs Fonctionnelles

### Comment implémenter les specs en respectant les contraintes :

1. **Chargement Initial** :
   - Au `init()` d'Alpine, appeler `runWorkflow('initial-load')`
   - Le workflow appelle `fetch('/api/...')` pour récupérer les données depuis SQLite
   - Le workflow retourne les données à Alpine qui met à jour son état

2. **Actions Utilisateur** :
   - Tous les boutons sans exception font un `@click="runWorkflow('nom-workflow', params)"`
   - Le workflow fait un `fetch()` vers l'API Bun.js pour modifier SQLite
   - Le workflow met à jour le state Alpine avec la réponse de l'API

3. **Gestion des Erreurs** :
   - Workflows retournent toujours `{ success: true/false, error: string }`
   - Alpine affiche les erreurs via `x-show="error"`

4. **Navigation** :
   - Pour passer des paramètres : modifier le hash avec `location.hash`
   - Lire les params avec `new URLSearchParams(location.hash.slice(1))`
