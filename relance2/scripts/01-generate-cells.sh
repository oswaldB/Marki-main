#!/bin/bash
# scripts/01-generate-cells.sh
# Génère cells-listing.md depuis app-map.md

set -e

PROJECT_DIR="/home/ubuntu/marki/relance2"
APP_MAP="$PROJECT_DIR/specs-global/app-map.md"
OUTPUT="$PROJECT_DIR/specs-global/cells-listing.md"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}ℹ️  $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérification que app-map.md existe
if [ ! -f "$APP_MAP" ]; then
    log_error "$APP_MAP n'existe pas"
    echo ""
    echo "Crée d'abord le fichier avec la structure suivante:"
    echo ""
    cat << 'EOF'
# Application Map

## Écrans
| URL | Nom | Description |
|-----|-----|-------------|
| / | dashboard | Tableau de bord |
| /impayes | liste-impayes | Liste des impayés |

## Workflows Backend
| ID | Type | Attaché à | Description |
|----|------|-----------|-------------|
| sync-missions | wf-bg | detail-impaye | Synchronise missions |
EOF
    echo ""
    exit 1
fi

log_info "Génération du cells listing depuis app-map.md..."

# Vérifier que pi est disponible
if ! command -v pi &> /dev/null; then
    log_error "La commande 'pi' n'est pas disponible"
    echo "Installe-la d'abord ou utilise le mode manuel"
    exit 1
fi

# Prompt pour pi
PROMPT="
Tu es un architecte logiciel spécialisé en Flask/MVC.

Lis ce document app-map.md qui décrit une application web.

Ta mission:
1. Identifie chaque CELL (écran, wf-bg, cron) mentionné
2. Pour chaque cell, détermine:
   - Type: ecran | wf-bg | cron
   - Nom technique (snake_case)
   - Description courte
   - Dépendances: base layout (toujours), chemin BDD si accès données
3. Génère le fichier cells-listing.md au format ci-dessous

Génère un fichier cells-listing.md au format:

# Cells Listing

## Cell: <nom>
- **Type**: <type>
- **Description**: <description>
- **Dépendances**: <liste>
- **Structure**:
\`\`\`
app/<nom>/
├── __init__.py
├── routes/
│   └── ...
├── models/
│   └── ...
├── templates/
│   └── ...
├── logs/
│   └── ...
└── specs/
    ├── valide.md
    └── ...
\`\`\`

Contenu de app-map.md:
$(cat "$APP_MAP")
"

# Exécution avec pi
if ! pi -p "$PROMPT" > "$OUTPUT" 2>/dev/null; then
    log_error "Erreur lors de l'appel à pi"
    echo "Vérifie que la commande pi fonctionne correctement"
    exit 1
fi

# Vérifier que le fichier a été généré
if [ ! -f "$OUTPUT" ]; then
    log_error "Le fichier $OUTPUT n'a pas été généré"
    exit 1
fi

# Compter les cells trouvées
CELL_COUNT=$(grep -c "^## Cell:" "$OUTPUT" 2>/dev/null || echo "0")

log_info "Cells listing généré: $OUTPUT"
log_info "$CELL_COUNT cells identifiées"
echo ""
echo "Prochaine étape:"
echo "  ./scripts/02a-build-structure-with-existing.sh  (si tu as déjà des specs)"
echo "  ./scripts/02b-build-structure-from-scratch.sh   (si nouveau projet)"
