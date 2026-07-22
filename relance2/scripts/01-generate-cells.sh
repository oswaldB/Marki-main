#!/bin/bash
# scripts/01-generate-cells.sh
# Génère cells-listing.md depuis app-map.md avec pi -p

set -e

PROJECT_DIR="/home/ubuntu/marki/relance2"
APP_MAP="$PROJECT_DIR/specs-global/app-map.md"
OUTPUT="$PROJECT_DIR/specs-global/cells-listing.md"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}ℹ️  $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Vérification que app-map.md existe
if [ ! -f "$APP_MAP" ]; then
    log_error "$APP_MAP n'existe pas"
    exit 1
fi

log_info "Génération du cells listing avec pi -p..."

# Vérifier que pi est disponible
if ! command -v pi &> /dev/null; then
    log_error "La commande 'pi' n'est pas disponible"
    exit 1
fi

# Lire le contenu de app-map.md
APP_MAP_CONTENT=$(cat "$APP_MAP")

# Prompt avec structure EXACTE de cellsmvc.md
PROMPT="Tu dois générer un fichier Markdown strict selon l'architecture Cell-Based MVC.

STRUCTURE D'UNE CELL ÉCRAN (à reproduire exactement):
## Cell: <nom_snake_case>
- **Type**: ecran
- **Description**: <description>
- **Structure**:
\`\`\`
app/<nom_cell>/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_<workflow>.py
├── models/
│   ├── __init__.py
│   ├── <modele1>.py
│   └── <modele2>.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── sync-missions.md
    ├── models/
    │   └── <modele1>.md
    └── routes/
        └── index.md
\`\`\`

STRUCTURE D'UNE CELL WORKFLOW BACKEND (wf-bg):
## Cell: <nom_snake_case>
- **Type**: wf-bg
- **Description**: <description>
- **Structure**:
\`\`\`
app/<nom_cell>/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_<workflow>.py
├── models/
│   ├── __init__.py
│   ├── <modele1>.py
│   └── <modele2>.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── sync-missions.md
    ├── models/
    │   └── <modele1>.md
    └── routes/
        └── wf_<workflow>.md
\`\`\`

STRUCTURE D'UNE CELL CRON:
## Cell: <nom_snake_case>
- **Type**: cron
- **Description**: <description>
- **Structure**:
\`\`\`
app/<nom_cell>/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── api_trigger.py
├── models/
│   ├── __init__.py
│   └── <modele1>.py
├── cron.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── cleanup-process.md
    ├── models/
    │   └── <modele1>.md
    └── routes/
        └── api_trigger.md
\`\`\`

RÈGLES:
1. Commencer par \"# Cells Listing\"
2. Chaque cell commence par \"## Cell: \" + nom_snake_case
3. PAS de section Dépendances
4. Les écrans ont: routes/ (avec __init__.py, index.py, etc.), models/, templates/ (avec workflows/), logs/, specs/
5. Les wf-bg ont: routes/, models/, logs/, specs/ (PAS de templates/)
6. Les cron ont: routes/, models/, cron.py, logs/, specs/
7. Toutes les sous-sections doivent être présentes dans specs/: A LIRE EN PREMIER/, models/, routes/ + mockups/ et wf-frontend/ pour les écrans, + wf-backend/ pour wf-bg et cron

Document source:
$APP_MAP_CONTENT

Génère UNIQUEMENT le contenu du fichier, ligne 1 = \"# Cells Listing\":"

# Exécution avec pi -p
log_info "Appel à pi -p..."
if ! pi -p "$PROMPT" > "$OUTPUT" 2>/dev/null; then
    log_error "Erreur lors de l'appel à pi"
    exit 1
fi

# Nettoyer le fichier: garder uniquement à partir de "# Cells Listing"
sed -i '0,/^# Cells Listing/{/^# Cells Listing/!d}' "$OUTPUT" 2>/dev/null || true

# Vérifier que le fichier a été généré
if [ ! -f "$OUTPUT" ]; then
    log_error "Le fichier $OUTPUT n'a pas été généré"
    exit 1
fi

# Compter les cells trouvées
CELL_COUNT=$(grep -c "^## Cell:" "$OUTPUT" 2>/dev/null || echo "0")

if [ "$CELL_COUNT" -eq 0 ]; then
    log_error "Aucune cell trouvée au format attendu"
    exit 1
fi

log_info "Cells listing généré: $OUTPUT"
log_info "$CELL_COUNT cells identifiées"
echo ""
echo "Prochaine étape:"
echo "  ./scripts/02a-build-structure-with-existing.sh"
