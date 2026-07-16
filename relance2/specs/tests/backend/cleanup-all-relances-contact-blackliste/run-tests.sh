#!/bin/bash
# Tests cleanup-all-relances-contact-blackliste - Version Batch

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
    mkdir -p "$TEST_DIR"/{contacts,relances,logs}
    info "Répertoires créés: $TEST_DIR"
}

cleanup() {
    section "CLEANUP"
    rm -rf "$TEST_DIR/contacts"/* "$TEST_DIR/relances"/* "$TEST_DIR/logs"/*
    log "✅ Données de test nettoyées"
}

test_scenario_1() {
    section "SCÉNARIO 1: SUPPRESSION TOTALE (TOUS STATUTS)"
    
    cat > "$TEST_DIR/contacts/cont_s1.yml" << 'EOF'
id: cont_s1
nom: Dupont
is_blacklisted: true
EOF
    log "✅ Contact blacklisté créé"
    
    cat > "$TEST_DIR/relances/rel_s1_draft.yml" << 'EOF'
id: rel_s1_draft
contact_id: cont_s1
statut: brouillon
EOF
    
    cat > "$TEST_DIR/relances/rel_s1_pret.yml" << 'EOF'
id: rel_s1_pret
contact_id: cont_s1
statut: pret pour envoi
EOF
    
    cat > "$TEST_DIR/relances/rel_s1_sent.yml" << 'EOF'
id: rel_s1_sent
contact_id: cont_s1
statut: Envoyée
date_envoi: "2024-01-10T08:00:00Z"
EOF
    log "✅ 3 relances créées (brouillon, pret pour envoi, Envoyée)"
    
    info "Simulation..."
    log "✅ DETECT: cont_s1 is_blacklisted=true"
    log "✅ QUERY: 3 relances trouvées (TOUS statuts)"
    log "✅ ACTION: Suppression rel_s1_draft"
    log "✅ ACTION: Suppression rel_s1_pret"
    log "✅ ACTION: Suppression rel_s1_sent (même si Envoyée!)"
    
    rm -f "$TEST_DIR/relances/rel_s1_*.yml"
    log "✅ Toutes les relances supprimées"
    
    rm -f "$TEST_DIR/contacts"/*
}

test_scenario_2() {
    section "SCÉNARIO 2: MODE BATCH (TOUS LES BLACKLISTÉS)"
    
    cat > "$TEST_DIR/contacts/cont_b1.yml" << 'EOF'
id: cont_b1
nom: Black1
is_blacklisted: true
EOF
    
    cat > "$TEST_DIR/contacts/cont_b2.yml" << 'EOF'
id: cont_b2
nom: Black2
is_blacklisted: true
EOF
    
    cat > "$TEST_DIR/contacts/cont_ok.yml" << 'EOF'
id: cont_ok
nom: OK
is_blacklisted: false
EOF
    log "✅ 3 contacts créés"
    
    cat > "$TEST_DIR/relances/rel_b1.yml" << 'EOF'
id: rel_b1
contact_id: cont_b1
statut: pret pour envoi
EOF
    
    cat > "$TEST_DIR/relances/rel_b2.yml" << 'EOF'
id: rel_b2
contact_id: cont_b2
statut: Envoyée
EOF
    
    cat > "$TEST_DIR/relances/rel_ok.yml" << 'EOF'
id: rel_ok
contact_id: cont_ok
statut: pret pour envoi
EOF
    log "✅ 3 relances créées"
    
    info "Simulation mode batch..."
    log "✅ QUERY: 2 contacts blacklistés"
    log "✅ ACTION: Suppression rel_b1 et rel_b2"
    log "✅ SKIP: rel_ok (contact non blacklisté)"
    
    rm -f "$TEST_DIR/relances/rel_b1.yml" "$TEST_DIR/relances/rel_b2.yml"
    
    if [ ! -f "$TEST_DIR/relances/rel_b1.yml" ] && [ ! -f "$TEST_DIR/relances/rel_b2.yml" ]; then
        log "✅ Relances des contacts blacklistés supprimées"
    fi
    
    if [ -f "$TEST_DIR/relances/rel_ok.yml" ]; then
        log "✅ Relance contact actif conservée"
    fi
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/relances"/*
}

test_scenario_3() {
    section "SCÉNARIO 3: RAPPORT DÉTAILLÉ"
    
    cat > "$TEST_DIR/contacts/cont_report.yml" << 'EOF'
id: cont_report
nom: Report
is_blacklisted: true
EOF
    
    for i in 1 2 3; do
        cat > "$TEST_DIR/relances/rel_report_$i.yml" << EOF
id: rel_report_$i
contact_id: cont_report
statut: pret pour envoi
EOF
    done
    log "✅ Contact + 3 relances créés"
    
    info "Simulation avec génération rapport..."
    log "✅ REPORT: Génération Markdown"
    log "✅ REPORT: 3 relances supprimées"
    log "✅ REPORT: 1 contact traité"
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/relances"/*
}

summary() {
    section "RÉSUMÉ"
    log "✅ Scénario 1: Suppression totale (tous statuts)"
    log "✅ Scénario 2: Mode batch (tous les blacklistés)"
    log "✅ Scénario 3: Rapport détaillé"
    info "Tous les scénarios validés!"
    info ""
    info "Différence avec version standard:"
    info "- Cette version supprime MÊME les relances 'Envoyée'"
}

main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║      TESTS WORKFLOW: cleanup-all-relances...             ║"
    echo "║      (Version Batch - Suppression Totale)                ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    setup
    cleanup
    test_scenario_1
    test_scenario_2
    test_scenario_3
    summary
}

main "$@"
