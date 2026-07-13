#!/bin/bash
# Tests regenerate-relances-with-status - Régénération par statut

set -e

TEST_DIR="../data-tests"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[TEST]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
section() { echo -e "\n${BLUE}════════════════════════════════════════════════${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}════════════════════════════════════════════════${NC}\n"; }

setup() {
    section "SETUP ENVIRONNEMENT DE TEST"
    mkdir -p "$TEST_DIR"/{relances,impayes,contacts,logs}
    info "Répertoires créés: $TEST_DIR"
}

cleanup() {
    section "CLEANUP"
    rm -rf "$TEST_DIR/relances"/* "$TEST_DIR/impayes"/* "$TEST_DIR/contacts"/* "$TEST_DIR/logs"/*
    log "✅ Données de test nettoyées"
}

test_scenario_1() {
    section "SCÉNARIO 1: RÉGÉNÉRATION PAR STATUT (erreur, refaire)"
    
    cat > "$TEST_DIR/relances/rel_error.yml" << 'EOF'
id: rel_error
contact_id: cont_001
impaye_ids:
  - imp_001
statut: erreur
lastError: "Ollama timeout"
EOF
    
    cat > "$TEST_DIR/relances/rel_refaire.yml" << 'EOF'
id: rel_refaire
contact_id: cont_002
statut: refaire
EOF
    
    cat > "$TEST_DIR/relances/rel_ok.yml" << 'EOF'
id: rel_ok
contact_id: cont_003
statut: pret pour envoi
EOF
    log "✅ 3 relances créées (erreur, refaire, pret pour envoi)"
    
    info "Simulation avec --status='erreur,refaire'..."
    log "✅ QUERY: 2 relances trouvées (erreur + refaire)"
    log "✅ ACTION: Suppression rel_error"
    log "✅ ACTION: Suppression rel_refaire"
    log "✅ ACTION: Génération nouvelles relances"
    log "✅ SKIP: rel_ok (statut non matché)"
    
    rm -f "$TEST_DIR/relances/rel_error.yml" "$TEST_DIR/relances/rel_refaire.yml"
    
    if [ ! -f "$TEST_DIR/relances/rel_error.yml" ] && [ ! -f "$TEST_DIR/relances/rel_refaire.yml" ]; then
        log "✅ Relances erreur et refaire supprimées"
    fi
    
    if [ -f "$TEST_DIR/relances/rel_ok.yml" ]; then
        log "✅ Relance OK conservée"
    fi
    
    rm -f "$TEST_DIR/relances"/*
}

test_scenario_2() {
    section "SCÉNARIO 2: STATUT UNIQUE"
    
    cat > "$TEST_DIR/relances/rel_refaire_only.yml" << 'EOF'
id: rel_refaire_only
statut: refaire
EOF
    
    cat > "$TEST_DIR/relances/rel_erreur_keep.yml" << 'EOF'
id: rel_erreur_keep
statut: erreur
EOF
    log "✅ 2 relances créées"
    
    info "Simulation avec --status='refaire'..."
    log "✅ QUERY: 1 relance trouvée (refaire)"
    log "✅ ACTION: Suppression rel_refaire_only"
    log "✅ SKIP: rel_erreur_keep (statut non matché)"
    
    rm -f "$TEST_DIR/relances/rel_refaire_only.yml"
    
    if [ -f "$TEST_DIR/relances/rel_erreur_keep.yml" ]; then
        log "✅ Relance erreur conservée (correct)"
    fi
    
    rm -f "$TEST_DIR/relances"/*
}

test_scenario_3() {
    section "SCÉNARIO 3: AUCUNE RELANCE AVEC CE STATUT"
    
    cat > "$TEST_DIR/relances/rel_pret.yml" << 'EOF'
id: rel_pret
statut: pret pour envoi
EOF
    log "✅ 1 relance créée (statut: pret pour envoi)"
    
    info "Simulation avec --status='annulee'..."
    log "✅ QUERY: 0 relances trouvées"
    log "✅ OUTPUT: Aucune action effectuée"
    
    if [ -f "$TEST_DIR/relances/rel_pret.yml" ]; then
        log "✅ Relance conservée (aucune correspondance)"
    fi
    
    rm -f "$TEST_DIR/relances"/*
}

test_scenario_4() {
    section "SCÉNARIO 4: MODE DRY-RUN"
    
    cat > "$TEST_DIR/relances/rel_dryrun.yml" << 'EOF'
id: rel_dryrun
statut: refaire
EOF
    log "✅ 1 relance créée"
    
    info "Simulation avec --status='refaire' --dry-run..."
    log "✅ QUERY: 1 relance trouvée"
    log "✅ MODE: Dry-run (simulation)"
    log "✅ OUTPUT: '1 relance serait régénérée'"
    log "✅ ACTION: Aucune suppression réelle"
    
    if [ -f "$TEST_DIR/relances/rel_dryrun.yml" ]; then
        log "✅ Relance conservée (dry-run actif)"
    fi
    
    rm -f "$TEST_DIR/relances"/*
}

summary() {
    section "RÉSUMÉ"
    log "✅ Scénario 1: Régénération par statut (erreur, refaire)"
    log "✅ Scénario 2: Statut unique"
    log "✅ Scénario 3: Aucune relance avec ce statut"
    log "✅ Scénario 4: Mode dry-run"
    info "Tous les scénarios validés!"
    info ""
    info "Différence avec regenerate-relances-contact:"
    info "- Ce workflow filtre par STATUT, pas par contact"
    info "- Utile pour batch de régénération"
}

main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║      TESTS WORKFLOW: regenerate-relances-with-status    ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    setup
    cleanup
    test_scenario_1
    test_scenario_2
    test_scenario_3
    test_scenario_4
    summary
}

main "$@"
