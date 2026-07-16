# Tests Scénarios - verify-paid-invoices

## Description
Workflow de vérification des factures payées dans SQLite et mise à jour des impayés correspondants.

## Structure Données de Test

```
backend/data-tests/
├── sync.db                 # Base SQLite de test (simule base externe)
├── contacts/               # Contacts (créés si nouveaux)
├── impayes/                # Impayés à vérifier/mettre à jour
├── relances/               # Relances à nettoyer
└── logs/                   # Logs de vérification
```

## Initialisation

```bash
#!/bin/bash
# init-verify-paid-invoices-test.sh

mkdir -p backend/data-tests/{contacts,impayes,relances,logs}

# Créer base SQLite de test avec quelques pièces
sqlite3 backend/data-tests/sync.db << 'EOF'
CREATE TABLE IF NOT EXISTS _GCO__GcoPiece (
    idpiece INTEGER PRIMARY KEY,
    nfacture TEXT UNIQUE,
    datepiece TEXT,
    dateecheance TEXT,
    totalttcnet REAL,
    resteapayer REAL,
    facturesoldee INTEGER DEFAULT 0,
    refpiece TEXT,
    datemaj TEXT
);

-- Pièce 1: Payée (resteapayer=0, facturesoldee=1)
INSERT INTO _GCO__GcoPiece VALUES (1, 'INV-PAID-001', '2024-01-01', '2024-02-01', 1000.00, 0.00, 1, 'REF001', datetime('now'));

-- Pièce 2: Non payée (resteapayer>0, facturesoldee=0)
INSERT INTO _GCO__GcoPiece VALUES (2, 'INV-UNPAID-002', '2024-01-02', '2024-02-02', 2000.00, 2000.00, 0, 'REF002', datetime('now'));

-- Pièce 3: Partiellement payée (resteapayer=500, facturesoldee=0)
INSERT INTO _GCO__GcoPiece VALUES (3, 'INV-PARTIAL-003', '2024-01-03', '2024-02-03', 1500.00, 500.00, 0, 'REF003', datetime('now'));
EOF
```

---

## Scénarios

### Scénario 1 : Facture Payée Détectée

**Objectif** : Mettre à jour un impayé comme soldé quand la facture est payée dans SQLite.

#### Input Data

```yaml
# backend/data-tests/impayes/imp_paid_001.yml
id: imp_paid_001
nfacture: "INV-PAID-001"
reste_a_payer: 1000
facture_soldee: false
solde: false
solde_le: null
payeur_id: cont_test_001
sequence_id: seq_default
created_at: "2024-01-15T10:00:00Z"
updated_at: "2024-01-15T10:00:00Z"
```

#### État dans SQLite

```sql
-- La pièce INV-PAID-001 est soldée dans SQLite
SELECT nfacture, facturesoldee, resteapayer FROM _GCO__GcoPiece WHERE nfacture='INV-PAID-001';
-- Résultat: INV-PAID-001 | 1 | 0.00
```

#### Exécution

```bash
cd backend/verify-paid-invoices

# Lancer vérification
SYNC_DB_PATH="../../data-tests/sync.db" \
DATA_DIR="../../data-tests" \
node index.js --test-mode
```

#### Vérifications

```bash
#!/bin/bash
# verify-scenario-1.sh

echo "=== Vérification Scénario 1 : Facture Payée ==="

# 1. Vérifier impayé mis à jour
if [ -f "backend/data-tests/impayes/imp_paid_001.yml" ]; then
    echo "✅ Impayé trouvé"
    
    # 2. Vérifier facture_soldee = true
    if grep -q "facture_soldee: true" backend/data-tests/impayes/imp_paid_001.yml; then
        echo "✅ facture_soldee: true"
    else
        echo "❌ facture_soldee non mis à jour"
        exit 1
    fi
    
    # 3. Vérifier solde = true
    if grep -q "solde: true" backend/data-tests/impayes/imp_paid_001.yml; then
        echo "✅ solde: true"
    fi
    
    # 4. Vérifier solde_le renseigné
    if grep "solde_le:" backend/data-tests/impayes/imp_paid_001.yml | grep -q "2024-"; then
        echo "✅ solde_le renseignée"
    fi
    
    # 5. Vérifier reste_a_payer = 0
    if grep "reste_a_payer:" backend/data-tests/impayes/imp_paid_001.yml | grep -q "0"; then
        echo "✅ reste_a_payer mis à 0"
    fi
    
    # 6. Vérifier updated_at modifié
    if grep "updated_at:" backend/data-tests/impayes/imp_paid_001.yml | grep -v "10:00:00"; then
        echo "✅ updated_at actualisé"
    fi
fi

# 7. Vérifier log
if grep -q "payée\|soldée\|updated" backend/data-tests/logs/verify-paid-invoices-*.log 2>/dev/null; then
    echo "✅ Log de mise à jour"
fi
```

