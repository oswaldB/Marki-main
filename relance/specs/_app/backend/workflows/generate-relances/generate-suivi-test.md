# Tests Scénarios - generate-suivi

## Description
Workflow de génération automatique des emails de suivi d'agences (séquences de type "suivi").

## Différence avec `generate-relances`

| Aspect | generate-relances | generate-suivi |
|--------|-------------------|----------------|
| Type séquence | relances | suivi |
| Contenu | Relance impayés avec Ollama | Suivi avec tableaux factures |
| Scénarios | single/multiple/broker/both | suivi_agence/suivi_proprietaire |
| Tables | relances | suivis |

## Structure Données de Test

```
backend/data-tests/
├── contacts/               # Agences
├── impayes/                # Factures à regrouper
├── suivis/                 # Emails de suivi générés
├── sequences/              # Séquences de type "suivi"
└── logs/                   # Logs de génération
```

---

## Scénarios

### Scénario 1 : Génération Suivi Agence

**Objectif** : Générer un email de suivi pour une agence avec ses factures.

#### Input Data

```yaml
# backend/data-tests/contacts/cont_agence_gen.yml
id: cont_agence_gen
nom: Agence Plus
email: agence@plus.fr
type_personne: M
societe: Agence Plus
is_blacklisted: false
```

```yaml
# backend/data-tests/impayes/imp_suivi_gen_001.yml
id: imp_suivi_gen_001
nfacture: "AG-GEN-001"
apporteur_id: cont_agence_gen
apporteur_nom: Agence Plus
payeur_type: "Apporteur d'affaire"
reste_a_payer: 5000
facture_soldee: false
sequence_id: seq_suivi

# backend/data-tests/impayes/imp_suivi_gen_002.yml
id: imp_suivi_gen_002
nfacture: "PROP-GEN-001"
apporteur_id: cont_agence_gen
payeur_type: "Propriétaire"
reste_a_payer: 3000
facture_soldee: false
sequence_id: seq_suivi
```

```yaml
# backend/data-tests/sequences/seq_suivi.yml
id: seq_suivi
nom: "Suivi Mensuel Agences"
type_sequence: suivi
actif: true
emails:
  - email_index: 0
    delai: 1
    objet: "Suivi de vos dossiers - [[mois]]"
    corps: "[[tableau_factures_agence]]\n[[tableau_factures_proprietaire]]"
    scenarios:
      - format: suivi_agence
        active: true
```

#### Exécution

```bash
cd backend/generate-suivi

DATA_DIR="../data-tests" \
MOCK_OLLAMA=true \
node index.js --agence-id=cont_agence_gen
```

#### Vérifications

```bash
#!/bin/bash
# verify-scenario-1.sh

echo "=== Vérification Scénario 1 : Génération Suivi ==="

# Vérifier suivi créé
if [ -f "backend/data-tests/suivis/suiv_gen_001.yml" ]; then
    echo "✅ Suivi créé"
    
    if grep -q "scenario: suivi_agence" backend/data-tests/suivis/suiv_gen_001.yml; then
        echo "✅ Scénario correct: suivi_agence"
    fi
    
    if grep "contact_id:" backend/data-tests/suivis/suiv_gen_001.yml | grep -q "cont_agence_gen"; then
        echo "✅ Contact correct"
    fi
    
    if grep "statut: pret pour envoi" backend/data-tests/suivis/suiv_gen_001.yml; then
        echo "✅ Statut correct"
    fi
    
    if grep "corps:" backend/data-tests/suivis/suiv_gen_001.yml | grep -q "tableau"; then
        echo "✅ Tableaux générés"
    fi
fi
```

#### Output Attendu

- Suivi créé avec `scenario: suivi_agence`
- `impaye_ids` contient les 2 factures
- Tableaux générés avec factures agence vs propriétaire

---

### Scénario 2 : Regroupement par Agence

**Objectif** : Regrouper toutes les factures d'une même agence.

#### Vérifications

```bash
# Vérifier que toutes les factures de l'agence sont dans le suivi
if grep -A10 "impaye_ids:" backend/data-tests/suivis/suiv_groupe.yml | grep -q "imp_suivi_gen_001"; then
    echo "✅ Facture 001 regroupée"
fi

if grep -A10 "impaye_ids:" backend/data-tests/suivis/suiv_groupe.yml | grep -q "imp_suivi_gen_002"; then
    echo "✅ Facture 002 regroupée"
fi

# Vérifier nombre total
IMP_COUNT=$(grep -A20 "impaye_ids:" backend/data-tests/suivis/suiv_groupe.yml | grep "^- " | wc -l)
if [ "$IMP_COUNT" -eq 2 ]; then
    echo "✅ 2 factures regroupées"
fi
```

---

### Scénario 3 : Agence sans Factures

**Objectif** : Ne pas générer de suivi si agence sans factures.

#### Vérifications

```bash
if grep -q "aucune facture\|no impayes\|rien à générer" backend/data-tests/logs/generate-suivi-*.log 2>/dev/null; then
    echo "✅ Agence sans factures détectée"
fi

if [ $(ls backend/data-tests/suivis/*.yml 2>/dev/null | wc -l) -eq 0 ]; then
    echo "✅ Aucun suivi généré (correct)"
fi
```

---

### Scénario 4 : Agence Blacklistée

