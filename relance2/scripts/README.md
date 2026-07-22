# Scripts du Processus Cell-Based MVC

## Vue d'ensemble

Ces scripts automatisent le développement selon l'architecture Cell-Based MVC.

## Prérequis

```bash
# Installer les dépendances Python
pip install -r requirements.txt

# Installer Playwright (pour les tests)
playwright install chromium

# Commande pi disponible
which pi  # doit retourner le chemin
```

## Ordre d'exécution

```bash
# Étape 1: Créer app-map.md manuellement dans specs-global/
$EDITOR specs-global/app-map.md

# Étape 2: Générer le listing des cells
./scripts/01-generate-cells.sh

# Étape 3: Choisir selon contexte

# Option A: Tu as déjà des specs dans specs/ (mockups, workflows...)
./scripts/02a-build-structure-with-existing.sh

# Option B: Nouveau projet, structure vide
./scripts/02b-build-structure-from-scratch.sh

# Étape 4: Initialiser le boilerplate Flask (lance serveur + tests)
./scripts/03-init-boilerplate.sh

# Étape 5: Développer les cells validées
./scripts/04-dev-cells.sh

# Étape 6: Tester (optionnel si déjà fait dans 03)
./scripts/05-test-cells.sh
```

## Description détaillée des scripts

### 01-generate-cells.sh

**Usage**: `./scripts/01-generate-cells.sh`

Lit `specs-global/app-map.md` et génère `specs-global/cells-listing.md` avec `pi -p`.

**Entrées**:
- `specs-global/app-map.md` (manuel)

**Sorties**:
- `specs-global/cells-listing.md`

### 02a-build-structure-with-existing.sh

**Usage**: `./scripts/02a-build-structure-with-existing.sh`

Crée la structure `/app/` et copie les specs existantes depuis `specs/`.

**Entrées**:
- `specs-global/cells-listing.md`
- `specs/<cell>/` (existants)

**Sorties**:
- `/app/<cell>/` avec structure complète + specs copiées

### 02b-build-structure-from-scratch.sh

**Usage**: `./scripts/02b-build-structure-from-scratch.sh`

Crée la structure `/app/` vide (sans copier de specs).

**Entrées**:
- `specs-global/cells-listing.md`

**Sorties**:
- `/app/<cell>/` avec structure vide

### 03-init-boilerplate.sh

**Usage**: `./scripts/03-init-boilerplate.sh`

Initialise un projet Flask complet avec:
- Cell `auth` (JWT + token de test)
- Cell `hello` (public)
- Cell `hello_protected` (privé avec auth)
- Cell `hello_bg` (API)
- Cell `hello_cron` (cron job)
- Logs automatiques

**Lance automatiquement**:
- Serveur Flask sur port 5000
- Tests avec Playwright

**Entrées**: Aucune

**Sorties**:
- App Flask complète dans `app/`
- Serveur démarré
- Logs dans `app/*/logs/`

### 04-dev-cells.sh

**Usage**: `./scripts/04-dev-cells.sh`

Développe les cells qui ont `valide.md` mais pas `devok.md`.

**Fonctionnement**:
1. Détecte les cells à développer
2. Crée une branche git par cell
3. Appelle `pi -p` pour générer le code
4. Extrait et écrit les fichiers
5. Commit et push

**Entrées**:
- `app/<cell>/specs/valide.md` (doit exister)
- `app/<cell>/specs/` (tous les fichiers de specs)

**Sorties**:
- Fichiers Python/HTML/Workflows créés
- Branches git `feature/cell-<nom>`

**Post-développement**:
```bash
# Marquer comme développée
touch app/<cell>/specs/devok.md
```

### 05-test-cells.sh

**Usage**: `./scripts/05-test-cells.sh`

Teste toutes les cells écran et capture les logs.

**Prérequis**:
- Serveur Flask démarré sur port 5000

**Fonctionnement**:
1. Pour chaque cell avec `templates/index.html`
2. Lance Playwright avec token JWT de test
3. Capture console, erreurs, screenshot
4. Génère rapport JSON

