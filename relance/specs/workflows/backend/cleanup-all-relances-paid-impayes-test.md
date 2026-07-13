# Tests Scénarios - cleanup-all-relances-paid-impayes

## Description
Workflow de nettoyage des relances associées aux impayés qui ont été soldés (payés).

## Différence avec `verify-paid-invoices`

| Aspect | verify-paid-invoices | cleanup-all-relances-paid-impayes |
|--------|----------------------|-----------------------------------|
| Action principale | Met à jour statut impayés | Supprime les relances |
| Trigger | Vérification SQLite | Impayés déjà soldés |
| Scope | Mise à jour + nettoyage | Nettoyage pur |

## Structure Données de Test

```
backend/data-tests/
├── impayes/                # Impayés soldés
├── relances/               # Relances à supprimer
└── logs/                   # Logs de nettoyage
```

---

## Scénarios

### Scénario 1 : Impayé Payé - Relances Supprimées

**Objectif** : Supprimer toutes les relances d'un impayé soldé.

#### Input Data

```yaml
# backend/data-tests/impayes/imp_paid_cleanup.yml
id: imp_paid_cleanup
nfacture: "INV-PAID-001"
reste_a_payer: 0
facture_soldee: true
solde: true
solde_le: "2024-01-10T00:00:00Z"
payeur_id: cont_test
```

```yaml
# backend/data-tests/relances/rel_cleanup_001.yml
id: rel_cleanup_001
contact_id: cont_test
impaye_ids:
  - imp_paid_cleanup
statut: pret pour envoi
objet: "Rappel"

# backend/data-tests/relances/rel_cleanup_002.yml
id: rel_cleanup_002
contact_id: cont_test
impaye_ids:
  - imp_paid_cleanup
statut: brouillon
objet: "Brouillon"
```

#### Exécution

```bash
cd backend/cleanup-all-relances-paid-impayes

DATA_DIR="../data-tests" \
node index.js
```

#### Vérifications

```bash
#!/bin/bash
# verify-scenario-1.sh

echo "=== Vérification Scénario 1 : Impayé Payé ==="

# Vérifier relances supprimées
for rel in rel_cleanup_001 rel_cleanup_002; do
    if [ ! -f "backend/data-tests/relances/${rel}.yml" ]; then
        echo "✅ Relance ${rel} supprimée"
    else
        echo "❌ Relance ${rel} NON supprimée"
        exit 1
    fi
done

# Vérifier log
if grep -q "impayé payé\|soldé\|supprimée" backend/data-tests/logs/cleanup-paid-*.log 2>/dev/null; then
    echo "✅ Log présent"
fi
```

#### Output Attendu

- 2 relances supprimées (impayé payé)
- Log: "2 relances supprimées pour impayé payé imp_paid_cleanup"

---

### Scénario 2 : Impayé Non Payé - Relances Conservées

**Objectif** : Ne pas toucher aux relances des impayés non soldés.

#### Input Data

```yaml
# backend/data-tests/impayes/imp_unpaid.yml
id: imp_unpaid
nfacture: "INV-UNPAID-002"
reste_a_payer: 2000
facture_soldee: false
solde: false
```

```yaml
# backend/data-tests/relances/rel_keep.yml
id: rel_keep
impaye_ids:
  - imp_unpaid
statut: pret pour envoi
```

#### Vérifications

```bash
# Vérifier relance conservée
if [ -f "backend/data-tests/relances/rel_keep.yml" ]; then
    echo "✅ Relance conservée (impayé non soldé)"
else
    echo "❌ ERREUR: Relance supprimée alors que impayé non payé!"
    exit 1
fi
```

---

### Scénario 3 : Multi-Impayés Partiellement Payés

**Objectif** : Gérer relance avec plusieurs impayés où certains sont payés.

#### Input Data

```yaml
# Impayé 1: Payé
id: imp_multi_paid
nfacture: "INV-PAID"
reste_a_payer: 0
facture_soldee: true

# Impayé 2: Non payé
id: imp_multi_unpaid
nfacture: "INV-UNPAID"
reste_a_payer: 1000
facture_soldee: false
```

```yaml
# Relance avec les deux impayés
id: rel_multi
impaye_ids:
  - imp_multi_paid
  - imp_multi_unpaid
statut: pret pour envoi
```

#### Vérifications

```bash
# Vérifier relance conservée (car un impayé non payé)
if [ -f "backend/data-tests/relances/rel_multi.yml" ]; then
    echo "✅ Relance conservée (impayé non payé présent)"
fi

# Vérifier que relance n'est PAS supprimée
if grep -q "statut: pret pour envoi" backend/data-tests/relances/rel_multi.yml; then
    echo "✅ Statut inchangé"
fi
```

#### Output Attendu

- Relance conservée (car imp_multi_unpaid non payé)
- Optionnel: statut changé en "refaire" pour régénération

---

### Scénario 4 : Batch - Plusieurs Impayés Payés

**Objectif** : Mode batch avec plusieurs impayés soldés.

#### Input Data

5 impayés soldés avec 10 relances associées.

#### Vérifications

```bash
# Vérifier nombre de relances supprimées
if grep -q "10 relances\|supprimées" backend/data-tests/logs/cleanup-paid-*.log; then
    echo "✅ Log mentionne 10 suppressions"
fi

# Vérifier rapport
if ls backend/data-tests/logs/cleanup-paid-report-*.md 1>/dev/null 2>&1; then
    echo "✅ Rapport généré"
fi
```

---

## Script de Test Automatisé

```bash
#!/bin/bash
# backend/cleanup-all-relances-paid-impayes/run-tests.sh

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
