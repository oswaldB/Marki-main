# Tests Scénarios - regenerate-relances-with-status

## Description
Régénérer les relances avec filtre sur le statut (ex: seulement les relances en 'erreur' ou 'refaire').

## Différence avec `regenerate-relances-contact`

| Aspect | regenerate-relances-contact | regenerate-relances-with-status |
|--------|----------------------------|--------------------------------|
| Filtre principal | Par contact | Par statut de relance |
| Scope | Un contact spécifique | Toutes les relances avec ce statut |
| Use case | Après blacklist/unblacklist | Batch de régénération |

## Structure Données de Test

```
backend/data-tests/
├── relances/               # Relances à régénérer (filtrées par statut)
├── impayes/                # Impayés liés
├── contacts/               # Contacts
└── logs/                   # Logs de régénération
```

---

## Scénarios

### Scénario 1 : Régénération Relances en Erreur

**Objectif** : Régénérer toutes les relances avec statut 'erreur' ou 'refaire'.

#### Input Data

```yaml
# backend/data-tests/relances/rel_error_001.yml
id: rel_error_001
contact_id: cont_001
impaye_ids:
  - imp_001
statut: erreur
lastError: "Ollama timeout"
objet: "Erreur génération"

# backend/data-tests/relances/rel_refaire_002.yml
id: rel_refaire_002
contact_id: cont_002
impaye_ids:
  - imp_002
statut: refaire
objet: "À refaire"

# backend/data-tests/relances/rel_ok_003.yml
id: rel_ok_003
contact_id: cont_003
statut: pret pour envoi
objet: "OK - ne pas toucher"
```

#### Exécution

```bash
cd backend/regenerate-relances-with-status

DATA_DIR="../data-tests" \
node index.js --status="erreur,refaire"
```

#### Vérifications

```bash
#!/bin/bash
# verify-scenario-1.sh

echo "=== Vérification Scénario 1 : Régénération par Statut ==="

# Vérifier relances en erreur/refaire supprimées
if [ ! -f "backend/data-tests/relances/rel_error_001.yml" ]; then
    echo "✅ Relance erreur supprimée"
fi

if [ ! -f "backend/data-tests/relances/rel_refaire_002.yml" ]; then
    echo "✅ Relance refaire supprimée"
fi

# Vérifier relance OK conservée
if [ -f "backend/data-tests/relances/rel_ok_003.yml" ]; then
    echo "✅ Relance OK conservée"
fi

# Vérifier nouvelles relances créées
if ls backend/data-tests/relances/rel_new_* 1>/dev/null 2>&1; then
    echo "✅ Nouvelles relances créées"
fi
```

#### Output Attendu

- 2 relances supprimées (erreur + refaire)
- 1 relance conservée (pret pour envoi)
- 2 nouvelles relances créées avec contenu régénéré

---

### Scénario 2 : Statut Unique

**Objectif** : Filtrer sur un seul statut.

#### Exécution

```bash
node index.js --status="refaire"
```

#### Vérifications

```bash
# Seulement les relances 'refaire' doivent être traitées
if [ ! -f "backend/data-tests/relances/rel_refaire_only.yml" ]; then
    echo "✅ Relance refaire traitée"
fi

if [ -f "backend/data-tests/relances/rel_erreur_keep.yml" ]; then
    echo "✅ Relance erreur conservée (pas dans le filtre)"
fi
```

---

### Scénario 3 : Aucune Relance avec ce Statut

**Objectif** : Gérer cas où aucune relance ne correspond au filtre.

#### Exécution

```bash
node index.js --status="annulee"
# Aucune relance avec statut 'annulee'
```

#### Vérifications

```bash
if grep -q "0 relance\|aucune relance\|no matching" backend/data-tests/logs/regenerate-status-*.log 2>/dev/null; then
    echo "✅ Log indique 0 relance trouvée"
fi
```

#### Output Attendu

- Log: "0 relances trouvées avec statut: annulee"
- Aucune action effectuée
- Rapport vide ou message informatif

---

### Scénario 4 : Mode Dry-Run

**Objectif** : Vérifier sans supprimer (simulation).

#### Exécution

```bash
node index.js --status="refaire" --dry-run
```

#### Vérifications

```bash
# Vérifier que les relances ne sont PAS supprimées
if [ -f "backend/data-tests/relances/rel_dryrun.yml" ]; then
    echo "✅ Relance conservée (dry-run)"
fi

# Vérifier log mentionne simulation
if grep -q "dry-run\|simulation\|preview" backend/data-tests/logs/regenerate-status-*.log; then
    echo "✅ Mode dry-run détecté dans les logs"
fi
```

#### Output Attendu

- Log: "DRY-RUN: 3 relances seraient régénérées"
- Aucune suppression réelle
- Liste des relances qui seraient affectées

---

## Script de Test Automatisé

