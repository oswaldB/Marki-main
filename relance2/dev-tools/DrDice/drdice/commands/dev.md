# Documentation de dev.py

## Vue d'ensemble

La commande `dev` est le moteur de développement automatique de DrDice. Elle génère du code Flask/Alpine.js à partir des spécifications contenues dans une cell, teste automatiquement le résultat, et gère le cycle de vie git.

## Architecture générale

```
┌─────────────────────────────────────────────────────────────────┐
│                         dev.py                                  │
├─────────────────────────────────────────────────────────────────┤
│  1. Détection des cells à développer                             │
│     └── Fichier specs/valide.md existe ET specs/devok.md absent │
│                                                                 │
│  2. Pour chaque cell :                                           │
│     a. Git setup (branche feature/cell-{name})                  │
│     b. Nettoyage de la cell (sauf specs/)                       │
│     c. Construction du prompt complet                           │
│     d. Appel à `pi -p` pour génération IA                      │
│     e. Extraction YAML → fichiers                               │
│     f. Mise à jour app.py (blueprint)                           │
│     g. Tests Playwright + logs backend                          │
│     h. Correction automatique si échec                          │
│     i. Git commit + push                                        │
│     j. Création devok.md                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Fonctions principales

### `_build_detailed_prompt(cell)` → str

Construit un prompt détaillé pour l'IA en lisant tous les fichiers de specs.

**Sources lues :**
- `specs/A LIRE EN PREMIER/rules.md` → Règles spécifiques
- `specs/A LIRE EN PREMIER/schema.sql` → Schéma base de données
- `specs/wf-frontend/*.md` → Workflows frontend
- `specs/wf-backend/*.md` → Workflows backend
- `specs/models/*.md` → Spécifications modèles
- `specs/routes/*.md` → Spécifications routes

**Structure du prompt généré :**
```
Tu es un développeur Flask/Alpine.js expert.
Développe la cell: {cell_name}

## Règles du projet (cellsmvc)
- Structure: routes/, models/, templates/
- Frontend: Alpine.js + Jinja2 + Tailwind
- Backend: Flask, SQLite
...

## Spécifications à implémenter:
### Règles spécifiques: {rules_md}
### Schéma SQL: {schema_sql}
...

## Ta mission:
1. Crée/complète tous les fichiers Python
2. Crée les templates HTML
...

Pour CHAQUE fichier, donne un élément YAML avec:
- chemin: ...
- contenu: |
    ...

Réponds avec UN SEUL document YAML complet.
```

### `_develop_cell(cell, project, skip_clean)` → (bool, Path|None)

Orchestre le développement d'une cellule unique.

**Étapes :**
1. **Nettoyage** (`_clean_cell`) : Supprime tout sauf `specs/`, recrée structure
2. **Prompt** (`_build_detailed_prompt`) : Lit specs et construit le prompt
3. **Génération** : Appelle `pi -p` avec timeout 300s
4. **Nettoyage YAML** (`_clean_yaml_response`) : Extrait le bloc YAML de la réponse
5. **Validation** : Demande confirmation utilisateur
6. **Extraction** (`_extract_files`) : Parse YAML → fichiers sur disque
7. **app.py** (`_update_app_py`) : Ajoute le blueprint via `pi -p`

### `_extract_files(cell, yaml_path)` → bool

Extrait les fichiers depuis le YAML généré par l'IA.

**Format attendu :**
```yaml
fichiers:
  - chemin: app/screens/{cell}/routes/index.py
    contenu: |
      # code Python
  - chemin: app/screens/{cell}/templates/index.html
    contenu: |
      <!-- code HTML -->
```

**Logique de nettoyage :**
- Ignore les lignes markdown `**texte**` hors blocs contenu
- Sauvegarde debug si erreur YAML
- Filtre `app.py` (géré automatiquement)
- Vérifie que les chemins sont bien dans la cellule

### `_update_app_py(project, cell)` → bool

Met à jour `app/app.py` pour enregistrer le blueprint de la nouvelle cell.

**Processus :**
1. Détecte le type de cell (`screens/`, `backend_wf/`, `cron/`)
2. Détermine le `url_prefix` approprié
3. Construit les lignes d'import et de registration
4. Lit le contenu actuel de `app.py`
5. Appelle `pi -p` pour modification intelligente
6. Nettoie la réponse (enlève les balises markdown)
7. Vérifie que le blueprint a bien été ajouté
8. Écrit le nouveau contenu

### `_run_cell_tests(cell, project, console)` → (bool, list[str])

Exécute les tests automatiques pour une cell.

**Vérifications effectuées :**

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Vérifier serveur Flask | `curl localhost:5000` OK |
| 2 | Démarrer serveur si besoin | Retourne erreurs de démarrage |
| 3 | Vérifier HTTP | Code 200 ou 302 |
| 4 | Test Playwright | Pas d'erreurs console/frontend |
| 5 | Logs backend | Capture erreurs Flask |

**Fichiers de logs créés :**
```
cells/{type}/{cell}/logs/{timestamp}/
├── report.json           # Rapport final
├── frontend.json         # Logs Playwright (console, erreurs JS)
├── backend.log           # Erreurs Flask capturées
├── test_output.log       # Sortie du test
├── errors.txt            # Erreurs consolidées
└── screenshots/{cell}.png # Capture d'écran
```

### `_auto_fix_cell(cell, project, yaml_path, errors)` → bool

Tente de corriger automatiquement une cell en échec.

**Contexte fourni à l'IA :**
- Erreurs consolidées (paramètre + errors.txt)
- Logs frontend (JSON)
- Logs backend (Flask)
- Sortie du test
- Code actuel (extraits des fichiers .py)

**Prompt de correction :**
```
Tu es un développeur Flask/Alpine.js expert.
La cell '{cell_name}' a des erreurs lors des tests.

## Erreurs détectées: {...}
## Logs frontend: {...}
## Logs backend: {...}
## Code actuel: {...}

Ta mission:
1. Analyse les erreurs (frontend ET backend)
2. Identifie la cause racine
3. Corrige le code
4. Donne les fichiers corrigés complets en YAML
```

### Fonctions utilitaires

| Fonction | Description |
|----------|-------------|
| `_check_pi()` | Vérifie que `pi` est disponible |
| `_get_git_branch_name(cell_name)` | Convertit nom cell → `feature/cell-{name}` |
| `_git_setup(project_dir, cell_name)` | Crée/checkout la branche git |
| `_git_commit(project_dir, cell_name)` | Commit et push les changements |
| `_clean_cell(cell)` | Supprime tout sauf `specs/`, recrée structure |
| `_check_server()` | Teste si Flask répond sur port 5000 |
| `_start_server(project_dir)` | Démarre Flask via `scripts/03-init-boilerplate.sh` |
| `_restart_server(project_dir)` | Kill + redémarre Flask |
| `_create_detailed_devok(cell)` | Crée `specs/devok.md` avec métadonnées |
| `_read_specs_file()` | Lit un fichier de specs |
| `_read_specs_directory()` | Lit tous les `.md` d'un dossier |

## Gestion des erreurs

### Erreurs de démarrage serveur
- Capture stderr immédiat du processus
- Lit `flask_server.log` (lignes nouvelles)
- Lit fichiers alternatifs (`gunicorn.log`, `server.log`, `app.log`)

### Erreurs HTTP 500+
- Capture immédiate des logs backend
- Skip le test Playwright (page non fonctionnelle)
- Enrichit les erreurs pour la correction auto

### Erreurs YAML
- Sauvegarde contenu brut dans `{yaml_path}-debug.yaml`
- Affiche message d'erreur détaillé
- Permet debug manuel

## Options CLI

```bash
drdice dev [OPTIONS]
  --project-dir PATH    Chemin du projet
  --cell NAME           Développer une cell spécifique
  --skip-tests          Ne pas lancer les tests
  --skip-git            Ne pas gérer git
  --skip-clean          Ne pas nettoyer avant génération
  --auto-fix            Correction automatique sans interaction
```

## Flux de données

```
specs/                          dev-output.yaml
├── A LIRE EN PREMIER/              ├── fichiers:
│   ├── rules.md                    │   - chemin: routes/index.py
│   └── schema.sql                  │     contenu: |
├── wf-frontend/                    │       ...
│   └── *.md                        │   - chemin: templates/index.html
├── wf-backend/                     │     contenu: |
│   └── *.md                        │       ...
├── models/                         app.py (via pi -p)
│   └── *.md                        └── from app.screens.{cell} import ...
└── routes/
    └── *.md
```

## Dépendances externes

- `pi` : Commande de génération IA (via subprocess)
- `git` : Gestion des branches et commits
- `curl` : Vérification HTTP
- `flask` : Serveur de test
- Playwright : Tests frontend (via `scripts/test-frontend.py`)

## Limitations actuelles

1. **Timeouts fixes** : 300s pour génération, 60s pour tests
2. **Port 5000 hardcoded** : Serveur Flask toujours sur ce port
3. **YAML fragile** : Nettoyage nécessaire pour cas particuliers
4. **Correction auto** : Une seule tentative, pas de boucle
5. **app.py** : Mise à jour via IA (lente), pourrait être programmatique