**Entrées**:
- Serveur Flask sur http://localhost:5000

**Sorties**:
- `app/<cell>/logs/<timestamp>/frontend.json`
- `app/<cell>/logs/<timestamp>/screenshots/*.png`
- `app/<cell>/logs/<timestamp>/report.json`

### test-frontend.py

**Usage**: `python scripts/test-frontend.py <url> <screenshot> <logfile>`

Script Python utilisé par `05-test-cells.sh`.

**Exemple**:
```bash
python scripts/test-frontend.py \
  "http://localhost:5000/hello" \
  "app/hello/logs/test.png" \
  "app/hello/logs/test.json"
```

**Fonctionnalités**:
- Injecte token JWT de test dans les headers
- Capture console (log, warn, error)
- Capture erreurs de page
- Screenshot full-page
- Génère JSON structuré

## Fichiers de spécifications

### specs-global/app-map.md
Carte de l'application avec écrans et workflows backend.

```markdown
# Application Map

## Écrans
| URL | Nom | Description |
|-----|-----|-------------|
| / | dashboard | Tableau de bord |

## Workflows Backend
| ID | Type | Attaché à | Description |
|----|------|-----------|-------------|
| sync | wf-bg | dashboard | Synchronisation |
```

### app/<cell>/specs/valide.md
Marqueur de validation des specs.

```markdown
# Validation

- [x] Structure complète
- [x] Mockups créés
- [x] Workflows documentés
```

### app/<cell>/specs/devok.md
Marqueur de développement terminé.

```bash
touch app/<cell>/specs/devok.md
```

## Workflow complet de développement

### Nouveau projet

```bash
# 1. Créer l'app-map
cat > specs-global/app-map.md << 'EOF'
# Application Map
## Écrans
| URL | Nom | Description |
| / | dashboard | Tableau de bord |
EOF

# 2. Générer et construire
./scripts/01-generate-cells.sh
./scripts/02b-build-structure-from-scratch.sh

# 3. Lancer boilerplate (avec tests)
./scripts/03-init-boilerplate.sh

# 4. Remplir les specs
# Éditer: app/dashboard/specs/mockups/etat-normal.html
# Éditer: app/dashboard/specs/wf-frontend/initial-load.md
# ...

# 5. Valider
touch app/dashboard/specs/valide.md

# 6. Développer
./scripts/04-dev-cells.sh

# 7. Tester
./scripts/05-test-cells.sh
```

### Projet existant avec specs

```bash
# Supposons que vous avez déjà:
# specs/dashboard/mockups/
# specs/dashboard/wf-frontend/

./scripts/01-generate-cells.sh
./scripts/02a-build-structure-with-existing.sh
./scripts/03-init-boilerplate.sh
touch app/dashboard/specs/valide.md
./scripts/04-dev-cells.sh
./scripts/05-test-cells.sh
```

## Dépannage

### "Commande pi non disponible"
```bash
# Vérifier l'installation
which pi

# Sinon, les scripts fonctionnent en mode dégradé
# avec création manuelle des structures
```

### "Playwright non installé"
```bash
pip install playwright
playwright install chromium
```

### "Le serveur Flask n'est pas démarré"
```bash
# Vérifier si le port 5000 est utilisé
lsof -i :5000

# Tuer le processus si besoin
kill $(lsof -t -i :5000)

# Relancer
./scripts/03-init-boilerplate.sh
```

### Tests qui échouent
```bash
# Vérifier les logs
ls -la app/*/logs/

# Voir le dernier test
cat app/*/logs/*/frontend.json | jq

# Voir les erreurs console
cat app/*/logs/*/frontend.json | jq '.errors'
```

## Architecture des logs

```
app/
├── <cell>/
│   ├── logs/
│   │   └── 2025-07-22_14-30-45/
│   │       ├── frontend.json      # Logs console navigateur
│   │       ├── screenshot.png     # Capture d'écran
│   │       └── report.json        # Résumé
```

## Token JWT de test

Le token utilisé pour les tests est hardcodé:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test
```

Il est automatiquement injecté dans les headers par `test-frontend.py`.