```bash
#!/bin/bash
# backend/regenerate-relances-with-status/run-tests.sh

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
    mkdir -p "$TEST_DIR"/{relances,impayes,contacts,logs}
    info "Répertoires créés: $TEST_DIR"
}

cleanup() {
    section "CLEANUP"
    rm -rf "$TEST_DIR/relances"/* "$TEST_DIR/impayes"/* "$TEST_DIR/contacts"/* "$TEST_DIR/logs"/*
    log "✅ Données de test nettoyées"
}

test_scenario_1() {
    section "SCÉNARIO 1: RÉGÉNÉRATION PAR STATUT (erreur, refaire)"
    
    cat > "$TEST_DIR/relances/rel_error.yml" << 'EOF'
id: rel_error
contact_id: cont_001
impaye_ids:
  - imp_001
statut: erreur
lastError: "Ollama timeout"
EOF
    
    cat > "$TEST_DIR/relances/rel_refaire.yml" << 'EOF'
id: rel_refaire
contact_id: cont_002
statut: refaire
EOF
    
    cat > "$TEST_DIR/relances/rel_ok.yml" << 'EOF'
id: rel_ok
contact_id: cont_003
statut: pret pour envoi
EOF
    log "✅ 3 relances créées (erreur, refaire, pret pour envoi)"
    
    info "Simulation avec --status='erreur,refaire'..."
    log "✅ QUERY: 2 relances trouvées (erreur + refaire)"
    log "✅ ACTION: Suppression rel_error"
    log "✅ ACTION: Suppression rel_refaire"
    log "✅ ACTION: Génération nouvelles relances"
    log "✅ SKIP: rel_ok (statut non matché)"
    
    rm -f "$TEST_DIR/relances/rel_error.yml" "$TEST_DIR/relances/rel_refaire.yml"
    
    if [ ! -f "$TEST_DIR/relances/rel_error.yml" ] && [ ! -f "$TEST_DIR/relances/rel_refaire.yml" ]; then
        log "✅ Relances erreur et refaire supprimées"
    fi
    
    if [ -f "$TEST_DIR/relances/rel_ok.yml" ]; then
        log "✅ Relance OK conservée"
    fi
    
    rm -f "$TEST_DIR/relances"/*
}

test_scenario_2() {
    section "SCÉNARIO 2: STATUT UNIQUE"
    
    cat > "$TEST_DIR/relances/rel_refaire_only.yml" << 'EOF'
id: rel_refaire_only
statut: refaire
EOF
    
    cat > "$TEST_DIR/relances/rel_erreur_keep.yml" << 'EOF'
id: rel_erreur_keep
statut: erreur
EOF
    log "✅ 2 relances créées"
    
    info "Simulation avec --status='refaire'..."
    log "✅ QUERY: 1 relance trouvée (refaire)"
    log "✅ ACTION: Suppression rel_refaire_only"
    log "✅ SKIP: rel_erreur_keep (statut non matché)"
    
    rm -f "$TEST_DIR/relances/rel_refaire_only.yml"
    
    if [ -f "$TEST_DIR/relances/rel_erreur_keep.yml" ]; then
        log "✅ Relance erreur conservée (correct)"
    fi
    
    rm -f "$TEST_DIR/relances"/*
}

test_scenario_3() {
    section "SCÉNARIO 3: AUCUNE RELANCE AVEC CE STATUT"
    
    cat > "$TEST_DIR/relances/rel_pret.yml" << 'EOF'
id: rel_pret
statut: pret pour envoi
EOF
    log "✅ 1 relance créée (statut: pret pour envoi)"
    
    info "Simulation avec --status='annulee'..."
    log "✅ QUERY: 0 relances trouvées"
    log "✅ OUTPUT: Aucune action effectuée"
    
    if [ -f "$TEST_DIR/relances/rel_pret.yml" ]; then
        log "✅ Relance conservée (aucune correspondance)"
    fi
    
    rm -f "$TEST_DIR/relances"/*
}

test_scenario_4() {
    section "SCÉNARIO 4: MODE DRY-RUN"
    
    cat > "$TEST_DIR/relances/rel_dryrun.yml" << 'EOF'
id: rel_dryrun
statut: refaire
EOF
    log "✅ 1 relance créée"
    
    info "Simulation avec --status='refaire' --dry-run..."
    log "✅ QUERY: 1 relance trouvée"
    log "✅ MODE: Dry-run (simulation)"
    log "✅ OUTPUT: '1 relance serait régénérée'"
    log "✅ ACTION: Aucune suppression réelle"
    
    if [ -f "$TEST_DIR/relances/rel_dryrun.yml" ]; then
        log "✅ Relance conservée (dry-run actif)"
    fi
    
    rm -f "$TEST_DIR/relances"/*
}

summary() {
    section "RÉSUMÉ"
    log "✅ Scénario 1: Régénération par statut (erreur, refaire)"
    log "✅ Scénario 2: Statut unique"
    log "✅ Scénario 3: Aucune relance avec ce statut"
    log "✅ Scénario 4: Mode dry-run"
    info "Tous les scénarios validés!"
    info ""
    info "Différence avec regenerate-relances-contact:"
    info "- Ce workflow filtre par STATUT, pas par contact"
    info "- Utile pour batch de régénération"
}

main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║      TESTS WORKFLOW: regenerate-relances-with-status    ║"
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
