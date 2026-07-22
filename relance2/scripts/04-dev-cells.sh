#!/bin/bash
# scripts/04-dev-cells.sh
# Développe et teste les cells validées

set -e

PROJECT_DIR="/home/ubuntu/marki/relance2"
APP_DIR="$PROJECT_DIR/app"
TEST_AFTER_DEV=true  # Activer les tests après chaque dev

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

# Lister les cells à dev (recherche récursive dans tous les sous-répertoires)
TO_DEV=()
TO_DEV_DIRS=()
while IFS= read -r valide_file; do
    cell_specs_dir=$(dirname "$valide_file")
    cell_dir=$(dirname "$cell_specs_dir")
    if [ ! -f "$cell_specs_dir/devok.md" ]; then
        cell_name=$(basename "$cell_dir")
        # Vérifier qu'on n'a pas déjà cette cell (éviter les doublons)
        already_in_list=false
        for existing in "${TO_DEV_DIRS[@]}"; do
            if [ "$existing" = "$cell_dir" ]; then
                already_in_list=true
                break
            fi
        done
        if [ "$already_in_list" = false ]; then
            TO_DEV+=("$cell_name")
            TO_DEV_DIRS+=("$cell_dir")
        fi
    fi
done < <(find "$APP_DIR" -name "valide.md" -type f 2>/dev/null)

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

# Compteurs pour le résumé final
TOTAL_CELLS=0
PASSED_CELLS=0
FAILED_CELLS=0

# Tracking des erreurs pour correction automatique
FAILED_CELLS_NAMES=()
FAILED_CELLS_DIRS=()
FAILED_CELLS_LOGS=()
FAILED_CELLS_ERRORS=()

