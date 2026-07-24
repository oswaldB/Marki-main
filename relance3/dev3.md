# dev3.md - Processus de Développement (Stack Static)

## Vue d'ensemble

Processus de développement pour stack **Caddy + PouchDB/CouchDB + Alpine.js + Express**.

---

## Liste des étapes

1. **Git Setup** - Créer et checkout la branche `feature/cell-{name}`
2. **Vérification Structure** - Tester si la structure fichiers correspond à `/dev-tools/DrDice/drdice/templates/static-stack/files-and-folders.md`, sinon générer la structure de base et vérifier Caddyfile
3. **Healthy Test** - Tester via script que tous les services fonctionnent (app/site/, couchdb, server.js)
4. **Analyse des Specs** - Parser `.specs/` pour identifier le type de cell et les fichiers nécessaires
5. **Nettoyage de la Cell** - Supprimer tout sauf `.specs/`
6. **Génération des Squelettes** - Créer les fichiers templates avec instructions
7. **Update Caddyfile** - Configurer les routes (frontend uniquement)
8. **Skeleton Tests** - Vérifier que tous les fichiers requis existent et retournent les bonnes réponses
9. **Génération IA** - Exécuter `pi -p` pour chaque fichier et générer le code final
10. **Post-Gen Tests** - Tests complets : console logs, workflows avec données mock, analyse par `pi -p`
11. **Commit Git** - Versionner les changements
12. **Création devok.md** - Marquer la cell comme développée

---

## Étape 1 : Git Setup

**Objectif** : Préparer l'environnement git pour le développement

**Actions** :
- Créer la branche `feature/cell-{name}`
- Checkout de la branche

**Entrées** :
- Nom de la cell

**Sorties** :
- Branche git créée et active

**Validation** : Branche créée avec succès

---

## Étape 2 : Vérification Structure

**Objectif** : S'assurer que la structure de base du projet est conforme

**Actions** :
- Exécuter le script `/drdice/scripts/verify-structure.sh`
- Vérifier conformité avec `/dev-tools/DrDice/drdice/templates/static-stack/files-and-folders.md`
- Si structure incorrecte :
  - Générer la structure de base définie dans `/dev-tools/DrDice/drdice/templates/static-stack/files-and-folders.md`
  - Vérifier que `/etc/caddy/Caddyfile` est correctement configuré
  - Re-vérifier la structure

**Entrées** :
- `/dev-tools/DrDice/drdice/templates/static-stack/files-and-folders.md` (spécification structure)
- Structure actuelle du projet

**Sorties** :
- Structure conforme ou générée
- Caddyfile valide

**Validation** : Script retourne exit code 0

---

## Étape 3 : Healthy Test

**Objectif** : Vérifier que tous les services sont up et répondent

**Actions** :
- Exécuter `/drdice/scripts/healthy-test.sh`
- Tests réalisés :
  - `curl http://dev.markidiags.com/app/site/healthy.html` → attendu 200
  - `curl http://dev.markidiags.com/couchdb/healthy` → attendu 200
  - `curl -X POST http://dev.markidiags.com/server.js/healthy` → attendu 200

**Entrées** :
- Services démarrés

**Sorties** :
- Rapport de santé des services

**Validation** : Tous les services répondent 200

---

## Étape 4 : Analyse des Specs

**Objectif** : Parser les specs et identifier les fichiers nécessaires

**Actions** :
- Analyser `.specs/` pour déterminer le type de cell
- Identifier les fichiers à générer selon le type :
  - **Frontend** : `index.html`, `main.js`, `workflows/*.js`
  - **Backend Service** : `index.js`, `cron.js` (optionnel) - `package.json` sera généré par IA
- Extraire les dépendances globales (rules)

**Entrées** :
- Dossier `.specs/` de la cell

**Sorties** :
- `DevPlan` avec liste des `FilePlan`

**Validation** : Au moins un fichier identifié à générer

---

## Étape 5 : Nettoyage de la Cell

**Objectif** : Vider le contenu existant sauf les specs

**Actions** :
- Supprimer tous les fichiers/dossiers sauf `.specs/`

**Entrées** :
- Cell existante (éventuellement)

**Sorties** :
- Cell vide avec seulement `.specs/`

**Validation** : Dossier propre, seul `.specs/` préservé

---

## Étape 6 : Génération des Squelettes

**Objectif** : Créer les fichiers squelettes avec instructions

**Actions** :
- Pour chaque `FilePlan`, charger le template depuis `templates/static-stack/squelettes/`
- Remplacer les variables (`{cell_name}`, `{instructions}`, etc.)
- Écrire le fichier dans la cell (dans `~/marki/relance3/app/`)