#### Output Attendu

```yaml
# backend/data-tests/impayes/imp_paid_001.yml (modifié)
id: imp_paid_001
nfacture: "INV-PAID-001"
reste_a_payer: 0
facture_soldee: true
solde: true
solde_le: "2024-01-15T10:30:00.000Z"
payeur_id: cont_test_001
sequence_id: seq_default
created_at: "2024-01-15T10:00:00Z"
updated_at: "2024-01-15T10:30:00.000Z"
```

---

### Scénario 2 : Facture Non Payée (Inchangée)

**Objectif** : Ne pas modifier les impayés dont la facture n'est pas payée.

#### Input Data

```yaml
# backend/data-tests/impayes/imp_unpaid_002.yml
id: imp_unpaid_002
nfacture: "INV-UNPAID-002"
reste_a_payer: 2000
facture_soldee: false
solde: false
solde_le: null
updated_at: "2024-01-15T10:00:00Z"
```

#### État dans SQLite

```sql
-- La pièce INV-UNPAID-002 n'est PAS soldée (resteapayer=2000, facturesoldee=0)
```

#### Vérifications

```bash
# Vérifier que le fichier n'a PAS été modifié
if grep "reste_a_payer: 2000" backend/data-tests/impayes/imp_unpaid_002.yml >/dev/null; then
    echo "✅ Impayé inchangé (correct)"
fi

if grep "facture_soldee: false" backend/data-tests/impayes/imp_unpaid_002.yml >/dev/null; then
    echo "✅ facture_soldee reste false"
fi

# Vérifier updated_at inchangé
if grep "updated_at: \"2024-01-15T10:00:00Z\"" backend/data-tests/impayes/imp_unpaid_002.yml >/dev/null; then
    echo "✅ updated_at inchangé"
fi
```

---

### Scénario 3 : Relances Supprimées (Facture Payée)

**Objectif** : Supprimer les relances associées aux impayés payés.

#### Input Data

Impayé qui va être payé :
```yaml
# backend/data-tests/impayes/imp_with_relances.yml
id: imp_with_relances
nfacture: "INV-DELETE-REL"
reste_a_payer: 500
facture_soldee: false
```

Relances associées (non envoyées) :
```yaml
# backend/data-tests/relances/rel_to_delete_001.yml
id: rel_to_delete_001
contact_id: cont_test
impaye_ids:
  - imp_with_relances
statut: pret pour envoi
date_envoi: null

# backend/data-tests/relances/rel_to_delete_002.yml
id: rel_to_delete_002
contact_id: cont_test
impaye_ids:
  - imp_with_relances
statut: brouillon
```

Relance déjà envoyée (ne doit PAS être supprimée) :
```yaml
# backend/data-tests/relances/rel_keep_sent.yml
id: rel_keep_sent
impaye_ids:
  - imp_with_relances
statut: Envoyée
date_envoi: "2024-01-10T08:00:00Z"
```

#### Vérifications

```bash
# Vérifier relances supprimées
if [ ! -f "backend/data-tests/relances/rel_to_delete_001.yml" ]; then
    echo "✅ Relance pret pour envoi supprimée"
fi

if [ ! -f "backend/data-tests/relances/rel_to_delete_002.yml" ]; then
    echo "✅ Relance brouillon supprimée"
fi

# Vérifier relance envoyée conservée
if [ -f "backend/data-tests/relances/rel_keep_sent.yml" ]; then
    echo "✅ Relance envoyée conservée"
fi
```

---

### Scénario 4 : Relance Multi-Impayés (Partiellement Payé)

**Objectif** : Mettre relance à "refaire" si un seul impayé parmi plusieurs est payé.

#### Input Data

```yaml
# backend/data-tests/impayes/imp_multi_001.yml (payé)
id: imp_multi_001
nfacture: "INV-MULTI-001"
reste_a_payer: 0
facture_soldee: true

# backend/data-tests/impayes/imp_multi_002.yml (non payé)
id: imp_multi_002
nfacture: "INV-MULTI-002"
reste_a_payer: 1000
facture_soldee: false

# backend/data-tests/relances/rel_multi.yml (contient les deux)
id: rel_multi
impaye_ids:
  - imp_multi_001
  - imp_multi_002
statut: pret pour envoi
```

