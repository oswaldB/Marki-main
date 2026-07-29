# Page Specs - login

> **DOCUMENT DE RÉFÉRENCE PRIORITAIRE**
> 
> Ce fichier définit les règles immuables du projet. 
> **LIT EN PRIORITÉ ABSOLUE avant toute modification de code.**

## Partie 1 : Use Cases (Gherkin)

```gherkin
Feature: login Page
  En tant qu'utilisateur
  Je veux pouvoir interagir avec la page login
  Afin de réaliser mes tâches

  Scenario: Chargement initial de la page
    Given je suis sur la page login
    When la page se charge
    Then les données initiales sont chargées via le workflow "initial-load"
    And l'interface est prête à l'emploi

  Scenario: Soumission du formulaire de connexion
    Given je suis sur la page login
    When je remplis l'identifiant "oswald"
    And je remplis le mot de passe "coucou"
    And je clique sur le bouton "Se connecter"
    Then le workflow "auth-submit" est déclenché
    And la session CouchDB est créée avec le cookie AuthSession
    And l'écran de synchronisation s'affiche sans changement d'URL
    And le workflow "sync-loading" démarre pour synchroniser PouchDB
    And les données sont téléchargées depuis https://dev.markidiags.com/data/
    And l'utilisateur est redirigé vers "/dashboard"

  Scenario: Session active existante au chargement
    Given je suis sur la page login
    And un cookie AuthSession valide existe
    When la page se charge
    Then le workflow "initial-load" vérifie la session CouchDB
    And si PouchDB est à jour, l'utilisateur est redirigé vers "/dashboard"
    And si PouchDB nécessite une synchronisation, le workflow "sync-loading" démarre
```

## Partie 2 : Choix Techniques et Règles du Projet

### Stack Technique
- **Frontend** : Alpine.js 3 + HTML statique
- **Backend** : Aucun (tout se fait côté front)
- **Database** : PouchDB (client) avec live sync vers CouchDB
- **Style** : TailwindCSS via CDN

### Règles Absolues (Pas d'Exception)

1. **Passage de paramètres URL** : Utiliser uniquement le hash (`#`)
   - Exemple : `http://dev.markidiags.com/login#userId=123`
   - Jamais de query params (`?userId=123`)

2. **Appel des Workflows** : Chaque bouton appelle UN workflow
   - Via `runWorkflow('nom-du-workflow')` dans Alpine.js
   - Les workflows sont dans `./workflows/*.js`

3. **Structure Alpine.js** :
   - Fonction principale dans `main.js` : `loginPage()`
   - Dans `index.html` : `x-data="loginPage()"`
   - Pas de store global, tout est dans la fonction de la page

4. **Data et Persistence** :
   - Toutes les données sont dans PouchDB local
   - Live sync automatique avec CouchDB
   - Pas de fetch/axios direct, tout passe par PouchDB

5. **Séparation des Concerns** :
   - `index.html` : structure + Alpine bindings
   - `main.js` : logique Alpine + appel des workflows
   - `workflows/*.js` : logique métier + sync DB

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
   - Le workflow lit depuis PouchDB et retourne les données
   - Alpine met à jour son état avec le résultat

2. **Actions Utilisateur** :
   - Tous les boutons sans exception font un `@click="runWorkflow('nom-workflow', params)"`
   - Le workflow modifie PouchDB
   - Le live sync met à jour automatiquement l'UI

3. **Gestion des Erreurs** :
   - Workflows retournent toujours `{ success: true/false, error: string }`
   - Alpine affiche les erreurs via `x-show="error"`

4. **Navigation** :
   - Pour passer des paramètres : modifier le hash avec `location.hash`
   - Lire les params avec `new URLSearchParams(location.hash.slice(1))`


## Partie 4 : Scénarios de Test Détaillés

> **Document de référence pour les tests automatisés**
> 
> Chaque workflow doit avoir un fichier scenario-{workflow}.md dans .specs/tests-workflows/

### Scénario 1 : Initial Load

**Workflow** : `initial-load`
**Fichier de test** : `.specs/tests-workflows/scenario-initial-load.md`

#### Préconditions (Mock Data)
- localStorage:
  - `auth_token`: "mock-jwt-token-1"
- État initial PouchDB:
  - Collection appropriée initialisée avec données de test

#### Actions
1. Charger la page `/{cell_name}`
2. Attendre que le workflow s'exécute automatiquement (au init() Alpine)
3. Vérifier que les données sont chargées depuis PouchDB

#### Vérifications Attendues
- [ ] Console contient : "initial-load started"
- [ ] Console contient : "initial-load completed" ou "initial-load failed"
- [ ] Pas d'erreur JS : "is not defined"
- [ ] Alpine.data mis à jour correctement
- [ ] PouchDB modifié comme attendu

#### Cas d'Erreur à Tester
- [ ] Token invalide/missing
- [ ] Données manquantes
- [ ] Erreur réseau (si applicable)
- [ ] Permissions insuffisantes

### Scénario 2 : Auth Submit

**Workflow** : `auth-submit`
**Fichier de test** : `.specs/tests-workflows/scenario-auth-submit.md`

#### Préconditions (Mock Data)
- localStorage:
  - `auth_token`: "mock-jwt-token-2"
- État initial PouchDB:
  - Collection appropriée initialisée avec données de test

#### Actions
1. Remplir le formulaire avec données valides
2. Cliquer sur le bouton `#btn-auth-submit`
3. Vérifier que `auth-submit` est appelé avec les bon paramètres
4. Vérifier la mise à jour PouchDB

#### Vérifications Attendues
- [ ] Console contient : "auth-submit started"
- [ ] Console contient : "auth-submit completed" ou "auth-submit failed"
- [ ] Pas d'erreur JS : "is not defined"
- [ ] Alpine.data mis à jour correctement
- [ ] PouchDB modifié comme attendu

#### Cas d'Erreur à Tester
- [ ] Token invalide/missing
- [ ] Données manquantes
- [ ] Erreur réseau (si applicable)
- [ ] Permissions insuffisantes

### Scénario 3 : Sync Loading

**Workflow** : `sync-loading`
**Fichier de test** : `.specs/tests-workflows/scenario-sync-loading.md`

#### Préconditions (Mock Data)
- localStorage:
  - `auth_token`: "mock-jwt-token-3"
- État initial PouchDB:
  - Collection appropriée initialisée avec données de test

#### Actions
1. Déclencher l'action via le bouton approprié
2. Vérifier que `sync-loading` est exécuté
3. Vérifier le résultat dans PouchDB

#### Vérifications Attendues
- [ ] Console contient : "sync-loading started"
- [ ] Console contient : "sync-loading completed" ou "sync-loading failed"
- [ ] Pas d'erreur JS : "is not defined"
- [ ] Alpine.data mis à jour correctement
- [ ] PouchDB modifié comme attendu

#### Cas d'Erreur à Tester
- [ ] Token invalide/missing
- [ ] Données manquantes
- [ ] Erreur réseau (si applicable)
- [ ] Permissions insuffisantes

### Scénario Global : Navigation et Cycle de Vie

**Objectif** : Vérifier le cycle complet de la page

#### Test de Navigation
1. Accéder à `/login`
2. Vérifier que `initial-load` s'exécute
3. Tester chaque bouton d'action
4. Vérifier les transitions

#### Test de Persistence
1. Modifier des données
2. Rafraîchir la page
3. Vérifier que les données persistent (PouchDB)
4. Vérifier le sync avec CouchDB

#### Liste des Workflows (3 total)
- `initial-load`
- `auth-submit`
- `sync-loading`
