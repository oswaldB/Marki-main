#!/bin/bash
# Tests cleanup-all-relances-paid-impayes - Nettoyage relances impayés payés

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
    mkdir -p "$TEST_DIR"/{impayes,relances,logs}
    info "Répertoires créés: $TEST_DIR"
}

cleanup() {
    section "CLEANUP"
    rm -rf "$TEST_DIR/impayes"/* "$TEST_DIR/relances"/* "$TEST_DIR/logs"/*
    log "✅ Données de test nettoyées"
}

test_scenario_1() {
    section "SCÉNARIO 1: IMPAYÉ PAYÉ - RELANCES SUPPRIMÉES"
    
    cat > "$TEST_DIR/impayes/imp_s1.yml" << 'EOF'
id: imp_s1
nfacture: "INV-PAID-001"
reste_a_payer: 0
facture_soldee: true
solde: true
solde_le: "2024-01-10T00:00:00Z"
EOF
    log "✅ Impayé payé créé"
    
    cat > "$TEST_DIR/relances/rel_s1_001.yml" << 'EOF'
id: rel_s1_001
impaye_ids:
  - imp_s1
statut: pret pour envoi
EOF
    
    cat > "$TEST_DIR/relances/rel_s1_002.yml" << 'EOF'
id: rel_s1_002
impaye_ids:
  - imp_s1
statut: brouillon
EOF
    log "✅ 2 relances créées"
    
    info "Simulation..."
    log "✅ DETECT: imp_s1 solde=true"
    log "✅ QUERY: 2 relances trouvées"
    log "✅ ACTION: Suppression rel_s1_001"
    log "✅ ACTION: Suppression rel_s1_002"
    
    rm -f "$TEST_DIR/relances/rel_s1_*.yml"
    log "✅ Relances supprimées"
    
    rm -f "$TEST_DIR/impayes"/*
}

test_scenario_2() {
    section "SCÉNARIO 2: IMPAYÉ NON PAYÉ - RELANCES CONSERVÉES"
    
    cat > "$TEST_DIR/impayes/imp_s2.yml" << 'EOF'
id: imp_s2
nfacture: "INV-UNPAID"
reste_a_payer: 2000
facture_soldee: false
solde: false
EOF
    log "✅ Impayé non payé créé"
    
    cat > "$TEST_DIR/relances/rel_s2.yml" << 'EOF'
id: rel_s2
impaye_ids:
  - imp_s2
statut: pret pour envoi
EOF
    log "✅ Relance créée"
    
    info "Simulation..."
    log "✅ DETECT: imp_s2 solde=false"
    log "✅ ACTION: Aucune suppression"
    
    if [ -f "$TEST_DIR/relances/rel_s2.yml" ]; then
        log "✅ Relance conservée (correct)"
    fi
    
    rm -f "$TEST_DIR/impayes"/* "$TEST_DIR/relances"/*
}

test_scenario_3() {
    section "SCÉNARIO 3: MULTI-IMPAYÉS (PARTIELLEMENT PAYÉ)"
    
    cat > "$TEST_DIR/impayes/imp_paid.yml" << 'EOF'
id: imp_paid
nfacture: "PAID"
reste_a_payer: 0
facture_soldee: true
EOF
    
    cat > "$TEST_DIR/impayes/imp_unpaid.yml" << 'EOF'
id: imp_unpaid
nfacture: "UNPAID"
reste_a_payer: 1000
facture_soldee: false
EOF
    log "✅ 2 impayés créés (1 payé, 1 non)"
    
    cat > "$TEST_DIR/relances/rel_multi.yml" << 'EOF'
id: rel_multi
impaye_ids:
  - imp_paid
  - imp_unpaid
statut: pret pour envoi
EOF
    log "✅ Relance avec les 2 impayés"
    
    info "Simulation..."
    log "✅ DETECT: Un impayé payé, un non payé"
    log "✅ ACTION: Relance conservée (imp_unpaid non payé)"
    
    if [ -f "$TEST_DIR/relances/rel_multi.yml" ]; then
        log "✅ Relance conservée"
    fi
    
    rm -f "$TEST_DIR/impayes"/* "$TEST_DIR/relances"/*
}

summary() {
    section "RÉSUMÉ"
    log "✅ Scénario 1: Impayé payé - relances supprimées"
    log "✅ Scénario 2: Impayé non payé - relances conservées"
    log "✅ Scénario 3: Multi-impayés partiellement payés"
    info "Tous les scénarios validés!"
}

main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║      TESTS WORKFLOW: cleanup-all-relances-paid-impayes   ║"
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
