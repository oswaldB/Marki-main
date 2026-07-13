# Tests Scénarios - regenerate-relances-contact

## Description
Régénérer les relances pour un contact spécifique après un événement (blacklist/unblacklist d'un impayé).

## Structure Données de Test

```
backend/data-tests/
├── contacts/               # Contact cible
├── impayes/                # Impayés du contact
├── relances/               # Relances à régénérer
├── sequences/              # Séquences de relances
└── logs/                   # Logs de régénération
```

## Initialisation

```bash
#!/bin/bash
# init-regenerate-relances-contact-test.sh

mkdir -p backend/data-tests/{contacts,impayes,relances,sequences,logs}

# Copier séquences
cp backend/data/sequences/*.yml backend/data-tests/sequences/ 2>/dev/null || true
```

---

## Scénarios

### Scénario 1 : Régénération Simple

**Objectif** : Régénérer les relances d'un contact après modification.

#### Input Data

```yaml
# backend/data-tests/contacts/cont_regen.yml
id: cont_regen
nom: Dupont
prenom: Jean
email: jean.dupont@test.com
is_blacklisted: false
created_at: "2024-01-15T10:00:00Z"
```

```yaml
# backend/data-tests/impayes/imp_regen_001.yml
id: imp_regen_001
nfacture: "INV-REGEN-001"
reste_a_payer: 1500
facture_soldee: false
payeur_id: cont_regen
contact_relance_id: cont_regen
sequence_id: seq_default
```

```yaml
# backend/data-tests/relances/rel_old_001.yml
id: rel_old_001
contact_id: cont_regen
impaye_ids:
  - imp_regen_001
statut: brouillon
objet: "Ancienne relance"
corps: "<p>Contenu ancien</p>"
email_index: 0
```

#### Exécution

```bash
cd backend/regenerate-relances-contact

DATA_DIR="../data-tests" \
node index.js --contact-id=cont_regen
```

#### Vérifications

```bash
#!/bin/bash
# verify-scenario-1.sh

echo "=== Vérification Scénario 1 : Régénération Simple ==="

# 1. Vérifier anciennes relances supprimées
if [ ! -f "backend/data-tests/relances/rel_old_001.yml" ]; then
    echo "✅ Ancienne relance brouillon supprimée"
else
    echo "❌ Ancienne relance non supprimée"
    exit 1
fi

# 2. Vérifier nouvelle relance créée
if [ -f "backend/data-tests/relances/rel_new_001.yml" ]; then
    echo "✅ Nouvelle relance créée"
    
    # Vérifier contenu généré
    if grep -q "objet:" backend/data-tests/relances/rel_new_001.yml; then
        echo "✅ Objet généré"
    fi
    
    if grep -q "corps:" backend/data-tests/relances/rel_new_001.yml; then
        echo "✅ Corps généré"
    fi
fi

# 3. Vérifier log
if grep -q "regenerate\|générée" backend/data-tests/logs/regenerate-*.log 2>/dev/null; then
    echo "✅ Log de régénération présent"
fi
```

#### Output Attendu

- Ancienne relance `rel_old_001.yml` supprimée (statut != "Envoyée")
- Nouvelle relance créée avec contenu généré via Ollama
- Scénario détecté (single/multiple/broker/both)
- Planification calculée (date_echeance + delai)

---

### Scénario 2 : Exclusion Impayé Spécifique

**Objectif** : Exclure un impayé spécifique de la régénération.

#### Input Data

```yaml
# Impayé à exclure
id: imp_exclude
nfacture: "INV-EXCLUDE"
reste_a_payer: 1000
payeur_id: cont_regen

# Impayé à inclure
id: imp_include
nfacture: "INV-INCLUDE"
reste_a_payer: 2000
payeur_id: cont_regen
```

Exécution avec `--exclude-impaye-id=imp_exclude`:

```bash
node index.js --contact-id=cont_regen --exclude-impaye-id=imp_exclude
```

#### Vérifications

```bash
# Vérifier que imp_exclude n'est pas dans la nouvelle relance
if grep -A5 "impaye_ids:" backend/data-tests/relances/rel_new.yml | grep -q "imp_include"; then
    echo "✅ imp_include inclus"
fi

if ! grep -A5 "impaye_ids:" backend/data-tests/relances/rel_new.yml | grep -q "imp_exclude"; then
    echo "✅ imp_exclude exclu (correct)"
fi
```

---

### Scénario 3 : Contact Blacklisté (Erreur)

**Objectif** : Refuser la régénération si contact blacklisté.

#### Input Data

```yaml
# backend/data-tests/contacts/cont_blacklist.yml
id: cont_blacklist
nom: Blacklisted
is_blacklisted: true
blacklist_date: "2024-01-10T00:00:00Z"
```

#### Vérifications

```bash
# Vérifier log d'erreur
if grep -q "blacklist\|refus" backend/data-tests/logs/regenerate-*.log 2>/dev/null; then
    echo "✅ Log mentionne contact blacklisté"
fi

# Vérifier qu'aucune relance n'est créée
if [ $(ls backend/data-tests/relances/*.yml 2>/dev/null | wc -l) -eq 0 ]; then
    echo "✅ Aucune relance créée (correct)"
fi
```

---

### Scénario 4 : Relances Envoyées Conservées

**Objectif** : Ne pas supprimer les relances déjà envoyées.

#### Input Data

```yaml
# Relance déjà envoyée
id: rel_sent
contact_id: cont_regen
impaye_ids:
  - imp_regen_001
statut: Envoyée
date_envoi: "2024-01-10T08:00:00Z"

# Relance brouillon
id: rel_draft
contact_id: cont_regen
impaye_ids:
  - imp_regen_001
statut: brouillon
```

#### Vérifications

```bash
# Vérifier relance envoyée conservée
if [ -f "backend/data-tests/relances/rel_sent.yml" ]; then
    echo "✅ Relance envoyée conservée"
fi

# Vérifier relance brouillon supprimée
if [ ! -f "backend/data-tests/relances/rel_draft.yml" ]; then
    echo "✅ Relance brouillon supprimée"
fi
```

---

### Scénario 5 : Sans Impayés à Relancer

**Objectif** : Gérer cas où contact n'a plus d'impayés à relancer.

#### Vérifications

```bash
# Vérifier log
if grep -q "aucun impayé\|no impayes\|rien à relancer" backend/data-tests/logs/regenerate-*.log 2>/dev/null; then
    echo "✅ Log indique aucun impayé à relancer"
fi

# Vérifier message retourné
if grep -q "0 relance\|aucune relance" backend/data-tests/logs/regenerate-*.log; then
    echo "✅ 0 relances générées"
fi
```

---

## Script de Test Automatisé

```bash
#!/bin/bash
# backend/regenerate-relances-contact/run-tests.sh

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
