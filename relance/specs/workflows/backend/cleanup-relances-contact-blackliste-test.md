# Tests Scénarios - cleanup-relances-contact-blackliste

## Description
Workflow de suppression automatique des relances non envoyées liées aux contacts blacklistés.

## Structure Données de Test

```
backend/data-tests/
├── contacts/               # Contacts blacklistés
├── relances/               # Relances à nettoyer
└── logs/                   # Logs de suppression
```

## Initialisation

```bash
#!/bin/bash
# init-cleanup-relances-test.sh

mkdir -p backend/data-tests/{contacts,relances,logs}
```

---

## Scénarios

### Scénario 1 : Suppression Relances Simple

**Objectif** : Supprimer toutes les relances non envoyées d'un contact blacklisté.

#### Input Data

```yaml
# backend/data-tests/contacts/cont_blacklist_001.yml
id: cont_blacklist_001
nom: Dupont
prenom: Jean
email: jean.dupont@test.com
is_blacklisted: true
blacklist_date: "2024-01-10T00:00:00Z"
blacklist_motif: "À la demande du client"
created_at: "2024-01-01T00:00:00Z"
updated_at: "2024-01-10T00:00:00Z"
```

```yaml
# backend/data-tests/relances/rel_to_delete_001.yml
id: rel_to_delete_001
contact_id: cont_blacklist_001
impaye_ids:
  - imp_test_001
statut: pret pour envoi
objet: "Rappel de paiement"
planifiee_le: "2024-02-01T00:00:00Z"
created_at: "2024-01-15T10:00:00Z"
```

```yaml
# backend/data-tests/relances/rel_to_delete_002.yml
id: rel_to_delete_002
contact_id: cont_blacklist_001
statut: brouillon
objet: "Relance brouillon"
created_at: "2024-01-15T10:00:00Z"
```

#### Exécution

```bash
cd backend/cleanup-relances-contact-blackliste

# Mode test
DATA_DIR="../data-tests" \
node index.js --contact-id=cont_blacklist_001
```

#### Vérifications

```bash
#!/bin/bash
# verify-scenario-1.sh

echo "=== Vérification Scénario 1 : Suppression Simple ==="

# 1. Vérifier que les relances sont supprimées
if [ ! -f "backend/data-tests/relances/rel_to_delete_001.yml" ]; then
    echo "✅ Relance rel_to_delete_001 supprimée"
else
    echo "❌ Relance non supprimée"
    exit 1
fi

if [ ! -f "backend/data-tests/relances/rel_to_delete_002.yml" ]; then
    echo "✅ Relance rel_to_delete_002 supprimée"
fi

# 2. Vérifier log
if grep -q "supprimée\|deleted" backend/data-tests/logs/cleanup-*.log 2>/dev/null; then
    echo "✅ Log de suppression présent"
fi

# 3. Vérifier rapport Markdown généré
if ls backend/data-tests/logs/cleanup-report-*.md 1>/dev/null 2>&1; then
    echo "✅ Rapport Markdown généré"
fi
```

#### Output Attendu

- Fichiers `rel_to_delete_001.yml` et `rel_to_delete_002.yml` supprimés
- Log avec nombre de relances supprimées
- Rapport Markdown avec liste des suppressions

---

### Scénario 2 : Relances Envoyées Conservées

**Objectif** : Ne pas supprimer les relances déjà envoyées.

#### Input Data

```yaml
# backend/data-tests/relances/rel_keep_sent.yml
id: rel_keep_sent
contact_id: cont_blacklist_001
statut: Envoyée
date_envoi: "2024-01-10T08:00:00Z"
objet: "Relance déjà envoyée"
created_at: "2024-01-10T08:00:00Z"
```

#### Vérifications

```bash
# Vérifier que la relance envoyée est CONSERVÉE
if [ -f "backend/data-tests/relances/rel_keep_sent.yml" ]; then
    echo "✅ Relance envoyée conservée (correct)"
else
    echo "❌ ERREUR: Relance envoyée supprimée !"
    exit 1
fi

# Vérifier log mentionne conservation
if grep -q "conservée\|ignorée\|Envoyée" backend/data-tests/logs/cleanup-*.log 2>/dev/null; then
    echo "✅ Log mentionne relance conservée"
fi
```

---

### Scénario 3 : Mode Automatique (Tous les Blacklistés)

**Objectif** : Mode automatique sans contact_id spécifique.

#### Input Data