**Fichiers générés selon type** :

| Type | Fichiers |
|------|----------|
| Frontend | `index.html`, `main.js`, `workflows/*.js` |
| Backend Service | `index.js`, `cron.js` (optionnel) |

> Note : `package.json` n'est PAS généré en squelette, il sera créé par IA.

**Entrées** :
- Templates dans `templates/static-stack/squelettes/`
- `DevPlan`

**Sorties** :
- Fichiers squelettes créés

**Validation** : Tous les fichiers du plan sont créés

---

## Étape 7 : Mise à jour Caddyfile (Frontend uniquement)

**Objectif** : Configurer les routes Caddy pour la cell

**Actions** :
- Si Caddyfile n'existe pas, créer la configuration de base
- Pour les cells frontend, vérifier que `file_server` gère la route
- Configuration auth pour `dev.markidiags.com` :
  - Basic auth avec mot de passe `Citron6-Mustang8`
  - Bypass auth pour les endpoints health

**Entrées** :
- Type de cell = "frontend"

**Sorties** :
- Caddyfile mis à jour
- Reload Caddy

**Validation** : Caddyfile prêt à servir la cell

---

## Étape 8 : Skeleton Tests

**Objectif** : Vérifier que les squelettes sont correctement générés et répondent

**Actions** :
- Exécuter `/drdice/scripts/skeleton-test.sh`
- Pour chaque fichier généré :
  - **Écrans HTML** : curl doit retourner 200 + contenu `<h1>Ecran {nom ecran} - pret pour dev</h1>`
  - **Console après 3s** : doit afficher `master.js loaded`
  - **Workflows JS après 3s** : console doit afficher `{nomworkflow}.js loaded`
  - **Cells serveur** : curl endpoint retourne `name: response ok`
  - **Security check** : sur `dev.markidiags.com`, bypass auth pour endpoints
- **Analyse avec pi -p** : Lire le rapport et exécuter `pi -p "est-ce que tout est ok? si oui retourne 'all good' si non, corrige les erreurs et relance /drdice/scripts/skeleton-test.sh"` 

**Entrées** :
- Fichiers squelettes générés
- Serveur Caddy démarré

**Sorties** :
- Rapport `skeleton-test-report.json`

**Validation** : Tous les tests passent (status OK)

---

## Étape 9 : Génération IA

**Objectif** : Générer le code final via IA (`pi -p`)

**Actions** :
- Pour chaque fichier squelette :
  1. Générer le prompt (squelette + specs sources)
  2. Exécuter `pi -p` avec timeout 600s
  3. Nettoyer la réponse (enlever balises markdown)
  4. Écrire le code dans le fichier final
  5. Sauvegarder logs dans `drdice-logs/`

**Entrées** :
- Fichiers squelettes
- Specs sources (`.specs/`)

**Sorties** :
- Fichiers code complets
- Logs dans `drdice-logs/`

**Validation** : Aucun timeout, tous les fichiers générés

---

## Étape 10 : Post-Gen Tests

**Objectif** : Tests complets après génération IA

