#!/bin/bash
# scripts/02b-build-structure-from-scratch.sh
# Construit la structure /app/ vide (sans récupération de specs)

set -e

PROJECT_DIR="/home/ubuntu/marki/relance2"
CELLS_LISTING="$PROJECT_DIR/specs-global/cells-listing.md"
APP_DIR="$PROJECT_DIR/app"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}ℹ️  $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${BLUE}🔨 $1${NC}"; }

if [ ! -f "$CELLS_LISTING" ]; then
    log_error "$CELLS_LISTING n'existe pas"
    echo "Exécute d'abord: ./scripts/01-generate-cells.sh"
    exit 1
fi

log_step "Construction de la structure /app/ (from scratch)..."

# Création dossier data
mkdir -p "$APP_DIR/data"

# Lecture du cells-listing et création manuelle
CELL_COUNT=0

while IFS= read -r line; do
    if [[ "$line" =~ ^##\ Cell:\ (.+) ]]; then
        cell_name="${BASH_REMATCH[1]}"
        log_info "Création structure pour: $cell_name"
        
        # Créer la structure complète
        mkdir -p "$APP_DIR/$cell_name"/{routes,models,templates/workflows,logs,specs/{mockups,wf-frontend,wf-backend,models,routes,"A LIRE EN PREMIER"}}
        
        # Fichiers de base
        touch "$APP_DIR/$cell_name/__init__.py"
        touch "$APP_DIR/$cell_name/routes/__init__.py"
        touch "$APP_DIR/$cell_name/models/__init__.py"
        
        # Fichiers de specs
        touch "$APP_DIR/$cell_name/specs/valide.md"
        touch "$APP_DIR/$cell_name/specs/A LIRE EN PREMIER/rules.md"
        cat > "$APP_DIR/$cell_name/specs/A LIRE EN PREMIER/schema.sql" << 'EOF'
-- Schema SQL de la cell
-- Décrivez ici les tables spécifiques à cette cell
EOF
        
        ((CELL_COUNT++)) || true
    fi
done < "$CELLS_LISTING"

if [ "$CELL_COUNT" -eq 0 ]; then
    log_warn "Aucune cell trouvée dans $CELLS_LISTING"
    log_warn "Le fichier existe mais ne contient peut-être pas de cells au bon format"
    exit 1
fi

# Résumé
echo ""
log_info "Structure /app/ construite avec succès"
echo ""
echo "Résumé:"
echo "  📁 Cells créées: $CELL_COUNT"
echo "  📁 Dossier data créé: $APP_DIR/data/"
echo ""
echo "Prochaines étapes:"
echo "  1. Remplir les specs: app/<cell>/specs/"
echo "  2. Valider: touch app/<cell>/specs/valide.md"
echo "  3. Lancer boilerplate: ./scripts/03-init-boilerplate.sh"
