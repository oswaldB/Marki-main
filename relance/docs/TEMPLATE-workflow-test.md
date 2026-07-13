# Tests Scénarios - [NOM_WORKFLOW]

## Principe

Les tests utilisent un environnement isolé `backend/data-tests/` pour ne pas impacter les données de production.

## Structure des Données de Test

```
backend/data-tests/
├── contacts/       # Contacts de test
├── impayes/        # Impayés de test  
├── relances/       # Relances de test
├── sequences/      # Séquences de test
├── users/          # Utilisateurs de test
└── logs/           # Logs de test (output)
```

## Initialisation des Tests

```bash
# Créer l'environnement de test
mkdir -p backend/data-tests/{contacts,impayes,relances,sequences,users,logs}

# Copier les séquences (référentiel partagé)
cp backend/data/sequences/*.yml backend/data-tests/sequences/ 2>/dev/null || true

# Copier les profils SMTP
cp backend/data/smtp_profiles/*.yml backend/data-tests/smtp_profiles/ 2>/dev/null || true
```

## Scénarios

### Scénario 1 : [Nom du Scénario]

**Objectif** : [Description]

#### Données d'Entrée (Input)

Créer les fichiers suivants dans `backend/data-tests/` :

```yaml
# backend/data-tests/contacts/cont_scenario_1.yml
id: cont_scenario_1
nom: Test
prenom: Scenario1
email: scenario1@test.com
is_blacklisted: false
created_at: "2024-01-15T10:00:00Z"
updated_at: "2024-01-15T10:00:00Z"
```

```yaml
# backend/data-tests/impayes/imp_scenario_1.yml
id: imp_scenario_1
nfacture: "12345"
reste_a_payer: 1500
facture_soldee: false
payeur_id: cont_scenario_1
sequence_id: seq_test
created_at: "2024-01-15T10:00:00Z"
```

#### Exécution du Test

```bash
# 1. Lancer le workflow avec DATA_DIR pointant vers data-tests
cd backend/[workflow]
DATA_DIR="../data-tests" node index.js --test-mode

# OU si le workflow supporte un flag --data-dir:
node index.js --data-dir="../../data-tests" --scenario="scenario_1"
```

#### Vérifications (Assertions)

```bash
# Vérifier fichiers output
echo "=== Vérifications Scénario 1 ==="

# 1. Contact modifié ?
if grep -q "is_blacklisted: true" ../../data-tests/contacts/cont_scenario_1.yml; then
    echo "✅ Contact blacklisted"
else
    echo "❌ Contact non modifié"
fi

# 2. Relances annulées ?
if [ -f ../../data-tests/relances/rel_scenario_1.yml ]; then
    if grep -q "statut: annulee" ../../data-tests/relances/rel_scenario_1.yml; then
        echo "✅ Relance annulée"
    fi
fi

# 3. Log créé ?
if ls ../../data-tests/logs/[workflow]*.log 1>/dev/null 2>&1; then
    echo "✅ Log généré"
    tail -5 ../../data-tests/logs/[workflow]*.log
fi
```

#### Données de Sortie Attendues (Expected Output)

```yaml
# backend/data-tests/contacts/cont_scenario_1.yml (modifié)
id: cont_scenario_1
nom: Test
is_blacklisted: true
blacklist_date: "2024-01-15T10:30:00Z"
blacklist_motif: "Test"
updated_at: "2024-01-15T10:30:00Z"
```

---

## Script de Test Automatisé

Créer `run-tests.sh` dans le dossier du workflow :

```bash
#!/bin/bash
# run-tests.sh - Tests pour [WORKFLOW]

set -e

WORKFLOW="[NOM_WORKFLOW]"
TEST_DIR="../../data-tests"
LOG_FILE="$TEST_DIR/logs/test-$(date +%Y%m%d-%H%M%S).log"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[TEST]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

# Setup
setup() {
    log "=== Setup Environnement de Test ==="
    mkdir -p "$TEST_DIR"/{contacts,impayes,relances,sequences,users,smtp_profiles,logs}
    
    # Copier référentiels partagés
    cp ../../data/sequences/*.yml "$TEST_DIR/sequences/" 2>/dev/null || warn "Pas de séquences à copier"
    cp ../../data/smtp_profiles/*.yml "$TEST_DIR/smtp_profiles/" 2>/dev/null || warn "Pas de SMTP profiles"
}

# Cleanup
cleanup() {
    log "=== Cleanup ==="
    rm -rf "$TEST_DIR/contacts"/*
    rm -rf "$TEST_DIR/impayes"/*
    rm -rf "$TEST_DIR/relances"/*
    rm -rf "$TEST_DIR/users"/*
}

# Créer données scénario 1
create_scenario_1() {
    log "Création données Scénario 1..."
    
    cat > "$TEST_DIR/contacts/cont_test_001.yml" << 'EOF'
id: cont_test_001
nom: Dupont
prenom: Jean
email: jean.dupont@test.com
is_blacklisted: false
blacklist_date: null
blacklist_motif: null
created_at: "2024-01-15T10:00:00Z"
updated_at: "2024-01-15T10:00:00Z"
EOF

    cat > "$TEST_DIR/impayes/imp_test_001.yml" << 'EOF'
id: imp_test_001
nfacture: "F001"
reste_a_payer: 1000
facture_soldee: false
payeur_id: cont_test_001
sequence_id: seq_default
created_at: "2024-01-15T10:00:00Z"
EOF
}

# Vérifier résultat scénario 1
verify_scenario_1() {
    log "Vérification Scénario 1..."
    
    local success=true
    
    # Vérifier contact modifié
    if grep -q "is_blacklisted: true" "$TEST_DIR/contacts/cont_test_001.yml"; then
        log "✅ Contact blacklisted"
    else
        error "❌ Contact non blacklisted"
        success=false
    fi
    
    # Vérifier log
    if [ -f "$LOG_FILE" ]; then
        if grep -q "blacklisted" "$LOG_FILE"; then
            log "✅ Log contient 'blacklisted'"
        fi
    fi
    
    return $([ "$success" = true ] && echo 0 || echo 1)
}

# Main
main() {
    log "=== Tests $WORKFLOW ==="
    
    setup
    
    # Scénario 1
    log ""
    log ">>> Scénario 1: Blacklist simple"
    create_scenario_1
    
    # Exécuter workflow (adapter selon le workflow)
    # node index.js --data-dir="$TEST_DIR" --contact-id="cont_test_001" --motif="Test"
    
    verify_scenario_1
    local scenario1_result=$?
    
    # Cleanup
    cleanup
    
    # Résumé
    log ""
    log "=== Résultats ==="
    if [ $scenario1_result -eq 0 ]; then
        log "✅ Scénario 1: PASS"
    else
        error "❌ Scénario 1: FAIL"
    fi
    
    log "Log complet: $LOG_FILE"
}

# Run
main "$@"
```

## Utilisation

```bash
# Rendre exécutable
chmod +x backend/[workflow]/run-tests.sh

# Lancer les tests
cd backend/[workflow]
./run-tests.sh

# Lancer un scénario spécifique
./run-tests.sh --scenario=1

# Mode verbose
./run-tests.sh --verbose
```

## Intégration CI

```yaml
# .github/workflows/tests.yml (exemple)
name: Tests Workflows
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup test environment
        run: |
          mkdir -p backend/data-tests/{contacts,impayes,relances,logs}
          cp -r backend/data/sequences backend/data-tests/
      
      - name: Run workflow tests
        run: |
          for test in backend/*/run-tests.sh; do
            echo "Testing: $test"
            "$test" || exit 1
          done
```
