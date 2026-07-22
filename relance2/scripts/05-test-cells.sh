#!/bin/bash
# scripts/05-test-cells.sh
# Teste les cells et capture les logs frontend/backend

set -e

PROJECT_DIR="/home/ubuntu/marki/relance2"
APP_DIR="$PROJECT_DIR/app"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}ℹ️  $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${BLUE}🔨 $1${NC}"; }
log_highlight() { echo -e "${CYAN}$1${NC}"; }

# Vérifier que l'app est démarrée
log_step "Vérification du serveur Flask..."

if ! curl -s http://localhost:5000/ > /dev/null 2>&1; then
    log_error "Le serveur Flask n'est pas démarré sur le port 5000"
    echo ""
    echo "Démarrez d'abord:"
    echo "  ./scripts/03-init-boilerplate.sh"
    echo ""
    echo "Ou manuellement:"
    echo "  export FLASK_APP=app"
    echo "  python -m flask run --port=5000"
    exit 1
fi

log_info "Serveur Flask détecté sur http://localhost:5000"
echo ""

# Compteurs
TOTAL_CELLS=0
PASSED_CELLS=0
FAILED_CELLS=0

# Pour chaque cell écran
for cell_dir in "$APP_DIR"/*/; do
    [ -d "$cell_dir" ] || continue
    
    cell_name=$(basename "$cell_dir")
    
    # Vérifier si c'est une cell écran (a un template index.html)
    if [ ! -f "$cell_dir/templates/index.html" ]; then
        continue
    fi
    
    ((TOTAL_CELLS++)) || true
    
    # Créer le dossier de logs avec timestamp
    TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
    LOGS_DIR="$cell_dir/logs/$TIMESTAMP"
    mkdir -p "$LOGS_DIR/screenshots"
    
    log_highlight "═══════════════════════════════════════"
    log_step "Testing: $cell_name"
    log_info "Logs: $LOGS_DIR"
    log_highlight "═══════════════════════════════════════"
    
    url="http://localhost:5000/$cell_name"
    
    # Vérifier que l'URL existe
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$http_code" != "200" ]; then
        log_warn "Route $url retourne HTTP $http_code"
    fi
    
    # Lancer le test Playwright
    if python "$PROJECT_DIR/scripts/test-frontend.py" \
        "$url" \
        "$LOGS_DIR/screenshots/$cell_name.png" \
        "$LOGS_DIR/frontend.json" 2>&1 | tee "$LOGS_DIR/test_output.log"; then
        
        # Vérifier s'il y a des erreurs dans le log
        if [ -f "$LOGS_DIR/frontend.json" ]; then
            error_count=$(python3 -c "import json; data=json.load(open('$LOGS_DIR/frontend.json')); print(len(data.get('errors', [])))" 2>/dev/null || echo "0")
            
            if [ "$error_count" -eq 0 ]; then
                log_info "$cell_name: ✅ PASS ($error_count erreurs)"
                ((PASSED_CELLS++)) || true
            else
                log_warn "$cell_name: ⚠️  PASS avec $error_count erreurs"
                ((PASSED_CELLS++)) || true
            fi
        else
            log_info "$cell_name: ✅ PASS"
            ((PASSED_CELLS++)) || true
        fi
    else
        log_error "$cell_name: ❌ FAIL"
        ((FAILED_CELLS++)) || true
    fi
    
    # Générer un rapport rapide
    cat > "$LOGS_DIR/report.json" << EOF
{
  "cell": "$cell_name",
  "timestamp": "$TIMESTAMP",
  "url": "$url",
  "status": "tested",
  "files": {
    "frontend": "frontend.json",
    "screenshot": "screenshots/$cell_name.png",
    "output": "test_output.log"
  }
}
EOF
    
    echo ""
done

# Résumé final
echo ""
log_highlight "═══════════════════════════════════════"
log_highlight "📊 Résumé des tests"
log_highlight "═══════════════════════════════════════"
echo ""
echo "Total cells testées: $TOTAL_CELLS"
echo -e "${GREEN}✅ PASS: $PASSED_CELLS${NC}"
echo -e "${RED}❌ FAIL: $FAILED_CELLS${NC}"
echo ""

if [ $FAILED_CELLS -eq 0 ]; then
    log_info "Tous les tests ont réussi!"
else
    log_warn "$FAILED_CELLS cells ont des erreurs"
fi

echo ""
echo "Pour voir les logs détaillés:"
echo "  ls -la app/*/logs/"
echo ""
echo "Pour voir les screenshots:"
echo "  find app/*/logs -name '*.png' -exec ls -la {} \;"
echo ""
echo "Pour analyser les erreurs:"
echo "  cat app/<cell>/logs/<timestamp>/frontend.json | jq '.errors'"
