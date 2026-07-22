#!/bin/bash
# scripts/04-dev-cells.sh
# Développe les cells validées avec pi -p

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

# Fonction pour convertir nom en branche
to_branch_name() {
    echo "feature/cell-$(echo "$1" | tr '_' '-')"
}

echo ""
log_step "Recherche des cells à développer..."
echo ""

# Lister les cells à dev
TO_DEV=()
for cell_dir in "$APP_DIR"/*/; do
    if [ -d "$cell_dir/specs" ]; then
        if [ -f "$cell_dir/specs/valide.md" ] && [ ! -f "$cell_dir/specs/devok.md" ]; then
            cell_name=$(basename "$cell_dir")
            TO_DEV+=("$cell_name")
        fi
    fi
done

if [ ${#TO_DEV[@]} -eq 0 ]; then
    log_warn "Aucune cell à développer"
    echo ""
    echo "Conditions pour développer:"
    echo "  - Fichier specs/valide.md doit exister"
    echo "  - Fichier specs/devok.md ne doit PAS exister"
    echo ""
    echo "Cells avec valide.md:"
    find "$APP_DIR" -name "valide.md" -exec dirname {} \; 2>/dev/null | while read dir; do
        cell=$(basename "$dir")
        if [ ! -f "$dir/devok.md" ]; then
            echo "  - $cell (prêt à développer)"
        else
            echo "  - $cell (déjà développé)"
        fi
    done
    echo ""
    echo "Pour marquer une cell comme développée:"
    echo "  touch app/<cell>/specs/devok.md"
    exit 0
fi

echo "📋 Cells à développer (${#TO_DEV[@]}):"
for cell_name in "${TO_DEV[@]}"; do
    echo "  - $cell_name"
done
echo ""

read -p "Continuer le développement? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

# Vérifier que pi est disponible
if ! command -v pi >/dev/null 2>&1; then
    log_error "La commande 'pi' n'est pas disponible"
    exit 1
fi

# Pour chaque cell
for cell_name in "${TO_DEV[@]}"; do
    CELL_DIR="$APP_DIR/$cell_name"
    BRANCH_NAME=$(to_branch_name "$cell_name")
    
    echo ""
    log_highlight "═══════════════════════════════════════"
    log_highlight "📦 Développement: $cell_name"
    log_highlight "🌿 Branche: $BRANCH_NAME"
    log_highlight "═══════════════════════════════════════"
    echo ""
    
    # Création branche
    cd "$PROJECT_DIR"
    
    if git rev-parse --git-dir > /dev/null 2>&1; then
        git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
        log_info "Branche: $BRANCH_NAME"
    else
        log_warn "Pas de repo git, développement sans branche"
    fi
    
    # Lecture des specs
    log_step "Lecture des specs pour $cell_name..."
    
    RULES_MD=""
    if [ -f "$CELL_DIR/specs/A LIRE EN PREMIER/rules.md" ]; then
        RULES_MD=$(cat "$CELL_DIR/specs/A LIRE EN PREMIER/rules.md")
        log_info "Rules.md trouvé"
    fi
    
    SCHEMA_SQL=""
    if [ -f "$CELL_DIR/specs/A LIRE EN PREMIER/schema.sql" ]; then
        SCHEMA_SQL=$(cat "$CELL_DIR/specs/A LIRE EN PREMIER/schema.sql")
        log_info "Schema.sql trouvé"
    fi
    
    WF_FRONTEND=""
    if [ -d "$CELL_DIR/specs/wf-frontend" ]; then
        for wf in "$CELL_DIR/specs/wf-frontend/"*.md; do
            [ -f "$wf" ] && WF_FRONTEND+="$(cat "$wf")


"
        done
        [ -n "$WF_FRONTEND" ] && log_info "Workflows frontend trouvés"
    fi
    
    WF_BACKEND=""
    if [ -d "$CELL_DIR/specs/wf-backend" ]; then
        for wf in "$CELL_DIR/specs/wf-backend/"*.md; do
            [ -f "$wf" ] && WF_BACKEND+="$(cat "$wf")


"
        done
        [ -n "$WF_BACKEND" ] && log_info "Workflows backend trouvés"
    fi
    
    MODELS_SPECS=""
    if [ -d "$CELL_DIR/specs/models" ]; then
        for mf in "$CELL_DIR/specs/models/"*.md; do
            [ -f "$mf" ] && MODELS_SPECS+="$(cat "$mf")


"
        done
        [ -n "$MODELS_SPECS" ] && log_info "Specs modèles trouvées"
    fi
    
    ROUTES_SPECS=""
    if [ -d "$CELL_DIR/specs/routes" ]; then
        for rf in "$CELL_DIR/specs/routes/"*.md; do
            [ -f "$rf" ] && ROUTES_SPECS+="$(cat "$rf")


"
        done
        [ -n "$ROUTES_SPECS" ] && log_info "Specs routes trouvées"
    fi
    
    # Génération du prompt
    log_step "Génération du code avec pi..."
    
    PROMPT="Tu es un développeur Flask/Alpine.js expert.

Développe la cell: $cell_name

## Règles du projet (cellsmvc)
- Structure: routes/ (1 fichier par route/wf-bg), models/ (1 fichier par modèle), templates/ (plat)
- Frontend: Alpine.js + Jinja2 + Tailwind (CDN)
- Backend: Flask, SQLite
- Workflows frontend dans templates/workflows/
- Workflows backend dans routes/ (préfixés wf_)
- Logs dans logs/
- Toujours générer des fichiers complets et fonctionnels

## Spécifications à implémenter:

### Règles spécifiques:
$RULES_MD

### Schéma SQL:
$SCHEMA_SQL

### Spécifications Modèles:
$MODELS_SPECS

### Spécifications Routes:
$ROUTES_SPECS

### Workflows Frontend:
$WF_FRONTEND

### Workflows Backend:
$WF_BACKEND

## Ta mission:
1. Crée/complète tous les fichiers Python (__init__.py, routes/*.py, models/*.py)
2. Crée les templates HTML (index.html, alpinejs.html, workflows/*.html)
3. Assure-toi que la cell est fonctionnelle
4. Respecte strictement l'architecture cellsmvc

Pour CHAQUE fichier, donne:
- Le chemin complet relatif (ex: app/$cell_name/routes/index.py)
- Le contenu entre balises code

Exemple:

FICHIER: app/$cell_name/__init__.py
\`\`\`python
# contenu complet
\`\`\`

Réponds avec TOUS les fichiers complets et prêts à l'emploi."
    
    # Exécution pi
    OUTPUT_FILE="$CELL_DIR/dev-output.md"
    if pi -p "$PROMPT" > "$OUTPUT_FILE" 2>/dev/null; then
        log_info "Code généré dans: $OUTPUT_FILE"
    else
        log_error "Erreur lors de la génération du code"
        continue
    fi
    
    # Extraction et écriture des fichiers
    log_step "Extraction des fichiers..."
    
    python3 << PYTHON_EOF
import re
import os

output_file = "$OUTPUT_FILE"
cell_dir = "$CELL_DIR"

with open(output_file, 'r') as f:
    content = f.read()

# Pattern pour trouver les fichiers
pattern = r'FICHIER:\s*(\S+)\s*```(?:\w+)?\s*\n(.*?)\n```'
matches = re.findall(pattern, content, re.DOTALL)

files_created = 0
for filepath, filecontent in matches:
    filepath = filepath.strip()
    filecontent = filecontent.strip()
    
    # Convertir chemin relatif
    if filepath.startswith('app/'):
        full_path = os.path.join("$PROJECT_DIR", filepath)
    else:
        full_path = os.path.join(cell_dir, filepath)
    
    # Créer le dossier parent
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    
    # Écrire le fichier
    with open(full_path, 'w') as f:
        f.write(filecontent)
    
    print(f"  ✅ {filepath}")
    files_created += 1

print(f"\n{files_created} fichiers extraits")
PYTHON_EOF
    
    # Nettoyer le fichier de sortie
    rm "$OUTPUT_FILE"
    
    # Commit si git
    if git rev-parse --git-dir > /dev/null 2>&1; then
        git add "$CELL_DIR" 2>/dev/null || true
        git commit -m "feat($cell_name): implémentation cell" 2>/dev/null || true
        
        # Push
        if git remote >/dev/null 2>&1; then
            git push -u origin "$BRANCH_NAME" 2>/dev/null || log_warn "Push manuel nécessaire"
        fi
    fi
    
    log_info "$cell_name développé avec succès"
    
    # Proposer de marquer comme devok
    read -p "Marquer comme développé (créer devok.md)? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cat > "$CELL_DIR/specs/devok.md" << EOF
# Développement OK

Date: $(date -Iseconds)
Cell: $cell_name
Statut: Développée

## Fichiers créés
$(find "$CELL_DIR" -type f -name "*.py" -o -name "*.html" | wc -l) fichiers

## Tests
- [ ] Test manuel effectué
- [ ] Logs vérifiés
EOF
        log_info "devok.md créé"
    fi
    
    echo ""
done

echo ""
log_highlight "═══════════════════════════════════════"
log_highlight "✅ Cycle de développement terminé"
log_highlight "═══════════════════════════════════════"
echo ""
echo "Pour tester les cells:"
echo "  ./scripts/05-test-cells.sh"
echo ""
echo "Pour créer des PR (si git configuré):"
echo "  gh pr create --title 'feat: <cell>' --body 'Implémentation'"
