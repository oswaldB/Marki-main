# DrDice - Outils Cells MVC

Outils Python de génération et développement de cells pour l'architecture Cell-Based MVC.

## Structure

```
DrDice/
├── drdice/
│   ├── core/           # Classes métier (Cell, Project, YAMLBuilder)
│   ├── commands/       # Commandes CLI (generate, build, init, dev)
│   ├── utils/          # Utilitaires
│   ├── cli.py          # CLI principal
│   └── __main__.py     # Point d'entrée
├── pyproject.toml      # Configuration du package
└── README.md
```

## Installation

```bash
cd DrDice
pip install -e .
```

Ou sans installation:
```bash
cd DrDice
python -m drdice --help
```

## Commandes

### `drdice generate` (ex: 01-generate-cells.sh)

Génère `cells-listing.md` depuis `app-map.md` via `pi -p`.

```bash
drdice generate
# ou avec options
drdice generate --project-dir /path/to/project --output custom-listing.md
```

### `drdice build` (ex: 02a-build-structure-with-existing.sh)

Construit la structure `/app/` depuis `cells-listing.md`.

```bash
drdice build
# ou
drdice build --project-dir /path/to/project
```

### `drdice init` (ex: 03-init-boilerplate.sh)

Initialise le boilerplate Flask minimal avec auth, hello_protected, logs.

```bash
drdice init
# ou
drdice init --skip-tests
```

### `drdice dev` (ex: 04-dev-cells.sh)

Développe et teste les cells validées (avec `valide.md` mais pas `devok.md`).

```bash
drdice dev                    # Toutes les cells à développer
drdice dev --cell login       # Une cell spécifique
drdice dev --skip-tests       # Sans tests
```

## Équivalences avec les scripts shell

| Script Shell | Commande Python | Fonction |
|-------------|-----------------|----------|
| `01-generate-cells.sh` | `drdice generate` | Génère cells-listing.md |
| `02a-build-structure-with-existing.sh` | `drdice build` | Construit /app/ |
| `03-init-boilerplate.sh` | `drdice init` | Initialise Flask |
| `04-dev-cells.sh` | `drdice dev` | Développe les cells |

## Architecture

Le projet utilise:
- **Click** pour les CLI
- **Rich** pour l'affichage coloré et les barres de progression
- **PyYAML** pour la manipulation YAML
- **Jinja2** pour les templates

## Classes principales

### `Cell`

Représente une cell du projet avec ses propriétés:
- `name`: nom de la cell
- `cell_type`: `ecran`, `wf-bg`, ou `cron`
- `path`: chemin sur disque
- `is_valid`: présence de `valide.md`
- `is_developed`: présence de `devok.md`

### `Project`

Gère le projet global:
- `parse_cells_listing()`: parse cells-listing.md
- `get_cells_to_develop()`: retourne les cells prêtes
- `get_all_cells()`: itère sur toutes les cells

### `YAMLBuilder`

Construit le document YAML de développement:
- Analyse les specs dans `specs/`
- Génère un document structuré avec instructions
- Intègre les contenus des fichiers `.md` de specs

## Exemple de document YAML généré

```yaml
cell:
  name: login
  type: ecran
  path: app/screens/login

context:
  rules: |
    # Règles du projet...
  schema: |
    CREATE TABLE users...

instructions_ia: |
  Remplacer tous les contenus par du code fonctionnel...

fichiers:
  - chemin: app/screens/login/__init__.py
    type: python
    description: Blueprint Flask
    instructions: Créer bp = Blueprint(...)
    specs_context: ""
    contenu: |
      # À IMPLEMENTER

  - chemin: app/screens/login/routes/index.py
    type: python
    description: Route GET /
    instructions: Implémenter login GET/POST
    specs_context: |
      ## Route Login
      - GET: affiche formulaire
      - POST: vérifie credentials
    contenu: |
      # À IMPLEMENTER
```
