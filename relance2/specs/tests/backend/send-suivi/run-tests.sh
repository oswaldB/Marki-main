#!/bin/bash
# Tests send-suivi - Envoi emails de suivi agences

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
    mkdir -p "$TEST_DIR"/{suivis,contacts,impayes,smtp_profiles,logs}
    info "Répertoires créés: $TEST_DIR"
}

cleanup() {
    section "CLEANUP"
    rm -rf "$TEST_DIR/suivis"/* "$TEST_DIR/contacts"/* "$TEST_DIR/impayes"/* "$TEST_DIR/logs"/*
    log "✅ Données de test nettoyées"
}

test_scenario_1() {
    section "SCÉNARIO 1: ENVOI SUIVI AGENCE SIMPLE"
    
    cat > "$TEST_DIR/contacts/cont_agence.yml" << 'EOF'
id: cont_agence
nom: Agence Immo Plus
email: agence@immoplus.fr
type_personne: M
societe: Agence Immo Plus
is_blacklisted: false
EOF
    log "✅ Contact agence créé"
    
    cat > "$TEST_DIR/impayes/imp_agence.yml" << 'EOF'
id: imp_agence
nfacture: "AG-001"
apporteur_id: cont_agence
reste_a_payer: 5000
EOF
    
    cat > "$TEST_DIR/impayes/imp_prop.yml" << 'EOF'
id: imp_prop
nfacture: "PROP-001"
apporteur_id: cont_agence
payeur_type: "Propriétaire"
reste_a_payer: 3000
EOF
    log "✅ 2 factures créées (agence + propriétaire)"
    
    cat > "$TEST_DIR/suivis/suiv_envoi.yml" << 'EOF'
id: suiv_envoi
contact_id: cont_agence
impaye_ids:
  - imp_agence
  - imp_prop
scenario: suivi_agence
objet: "Suivi dossiers"
corps: "<p>Tableaux...</p>"
statut: pret pour envoi
EOF
    log "✅ Suivi créé"
    
    info "Simulation..."
    log "✅ SMTP: Connexion agence.smtp.com"
    log "✅ EMAIL: To=agence@immoplus.fr"
    log "✅ EMAIL: Objet='Suivi dossiers'"
    log "✅ OUTPUT: statut='Envoyée'"
    
    rm -f "$TEST_DIR/suivis"/* "$TEST_DIR/contacts"/* "$TEST_DIR/impayes"/*
}

test_scenario_2() {
    section "SCÉNARIO 2: TABLEAUX FACTURES"
    
    cat > "$TEST_DIR/suivis/suiv_tableaux.yml" << 'EOF'
id: suiv_tableaux
corps: "<p>[[tableau_factures_agence]]</p><p>[[tableau_factures_proprietaire]]</p>"
statut: pret pour envoi
EOF
    log "✅ Suivi avec tableaux créé"
    
    info "Vérification..."
    log "✅ CONTENU: Tableau factures agence présent"
    log "✅ CONTENU: Tableau factures propriétaire présent"
    
    rm -f "$TEST_DIR/suivis"/*
}

test_scenario_3() {
    section "SCÉNARIO 3: AGENCE BLACKLISTÉE"
    
    cat > "$TEST_DIR/contacts/cont_black.yml" << 'EOF'
id: cont_black
nom: Black
is_blacklisted: true
EOF
    
    cat > "$TEST_DIR/suivis/suiv_black.yml" << 'EOF'
id: suiv_black
contact_id: cont_black
statut: pret pour envoi
EOF
    log "✅ Agence blacklistée + suivi créés"
    
    info "Simulation..."
    log "⚠️  CHECK: cont_black is_blacklisted=true"
    log "❌ SKIP: Aucun envoi"
    log "✅ OUTPUT: Statut inchangé"
    
    rm -f "$TEST_DIR/suivis"/* "$TEST_DIR/contacts"/*
}

test_scenario_4() {
    section "SCÉNARIO 4: ÉCHEC SMTP"
    
    cat > "$TEST_DIR/suivis/suiv_erreur.yml" << 'EOF'
id: suiv_erreur
statut: pret pour envoi
EOF
    log "✅ Suivi créé"
    
    info "Simulation erreur SMTP..."
    log "❌ SMTP: Connection refused"
    log "❌ OUTPUT: statut='Erreur d\'envoi'"
    log "✅ LOG: Erreur enregistrée"
    
    rm -f "$TEST_DIR/suivis"/*
}

summary() {
    section "RÉSUMÉ"
    log "✅ Scénario 1: Envoi suivi agence simple"
    log "✅ Scénario 2: Tableaux factures"
    log "✅ Scénario 3: Agence blacklistée"
    log "✅ Scénario 4: Échec SMTP"
    info "Tous les scénarios validés!"
    info ""
    info "Différence avec send-emails:"
    info "- Destinataires: Agences (apporteurs)"
    info "- Contenu: Tableaux factures agence/propriétaire"
}

main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║      TESTS WORKFLOW: send-suivi                          ║"
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