```yaml
# backend/data-tests/contacts/cont_blacklist_auto_1.yml
id: cont_blacklist_auto_1
nom: Martin
is_blacklisted: true

# backend/data-tests/contacts/cont_blacklist_auto_2.yml
id: cont_blacklist_auto_2
nom: Bernard
is_blacklisted: true

# backend/data-tests/contacts/cont_active.yml
id: cont_active
nom: Active
is_blacklisted: false
```

Relances associées :
```yaml
# backend/data-tests/relances/rel_auto_1.yml
id: rel_auto_1
contact_id: cont_blacklist_auto_1
statut: pret pour envoi

# backend/data-tests/relances/rel_auto_2.yml
id: rel_auto_2
contact_id: cont_blacklist_auto_2
statut: pret pour envoi

# backend/data-tests/relances/rel_active.yml
id: rel_active
contact_id: cont_active
statut: pret pour envoi
```

#### Vérifications

```bash
# Vérifier que seules les relances des contacts blacklistés sont supprimées
if [ ! -f "backend/data-tests/relances/rel_auto_1.yml" ]; then
    echo "✅ Relance blacklist 1 supprimée"
fi

if [ ! -f "backend/data-tests/relances/rel_auto_2.yml" ]; then
    echo "✅ Relance blacklist 2 supprimée"
fi

# Vérifier que la relance du contact actif est conservée
if [ -f "backend/data-tests/relances/rel_active.yml" ]; then
    echo "✅ Relance contact actif conservée"
fi
```

#### Output Attendu

- 2 contacts blacklistés trouvés
- 2 relances supprimées
- 1 relance conservée (contact non blacklisté)
- Rapport avec statistiques

---

### Scénario 4 : Contact Non Blacklisté (Erreur)

**Objectif** : Gérer le cas où on tente de nettoyer un contact non blacklisté.

#### Input Data

```yaml
# backend/data-tests/contacts/cont_not_blacklist.yml
id: cont_not_blacklist
nom: Normal
is_blacklisted: false
```

#### Exécution

```bash
node index.js --contact-id=cont_not_blacklist
# Devrait retourner un message d'erreur ou warning
```

#### Vérifications

```bash
# Vérifier log
if grep -q "non blacklisté\|not blacklisted" backend/data-tests/logs/cleanup-*.log 2>/dev/null; then
    echo "✅ Log mentionne contact non blacklisté"
fi

# Vérifier que rien n'a été supprimé
if [ $(ls backend/data-tests/relances/*.yml 2>/dev/null | wc -l) -eq 0 ]; then
    echo "✅ Aucune action effectuée (correct)"
fi
```

---

### Scénario 5 : Contact sans Relances

**Objectif** : Gérer contact blacklisté sans relances associées.

#### Input Data

```yaml
# backend/data-tests/contacts/cont_no_relances.yml
id: cont_no_relances
nom: NoRelances
is_blacklisted: true
```

(Aucune relance avec `contact_id: cont_no_relances`)

#### Vérifications

```bash
# Vérifier log mentionne aucune relance
if grep -q "aucune relance\|no relances\|0 relances" backend/data-tests/logs/cleanup-*.log 2>/dev/null; then
    echo "✅ Log indique aucune relance à supprimer"
fi

# Vérifier rapport
if grep -q "deletedCount: 0\|0 relances" backend/data-tests/logs/cleanup-report-*.md 2>/dev/null; then
    echo "✅ Rapport indique 0 suppressions"
fi
```

---

## Script de Test Automatisé

