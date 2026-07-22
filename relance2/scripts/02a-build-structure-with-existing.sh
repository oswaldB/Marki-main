#!/bin/bash
# scripts/02a-build-structure-with-existing.sh
# Construit la structure /app/ organisée par type de cell

set -e

PROJECT_DIR="/home/ubuntu/marki/relance2"
CELLS_LISTING="$PROJECT_DIR/specs-global/cells-listing.md"
APP_DIR="$PROJECT_DIR/app"
SPECS_GLOBAL="$PROJECT_DIR/specs-global"

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

log_step "Construction de la structure /app/ organisée par type..."

# Création dossiers racine
mkdir -p "$APP_DIR/data"
mkdir -p "$APP_DIR/screens"
mkdir -p "$APP_DIR/backend_wf"
mkdir -p "$APP_DIR/cron"

# Étape 1: Extraire les cells dans un tableau
log_step "Extraction des cells depuis cells-listing.md..."

declare -a CELLS_ARRAY
declare -a TYPES_ARRAY

CURRENT_CELL=""
CURRENT_TYPE=""

while IFS= read -r line; do
    if [[ "$line" =~ ^##\ Cell:\ (.+) ]]; then
        CURRENT_CELL="${BASH_REMATCH[1]}"
        continue
    fi

    if [[ "$line" =~ ^-\ \*\*Type\*\*:\ (.+) ]]; then
        CURRENT_TYPE="${BASH_REMATCH[1]}"
        if [ -n "$CURRENT_CELL" ] && [ -n "$CURRENT_TYPE" ]; then
            CELLS_ARRAY+=("$CURRENT_CELL")
            TYPES_ARRAY+=("$CURRENT_TYPE")
            log_info "Cell détectée: $CURRENT_CELL (type: $CURRENT_TYPE)"
            CURRENT_CELL=""
            CURRENT_TYPE=""
        fi
    fi
done < "$CELLS_LISTING"

if [ -n "$CURRENT_CELL" ] && [ -n "$CURRENT_TYPE" ]; then
    CELLS_ARRAY+=("$CURRENT_CELL")
    TYPES_ARRAY+=("$CURRENT_TYPE")
    log_info "Cell détectée: $CURRENT_CELL (type: $CURRENT_TYPE)"
fi

TOTAL_CELLS=${#CELLS_ARRAY[@]}

if [ "$TOTAL_CELLS" -eq 0 ]; then
    log_error "Aucune cell trouvée dans $CELLS_LISTING"
    exit 1
fi

log_info "$TOTAL_CELLS cells à créer"
echo ""

# Contenu du fichier alpinejs.html - ordre: Props -> Init (from workflow-init) -> Workflows
ALPINEJS_CONTENT='<!-- templates/{{ cell_name }}/alpinejs.html -->
<script>
    // Logger global
    const log = {
        debug: (event, data) => console.log(`[DEBUG][${event}]`, JSON.stringify(data)),
        info: (event, data) => console.log(`[INFO][${event}]`, JSON.stringify(data)),
        warn: (event, data) => console.warn(`[WARN][${event}]`, JSON.stringify(data)),
        error: (event, data) => console.error(`[ERROR][${event}]`, JSON.stringify(data))
    };

    document.addEventListener("alpine:init", () => {
        Alpine.data("{{ cell_name }}", () => ({
            // =====================================================
            // 1. PROPS RÉACTIVES - À PERSONNALISER SELON LA CELL
            // =====================================================

            // UI State (conserver ces 3)
            loading: false,
            saving: false,
            error: null,

            // Data - REMPLACER PAR VOS DONNÉES MÉTIER
            // Exemple: items: [], selected: null, filters: {}
            data: [],
            selected: null,

            // Helpers - AJOUTER VOS FORMATTERS
            formatDate(dateStr) {
                if (!dateStr) return "-";
                return new Date(dateStr).toLocaleDateString("fr-FR");
            },

            // =====================================================
            // 2. INIT (depuis workflow-init.html - NE PAS MODIFIER ICI)
            // =====================================================
            {% include "{{ cell_name }}/workflows/workflow-init.html" %},

            // =====================================================
            // 3. WORKFLOWS MÉTIER - AJOUTER VOS {% include %} ICI
            // =====================================================
            // Exemple: {% include "{{ cell_name }}/workflows/load-data.html" %},
            //          {% include "{{ cell_name }}/workflows/save-data.html" %},

        }));
    });
</script>'

# Répertoire des specs globales
RULES_DEV="$PROJECT_DIR/rules/rules.md"
SCHEMA_GLOBAL="$SPECS_GLOBAL/schema.sql"

# Vérifier que les fichiers sources existent
if [ ! -f "$RULES_DEV" ]; then
    log_warn "Fichier $RULES_DEV non trouvé - rules.md ne sera pas copié"
fi

if [ ! -f "$SCHEMA_GLOBAL" ]; then
    log_warn "Fichier $SCHEMA_GLOBAL non trouvé - schema.sql ne sera pas copié"
fi

# Étape 2: Création de la structure (script bash pur) dans le bon dossier
CELL_COUNT=0

for i in "${!CELLS_ARRAY[@]}"; do
    CELL_NAME="${CELLS_ARRAY[$i]}"
    CELL_TYPE="${TYPES_ARRAY[$i]}"

    ((CELL_COUNT++)) || true

    # Déterminer le dossier parent selon le type
    case "$CELL_TYPE" in
        "ecran")
            PARENT_DIR="$APP_DIR/screens"
            ;;
        "wf-bg")
            PARENT_DIR="$APP_DIR/backend_wf"
            ;;
        "cron")
            PARENT_DIR="$APP_DIR/cron"
            ;;
    esac

    log_step "[$CELL_COUNT/$TOTAL_CELLS] Création: $CELL_NAME ($CELL_TYPE) dans $(basename $PARENT_DIR)/"

    # Création des dossiers communs à tous les types
    mkdir -p "$PARENT_DIR/$CELL_NAME/routes"
    mkdir -p "$PARENT_DIR/$CELL_NAME/models"
    mkdir -p "$PARENT_DIR/$CELL_NAME/logs"
    mkdir -p "$PARENT_DIR/$CELL_NAME/specs/LIRE_EN_PREMIER"
    mkdir -p "$PARENT_DIR/$CELL_NAME/specs/models"
    mkdir -p "$PARENT_DIR/$CELL_NAME/specs/routes"
    mkdir -p "$PARENT_DIR/$CELL_NAME/specs/wf-backend"

    # Fichiers communs
    touch "$PARENT_DIR/$CELL_NAME/__init__.py"
    touch "$PARENT_DIR/$CELL_NAME/routes/__init__.py"
    touch "$PARENT_DIR/$CELL_NAME/models/__init__.py"
    
    # Copier rules.md depuis rules/rules.md (version condensée)
    if [ -f "$RULES_DEV" ]; then
        cp "$RULES_DEV" "$PARENT_DIR/$CELL_NAME/specs/LIRE_EN_PREMIER/rules.md"
    else
        touch "$PARENT_DIR/$CELL_NAME/specs/LIRE_EN_PREMIER/rules.md"
    fi
    
    # Copier schema.sql depuis schema global
    if [ -f "$SCHEMA_GLOBAL" ]; then
        cp "$SCHEMA_GLOBAL" "$PARENT_DIR/$CELL_NAME/specs/LIRE_EN_PREMIER/schema.sql"
    else
        touch "$PARENT_DIR/$CELL_NAME/specs/LIRE_EN_PREMIER/schema.sql"
    fi
    
    touch "$PARENT_DIR/$CELL_NAME/specs/wf-backend/workflow-init.md"

    # Structure spécifique selon le type
    case "$CELL_TYPE" in
        "ecran")
            # Écran: templates/, mockups/, wf-frontend/
            mkdir -p "$PARENT_DIR/$CELL_NAME/templates/workflows"
            mkdir -p "$PARENT_DIR/$CELL_NAME/specs/mockups"
            mkdir -p "$PARENT_DIR/$CELL_NAME/specs/wf-frontend"

            touch "$PARENT_DIR/$CELL_NAME/templates/index.html"
            touch "$PARENT_DIR/$CELL_NAME/templates/workflows/workflow-init.html"
            touch "$PARENT_DIR/$CELL_NAME/specs/mockups/etat-normal.html"
            touch "$PARENT_DIR/$CELL_NAME/specs/wf-frontend/workflow-init.md"
            touch "$PARENT_DIR/$CELL_NAME/routes/index.py"
            touch "$PARENT_DIR/$CELL_NAME/routes/api_data.py"

            # Créer alpinejs.html avec contenu
            echo "$ALPINEJS_CONTENT" | sed "s/{{ cell_name }}/$CELL_NAME/g" > "$PARENT_DIR/$CELL_NAME/templates/alpinejs.html"
            ;;
        "wf-bg")
            # Workflow backend
            touch "$PARENT_DIR/$CELL_NAME/routes/wf_${CELL_NAME}.py"
            ;;
        "cron")
            # Cron
            touch "$PARENT_DIR/$CELL_NAME/cron.py"
            touch "$PARENT_DIR/$CELL_NAME/routes/api_trigger.py"
            ;;
    esac

    log_info "Structure créée: $CELL_NAME"
done

echo ""


# Résumé
echo ""
log_info "Structure /app/ construite avec succès"
echo ""
echo "Résumé:"
echo "  📁 Screens créés: $(ls -d "$APP_DIR/screens"/*/ 2>/dev/null | wc -l)"
echo "  📁 Backend-wf créés: $(ls -d "$APP_DIR/backend_wf"/*/ 2>/dev/null | wc -l)"
echo "  📁 Cron créés: $(ls -d "$APP_DIR/cron"/*/ 2>/dev/null | wc -l)"
echo ""
echo "Structure:"
echo "  /app/screens/        → Cells de type écran"
echo "  /app/backend_wf/     → Cells de type workflow backend"
echo "  /app/cron/           → Cells de type cron"
echo ""
echo "Prochaines étapes:"
echo "  1. Vérifier les specs: ls -la app/screens/<cell>/specs/"
echo "  2. Lancer boilerplate: ./scripts/03-init-boilerplate.sh"