**Actions** :
- Exécuter `/drdice/scripts/postgen-test.sh`
- **Tests frontend** :
  - Parcourir toutes les pages (liste depuis `/app/.drdice/pages.json` mis à jour à l'étape 6)
  - Vérifier console vide (aucune erreur)
  - Vérifier présence logs : `master.js loaded`, `{workflow}.js loaded`, `pouchdb loaded`, `classe-XXX-pouchdb-loaded with X entries`
- **Tests workflows frontend** :
  - Utiliser base CouchDB `marki-test` (créée si n'existe pas)
  - Peupler avec données mock
  - Créer page `test-workflows.html` (générée à l'étape 6 dans `app/site/tests/` depuis template `/templates/static-stack/squelettes/test/test-workflows.html`)
  - Cette page charge PouchDB depuis CouchDB `marki-test`, trigger le workflow et affiche les logs console
  - Trigger workflow → log résultat
- **Tests serveur** :
  - Routes : test avec données mock input/output
  - Scripts : exécuter sur `marki-test`, vérifier output
- **Analyse** :
  - Sauvegarder tous les logs dans un fichier par tests dans le dossier `.drdice/test-results/`
  - Le script `postgen-test.sh` appelle `pi -p` pour analyser le rapport et statuer (OK/KO)
  - Si KO : `pi -p` propose corrections et relancer le test.

**Entrées** :
- Code généré
- Base `marki-test` (créée si inexistante)

**Sorties** :
- `postgen-test-report.json`
- Logs console
- Analyse `pi -p`

**Validation** : Rapport OK + analyse `pi -p` valide

---

## Étape 11 : Commit Git

**Objectif** : Versionner les changements

**Actions** :
- `git add .`
- Commit avec message formaté : `feat({cell}): implémentation cell dev3`
- Push vers origin si remote configuré

**Entrées** :
- Fichiers générés
- Branche git active

**Sorties** :
- Commit créé (et push éventuel)

**Validation** : Commit réussi

---

## Étape 12 : Création devok.md

**Objectif** : Marquer la cell comme développée

**Actions** :
- Créer `.specs/devok.md` avec :
  - Statut ✅
  - Date et méthode (dev3)
  - Stack utilisé
  - Checklist des tests passés

**Entrées** :
- Toutes les étapes précédentes OK

**Sorties** :
- `devok.md` créé

**Validation** : ✅ Processus terminé

---

## Section Tests - Détail des Scripts

### 1. verify-structure.sh

**Chemin** : `/drdice/scripts/verify-structure.sh`

**Fonctionnement** :
- Compare la structure actuelle avec `/dev-tools/DrDice/drdice/templates/static-stack/files-and-folders.md`
- Vérifie existence des dossiers : `app/site/`, `app/server/`, `app/shared/`
- Vérifie présence `Caddyfile` à `/etc/caddy/Caddyfile`

**Si structure incorrecte** :
- Génère la structure manquante selon `/dev-tools/DrDice/drdice/templates/static-stack/files-and-folders.md`
- Crée/répare le `Caddyfile` avec config de base
- Re-vérifie et retourne exit code

**Rapport** : `structure-report.json`

---

### 2. healthy-test.sh

**Chemin** : `/drdice/scripts/healthy-test.sh`

**Fonctionnement** :
- Teste la réponse HTTP de chaque service critique
- Timeout : 10s par service
- Retry : 3 tentatives avec backoff

**Tests réalisés** :

| Service | URL | Méthode | Attendu |
|---------|-----|---------|---------|
| Frontend | `dev.markidiags.com/app/site/healthy.html` | GET | 200 + body "healthy" |
| CouchDB | `dev.markidiags.com/couchdb/healthy` | GET | 200 + JSON `{status: "ok"}` |
| Server | `dev.markidiags.com/server.js/healthy` | POST | 200 + `{name: "response ok"}` |

**Rapport** : `healthy-test-report.json` avec timestamps et codes réponse

---

### 3. skeleton-test.sh

**Chemin** : `/drdice/scripts/skeleton-test.sh`

**Fonctionnement** :
- Pour chaque fichier généré par le skeleton, teste sa validité

**Tests par type** :

**Écrans HTML** :
- `curl -s {url} | grep "<h1>Ecran.*- pret pour dev</h1>"`
- Doit retourner match
- Status HTTP 200

**JavaScript (master.js, workflows)** :
- Ouvrir page dans headless browser (Playwright)
- Attendre 3 secondes
- Capturer console logs
- Vérifier présence : `master.js loaded` ou `{name}.js loaded`

**Serveur (endpoints)** :
- `curl -X POST {endpoint}/healthy`
- Doit retourner `{name: "response ok"}`
- Status 200

**Security** :
- Vérifier que `dev.markidiags.com` demande auth (basic auth)
- Vérifier que les endpoints health sont bypass (pas d'auth)

**Analyse avec pi -p** :
- Lire le rapport `skeleton-test-report.json`
- Exécuter `pi -p "est-ce que tout est ok? si oui retourne 'all good' si non, corrige les erreurs et relance /drdice/scripts/skeleton-test.sh"`
- Si corrections proposées, les appliquer et relancer le test

**Rapport** : `skeleton-test-report.json` avec résultat par fichier testé

---

### 4. postgen-test.sh

**Chemin** : `/drdice/scripts/postgen-test.sh`

**Fonctionnement** :
- Tests complets après génération IA
- Création base `marki-test` si inexistante
- Peuplement avec données mock

**A. Tests Frontend (Navigation)** :
- Lire la liste des pages depuis `/app/.drdice/pages.json`
- Parcourir toutes les URLs des cells frontend
- Pour chaque page :
  - Charger avec Playwright
  - Attendre 5 secondes (chargement PouchDB)
  - Capturer tous les logs console
  - Vérifier aucune erreur (console.error vide)
  - Vérifier présence logs attendus :
    - `master.js loaded`
    - `{workflow-name}.js loaded` (pour chaque workflow)
    - `pouchdb loaded`
    - `classe-{name}-pouchdb-loaded with {X} entries`

**B. Tests Workflows Frontend** :
- Utiliser base CouchDB `marki-test` (créée si inexistante)
- Créer page temporaire `app/site/tests/test-workflows.html` (depuis template `/templates/static-stack/squelettes/test/test-workflows.html`)
- Cette page charge PouchDB depuis CouchDB `marki-test`
- Pour chaque workflow :
  - Peupler `marki-test` avec données mock (input)
  - Charger page test
  - Trigger workflow via action user simulée
  - Capturer log résultat
  - Vérifier données dans PouchDB (output attendu)

**C. Tests Serveur (Routes)** :
- Pour chaque route/endpoints :
  - POST avec données mock (input)
  - Vérifier réponse (output attendu)
  - Vérifier modification `marki-test` si applicable

**D. Tests Scripts** :
- Pour chaque script (fonction backend appelée par cron) :
  - Exécuter avec `node script.js --env=marki-test`
  - Vérifier output console
  - Vérifier modification données `marki-test`

**E. Analyse IA** :
- Sauvegarder tous les logs dans un fichier par tests dans le dossier `.drdice/test-results/`
- Générer `postgen-test-report.json`
- Appeler `pi -p` (depuis le script) avec le rapport en input
- `pi -p` statue : PASS ou FAIL avec raisons
- Si FAIL : `pi -p` propose corrections et relancer le test

**Rapport** : `postgen-test-report.json` + `pi-analysis.md`

---

## Flux conditionnels

### Si cell déjà développée (devok.md existe)

```
DÉTECTION ──▶ [SKIP] ──▶ Passer à la cell suivante
```

### Si tests échouent (étape 2, 3, 8 ou 10)

```
TESTS KO ──▶ Afficher erreurs ──▶ pi -p analyse ──▶ Correction ?
                                              │
                                              ├──▶ OUI ──▶ Appliquer fix ──▶ Re-test
                                              │
                                              └──▶ NON ──▶ Arrêt cell (pas de devok.md)
```

### Si pas de git configuré (--skip-git)

```
ÉTAPE 1 [SKIP] ──▶ ÉTAPE 11 [SKIP]
```

---

## Checkpoints par étape

| Étape | Checkpoint | Validation |
|-------|------------|------------|
| 1 | Branche créée | `git branch` montre la branche |
| 2 | Structure OK | `verify-structure.sh` exit 0 |
| 3 | Services UP | `healthy-test.sh` tous 200 |
| 4 | Plan généré | `len(plan.files) > 0` |
| 5 | Cell nettoyée | Seul `.specs/` présent |
| 6 | Squelettes OK | Tous les fichiers du plan créés |
| 7 | Caddyfile OK | Route configurée + auth ok |
| 8 | Skeleton Tests | `skeleton-test-report.json` OK |
| 9 | Génération IA | Aucun timeout, tous les fichiers générés |
| 10 | Post-Gen Tests | `postgen-test-report.json` + `pi -p` OK |
| 11 | Commit | `git log` montre le commit |
| 12 | Finalisation | `devok.md` créé |

---

## Structure des fichiers générés

### Cell Frontend (`app/site/cell/{name}/`)

```
.specs/
├── valide.md
├── devok.md              # [créé à la fin]
├── mockups/
├── wf-frontend/
└── wf-backend/

index.html                # [généré]
main.js                   # [généré]
workflows/                # [généré]
└── *.js
drdice-logs/                # [logs des prompts]
```

### Cell Backend Service (`app/server/cells/services/{name}/`)

```
.specs/
├── valide.md
├── devok.md
├── wf-backend/

index.js                  # [généré]
package.json              # [généré]
drdice-logs/
```

---

## Commande CLI

```bash
# Développer une cell spécifique
drdice dev3 --cell {name}

# Développer toutes les cells à développer
drdice dev3

# Options
--project-dir PATH    # Chemin du projet
--skip-git            # Ne pas gérer git
--skip-clean          # Ne pas nettoyer avant dev
--skip-tests          # Passer tous les tests (dangereux)
```

---

## Dépendances externes

- `pi` : Commande de génération IA
- `git` : Gestion des versions
- `caddy` : Serveur web (port 8080)
- `node` : Pour les backend services (et scripts cron)
- `couchdb` : Database (port 5984)
- `playwright` : Pour les tests headless

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Serveur | Caddy |
| Frontend | Alpine.js + TailwindCSS + PouchDB |
| Backend | Node.js + Express |
| Database | CouchDB (PouchDB côté client) |
| Génération | `pi -p` (IA) |
| Tests | Scripts bash + Playwright + `pi -p` analyse |