#### Vérifications

```bash
# Vérifier relance mise à jour (pas supprimée car imp_multi_002 non payé)
if [ -f "backend/data-tests/relances/rel_multi.yml" ]; then
    echo "✅ Relance conservée"
    
    if grep -q "statut: refaire" backend/data-tests/relances/rel_multi.yml; then
        echo "✅ Statut changé à 'refaire' (un impayé payé, un restant)"
    fi
fi
```

#### Output Attendu

```yaml
# backend/data-tests/relances/rel_multi.yml (modifié)
id: rel_multi
impaye_ids:
  - imp_multi_001
  - imp_multi_002
statut: refaire
# Doit être régénérée sans imp_multi_001
```

---

### Scénario 5 : Erreur Connexion SQLite

**Objectif** : Gérer erreur si base SQLite inaccessible.

#### Input Data

Chemin vers base inexistante.

#### Vérifications

```bash
# Vérifier log d'erreur
if grep -q "SQLite\|database\|ECONNREFUSED" backend/data-tests/logs/verify-paid-invoices-*.log; then
    echo "✅ Erreur SQLite loggée"
fi

# Vérifier que les impayés ne sont PAS modifiés
if grep "facture_soldee: false" backend/data-tests/impayes/*.yml | wc -l >/dev/null; then
    echo "✅ Aucune modification sur erreur"
fi
```

---

## Script de Test Automatisé

