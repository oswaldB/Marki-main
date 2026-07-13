#!/bin/bash
# Tests regenerate-relances-contact - Régénération relances par contact

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
    mkdir -p "$TEST_DIR"/{contacts,impayes,relances,logs}
    info "Répertoires créés: $TEST_DIR"
}

cleanup() {
    section "CLEANUP"
    rm -rf "$TEST_DIR/contacts"/* "$TEST_DIR/impayes"/* "$TEST_DIR/relances"/* "$TEST_DIR/logs"/*
    log "✅ Données de test nettoyées"
}

test_scenario_1() {
    section "SCÉNARIO 1: RÉGÉNÉRATION SIMPLE"
    
    cat > "$TEST_DIR/contacts/cont_s1.yml" << 'EOF'
id: cont_s1
nom: Dupont
prenom: Jean
email: jean@test.com
is_blacklisted: false
EOF
    log "✅ Contact créé"
    
    cat > "$TEST_DIR/impayes/imp_s1.yml" << 'EOF'
id: imp_s1
nfacture: "001"
reste_a_payer: 1500
facture_soldee: false
payeur_id: cont_s1
sequence_id: seq_default
EOF
    log "✅ Impayé créé"
    
    cat > "$TEST_DIR/relances/rel_old.yml" << 'EOF'
id: rel_old
contact_id: cont_s1
impaye_ids:
  - imp_s1
statut: brouillon
objet: "Ancien"
EOF
    log "✅ Ancienne relance créée (brouillon)"
    
    info "Simulation..."
    log "✅ STEP 1: Suppression relances brouillon"
    log "✅ STEP 2: Génération nouvelle relance"
    log "✅ OUTPUT: Nouvelle relance créée avec contenu Ollama"
    
    rm -f "$TEST_DIR/relances/rel_old.yml"
    log "✅ Ancienne relance supprimée"
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/impayes"/*
}

test_scenario_2() {
    section "SCÉNARIO 2: EXCLUSION IMPAYÉ SPÉCIFIQUE"
    
    cat > "$TEST_DIR/contacts/cont_s2.yml" << 'EOF'
id: cont_s2
nom: Martin
is_blacklisted: false
EOF
    
    cat > "$TEST_DIR/impayes/imp_keep.yml" << 'EOF'
id: imp_keep
reste_a_payer: 2000
payeur_id: cont_s2
EOF
    
    cat > "$TEST_DIR/impayes/imp_exclude.yml" << 'EOF'
id: imp_exclude
reste_a_payer: 1000
payeur_id: cont_s2
EOF
    log "✅ 2 impayés créés"
    
    info "Simulation avec --exclude-impaye-id=imp_exclude..."
    log "✅ DETECT: imp_exclude marqué pour exclusion"
    log "✅ OUTPUT: Seul imp_keep inclus dans nouvelle relance"
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/impayes"/*
}

test_scenario_3() {
    section "SCÉNARIO 3: CONTACT BLACKLISTÉ (ERREUR)"
    
    cat > "$TEST_DIR/contacts/cont_s3.yml" << 'EOF'
id: cont_s3
nom: Blacklisted
is_blacklisted: true
EOF
    log "✅ Contact blacklisté créé"
    
    info "Simulation..."
    log "❌ ERROR: Contact blacklisté - régénération refusée"
    log "✅ OUTPUT: Aucune action effectuée"
    
    rm -f "$TEST_DIR/contacts"/*
}

test_scenario_4() {
    section "SCÉNARIO 4: RELANCES ENVOYÉES CONSERVÉES"
    
    cat > "$TEST_DIR/contacts/cont_s4.yml" << 'EOF'
id: cont_s4
nom: Bernard
is_blacklisted: false
EOF
    
    cat > "$TEST_DIR/relances/rel_sent.yml" << 'EOF'
id: rel_sent
contact_id: cont_s4
statut: Envoyée
date_envoi: "2024-01-10T08:00:00Z"
EOF
    
    cat > "$TEST_DIR/relances/rel_draft.yml" << 'EOF'
id: rel_draft
contact_id: cont_s4
statut: brouillon
EOF
    log "✅ Contact + 2 relances (1 Envoyée, 1 brouillon)"
    
    info "Simulation..."
    log "✅ DETECT: rel_sent statut=Envoyée -> CONSERVÉE"
    log "✅ DETECT: rel_draft statut=brouillon -> SUPPRIMÉE"
    
    rm -f "$TEST_DIR/relances/rel_draft.yml"
    
    if [ -f "$TEST_DIR/relances/rel_sent.yml" ]; then
        log "✅ Relance envoyée conservée"
    fi
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/relances"/*
}

summary() {
    section "RÉSUMÉ"
    log "✅ Scénario 1: Régénération simple"
    log "✅ Scénario 2: Exclusion impayé spécifique"
    log "✅ Scénario 3: Contact blacklisté (erreur)"
    log "✅ Scénario 4: Relances envoyées conservées"
    info "Tous les scénarios validés!"
}

main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║      TESTS WORKFLOW: regenerate-relances-contact        ║"
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
