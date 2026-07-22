#!/bin/bash
# scripts/02a-build-structure-with-existing.sh
# Construit la structure /app/ en récupérant les specs existantes

set -e

PROJECT_DIR="/home/ubuntu/marki/relance2"
CELLS_LISTING="$PROJECT_DIR/specs-global/cells-listing.md"
APP_DIR="$PROJECT_DIR/app"
SPECS_DIR="$PROJECT_DIR/specs"

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

log_step "Construction de la structure /app/ avec récupération des specs existantes..."

# Création dossier data
mkdir -p "$APP_DIR/data"

# Étape 1: Création de la structure de base via pi
log_step "Création de la structure de dossiers..."

PROMPT="
Tu es un développeur Flask expert.

Lis ce cells-listing.md qui décrit toutes les cells à créer.

Génère UNIQUEMENT des commandes bash pour:
1. Créer tous les dossiers nécessaires (mkdir -p)
2. Créer les fichiers __init__.py vides (touch)
3. Créer les fichiers de specs vides (touch valide.md, A LIRE EN PREMIER/rules.md, etc.)

Règles:
- Structure: app/<cell_name>/routes/, app/<cell_name>/models/, app/<cell_name>/templates/workflows/, app/<cell_name>/logs/, app/<cell_name>/specs/
- Pour chaque cell, créer aussi specs/A LIRE EN PREMIER/, specs/mockups/, specs/wf-frontend/, specs/wf-backend/
- Pas de contenu, juste la structure
- Utilise des chemins absolus depuis $PROJECT_DIR

Contenu:
$(cat "$CELLS_LISTING")
"

# Génération et exécution des commandes
if command -v pi > /dev/null 2>&1; then
    COMMANDS=$(pi -p "$PROMPT" 2>/dev/null)
    eval "$COMMANDS" 2>/dev/null || log_warn "Certaines commandes ont échoué (peut être normal)"
else
    log_warn "Commande 'pi' non disponible, création manuelle..."
    
    # Création manuelle basique
    while IFS= read -r line; do
        if [[ "$line" =~ ^##\ Cell:\ (.+) ]]; then
            cell_name="${BASH_REMATCH[1]}"
            log_info "Création structure pour: $cell_name"
            
            mkdir -p "$APP_DIR/$cell_name"/{routes,models,templates/workflows,logs,specs/{mockups,wf-frontend,wf-backend,models,routes,"A LIRE EN PREMIER"}}
            touch "$APP_DIR/$cell_name/__init__.py"
            touch "$APP_DIR/$cell_name/routes/__init__.py"
            touch "$APP_DIR/$cell_name/models/__init__.py"
            touch "$APP_DIR/$cell_name/specs/valide.md"
        fi
    done < "$CELLS_LISTING"
fi

# Étape 2: Recherche et copie des specs existantes
echo ""
log_step "Recherche et copie des specs existantes..."

COPIED_CELLS=0
for cell_dir in "$APP_DIR"/*/; do
    [ -d "$cell_dir" ] || continue
    
    cell_name=$(basename "$cell_dir")
    existing_specs="$SPECS_DIR/$cell_name"
    
    if [ -d "$existing_specs" ]; then
        log_info "Cell trouvée: $cell_name"
        
        # Copie des mockups
        if [ -d "$existing_specs/mockups" ] && [ "$(ls -A "$existing_specs/mockups" 2>/dev/null)" ]; then
            echo "      📄 Copie mockups/"
            cp -r "$existing_specs/mockups/"* "$cell_dir/specs/mockups/" 2>/dev/null || true
        fi
        
        # Copie des workflows frontend
        if [ -d "$existing_specs/wf-frontend" ] && [ "$(ls -A "$existing_specs/wf-frontend" 2>/dev/null)" ]; then
            echo "      📄 Copie wf-frontend/"
            cp -r "$existing_specs/wf-frontend/"* "$cell_dir/specs/wf-frontend/" 2>/dev/null || true
        fi
        
        # Copie des workflows backend
        if [ -d "$existing_specs/wf-backend" ] && [ "$(ls -A "$existing_specs/wf-backend" 2>/dev/null)" ]; then
            echo "      📄 Copie wf-backend/"
            cp -r "$existing_specs/wf-backend/"* "$cell_dir/specs/wf-backend/" 2>/dev/null || true
        fi
        
        # Copie des specs models
        if [ -d "$existing_specs/models" ] && [ "$(ls -A "$existing_specs/models" 2>/dev/null)" ]; then
            echo "      📄 Copie models/"
            cp -r "$existing_specs/models/"* "$cell_dir/specs/models/" 2>/dev/null || true
        fi
        
        # Copie des specs routes
        if [ -d "$existing_specs/routes" ] && [ "$(ls -A "$existing_specs/routes" 2>/dev/null)" ]; then
            echo "      📄 Copie routes/"
            cp -r "$existing_specs/routes/"* "$cell_dir/specs/routes/" 2>/dev/null || true
        fi
        
        # Copie schema.sql
        if [ -f "$existing_specs/schema.sql" ]; then
            echo "      📄 Copie schema.sql"
            cp "$existing_specs/schema.sql" "$cell_dir/specs/A LIRE EN PREMIER/"
        fi
        
        # Copie rules.md
        if [ -f "$existing_specs/rules.md" ]; then
            echo "      📄 Copie rules.md"
            cp "$existing_specs/rules.md" "$cell_dir/specs/A LIRE EN PREMIER/"
        fi
        
        ((COPIED_CELLS++)) || true
    fi
done

# Étape 3: Copie depuis specs-global si présent
echo ""
log_step "Copie depuis specs-global/..."

for cell_dir in "$APP_DIR"/*/; do
    [ -d "$cell_dir" ] || continue
    
    cell_name=$(basename "$cell_dir")
    global_specs="$PROJECT_DIR/specs-global/$cell_name"
    
    if [ -d "$global_specs" ]; then
        log_info "Copie specs-global/$cell_name"
        cp -r "$global_specs"/* "$cell_dir/specs/" 2>/dev/null || true
    fi
done

# Résumé
echo ""
log_info "Structure /app/ construite avec succès"
echo ""
echo "Résumé:"
echo "  📁 Cells créées: $(ls -d "$APP_DIR"/*/ 2>/dev/null | wc -l)"
echo "  📄 Cells avec specs copiées: $COPIED_CELLS"
echo ""
echo "Prochaines étapes:"
echo "  1. Vérifier les specs: ls -la app/<cell>/specs/"
echo "  2. Valider une cell: touch app/<cell>/specs/valide.md"
echo "  3. Lancer boilerplate: ./scripts/03-init-boilerplate.sh"