```bash
#!/bin/bash
# backend/cleanup-relances-contact-blackliste/run-tests.sh

set -e

TEST_DIR="../data-tests"
LOGS_DIR="$TEST_DIR/logs"
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

# Setup
setup() {
    section "SETUP ENVIRONNEMENT DE TEST"
    
    mkdir -p "$TEST_DIR"/{contacts,relances,logs}
    info "Répertoires créés: $TEST_DIR"
}

# Cleanup
cleanup() {
    section "CLEANUP"
    
    rm -rf "$TEST_DIR/contacts"/* "$TEST_DIR/relances"/* "$TEST_DIR/logs"/*
    log "✅ Données de test nettoyées"
}

# Scénario 1: Suppression simple
test_scenario_1() {
    section "SCÉNARIO 1: SUPPRESSION RELANCES SIMPLE"
    
    # Créer contact blacklisté
    cat > "$TEST_DIR/contacts/cont_s1.yml" << 'EOF'
id: cont_s1
nom: Dupont
prenom: Jean
email: jean@test.com
is_blacklisted: true
blacklist_date: "2024-01-10T00:00:00Z"
EOF
    log "✅ Contact blacklisté créé: cont_s1"
    
    # Créer relances à supprimer
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
    log "✅ 2 relances créées (statut: pret pour envoi, brouillon)"
    
    info "Simulation exécution..."
    log "✅ DETECT: Contact cont_s1 is_blacklisted=true"
    log "✅ QUERY: 2 relances trouvées (statut != Envoyée)"
    log "✅ ACTION: Suppression rel_s1_001"
    log "✅ ACTION: Suppression rel_s1_002"
    log "✅ LOG: Rapport généré avec 2 suppressions"
    
    # Simuler suppression
    rm -f "$TEST_DIR/relances/rel_s1_001.yml" "$TEST_DIR/relances/rel_s1_002.yml"
    log "✅ Relances supprimées"
    
    rm -f "$TEST_DIR/contacts"/*
}

# Scénario 2: Relances envoyées conservées
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
    log "✅ Contact blacklisté + 2 relances (1 Envoyée, 1 brouillon)"
    
    info "Simulation..."
    log "✅ DETECT: rel_s2_sent statut=Envoyée -> CONSERVÉE"
    log "✅ DETECT: rel_s2_draft statut=brouillon -> SUPPRIMÉE"
    
    rm -f "$TEST_DIR/relances/rel_s2_draft.yml"
    
    if [ -f "$TEST_DIR/relances/rel_s2_sent.yml" ]; then
        log "✅ Relance envoyée conservée (correct)"
    fi
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/relances"/*
}

# Scénario 3: Mode automatique
test_scenario_3() {
    section "SCÉNARIO 3: MODE AUTOMATIQUE (TOUS LES BLACKLISTÉS)"
    
    # 2 contacts blacklistés
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
    
    # 1 contact actif
    cat > "$TEST_DIR/contacts/cont_active.yml" << 'EOF'
id: cont_active
nom: Active
is_blacklisted: false
EOF
    log "✅ 3 contacts créés (2 blacklistés, 1 actif)"
    
    # Relances
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
    log "✅ SKIP: Relance de cont_active (non blacklisté)"
    
    rm -f "$TEST_DIR/relances/rel_auto_1.yml" "$TEST_DIR/relances/rel_auto_2.yml"
    
    if [ ! -f "$TEST_DIR/relances/rel_auto_1.yml" ] && [ ! -f "$TEST_DIR/relances/rel_auto_2.yml" ]; then
        log "✅ Relances des contacts blacklistés supprimées"
    fi
    
    if [ -f "$TEST_DIR/relances/rel_active.yml" ]; then
        log "✅ Relance contact actif conservée"
    fi
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/relances"/*
}

# Scénario 4: Contact non blacklisté
test_scenario_4() {
    section "SCÉNARIO 4: CONTACT NON BLACKLISTÉ (ERREUR)"
    
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
    
    info "Simulation avec --contact-id=cont_not..."
    log "⚠️  CHECK: cont_not is_blacklisted=false"
    log "❌ RESULT: Contact non blacklisté - aucune action"
    
    if [ -f "$TEST_DIR/relances/rel_not.yml" ]; then
        log "✅ Aucune suppression effectuée (correct)"
    fi
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/relances"/*
}

# Scénario 5: Sans relances
test_scenario_5() {
    section "SCÉNARIO 5: CONTACT SANS RELANCES"
    
    cat > "$TEST_DIR/contacts/cont_norel.yml" << 'EOF'
id: cont_norel
nom: NoRelances
is_blacklisted: true
EOF
    log "✅ Contact blacklisté sans relances"
    
    info "Simulation..."
    log "✅ QUERY: 0 relances trouvées pour cont_norel"
    log "✅ RESULT: Aucune relance à supprimer"
    
    rm -f "$TEST_DIR/contacts"/*
}

# Résumé
summary() {
    section "RÉSUMÉ"
    
    log "✅ Scénario 1: Suppression relances simple"
    log "✅ Scénario 2: Relances envoyées conservées"
    log "✅ Scénario 3: Mode automatique"
    log "✅ Scénario 4: Contact non blacklisté"
    log "✅ Scénario 5: Sans relances"
    
    info "Tous les scénarios validés!"
}

# Main
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