# Pour chaque cell
idx=0
for cell_name in "${TO_DEV[@]}"; do
    CELL_DIR="${TO_DEV_DIRS[$idx]}"
    idx=$((idx + 1))
    ((TOTAL_CELLS++)) || true
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

    # Vider la cell (garder structure mais supprimer contenu sauf specs/)
    log_step "Nettoyage de la cell $cell_name..."
    # Supprimer tous les fichiers et dossiers sauf specs/
    find "$CELL_DIR" -mindepth 1 -maxdepth 1 -not -name "specs" -exec rm -rf {} + 2>/dev/null || true
    # Recréer les dossiers de base vides
    mkdir -p "$CELL_DIR/routes" "$CELL_DIR/models" "$CELL_DIR/templates" "$CELL_DIR/logs"
    log_info "Cell nettoyée (specs/ conservé)"

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

    PROMPT=$(cat << 'PROMPT_EOF'
Tu es un développeur Flask/Alpine.js expert.

Développe la cell: __CELL_NAME__

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
__RULES_MD__

### Schéma SQL:
__SCHEMA_SQL__

### Spécifications Modèles:
__MODELS_SPECS__

### Spécifications Routes:
__ROUTES_SPECS__

### Workflows Frontend:
__WF_FRONTEND__

### Workflows Backend:
__WF_BACKEND__

## Ta mission:
1. Crée/complète tous les fichiers Python (__init__.py, routes/*.py, models/*.py)
2. Crée les templates HTML (index.html, alpinejs.html, workflows/*.html)
3. Assure-toi que la cell est fonctionnelle
4. Respecte strictement l'architecture cellsmvc

## IMPORTANT - NE PAS GÉNÉRER:
- **NE génère PAS app.py** (le fichier app.py principal est géré automatiquement par le système)
- Ne génère que les fichiers de la cell elle-même

Pour CHAQUE fichier, donne un élément YAML avec:
- chemin: le chemin complet relatif (ex: app/screens/__CELL_NAME__/routes/index.py)
- contenu: le code complet avec le pipe |

Exemple de sortie YAML:

fichiers:
  - chemin: app/screens/__CELL_NAME__/__init__.py
    contenu: |
      # contenu complet ici
  - chemin: app/screens/__CELL_NAME__/routes/index.py
    contenu: |
      # autre contenu

Réponds avec UN SEUL document YAML complet commençant par 'fichiers:' et contenant TOUS les fichiers. Si un fichier existe déjà dans le template, remplace-le complètement par ta version. Garde uniquement les fichiers nécessaires.
PROMPT_EOF
)

    # Substitution des variables
    PROMPT=${PROMPT//__CELL_NAME__/$cell_name}
    PROMPT=${PROMPT//__RULES_MD__/$RULES_MD}
    PROMPT=${PROMPT//__SCHEMA_SQL__/$SCHEMA_SQL}
    PROMPT=${PROMPT//__MODELS_SPECS__/$MODELS_SPECS}
    PROMPT=${PROMPT//__ROUTES_SPECS__/$ROUTES_SPECS}
    PROMPT=${PROMPT//__WF_FRONTEND__/$WF_FRONTEND}
    PROMPT=${PROMPT//__WF_BACKEND__/$WF_BACKEND}

    # Détecter le type de cell pour construire les chemins
    if [[ "$CELL_DIR" == */screens/* ]]; then
        CELL_TYPE="screens"
        CELL_PATH="app/screens/$cell_name"
    elif [[ "$CELL_DIR" == */backend_wf/* ]]; then
        CELL_TYPE="backend_wf"
        CELL_PATH="app/backend_wf/$cell_name"
    elif [[ "$CELL_DIR" == */cron/* ]]; then
        CELL_TYPE="cron"
        CELL_PATH="app/cron/$cell_name"
    else
        CELL_TYPE="screens"
        CELL_PATH="app/screens/$cell_name"
    fi

    # Créer le document YAML pré-rempli avec structure et instructions
    OUTPUT_FILE="$CELL_DIR/dev-output.yaml"
    log_step "Construction du document YAML avec instructions..."
    
    # Générer le document YAML directement en bash
    {
        echo "cell:"
        echo "  name: $cell_name"
        echo "  type: $CELL_TYPE"
        echo "  path: $CELL_PATH"
        echo ""
        echo "context:"
        echo "  rules: |"
        echo "    $(echo "$RULES_MD" | head -100 | sed 's/^/    /')"
        echo "  schema: |"
        echo "    $(echo "$SCHEMA_SQL" | head -50 | sed 's/^/    /')"
        echo ""
        echo "instructions_ia: |"
        echo "  Remplacer tous les champs 'contenu' par du code fonctionnel complet."
        echo "  Respecter les specs_context et instructions pour chaque fichier."
        echo ""
        echo "fichiers:"
        echo ""
        
        # 1. Blueprint
        echo "  - chemin: $CELL_PATH/__init__.py"
        echo "    type: python"
        echo "    description: Blueprint Flask"
        echo "    instructions: Créer bp = Blueprint('$cell_name', __name__, template_folder='templates')"
        echo "    specs_context: \"\""
        echo "    contenu: |"
        echo "      # À IMPLEMENTER: Blueprint Flask"
        echo ""
        
        # 2. Layout Alpine.js
        echo "  - chemin: $CELL_PATH/templates/alpinejs.html"
        echo "    type: html"
        echo "    description: Layout Alpine.js + Tailwind"
        echo "    instructions: HTML5 avec Alpine.js CDN (defer), Tailwind CDN, blocks Jinja2"
        echo "    specs_context: \"\""
        echo "    contenu: |"
        echo '      <!DOCTYPE html>'
        echo '      <html lang="fr">'
        echo '      <head>'
        echo '          <meta charset="UTF-8">'
        echo '          <meta name="viewport" content="width=device-width, initial-scale=1.0">'
        echo "          <title>{% block title %}{% endblock %} - $cell_name</title>"
        echo '          <script src="https://cdn.tailwindcss.com"></script>'
        echo '          <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>'
        echo '          {% block extra_css %}{% endblock %}'
        echo '      </head>'
        echo '      <body class="bg-gray-100 min-h-screen" x-data="{}">'
        echo '          {% block content %}{% endblock %}'
        echo '          {% block extra_js %}{% endblock %}'
        echo '      </body>'
        echo '      </html>'
        echo ""
        
        # 3. Index HTML
        INDEX_SPEC=""
        [ -f "$CELL_DIR/specs/routes/index.md" ] && INDEX_SPEC=$(head -50 "$CELL_DIR/specs/routes/index.md")
        echo "  - chemin: $CELL_PATH/templates/index.html"
        echo "    type: html"
        echo "    description: Page principale"
        echo "    instructions: Étendre alpinejs.html, implémenter block content avec Alpine.js"
        echo "    specs_context: |"
        echo "$INDEX_SPEC" | sed 's/^/      /'
        echo "    contenu: |"
        echo "      {% extends 'alpinejs.html' %}"
        echo "      {% block content %}"
        echo "      <!-- À IMPLEMENTER -->"
        echo "      {% endblock %}"
        echo ""
        
        # 4. Routes
        echo "  - chemin: $CELL_PATH/routes/__init__.py"
        echo "    type: python"
        echo "    description: Package routes"
        echo "    instructions: Vide ou imports communs"
        echo "    specs_context: \"\""
        echo "    contenu: |"
        echo "      # Package routes"
        echo ""
        
        # 5. Route index
        echo "  - chemin: $CELL_PATH/routes/index.py"
        echo "    type: python"
        echo "    description: Route GET /"
        echo "    instructions: @bp.route('/') def index(): return render_template('index.html')"
        echo "    specs_context: |"
        echo "$INDEX_SPEC" | sed 's/^/      /'
        echo "    contenu: |"
        echo "      # À IMPLEMENTER: Route GET /"
        echo ""
        
        # Routes additionnelles
        if [ -d "$CELL_DIR/specs/routes" ]; then
            for route_file in "$CELL_DIR/specs/routes/"*.md; do
                [ -f "$route_file" ] || continue
                route_name=$(basename "$route_file" .md)
                [ "$route_name" = "index" ] && continue
                route_spec=$(head -50 "$route_file" 2>/dev/null || echo "")
                echo "  - chemin: $CELL_PATH/routes/$route_name.py"
                echo "    type: python"
                echo "    description: Route /$route_name"
                echo "    instructions: bp.route('/$route_name') selon specs"
                echo "    specs_context: |"
                echo "$route_spec" | sed 's/^/      /'
                echo "    contenu: |"
                echo "      # À IMPLEMENTER: Route /$route_name"
                echo ""
            done
        fi
        
        # 6. Modèles
        echo "  - chemin: $CELL_PATH/models/__init__.py"
        echo "    type: python"
        echo "    description: Modèles de données"
        echo "    instructions: Classes SQLAlchemy selon schema.sql"
        echo "    specs_context: |"
        echo "      $(echo "$SCHEMA_SQL" | head -30 | sed 's/^/      /')"
        echo "    contenu: |"
        echo "      # À IMPLEMENTER: Modèles"
        echo ""
        
        # Modèles additionnels
        if [ -d "$CELL_DIR/specs/models" ]; then
            for model_file in "$CELL_DIR/specs/models/"*.md; do
                [ -f "$model_file" ] || continue
                model_name=$(basename "$model_file" .md)
                model_spec=$(head -50 "$model_file" 2>/dev/null || echo "")
                echo "  - chemin: $CELL_PATH/models/$model_name.py"
                echo "    type: python"
                echo "    description: Modèle $model_name"
                echo "    instructions: Implémenter selon specs"
                echo "    specs_context: |"
                echo "$model_spec" | sed 's/^/      /'
                echo "    contenu: |"
                echo "      # À IMPLEMENTER: Modèle $model_name"
                echo ""
            done
        fi
        
        # Workflows frontend
        if [ -d "$CELL_DIR/specs/wf-frontend" ]; then
            for wf_file in "$CELL_DIR/specs/wf-frontend/"*.md; do
                [ -f "$wf_file" ] || continue
                wf_name=$(basename "$wf_file" .md)
                wf_spec=$(head -50 "$wf_file" 2>/dev/null || echo "")
                echo "  - chemin: $CELL_PATH/templates/workflows/$wf_name.html"
                echo "    type: html"
                echo "    description: Workflow frontend $wf_name"
                echo "    instructions: Template avec Alpine.js"
                echo "    specs_context: |"
                echo "$wf_spec" | sed 's/^/      /'
                echo "    contenu: |"
                echo "      {% extends 'alpinejs.html' %}"
                echo "      {% block content %}"
                echo "      <!-- À IMPLEMENTER: Workflow $wf_name -->"
                echo "      {% endblock %}"
                echo ""
            done
        fi
        
        # Workflows backend
        if [ -d "$CELL_DIR/specs/wf-backend" ]; then
            for wf_file in "$CELL_DIR/specs/wf-backend/"*.md; do
                [ -f "$wf_file" ] || continue
                wf_name=$(basename "$wf_file" .md)
                wf_spec=$(head -50 "$wf_file" 2>/dev/null || echo "")
                echo "  - chemin: $CELL_PATH/routes/wf_$wf_name.py"
                echo "    type: python"
                echo "    description: Workflow backend $wf_name"
                echo "    instructions: Route workflow backend"
                echo "    specs_context: |"
                echo "$wf_spec" | sed 's/^/      /'
                echo "    contenu: |"
                echo "      # À IMPLEMENTER: Workflow $wf_name"
                echo ""
            done
        fi
        
    } > "$OUTPUT_FILE"
    
    log_info "Document YAML créé: $OUTPUT_FILE"
    
    # Préparer le prompt qui inclut le document
    PROMPT_HEADER=$(cat << 'HEADER_EOF'
Tu es un développeur Flask/Alpine.js expert.

Tu vas recevoir un DOCUMENT YAML décrivant une cell à développer.
Ce document contient:
- cell: métadonnées (nom, type, chemin)
- contexte: règles, schéma SQL
- fichiers: liste des fichiers à créer, chacun avec:
  * chemin: chemin complet relatif
  * description: à quoi sert ce fichier
  * instructions: comment l'implémenter
  * specs_context: extraits des specs .md
  * contenu: code actuel (placeholder)

TA MISSION:
Complète le champ "contenu" de CHAQUE fichier avec du CODE FONCTIONNEL COMPLET.

RÈGLES:
- Flask + SQLite backend
- Alpine.js + Tailwind CDN frontend
- Jinja2 templates avec extends
- Respecte strictement les specs_context et instructions
- Code complet, pas de placeholders

RÉPONDS avec le DOCUMENT YAML complet, tous les "contenu" remplis.

DOCUMENT YAML À COMPLÉTER:
---
HEADER_EOF
)

    # Combiner prompt + document YAML
    echo "$PROMPT_HEADER" > /tmp/prompt_full.txt
    cat "$OUTPUT_FILE" >> /tmp/prompt_full.txt

    # Exécution pi
    log_step "Génération du code avec pi..."
    if cd "$PROJECT_DIR" && pi -p "$(cat /tmp/prompt_full.txt)" > "$OUTPUT_FILE" 2>/dev/null; then
        log_info "Code généré dans: $OUTPUT_FILE"
    else
        log_error "Erreur lors de la génération du code"
        continue
    fi

    # Pause utilisateur pour validation de la génération
    echo ""
    log_info "Code généré dans $OUTPUT_FILE"
    read -p "Valider et continuer l'extraction? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "Abandon de la cell $cell_name - dev-output.yaml conservé pour inspection"
        continue
    fi

    # Extraction et écriture des fichiers
    log_step "Extraction des fichiers..."

    python3 << PYTHON_EOF
import yaml
import os
import sys

output_file = "$OUTPUT_FILE"
cell_dir = "$CELL_DIR"

# Lire tout le contenu du fichier
with open(output_file, 'r') as f:
    content = f.read()

# Parser tous les blocs YAML (séparés par des lignes vides ou commentaires)
# On utilise une approche simple : on extrait tous les documents YAML
from yaml import safe_load_all

all_fichiers = {}

# Essayer de parser comme un document unique d'abord
try:
    data = yaml.safe_load(content)
    if isinstance(data, dict) and 'fichiers' in data:
        for item in data['fichiers']:
            if isinstance(item, dict) and 'chemin' in item:
                all_fichiers[item['chemin']] = item.get('contenu', '')
except:
    pass

# Si pas de fichiers trouvés, essayer de parser tous les documents
try:
    docs = list(yaml.safe_load_all(content))
    for doc in docs:
        if isinstance(doc, dict) and 'fichiers' in doc:
            for item in doc['fichiers']:
                if isinstance(item, dict) and 'chemin' in item:
                    # La dernière occurrence écrase la précédente (priorité à l'IA)
                    all_fichiers[item['chemin']] = item.get('contenu', '')
except Exception as e:
    print(f"Erreur parsing YAML: {e}")
    sys.exit(1)

files_created = 0
skipped = 0

for filepath, filecontent in all_fichiers.items():
    if not filepath:
        continue
    
    if isinstance(filecontent, str):
        filecontent = filecontent.strip()
    else:
        filecontent = str(filecontent) if filecontent else ''

    # Ignorer explicitement app.py (géré automatiquement par le script)
    if os.path.basename(filepath) == 'app.py':
        print(f"  ⚠️  Ignoré (app.py géré automatiquement): {filepath}")
        skipped += 1
        continue

    # Convertir chemin relatif
    if filepath.startswith('app/'):
        # Éviter les chemins avec double app/
        cell_rel_path = "$CELL_DIR".replace("$PROJECT_DIR/", "")
        if filepath.startswith('app/' + cell_rel_path + '/app/'):
            filepath = filepath.replace(cell_rel_path + '/app/', cell_rel_path + '/')
        full_path = os.path.join("$PROJECT_DIR", filepath)
    else:
        full_path = os.path.join(cell_dir, filepath)

    # Vérifier que le fichier est bien dans la cell
    if not full_path.startswith(cell_dir):
        print(f"  ⚠️  Ignoré (hors cell): {filepath}")
        skipped += 1
        continue

    # Créer le dossier parent
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    # Écrire le fichier
    with open(full_path, 'w') as f:
        f.write(filecontent)

    print(f"  ✅ {filepath}")
    files_created += 1

print(f"\n{files_created} fichiers extraits, {skipped} ignorés")
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

    # ═══════════════════════════════════════════════════════════════
    # MISE À JOUR DE APP.PY - AJOUT DE LA ROUTE
    # ═══════════════════════════════════════════════════════════════
    log_step "Mise à jour de app.py avec la nouvelle route..."

    APP_PY_FILE="$APP_DIR/app.py"

    # Détecter le type de cell et construire le chemin d'import
    if [[ "$CELL_DIR" == */screens/* ]]; then
        CELL_TYPE="screens"
        URL_PREFIX="/$cell_name"
    elif [[ "$CELL_DIR" == */backend_wf/* ]]; then
        CELL_TYPE="backend_wf"
        URL_PREFIX="/api/$cell_name"
    elif [[ "$CELL_DIR" == */cron/* ]]; then
        CELL_TYPE="cron"
        URL_PREFIX="/$cell_name"
    elif [[ "$CELL_DIR" == */backend_wf/* ]]; then
        CELL_TYPE="backend_wf"
        URL_PREFIX="/api/$cell_name"
    else
        CELL_TYPE="screens"
        URL_PREFIX="/$cell_name"
    fi

    # Variables pour l'import et le register
    IMPORT_LINE="from app.${CELL_TYPE}.${cell_name} import bp as ${cell_name}_bp"
    REGISTER_LINE="    app.register_blueprint(${cell_name}_bp, url_prefix='${URL_PREFIX}')"

    # Vérifier si la route existe déjà
    if ! grep -q "${cell_name}_bp" "$APP_PY_FILE" 2>/dev/null; then
        # Lire le contenu de app.py
        python3 << PYTHON_UPDATE_EOF
import re

app_py_path = "$APP_PY_FILE"
cell_type = "$CELL_TYPE"
cell_name = "$cell_name"
url_prefix = "$URL_PREFIX"
import_line = "$IMPORT_LINE"
register_line = "$REGISTER_LINE"

with open(app_py_path, 'r') as f:
    content = f.read()

# Vérifier si déjà présent
if f"{cell_name}_bp" in content:
    print(f"   ℹ️  Route pour {cell_name} déjà présente dans app.py")
    exit(0)

# Ajouter l'import dans la section appropriée
# Chercher la section du type (SCREENS, BACKEND, CRON)
if cell_type == "screens":
    # Ajouter après la dernière ligne d'import screens
    pattern = r"(# SCREENS.*?\n)(.*?)(?=\n# BACKEND|\n# CRON|\n\n# )"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        # Insérer l'import après les imports existants de cette section
        section = match.group(2)
        lines = section.rstrip().split('\n')
        # Trouver la dernière ligne d'import dans cette section
        last_import_idx = -1
        for i, line in enumerate(lines):
            if line.strip().startswith('from app.'):
                last_import_idx = i
        if last_import_idx >= 0:
            lines.insert(last_import_idx + 1, import_line)
        else:
            lines.append(import_line)
        new_section = '\n'.join(lines) + '\n'
        content = content[:match.start(2)] + new_section + content[match.end(2):]
    else:
        # Fallback: ajouter avant # BACKEND
        content = content.replace("# BACKEND", import_line + "\n# BACKEND")

elif cell_type == "backend_wf":
    pattern = r"(# BACKEND WORKFLOWS.*?\n)(.*?)(?=\n# CRON|\n\n# )"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        section = match.group(2)
        lines = section.rstrip().split('\n')
        last_import_idx = -1
        for i, line in enumerate(lines):
            if line.strip().startswith('from app.'):
                last_import_idx = i
        if last_import_idx >= 0:
            lines.insert(last_import_idx + 1, import_line)
        else:
            lines.append(import_line)
        new_section = '\n'.join(lines) + '\n'
        content = content[:match.start(2)] + new_section + content[match.end(2):]
    else:
        content = content.replace("# CRON", import_line + "\n# CRON")

elif cell_type == "cron":
    pattern = r"(# CRON.*?\n)(.*?)(?=\n\n# ROUTES GLOBALES)"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        section = match.group(2)
        lines = section.rstrip().split('\n')
        last_import_idx = -1
        for i, line in enumerate(lines):
            if line.strip().startswith('from app.'):
                last_import_idx = i
        if last_import_idx >= 0:
            lines.insert(last_import_idx + 1, import_line)
        else:
            lines.append(import_line)
        new_section = '\n'.join(lines) + '\n'
        content = content[:match.start(2)] + new_section + content[match.end(2):]

# Ajouter le register_blueprint dans la section appropriée
section_comment = {
    "screens": "# SCREENS",
    "backend_wf": "# BACKEND WORKFLOWS",
    "cron": "# CRON"
}.get(cell_type, "# SCREENS")

# Chercher la section des registrations et ajouter la nouvelle ligne
# Pattern pour trouver les lignes app.register_blueprint dans la bonne section
section_start = content.find(section_comment)
if section_start != -1:
    # Trouver la fin de la section (prochaine section vide ou autre commentaire)
    next_section = content.find("\n\n", section_start)
    if next_section == -1:
        next_section = len(content)

    section_content = content[section_start:next_section]

    # Vérifier si déjà présent
    if f"{cell_name}_bp" not in section_content:
        # Trouver la dernière ligne de register dans cette section
        lines = section_content.split('\n')
        last_register_idx = -1
        for i, line in enumerate(lines):
            if 'app.register_blueprint' in line:
                last_register_idx = i

        if last_register_idx >= 0:
            lines.insert(last_register_idx + 1, register_line)
        else:
            # Ajouter à la fin de la section
            lines.append(register_line)

        new_section = '\n'.join(lines)
        content = content[:section_start] + new_section + content[next_section:]

with open(app_py_path, 'w') as f:
    f.write(content)

print(f"   ✅ Route ajoutée: {url_prefix} -> app.{cell_type}.{cell_name}")
PYTHON_UPDATE_EOF
    else
        log_info "Route déjà présente dans app.py"
    fi

    # ========== TESTS AUTOMATIQUES ==========
    if [ "$TEST_AFTER_DEV" = true ]; then
        echo ""
        log_step "Lancement des tests pour $cell_name..."

        # Vérifier que l'app est démarrée
        if ! curl -s http://localhost:5000/ > /dev/null 2>&1; then
            log_warn "Le serveur Flask n'est pas démarré sur le port 5000"
            log_info "Démarrage automatique du serveur..."

            # Tenter de démarrer le serveur
            if [ -f "$PROJECT_DIR/scripts/03-init-boilerplate.sh" ]; then
                (cd "$PROJECT_DIR" && bash "$PROJECT_DIR/scripts/03-init-boilerplate.sh" &) >/dev/null 2>&1
                sleep 3
            fi

            # Revérifier
            if ! curl -s http://localhost:5000/ > /dev/null 2>&1; then
                log_error "Impossible de démarrer le serveur automatiquement"
                log_info "Tests ignorés pour $cell_name - démarrez manuellement:"
                log_info "  export FLASK_APP=app && python -m flask run --port=5000"
            fi
        fi

        # Si le serveur est OK, lancer les tests
        if curl -s http://localhost:5000/ > /dev/null 2>&1; then
            # Créer le dossier de logs avec timestamp
            TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
            LOGS_DIR="$CELL_DIR/logs/$TIMESTAMP"
            mkdir -p "$LOGS_DIR/screenshots"

            log_info "Logs: $LOGS_DIR"

            # Déterminer l'URL selon le type de cell
            if [[ "$CELL_DIR" == */screens/* ]]; then
                url="http://localhost:5000/$cell_name"
            elif [[ "$CELL_DIR" == */backend_wf/* ]]; then
                url="http://localhost:5000/api/$cell_name"
            else
                url="http://localhost:5000/$cell_name"
            fi

            # Vérifier que l'URL existe
            http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
            http_ok=false

            if [ "$http_code" != "200" ] && [ "$http_code" != "302" ]; then
                log_warn "Route $url retourne HTTP $http_code"
                http_ok=false
            else
                http_ok=true
            fi

            # Lancer le test Playwright
            test_passed=false
            current_errors=""
            frontend_has_errors=false

            # Capturer les logs backend avant le test
            BACKEND_LOG_BEFORE=""
            if [ -f "$PROJECT_DIR/flask_server.log" ]; then
                BACKEND_LOG_BEFORE=$(wc -l < "$PROJECT_DIR/flask_server.log" 2>/dev/null || echo "0")
            fi

            if python "$PROJECT_DIR/scripts/test-frontend.py" \
                "$url" \
                "$LOGS_DIR/screenshots/$cell_name.png" \
                "$LOGS_DIR/frontend.json" 2>&1 | tee "$LOGS_DIR/test_output.log"; then

                # Vérifier s'il y a des erreurs dans le log frontend
                if [ -f "$LOGS_DIR/frontend.json" ]; then
                    # Vérifier aussi les erreurs console (comme 404 dans console)
                    console_errors=$(python3 -c "import json; data=json.load(open('$LOGS_DIR/frontend.json')); msgs=data.get('messages', []); errs=[m for m in msgs if m.get('type')=='error']; print('\n'.join([e.get('text', str(e)) for e in errs[:5]]))" 2>/dev/null || echo "")

                    error_count=$(python3 -c "import json; data=json.load(open('$LOGS_DIR/frontend.json')); print(len(data.get('errors', [])))" 2>/dev/null || echo "0")

                    # Ajouter les erreurs console à current_errors
                    if [ -n "$console_errors" ]; then
                        current_errors="${current_errors}\n  [CONSOLE] ${console_errors}"
                        frontend_has_errors=true
                    fi

                    if [ "$error_count" -gt 0 ]; then
                        frontend_has_errors=true
                        frontend_errs=$(python3 -c "import json; data=json.load(open('$LOGS_DIR/frontend.json')); errs=data.get('errors', []); print('\n'.join([f'  [FRONT] {e.get(\"message\", str(e))}' for e in errs[:5]]))" 2>/dev/null || echo "")
                        current_errors="${current_errors}\n${frontend_errs}"
                    fi
                fi
            else
                # Le test Python a échoué
                frontend_has_errors=true
                if [ -f "$LOGS_DIR/frontend.json" ]; then
                    current_errors=$(python3 -c "import json; data=json.load(open('$LOGS_DIR/frontend.json')); errs=data.get('errors', []); print('\n'.join([f'  [FRONT] {e.get(\"message\", str(e))}' for e in errs[:5]]))" 2>/dev/null || echo "")
                fi
                if [ -f "$LOGS_DIR/test_output.log" ]; then
                    current_errors="${current_errors}\n$(tail -20 "$LOGS_DIR/test_output.log")"
                fi
            fi

            # Déterminer le résultat final (HTTP + Frontend + Backend)
            if [ "$http_ok" = false ] || [ "$frontend_has_errors" = true ]; then
                test_passed=false
                ((FAILED_CELLS++)) || true

                if [ "$http_ok" = false ]; then
                    current_errors="${current_errors}\n  [HTTP] Route retourne HTTP $http_code"
                    log_error "$cell_name: ❌ HTTP $http_code"
                fi

                if [ "$frontend_has_errors" = true ]; then
                    log_error "$cell_name: ❌ Erreurs frontend détectées"
                fi
            else
                test_passed=true
                ((PASSED_CELLS++)) || true
                log_info "$cell_name: ✅ TEST PASS"
            fi

            # Capturer les erreurs backend (nouvelles depuis le test)
            backend_has_errors=false
            if [ -f "$PROJECT_DIR/flask_server.log" ]; then
                BACKEND_LOG_AFTER=$(wc -l < "$PROJECT_DIR/flask_server.log" 2>/dev/null || echo "0")
                if [ "$BACKEND_LOG_AFTER" -gt "$BACKEND_LOG_BEFORE" ]; then
                    # Extraire les nouvelles lignes de log
                    tail -n +$((BACKEND_LOG_BEFORE + 1)) "$PROJECT_DIR/flask_server.log" > "$LOGS_DIR/backend.log" 2>/dev/null
                    # Chercher les erreurs (ERROR, Exception, Traceback)
                    backend_errors=$(grep -E "(ERROR|Exception|Traceback|500)" "$LOGS_DIR/backend.log" 2>/dev/null | head -10 || echo "")
                    if [ -n "$backend_errors" ]; then
                        current_errors="${current_errors}\n  [BACK] Erreurs backend détectées:\n$(echo "$backend_errors" | sed 's/^/    /')"
                        backend_has_errors=true
                    fi
                fi
            fi

            # Si erreurs backend et qu'on avait réussi avant, on passe en échec
            if [ "$backend_has_errors" = true ] && [ "$test_passed" = true ]; then
                test_passed=false
                ((PASSED_CELLS--)) || true
                ((FAILED_CELLS++)) || true
                log_error "$cell_name: ❌ Erreurs backend détectées"
            elif [ "$backend_has_errors" = true ] && [ "$test_passed" = false ]; then
                # Déjà en échec, on log juste
                log_error "$cell_name: ❌ Erreurs backend détectées (en plus des autres)"
            fi

            # Sauvegarder les erreurs complètes pour correction
            printf "%s" "$current_errors" > "$LOGS_DIR/errors.txt" 2>/dev/null || echo "$current_errors" > "$LOGS_DIR/errors.txt"

            # Stocker les erreurs si échec (débogage)
            echo "DEBUG: test_passed=$test_passed, current_errors length=${#current_errors}" >> "$LOGS_DIR/debug.log"
            if [ "$test_passed" = "false" ] || [ -n "$current_errors" ]; then
                echo "DEBUG: Ajout à FAILED_CELLS_NAMES" >> "$LOGS_DIR/debug.log"
                FAILED_CELLS_NAMES+=("$cell_name")
                FAILED_CELLS_DIRS+=("$CELL_DIR")
                FAILED_CELLS_LOGS+=("$LOGS_DIR")
                FAILED_CELLS_ERRORS+=("$current_errors")
            fi

            # Générer un rapport rapide
            cat > "$LOGS_DIR/report.json" << EOF
{
  "cell": "$cell_name",
  "timestamp": "$TIMESTAMP",
  "url": "$url",
  "status": "tested",
  "http_code": "$http_code",
  "test_passed": $test_passed,
  "files": {
    "frontend": "frontend.json",
    "screenshot": "screenshots/$cell_name.png",
    "output": "test_output.log"
  }
}
EOF
        fi
    fi
    # ========== FIN TESTS ==========

    # Proposer de marquer comme devok (seulement si tests OK ou si pas de tests)
    if [ "$TEST_AFTER_DEV" = true ] && [ ${PASSED_CELLS:-0} -gt 0 ] 2>/dev/null; then
        read -p "Marquer comme développé et testé (créer devok.md)? (y/n) " -n 1 -r
    else
        read -p "Marquer comme développé (créer devok.md)? (y/n) " -n 1 -r
    fi
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cat > "$CELL_DIR/specs/devok.md" << EOF
# Développement OK

Date: $(date -Iseconds)
Cell: $cell_name
Statut: Développée

## Fichiers créés
$(find "$CELL_DIR" -type f \( -name "*.py" -o -name "*.html" \) 2>/dev/null | wc -l) fichiers

## Tests
- [x] Test automatique effectué
- [x] Logs vérifiés
EOF
        log_info "devok.md créé"
    fi

    echo ""
done

# Résumé final des tests
echo ""
log_highlight "═══════════════════════════════════════"
log_highlight "📊 Résumé"
log_highlight "═══════════════════════════════════════"
echo ""
echo "Total cells: $TOTAL_CELLS"
echo -e "${GREEN}✅ Dév + Test OK: $PASSED_CELLS${NC}"
if [ $FAILED_CELLS -gt 0 ]; then
    echo -e "${RED}❌ Échecs: $FAILED_CELLS${NC}"
fi
echo ""

if [ $FAILED_CELLS -eq 0 ] && [ $PASSED_CELLS -eq $TOTAL_CELLS ]; then
    log_info "Toutes les cells ont été développées et testées avec succès!"
else
    log_warn "Certaines cells nécessitent une attention"
fi

echo ""
log_highlight "═══════════════════════════════════════"
log_highlight "✅ Cycle de développement + tests terminé"
log_highlight "═══════════════════════════════════════"
echo ""

# Si des erreurs, les afficher et proposer correction
if [ ${#FAILED_CELLS_NAMES[@]} -gt 0 ]; then
    log_warn "${#FAILED_CELLS_NAMES[@]} cell(s) avec erreurs:"
    echo ""

    for i in "${!FAILED_CELLS_NAMES[@]}"; do
        echo -e "${RED}❌ ${FAILED_CELLS_NAMES[$i]}${NC}"
        echo "   Logs: ${FAILED_CELLS_LOGS[$i]}"
        if [ -n "${FAILED_CELLS_ERRORS[$i]}" ]; then
            echo "   Erreurs:"
            echo -e "${FAILED_CELLS_ERRORS[$i]}" | head -10
        fi
        echo ""
    done

    echo ""
    read -p "Voulez-vous tenter de corriger ces erreurs avec pi -p? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_step "Correction automatique des erreurs..."

        for i in "${!FAILED_CELLS_NAMES[@]}"; do
            cell_name="${FAILED_CELLS_NAMES[$i]}"
            cell_dir="${FAILED_CELLS_DIRS[$i]}"
            cell_logs="${FAILED_CELLS_LOGS[$i]}"
            cell_errors="${FAILED_CELLS_ERRORS[$i]}"

            echo ""
            log_highlight "🔧 Correction de: $cell_name"

            # Lire le code actuel
            CODE_CONTEXT=""
            while IFS= read -r -d '' f; do
                [ -f "$f" ] && CODE_CONTEXT+="\n\n=== $(basename "$f") ===\n$(head -100 "$f")"
            done < <(find "$cell_dir" -name "*.py" -type f -print0 2>/dev/null | head -z -n 5)

            # Lire les erreurs détaillées
            FRONTEND_JSON=""
            if [ -f "$cell_logs/frontend.json" ]; then
                FRONTEND_JSON=$(cat "$cell_logs/frontend.json")
            fi

            # Lire les erreurs backend
            BACKEND_ERRORS=""
            if [ -f "$cell_logs/backend.log" ]; then
                BACKEND_ERRORS=$(cat "$cell_logs/backend.log")
            fi

            # Construire le prompt de correction
            FIX_PROMPT=$(cat << 'FIXPROMPT_EOF'
Tu es un développeur Flask/Alpine.js expert.

La cell '__CELL_NAME__' a des erreurs lors des tests.

## Erreurs détectées:
__CELL_ERRORS__

## Logs frontend (JSON):
__FRONTEND_JSON__

## Logs backend (Flask):
__BACKEND_ERRORS__

## Code actuel (extrait):
__CODE_CONTEXT__

## Ta mission:
1. Analyse les erreurs ci-dessus (frontend ET backend)
2. Identifie la cause racine
3. Corrige le code pour résoudre TOUTES les erreurs
4. Donne les fichiers corrigés complets

## IMPORTANT - NE PAS GÉNÉRER:
- **NE génère PAS app.py** (le fichier app.py principal est géré automatiquement par le système)
- Ne génère que les fichiers de la cell elle-même

Pour CHAQUE fichier corrigé, donne un élément YAML avec:
- chemin: le chemin complet relatif (ex: app/__CELL_NAME__/routes/index.py)
- contenu: le code corrigé complet avec le pipe |

Exemple:

fichiers:
  - chemin: app/__CELL_NAME__/routes/index.py
    contenu: |
      # contenu corrigé complet ici
FIXPROMPT_EOF
)

            # Substitution des variables
            FIX_PROMPT=${FIX_PROMPT//__CELL_NAME__/$cell_name}
            FIX_PROMPT=${FIX_PROMPT//__CELL_ERRORS__/$cell_errors}
            FIX_PROMPT=${FIX_PROMPT//__FRONTEND_JSON__/$FRONTEND_JSON}
            FIX_PROMPT=${FIX_PROMPT//__BACKEND_ERRORS__/$BACKEND_ERRORS}
            FIX_PROMPT=${FIX_PROMPT//__CODE_CONTEXT__/$CODE_CONTEXT}
            # Exécution pi pour correction (depuis la racine du projet)
            FIX_OUTPUT="$cell_logs/fix-output.yaml"
            if cd "$PROJECT_DIR" && pi -p "$FIX_PROMPT" > "$FIX_OUTPUT" 2>/dev/null; then
                log_info "Correction générée pour $cell_name"

                # Extraction et écriture des fichiers corrigés
                python3 << PYTHON_EOF
import yaml
import os

output_file = "$FIX_OUTPUT"
cell_dir = "$cell_dir"
project_dir = "$PROJECT_DIR"

with open(output_file, 'r') as f:
    data = yaml.safe_load(f)

files_created = 0
skipped = 0

fichiers = data.get('fichiers', []) if isinstance(data, dict) else []

for item in fichiers:
    if not isinstance(item, dict):
        continue
    
    filepath = item.get('chemin', '').strip()
    filecontent = item.get('contenu', '')
    
    if isinstance(filecontent, str):
        filecontent = filecontent.strip()
    else:
        filecontent = str(filecontent) if filecontent else ''

    if not filepath:
        continue

    # Ignorer explicitement app.py (géré automatiquement par le script)
    if os.path.basename(filepath) == 'app.py':
        print(f"  ⚠️  Ignoré (app.py géré automatiquement): {filepath}")
        skipped += 1
        continue

    # Convertir chemin relatif
    if filepath.startswith('app/'):
        # Éviter les chemins avec double app/
        cell_rel_path = "$CELL_DIR".replace("$PROJECT_DIR/", "")
        if filepath.startswith('app/' + cell_rel_path + '/app/'):
            filepath = filepath.replace(cell_rel_path + '/app/', cell_rel_path + '/')
        full_path = os.path.join(project_dir, filepath)
    else:
        full_path = os.path.join(cell_dir, filepath)

    # Vérifier que le fichier est bien dans la cell
    if not full_path.startswith(cell_dir):
        print(f"  ⚠️  Ignoré (hors cell): {filepath}")
        skipped += 1
        continue

    # Créer le dossier parent
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    # Écrire le fichier
    with open(full_path, 'w') as f:
        f.write(filecontent)

    print(f"  ✅ Corrigé: {filepath}")
    files_created += 1

print(f"\n{files_created} fichiers corrigés, {skipped} ignorés")
        print(f"  ⚠️  Ignoré (hors cell): {filepath}")
        skipped += 1
        continue

    # Créer le dossier parent
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    # Écrire le fichier
    with open(full_path, 'w') as f:
        f.write(filecontent)

    print(f"  ✅ Corrigé: {filepath}")
    files_created += 1

print(f"\n{files_created} fichiers corrigés, {skipped} ignorés")
PYTHON_EOF

                rm "$FIX_OUTPUT"
                log_info "$cell_name corrigé!"
            else
                log_error "Échec de la correction pour $cell_name"
            fi
        done

        echo ""
        log_info "Corrections terminées. Relancez les tests pour vérifier."
    fi

    echo ""
    echo "Pour analyser les erreurs manuellement:"
    for i in "${!FAILED_CELLS_NAMES[@]}"; do
        echo "  ${FAILED_CELLS_NAMES[$i]}:"
        echo "    cat ${FAILED_CELLS_LOGS[$i]}/frontend.json | jq '.errors'"
    done
    echo ""
fi

echo "Pour créer des PR (si git configuré):"
echo "  gh pr create --title 'feat: <cell>' --body 'Implémentation'"
