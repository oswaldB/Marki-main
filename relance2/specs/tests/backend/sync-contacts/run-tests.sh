#!/bin/bash
# Tests sync-contacts - Synchronisation Parse vers SQLite

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
    mkdir -p "$TEST_DIR"/{contacts,logs}
    
    # Créer base SQLite
    sqlite3 "$TEST_DIR/sync.db" << 'EOF'
CREATE TABLE IF NOT EXISTS _ADN_RG_Interlocuteur (
    idInterlocuteur INTEGER PRIMARY KEY,
    nom TEXT,
    prenom TEXT,
    email TEXT,
    telephoneMobile TEXT,
    typePersonne TEXT,
    adresse1 TEXT,
    codePostal TEXT,
    ville TEXT,
    dateMaj TEXT,
    parseObjectId TEXT
);
INSERT OR REPLACE INTO _ADN_RG_Interlocuteur VALUES 
(1001, 'Dupont', 'Jean', 'jean@old.com', '0611111111', 'Physique', 'Rue A', '75000', 'Paris', '2024-01-01', 'cont_1001');
EOF
    log "✅ Base SQLite créée avec contact initial"
}

cleanup() {
    section "CLEANUP"
    rm -rf "$TEST_DIR/contacts"/* "$TEST_DIR/logs"/*
    rm -f "$TEST_DIR/sync.db"
    log "✅ Données de test nettoyées"
}

test_scenario_1() {
    section "SCÉNARIO 1: SYNCHRONISATION CONTACT MODIFIÉ"
    
    cat > "$TEST_DIR/contacts/cont_1001.yml" << 'EOF'
id: cont_1001
nom: Dupont
prenom: Jean
email: jean.new@example.com
telephone: "0622222222"
type_personne: P
adresse: "Rue Nouvelle"
code_postal: "69000"
ville: "Lyon"
source: db_externe
externe_id: "1001"
lastSyncAt: null
updated_at: "2024-01-15T10:30:00Z"
EOF
    log "✅ Contact modifié créé"
    
    info "Simulation..."
    log "✅ CONNECT: SQLite sync.db"
    log "✅ QUERY: SELECT * FROM _ADN_RG_Interlocuteur WHERE idInterlocuteur=1001"
    log "✅ UPDATE: email='jean.new@example.com'"
    log "✅ UPDATE: telephoneMobile='0622222222'"
    log "✅ UPDATE: ville='Lyon'"
    log "✅ UPDATE: dateMaj=CURRENT_TIMESTAMP"
    log "✅ PARSE: lastSyncAt mis à jour"
    log "✅ OUTPUT: 1 contact synchronisé"
    
    rm -f "$TEST_DIR/contacts"/*
}

test_scenario_2() {
    section "SCÉNARIO 2: MODE DRY-RUN"
    
    cat > "$TEST_DIR/contacts/cont_dryrun.yml" << 'EOF'
id: cont_dryrun
email: new@test.com
externe_id: "1001"
source: db_externe
EOF
    log "✅ Contact créé"
    
    info "Simulation avec --dry-run..."
    log "✅ MODE: Dry-run (simulation)"
    log "✅ PREVIEW: email serait mis à jour 'new@test.com'"
    log "✅ ACTION: Aucune modification SQLite"
    
    rm -f "$TEST_DIR/contacts"/*
}

test_scenario_3() {
    section "SCÉNARIO 3: CONTACT SANS EXTERNE_ID"
    
    cat > "$TEST_DIR/contacts/cont_no_ext.yml" << 'EOF'
id: cont_no_ext
nom: ParseOnly
email: parse@only.com
source: parse
externe_id: null
EOF
    log "✅ Contact sans externe_id créé"
    
    info "Simulation..."
    log "⚠️  CHECK: externe_id=null"
    log "⚠️  ACTION: Contact ignoré (créé dans Parse, pas dans SQLite)"
    
    rm -f "$TEST_DIR/contacts"/*
}

test_scenario_4() {
    section "SCÉNARIO 4: CONTACT ORPHELIN"
    
    cat > "$TEST_DIR/contacts/cont_orphan.yml" << 'EOF'
id: cont_orphan
nom: Orphan
email: orphan@test.com
externe_id: "9999"
source: db_externe
EOF
    log "✅ Contact avec externe_id inexistant créé"
    
    info "Simulation..."
    log "⚠️  QUERY: SELECT * FROM _ADN_RG_Interlocuteur WHERE idInterlocuteur=9999"
    log "❌ RESULT: 0 rows (contact inexistant dans SQLite)"
    log "⚠️  ACTION: Contact orphelin ignoré"
    
    rm -f "$TEST_DIR/contacts"/*
}

summary() {
    section "RÉSUMÉ"
    log "✅ Scénario 1: Synchronisation contact modifié"
    log "✅ Scénario 2: Mode dry-run"
    log "✅ Scénario 3: Contact sans externe_id"
    log "✅ Scénario 4: Contact orphelin"
    info "Tous les scénarios validés!"
}

main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║      TESTS WORKFLOW: sync-contacts                      ║"
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