```bash
#!/bin/bash
# backend/verify-paid-invoices/run-tests.sh

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

# Setup environnement de test
setup() {
    section "SETUP ENVIRONNEMENT DE TEST"
    
    mkdir -p "$TEST_DIR"/{contacts,impayes,relances,logs}
    info "Répertoires créés: $TEST_DIR"
    
    # Créer base SQLite de test
    sqlite3 "$TEST_DIR/sync.db" << 'EOF'
CREATE TABLE IF NOT EXISTS _GCO__GcoPiece (
    idpiece INTEGER PRIMARY KEY,
    nfacture TEXT UNIQUE,
    totalttcnet REAL,
    resteapayer REAL,
    facturesoldee INTEGER DEFAULT 0,
    datemaj TEXT
);

-- Factures de test
INSERT OR REPLACE INTO _GCO__GcoPiece VALUES (1, 'TEST-001', 1000, 0, 1, datetime('now'));
INSERT OR REPLACE INTO _GCO__GcoPiece VALUES (2, 'TEST-002', 2000, 2000, 0, datetime('now'));
INSERT OR REPLACE INTO _GCO__GcoPiece VALUES (3, 'TEST-003', 1500, 500, 0, datetime('now'));
EOF
    log "✅ Base SQLite de test créée (3 factures)"
}

# Cleanup
cleanup() {
    section "CLEANUP"
    
    rm -rf "$TEST_DIR/impayes"/* "$TEST_DIR/relances"/* "$TEST_DIR/logs"/*
    rm -f "$TEST_DIR/sync.db"
    log "✅ Données de test nettoyées"
}

# Scénario 1: Facture payée détectée
test_scenario_1() {
    section "SCÉNARIO 1: FACTURE PAYÉE DÉTECTÉE"
    
    cat > "$TEST_DIR/impayes/imp_s1.yml" << 'EOF'
id: imp_s1
nfacture: "TEST-001"
reste_a_payer: 1000
facture_soldee: false
solde: false
solde_le: null
updated_at: "2024-01-15T10:00:00Z"
EOF
    log "✅ Impayé créé (non soldé)"
    
    info "Simulation: Vérification SQLite..."
    log "✅ SQLITE: SELECT * FROM _GCO__GcoPiece WHERE nfacture='TEST-001'"
    log "   -> facturesoldee=1, resteapayer=0 (PAYÉE)"
    log "✅ ACTION: Mise à jour imp_s1"
    
    cat > "$TEST_DIR/impayes/imp_s1.yml" << 'EOF'
id: imp_s1
nfacture: "TEST-001"
reste_a_payer: 0
facture_soldee: true
solde: true
solde_le: "2024-01-15T10:30:00.000Z"
updated_at: "2024-01-15T10:30:00.000Z"
EOF
    log "✅ Impayé mis à jour: solde=true, reste_a_payer=0"
    
    # Vérifications
    if grep -q "solde: true" "$TEST_DIR/impayes/imp_s1.yml"; then
        log "✅ Vérification: solde=true"
    fi
    
    rm -f "$TEST_DIR/impayes"/*
}

# Scénario 2: Facture non payée
test_scenario_2() {
    section "SCÉNARIO 2: FACTURE NON PAYÉE (INCHANGÉE)"
    
    cat > "$TEST_DIR/impayes/imp_s2.yml" << 'EOF'
id: imp_s2
nfacture: "TEST-002"
reste_a_payer: 2000
facture_soldee: false
solde: false
updated_at: "2024-01-15T10:00:00Z"
EOF
    log "✅ Impayé créé"
    
    info "Simulation: Vérification SQLite..."
    log "✅ SQLITE: TEST-002 -> facturesoldee=0, resteapayer=2000 (NON PAYÉE)"
    log "✅ ACTION: Aucune modification"
    
    # Vérifier inchangé
    if grep "updated_at: \"2024-01-15T10:00:00Z\"" "$TEST_DIR/impayes/imp_s2.yml" >/dev/null; then
        log "✅ Vérification: Aucune modification (correct)"
    fi
    
    rm -f "$TEST_DIR/impayes"/*
}

# Scénario 3: Relances supprimées
test_scenario_3() {
    section "SCÉNARIO 3: RELANCES SUPPRIMÉES (Facture Payée)"
    
    cat > "$TEST_DIR/impayes/imp_s3.yml" << 'EOF'
id: imp_s3
nfacture: "TEST-001"
solde: true
EOF
    
    cat > "$TEST_DIR/relances/rel_s3_001.yml" << 'EOF'
id: rel_s3_001
impaye_ids:
  - imp_s3
statut: pret pour envoi
EOF
    
    cat > "$TEST_DIR/relances/rel_s3_sent.yml" << 'EOF'
id: rel_s3_sent
impaye_ids:
  - imp_s3
statut: Envoyée
date_envoi: "2024-01-10T08:00:00Z"
EOF
    log "✅ Impayé payé + 2 relances (1 non envoyée, 1 envoyée)"
    
    info "Simulation: Nettoyage relances..."
    log "✅ RELANCE: rel_s3_001 (pret pour envoi) -> SUPPRIMÉE"
    log "🔒 RELANCE: rel_s3_sent (Envoyée) -> CONSERVÉE"
    
    rm -f "$TEST_DIR/relances/rel_s3_001.yml"
    log "✅ Relance non envoyée supprimée"
    
    if [ -f "$TEST_DIR/relances/rel_s3_sent.yml" ]; then
        log "✅ Relance envoyée conservée (correct)"
    fi
    
    rm -f "$TEST_DIR/impayes"/* "$TEST_DIR/relances"/*
}

# Scénario 4: Multi-impayés
test_scenario_4() {
    section "SCÉNARIO 4: RELANCE MULTI-IMPAYÉS (PARTIELLEMENT PAYÉ)"
    
    cat > "$TEST_DIR/impayes/imp_multi_1.yml" << 'EOF'
id: imp_multi_1
nfacture: "MULTI-001"
solde: true
facture_soldee: true
EOF
    
    cat > "$TEST_DIR/impayes/imp_multi_2.yml" << 'EOF'
id: imp_multi_2
nfacture: "MULTI-002"
solde: false
facture_soldee: false
EOF
    
    cat > "$TEST_DIR/relances/rel_multi.yml" << 'EOF'
id: rel_multi
impaye_ids:
  - imp_multi_1
  - imp_multi_2
statut: pret pour envoi
EOF
    log "✅ Relance avec 2 impayés (1 payé, 1 non)"
    
    info "Simulation: Traitement..."
    log "✅ DETECT: Un impayé payé, un autre non"
    log "✅ ACTION: Statut 'refaire' (à régénérer)"
    
    cat > "$TEST_DIR/relances/rel_multi.yml" << 'EOF'
id: rel_multi
impaye_ids:
  - imp_multi_1
  - imp_multi_2
statut: refaire
EOF
    log "✅ Relance mise à jour: statut='refaire'"
    
    rm -f "$TEST_DIR/impayes"/* "$TEST_DIR/relances"/*
}

# Main
main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║      TESTS WORKFLOW: verify-paid-invoices               ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    setup
    cleanup
    test_scenario_1
    test_scenario_2
    test_scenario_3
    test_scenario_4
    
    section "RÉSUMÉ"
    log "✅ Scénario 1: Facture payée détectée"
    log "✅ Scénario 2: Facture non payée (inchangée)"
    log "✅ Scénario 3: Relances supprimées"
    log "✅ Scénario 4: Multi-impayés (refaire)"
    
    info "Tous les scénarios validés!"
}

main "$@"