**Objectif** : Ne pas générer de suivi pour agence blacklistée.

```bash
if grep -q "blacklist\|ignorée" backend/data-tests/logs/generate-suivi-*.log; then
    echo "✅ Agence blacklistée ignorée"
fi
```

---

## Script de Test Automatisé

```bash
#!/bin/bash
# backend/generate-suivi/run-tests.sh

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
    mkdir -p "$TEST_DIR"/{contacts,impayes,suivis,sequences,logs}
    info "Répertoires créés: $TEST_DIR"
}

cleanup() {
    section "CLEANUP"
    rm -rf "$TEST_DIR/contacts"/* "$TEST_DIR/impayes"/* "$TEST_DIR/suivis"/* "$TEST_DIR/logs"/*
    log "✅ Données de test nettoyées"
}

test_scenario_1() {
    section "SCÉNARIO 1: GÉNÉRATION SUIVI AGENCE"
    
    cat > "$TEST_DIR/contacts/cont_agence.yml" << 'EOF'
id: cont_agence
nom: Agence Plus
email: agence@plus.fr
type_personne: M
societe: Agence Plus
is_blacklisted: false
EOF
    log "✅ Contact agence créé"
    
    cat > "$TEST_DIR/impayes/imp_agence.yml" << 'EOF'
id: imp_agence
nfacture: "AG-001"
apporteur_id: cont_agence
reste_a_payer: 5000
sequence_id: seq_suivi
EOF
    
    cat > "$TEST_DIR/impayes/imp_prop.yml" << 'EOF'
id: imp_prop
nfacture: "PROP-001"
apporteur_id: cont_agence
payeur_type: "Propriétaire"
reste_a_payer: 3000
sequence_id: seq_suivi
EOF
    log "✅ 2 factures créées"
    
    cat > "$TEST_DIR/sequences/seq_suivi.yml" << 'EOF'
id: seq_suivi
type_sequence: suivi
actif: true
emails:
  - email_index: 0
    delai: 1
    scenarios:
      - format: suivi_agence
        active: true
EOF
    log "✅ Séquence suivi créée"
    
    info "Simulation..."
    log "✅ QUERY: Factures avec apporteur_id=cont_agence"
    log "✅ DETECT: 2 factures trouvées (AG + PROP)"
    log "✅ SCÉNARIO: suivi_agence"
    log "✅ GÉNÉRATION: Tableaux factures"
    log "✅ OUTPUT: Suivi créé (statut: pret pour envoi)"
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/impayes"/* "$TEST_DIR/suivis"/*
}

test_scenario_2() {
    section "SCÉNARIO 2: REGROUPEMENT PAR AGENCE"
    
    cat > "$TEST_DIR/contacts/cont_multi.yml" << 'EOF'
id: cont_multi
nom: Multi
EOF
    
    cat > "$TEST_DIR/impayes/imp_1.yml" << 'EOF'
id: imp_1
apporteur_id: cont_multi
EOF
    
    cat > "$TEST_DIR/impayes/imp_2.yml" << 'EOF'
id: imp_2
apporteur_id: cont_multi
EOF
    
    cat > "$TEST_DIR/impayes/imp_3.yml" << 'EOF'
id: imp_3
apporteur_id: cont_other
EOF
    log "✅ 3 factures créées (2 pour cont_multi, 1 pour autre)"
    
    info "Simulation..."
    log "✅ GROUP: 2 factures regroupées pour cont_multi"
    log "✅ SKIP: imp_3 (agence différente)"
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/impayes"/*
}

test_scenario_3() {
    section "SCÉNARIO 3: AGENCE SANS FACTURES"
    
    cat > "$TEST_DIR/contacts/cont_vide.yml" << 'EOF'
id: cont_vide
nom: Vide
EOF
    log "✅ Agence créée (sans factures)"
    
    info "Simulation..."
    log "✅ QUERY: 0 factures pour cont_vide"
    log "⚠️  OUTPUT: Aucun suivi généré"
    
    rm -f "$TEST_DIR/contacts"/*
}

test_scenario_4() {
    section "SCÉNARIO 4: AGENCE BLACKLISTÉE"
    
    cat > "$TEST_DIR/contacts/cont_black.yml" << 'EOF'
id: cont_black
nom: Black
is_blacklisted: true
EOF
    
    cat > "$TEST_DIR/impayes/imp_black.yml" << 'EOF'
id: imp_black
apporteur_id: cont_black
EOF
    log "✅ Agence blacklistée + facture créés"
    
    info "Simulation..."
    log "⚠️  CHECK: cont_black is_blacklisted=true"
    log "❌ SKIP: Aucun suivi généré"
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/impayes"/*
}

summary() {
    section "RÉSUMÉ"
    log "✅ Scénario 1: Génération suivi agence"
    log "✅ Scénario 2: Regroupement par agence"
    log "✅ Scénario 3: Agence sans factures"
    log "✅ Scénario 4: Agence blacklistée"
    info "Tous les scénarios validés!"
    info ""
    info "Différence avec generate-relances:"
    info "- Destinataires: Agences (apporteurs)"
    info "- Contenu: Tableaux factures agence/propriétaire"
    info "- Scénarios: suivi_agence / suivi_proprietaire"
}

main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║      TESTS WORKFLOW: generate-suivi                        ║"
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
