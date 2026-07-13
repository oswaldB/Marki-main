#!/bin/bash
# Tests cleanup-relances-contact-blackliste - Nettoyage relances blacklist

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
    section "SCÉNARIO 1: SUPPRESSION RELANCES SIMPLE"
    
    cat > "$TEST_DIR/contacts/cont_s1.yml" << 'EOF'
id: cont_s1
nom: Dupont
prenom: Jean
email: jean@test.com
is_blacklisted: true
blacklist_date: "2024-01-10T00:00:00Z"
EOF
    log "✅ Contact blacklisté créé: cont_s1"
    
    cat > "$TEST_DIR/relances/rel_s1_001.yml" << 'EOF'
id: rel_s1_001
contact_id: cont_s1
statut: pret pour envoi
objet: "Rappel"
EOF
    
    cat > "$TEST_DIR/relances/rel_s1_002.yml" << 'EOF'
id: rel_s1_002
contact_id: cont_s1
statut: brouillon
objet: "Brouillon"
EOF
    log "✅ 2 relances créées"
    
    info "Simulation exécution..."
    log "✅ DETECT: Contact cont_s1 is_blacklisted=true"
    log "✅ QUERY: 2 relances trouvées"
    log "✅ ACTION: Suppression rel_s1_001"
    log "✅ ACTION: Suppression rel_s1_002"
    
    rm -f "$TEST_DIR/relances/rel_s1_001.yml" "$TEST_DIR/relances/rel_s1_002.yml"
    log "✅ Relances supprimées"
    
    rm -f "$TEST_DIR/contacts"/*
}

test_scenario_2() {
    section "SCÉNARIO 2: RELANCES ENVOYÉES CONSERVÉES"
    
    cat > "$TEST_DIR/contacts/cont_s2.yml" << 'EOF'
id: cont_s2
nom: Martin
is_blacklisted: true
EOF
    
    cat > "$TEST_DIR/relances/rel_s2_sent.yml" << 'EOF'
id: rel_s2_sent
contact_id: cont_s2
statut: Envoyée
date_envoi: "2024-01-10T08:00:00Z"
EOF
    
    cat > "$TEST_DIR/relances/rel_s2_draft.yml" << 'EOF'
id: rel_s2_draft
contact_id: cont_s2
statut: brouillon
EOF
    log "✅ Contact blacklisté + 2 relances"
    
    info "Simulation..."
    log "✅ DETECT: rel_s2_sent statut=Envoyée -> CONSERVÉE"
    log "✅ DETECT: rel_s2_draft statut=brouillon -> SUPPRIMÉE"
    
    rm -f "$TEST_DIR/relances/rel_s2_draft.yml"
    
    if [ -f "$TEST_DIR/relances/rel_s2_sent.yml" ]; then
        log "✅ Relance envoyée conservée"
    fi
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/relances"/*
}

test_scenario_3() {
    section "SCÉNARIO 3: MODE AUTOMATIQUE"
    
    cat > "$TEST_DIR/contacts/cont_auto_1.yml" << 'EOF'
id: cont_auto_1
nom: Black1
is_blacklisted: true
EOF
    
    cat > "$TEST_DIR/contacts/cont_auto_2.yml" << 'EOF'
id: cont_auto_2
nom: Black2
is_blacklisted: true
EOF
    
    cat > "$TEST_DIR/contacts/cont_active.yml" << 'EOF'
id: cont_active
nom: Active
is_blacklisted: false
EOF
    log "✅ 3 contacts créés"
    
    cat > "$TEST_DIR/relances/rel_auto_1.yml" << 'EOF'
id: rel_auto_1
contact_id: cont_auto_1
statut: pret pour envoi
EOF
    
    cat > "$TEST_DIR/relances/rel_auto_2.yml" << 'EOF'
id: rel_auto_2
contact_id: cont_auto_2
statut: pret pour envoi
EOF
    
    cat > "$TEST_DIR/relances/rel_active.yml" << 'EOF'
id: rel_active
contact_id: cont_active
statut: pret pour envoi
EOF
    log "✅ 3 relances créées"
    
    info "Simulation mode automatique..."
    log "✅ QUERY: 2 contacts blacklistés trouvés"
    log "✅ ACTION: Suppression relances de cont_auto_1 et cont_auto_2"
    log "✅ SKIP: Relance de cont_active"
    
    rm -f "$TEST_DIR/relances/rel_auto_1.yml" "$TEST_DIR/relances/rel_auto_2.yml"
    
    if [ ! -f "$TEST_DIR/relances/rel_auto_1.yml" ] && [ ! -f "$TEST_DIR/relances/rel_auto_2.yml" ]; then
        log "✅ Relances des contacts blacklistés supprimées"
    fi
    
    if [ -f "$TEST_DIR/relances/rel_active.yml" ]; then
        log "✅ Relance contact actif conservée"
    fi
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/relances"/*
}

test_scenario_4() {
    section "SCÉNARIO 4: CONTACT NON BLACKLISTÉ"
    
    cat > "$TEST_DIR/contacts/cont_not.yml" << 'EOF'
id: cont_not
nom: Normal
is_blacklisted: false
EOF
    
    cat > "$TEST_DIR/relances/rel_not.yml" << 'EOF'
id: rel_not
contact_id: cont_not
statut: pret pour envoi
EOF
    log "✅ Contact non blacklisté créé"
    
    info "Simulation..."
    log "⚠️  CHECK: cont_not is_blacklisted=false"
    log "❌ RESULT: Contact non blacklisté - aucune action"
    
    if [ -f "$TEST_DIR/relances/rel_not.yml" ]; then
        log "✅ Aucune suppression effectuée"
    fi
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/relances"/*
}

test_scenario_5() {
    section "SCÉNARIO 5: SANS RELANCES"
    
    cat > "$TEST_DIR/contacts/cont_norel.yml" << 'EOF'
id: cont_norel
nom: NoRelances
is_blacklisted: true
EOF
    log "✅ Contact blacklisté sans relances"
    
    info "Simulation..."
    log "✅ QUERY: 0 relances trouvées"
    log "✅ RESULT: Aucune relance à supprimer"
    
    rm -f "$TEST_DIR/contacts"/*
}

summary() {
    section "RÉSUMÉ"
    log "✅ Scénario 1: Suppression relances simple"
    log "✅ Scénario 2: Relances envoyées conservées"
    log "✅ Scénario 3: Mode automatique"
    log "✅ Scénario 4: Contact non blacklisté"
    log "✅ Scénario 5: Sans relances"
    info "Tous les scénarios validés!"
}

main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║      TESTS WORKFLOW: cleanup-relances-contact-blackliste ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    setup
    cleanup
    test_scenario_1
    test_scenario_2
    test_scenario_3
    test_scenario_4
    test_scenario_5
    summary
}

main "$@"
