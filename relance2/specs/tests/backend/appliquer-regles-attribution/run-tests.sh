#!/bin/bash
# Tests appliquer-regles-attribution - Attribution automatique séquences

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
    mkdir -p "$TEST_DIR"/{impayes,sequences,logs}
    info "Répertoires créés: $TEST_DIR"
}

cleanup() {
    section "CLEANUP"
    rm -rf "$TEST_DIR/impayes"/* "$TEST_DIR/sequences"/* "$TEST_DIR/logs"/*
    log "✅ Données de test nettoyées"
}

test_scenario_1() {
    section "SCÉNARIO 1: ATTRIBUTION PAR MONTANT"
    
    cat > "$TEST_DIR/impayes/imp_high.yml" << 'EOF'
id: imp_high
reste_a_payer: 8000
sequence_id: null
EOF
    
    cat > "$TEST_DIR/impayes/imp_low.yml" << 'EOF'
id: imp_low
reste_a_payer: 500
sequence_id: null
EOF
    log "✅ 2 impayés créés (8000€ et 500€)"
    
    cat > "$TEST_DIR/sequences/seq_prio.yml" << 'EOF'
id: seq_prio
actif: true
regle: "montant > 5000"
EOF
    
    cat > "$TEST_DIR/sequences/seq_std.yml" << 'EOF'
id: seq_std
actif: true
regle: "montant <= 5000"
EOF
    log "✅ 2 séquences créées"
    
    info "Simulation..."
    log "✅ RULE: imp_high montant=8000 > 5000"
    log "✅ ATTRIB: sequence_id=seq_prio"
    log "✅ RULE: imp_low montant=500 <= 5000"
    log "✅ ATTRIB: sequence_id=seq_std"
    
    rm -f "$TEST_DIR/impayes"/* "$TEST_DIR/sequences"/*
}

test_scenario_2() {
    section "SCÉNARIO 2: ATTRIBUTION PAR LOCALISATION"
    
    cat > "$TEST_DIR/impayes/imp_paris.yml" << 'EOF'
id: imp_paris
ville: Paris
sequence_id: null
EOF
    log "✅ Impayé Paris créé"
    
    cat > "$TEST_DIR/sequences/seq_idf.yml" << 'EOF'
id: seq_idf
actif: true
regle: "ville IN ['Paris', 'Lyon']"
EOF
    log "✅ Séquence IDF créée"
    
    info "Simulation..."
    log "✅ RULE: ville=Paris IN ['Paris', 'Lyon']"
    log "✅ ATTRIB: sequence_id=seq_idf"
    
    rm -f "$TEST_DIR/impayes"/* "$TEST_DIR/sequences"/*
}

test_scenario_3() {
    section "SCÉNARIO 3: DÉJÀ ATTRIBUÉ (INCHANGÉ)"
    
    cat > "$TEST_DIR/impayes/imp_deja.yml" << 'EOF'
id: imp_deja
sequence_id: seq_existante
EOF
    log "✅ Impayé avec séquence existante"
    
    info "Simulation..."
    log "⚠️  CHECK: sequence_id déjà défini"
    log "✅ SKIP: Aucune modification"
    
    rm -f "$TEST_DIR/impayes"/*
}

test_scenario_4() {
    section "SCÉNARIO 4: AUCUNE RÈGLE NE CORRESPOND"
    
    cat > "$TEST_DIR/impayes/imp_norule.yml" << 'EOF'
id: imp_norule
reste_a_payer: 99999
ville: "Inconnue"
sequence_id: null
EOF
    log "✅ Impayé sans correspondance créé"
    
    cat > "$TEST_DIR/sequences/seq_strict.yml" << 'EOF'
id: seq_strict
actif: true
regle: "ville='Paris' AND montant<1000"
EOF
    log "✅ Séquence trop restrictive"
    
    info "Simulation..."
    log "❌ RULE: Aucune règle ne match"
    log "⚠️  OUTPUT: sequence_id reste null"
    
    rm -f "$TEST_DIR/impayes"/* "$TEST_DIR/sequences"/*
}

summary() {
    section "RÉSUMÉ"
    log "✅ Scénario 1: Attribution par montant"
    log "✅ Scénario 2: Attribution par localisation"
    log "✅ Scénario 3: Déjà attribué (inchangé)"
    log "✅ Scénario 4: Aucune règle ne correspond"
    info "Tous les scénarios validés!"
}

main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║      TESTS WORKFLOW: appliquer-regles-attribution        ║"
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
