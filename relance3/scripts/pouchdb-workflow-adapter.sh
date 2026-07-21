#!/bin/bash

# Script d'adaptation des workflows frontend pour PouchDB/CouchDB
# Avec système de reprise et traitement par lots

set -e

FRONTEND_DIR="/home/ubuntu/marki/relance3/workflows/frontend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_FILE="$SCRIPT_DIR/.adapt_state"
LOG_FILE="$SCRIPT_DIR/adapt-pouchdb.log"

# Configuration
BATCH_SIZE=${BATCH_SIZE:-3}
PAUSE_BETWEEN=${PAUSE_BETWEEN:-2}

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Initialiser le log
touch "$LOG_FILE"

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

info() { log "${BLUE}[INFO]${NC} $1"; }
success() { log "${GREEN}[OK]${NC} $1"; }
warn() { log "${YELLOW}[WARN]${NC} $1"; }
error() { log "${RED}[ERR]${NC} $1"; }

# Construire la liste des workflows
declare -a WORKFLOWS
declare -a ECRANS

scan_workflows() {
    WORKFLOWS=()
    ECRANS=()

    for ecran_dir in "$FRONTEND_DIR"/*/; do
        if [ -d "$ecran_dir" ]; then
            local ecran=$(basename "$ecran_dir")

            while IFS= read -r -d '' file; do
                local workflow=$(basename "$file" .md)
                local output="$ecran_dir/$workflow-pouchdb.js"

                # Ajouter seulement si pas encore adapté
                if [ ! -f "$output" ]; then
                    WORKFLOWS+=("$file")
                    ECRANS+=("$ecran")
                fi
            done < <(find "$ecran_dir" -maxdepth 1 -name "*.md" ! -name "README.md" -print0 2>/dev/null)
        fi
    done
}

# Afficher la barre de progression
show_progress() {
    local current=$1
    local total=$2
    local width=50
    local filled=$((current * width / total))
    local empty=$((width - filled))

    printf "\r["
    printf "%0.s█" $(seq 1 $filled)
    printf "%0.s░" $(seq 1 $empty)
    printf "] %d/%d (%d%%)" "$current" "$total" $((current * 100 / total))
}

# Instruction pour pi -p
INSTRUCTION='Adapte ce workflow pour une utilisation de PouchDB connecté en live avec CouchDB.

RÈGLES:
1. PouchDB local avec réplication live vers CouchDB
2. Remplace appels API par operations PouchDB (db.get, db.put, db.query, db.find)
3. Sync bidirectionnelle avec db.sync() ou replicate.to/from
4. Gestion conflits avec conflicts: true
5. Design documents (_design/) pour vues Mango
6. Pattern local-first: lecture PouchDB local, écriture PouchDB, sync auto
7. Gestion offline/online avec events paused/active
8. Conserver structure Alpine.js x-data
9. Ajouter syncStatus: idle|syncing|paused|error
10. Utiliser _id et _rev CouchDB

Modifie le fichier {workflow}.md avec les specifications complètes.'

# Traiter un workflow
adapt_workflow() {
    local file=$1
    local ecran=$2
    local workflow=$(basename "$file" .md)

    pi -p "$INSTRUCTION" "$file" > /dev/null 2>&1

    return $?
}

# === MAIN ===
clear
log ""
log "=========================================="
log "  ADAPTATION WORKFLOWS → POUCHDB"
log "=========================================="
log ""

# Scan initial
info "Scan des workflows..."
scan_workflows

TOTAL=${#WORKFLOWS[@]}

if [ $TOTAL -eq 0 ]; then
    success "Tous les workflows sont déjà adaptés !"
    exit 0
fi

log ""
log "Workflows restants à adapter: $TOTAL"
log "Batch size: $BATCH_SIZE"
log ""

# Charger l'état sauvegardé
START_INDEX=0
if [ -f "$STATE_FILE" ]; then
    START_INDEX=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
    info "Reprise à l'index $START_INDEX"
fi

# Traitement
SUCCESS=0
FAILED=0

for ((i=START_INDEX; i<TOTAL; i++)); do
    file="${WORKFLOWS[$i]}"
    ecran="${ECRANS[$i]}"
    workflow=$(basename "$file" .md)

    show_progress $((i + 1)) $TOTAL
    printf " %s/%s" "$ecran" "$workflow"

    if adapt_workflow "$file" "$ecran"; then
        SUCCESS=$((SUCCESS + 1))
    else
        FAILED=$((FAILED + 1))
        error "Échec: $ecran/$workflow" >&2
    fi

    # Sauvegarder la progression
    echo $((i + 1)) > "$STATE_FILE"

    # Pause tous les N workflows
    if [ $(((i + 1) % BATCH_SIZE)) -eq 0 ] && [ $((i + 1)) -lt $TOTAL ]; then
        printf "\n"
        info "Pause de ${PAUSE_BETWEEN}s..."
        sleep $PAUSE_BETWEEN
    fi
done

printf "\n\n"

# Supprimer le fichier d'état
rm -f "$STATE_FILE"

# Résumé
ADAPTED_COUNT=$(find "$FRONTEND_DIR" -name "*-pouchdb.js" | wc -l)

log "=========================================="
log "  RÉCAPITULATIF"
log "=========================================="
log ""
log "Total fichiers -pouchdb.js: $ADAPTED_COUNT"
log "Succès ce run: $SUCCESS"
log "Échecs: $FAILED"
log ""
log "Log: $LOG_FILE"
log ""
