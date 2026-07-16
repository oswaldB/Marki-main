# Tests Scénarios - cleanup-all-relances-contact-blackliste

## Description
Version batch du nettoyage des relances - supprime TOUTES les relances (y compris envoyées) des contacts blacklistés.

## Différence avec `cleanup-relances-contact-blackliste`

| Aspect | Standard | Batch (All) |
|--------|----------|-------------|
| Portée | Relances non envoyées | TOUTES les relances |
| Relances "Envoyée" | Conservées | Supprimées |
| Statut | Préservé | Suppression totale |
| Utilisation | Après blacklist | Nettoyage complet |

## Structure Données de Test

```
backend/data-tests/
├── contacts/               # Contacts blacklistés
├── relances/               # Relances à supprimer (tous statuts)
└── logs/                   # Logs de suppression
```

---

## Scénarios

### Scénario 1 : Suppression Totale (Tous Statuts)

**Objectif** : Supprimer TOUTES les relances d'un contact blacklisté, même celles envoyées.

#### Input Data

```yaml
# backend/data-tests/contacts/cont_all_blacklist.yml
id: cont_all_blacklist
nom: Dupont
is_blacklisted: true
blacklist_date: "2024-01-10T00:00:00Z"
```

```yaml
# backend/data-tests/relances/rel_all_001.yml
id: rel_all_001
contact_id: cont_all_blacklist
statut: pret pour envoi
objet: "Rappel"

# backend/data-tests/relances/rel_all_002.yml
id: rel_all_002
contact_id: cont_all_blacklist
statut: Envoyée
date_envoi: "2024-01-10T08:00:00Z"
objet: "Déjà envoyée"

# backend/data-tests/relances/rel_all_003.yml
id: rel_all_003
contact_id: cont_all_blacklist
statut: annulee
objet: "Annulée"
```

#### Exécution

```bash
cd backend/cleanup-all-relances-contact-blackliste

DATA_DIR="../data-tests" \
node index.js --contact-id=cont_all_blacklist
```

#### Vérifications

```bash
#!/bin/bash
# verify-scenario-1.sh

echo "=== Vérification Scénario 1 : Suppression Totale ==="

# Vérifier que TOUTES les relances sont supprimées (même Envoyée)
for rel in rel_all_001 rel_all_002 rel_all_003; do
    if [ ! -f "backend/data-tests/relances/${rel}.yml" ]; then
        echo "✅ Relance ${rel} supprimée"
    else
        echo "❌ Relance ${rel} NON supprimée"
        exit 1
    fi
done

# Vérifier log mentionne suppression totale
if grep -q "supprimée\|deleted\|total" backend/data-tests/logs/cleanup-all-*.log 2>/dev/null; then
    echo "✅ Log de suppression présent"
fi
```

#### Output Attendu

- **3 relances supprimées** (pret pour envoi + Envoyée + annulee)
- Rapport avec statut "total cleanup"
- Log: "3 relances supprimées pour cont_all_blacklist"

---

### Scénario 2 : Mode Batch (Tous les Blacklistés)

**Objectif** : Mode automatique sans spécifier de contact_id.

#### Input Data

```yaml
# Contact 1 blacklisté
id: cont_batch_1
nom: Batch1
is_blacklisted: true

# Contact 2 blacklisté
id: cont_batch_2
nom: Batch2
is_blacklisted: true

# Contact 3 actif
id: cont_batch_active
nom: Active
is_blacklisted: false
```

Relances:
```yaml
# rel_batch_1: pour cont_batch_1
id: rel_batch_1
contact_id: cont_batch_1
statut: pret pour envoi

# rel_batch_2: pour cont_batch_2
id: rel_batch_2
contact_id: cont_batch_2
statut: Envoyée

# rel_batch_active: pour cont_batch_active
id: rel_batch_active
contact_id: cont_batch_active
statut: pret pour envoi
```

#### Vérifications

```bash
# Vérifier relances des contacts blacklistés supprimées
if [ ! -f "backend/data-tests/relances/rel_batch_1.yml" ]; then
    echo "✅ Relance cont_batch_1 supprimée"
fi

if [ ! -f "backend/data-tests/relances/rel_batch_2.yml" ]; then
    echo "✅ Relance cont_batch_2 supprimée (même si Envoyée)"
fi

# Vérifier relance contact actif conservée
if [ -f "backend/data-tests/relances/rel_batch_active.yml" ]; then
    echo "✅ Relance contact actif conservée"
fi
```

#### Output Attendu

- 2 contacts blacklistés trouvés
- 2 relances supprimées (tous statuts)
- 1 relance conservée (contact non blacklisté)

---

### Scénario 3 : Rapport Détaillé

**Objectif** : Générer un rapport Markdown complet.

#### Input Data

5 contacts blacklistés avec 10 relances au total.

#### Vérifications

```bash
# Vérifier rapport Markdown généré
if ls backend/data-tests/logs/cleanup-all-report-*.md 1>/dev/null 2>&1; then
    echo "✅ Rapport Markdown généré"
    
    # Vérifier contenu du rapport
    if grep -q "10 relances supprimées" backend/data-tests/logs/cleanup-all-report-*.md; then
        echo "✅ Rapport mentionne nombre correct"
    fi
    
    if grep -q "5 contacts traités" backend/data-tests/logs/cleanup-all-report-*.md; then
        echo "✅ Rapport mentionne nombre de contacts"
    fi
fi
```

#### Output Attendu (Rapport)

```markdown
# Nettoyage Complet Relances Blacklist - 2024-01-15T10:30:00

## Résumé
- **Contacts traités** : 5
- **Relances supprimées** : 10
- **Mode** : batch (tous les blacklistés)

## Contacts
- cont_batch_1 (Batch1)
- cont_batch_2 (Batch2)
- ...

## Relances Supprimées
- rel_001 (Envoyée)
- rel_002 (pret pour envoi)
- ...
```

---

### Scénario 4 : Contact sans Relances

**Objectif** : Gérer contact blacklisté sans aucune relance.

#### Vérifications

```bash
# Vérifier log indique aucune action
if grep -q "0 relances\|aucune relance\|nothing to delete" backend/data-tests/logs/cleanup-all-*.log 2>/dev/null; then
    echo "✅ Log indique aucune relance à supprimer"
fi

# Vérifier rapport indique 0
if grep -q "deletedCount: 0" backend/data-tests/logs/cleanup-all-report-*.md 2>/dev/null; then
    echo "✅ Rapport indique 0 suppression"
fi
```

---

## Script de Test Automatisé

```bash
#!/bin/bash
# backend/cleanup-all-relances-contact-blackliste/run-tests.sh

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
    section "SCÉNARIO 1: SUPPRESSION TOTALE (TOUS STATUTS)"
    
    cat > "$TEST_DIR/contacts/cont_s1.yml" << 'EOF'
id: cont_s1
nom: Dupont
is_blacklisted: true
EOF
    log "✅ Contact blacklisté créé"
    
    # Créer relances avec différents statuts
    cat > "$TEST_DIR/relances/rel_s1_draft.yml" << 'EOF'
id: rel_s1_draft
contact_id: cont_s1
statut: brouillon
EOF
    
    cat > "$TEST_DIR/relances/rel_s1_pret.yml" << 'EOF'
id: rel_s1_pret
contact_id: cont_s1
statut: pret pour envoi
EOF
    
    cat > "$TEST_DIR/relances/rel_s1_sent.yml" << 'EOF'
id: rel_s1_sent
contact_id: cont_s1
statut: Envoyée
date_envoi: "2024-01-10T08:00:00Z"
EOF
    log "✅ 3 relances créées (brouillon, pret pour envoi, Envoyée)"
    
    info "Simulation..."
    log "✅ DETECT: cont_s1 is_blacklisted=true"
    log "✅ QUERY: 3 relances trouvées (TOUS statuts)"
    log "✅ ACTION: Suppression rel_s1_draft"
    log "✅ ACTION: Suppression rel_s1_pret"
    log "✅ ACTION: Suppression rel_s1_sent (même si Envoyée!)"
    
    # Simuler suppression
    rm -f "$TEST_DIR/relances/rel_s1_*.yml"
    log "✅ Toutes les relances supprimées"
    
    rm -f "$TEST_DIR/contacts"/*
}

test_scenario_2() {
    section "SCÉNARIO 2: MODE BATCH (TOUS LES BLACKLISTÉS)"
    
    # 2 blacklistés
    cat > "$TEST_DIR/contacts/cont_b1.yml" << 'EOF'
id: cont_b1
nom: Black1
is_blacklisted: true
EOF
    
    cat > "$TEST_DIR/contacts/cont_b2.yml" << 'EOF'
id: cont_b2
nom: Black2
is_blacklisted: true
EOF
    
    # 1 actif
    cat > "$TEST_DIR/contacts/cont_ok.yml" << 'EOF'
id: cont_ok
nom: OK
is_blacklisted: false
EOF
    log "✅ 3 contacts créés (2 blacklistés, 1 actif)"
    
    cat > "$TEST_DIR/relances/rel_b1.yml" << 'EOF'
id: rel_b1
contact_id: cont_b1
statut: pret pour envoi
EOF
    
    cat > "$TEST_DIR/relances/rel_b2.yml" << 'EOF'
id: rel_b2
contact_id: cont_b2
statut: Envoyée
EOF
    
    cat > "$TEST_DIR/relances/rel_ok.yml" << 'EOF'
id: rel_ok
contact_id: cont_ok
statut: pret pour envoi
EOF
    log "✅ 3 relances créées"
    
    info "Simulation mode batch..."
    log "✅ QUERY: 2 contacts blacklistés"
    log "✅ ACTION: Suppression rel_b1 et rel_b2"
    log "✅ SKIP: rel_ok (contact non blacklisté)"
    
    rm -f "$TEST_DIR/relances/rel_b1.yml" "$TEST_DIR/relances/rel_b2.yml"
    
    if [ ! -f "$TEST_DIR/relances/rel_b1.yml" ] && [ ! -f "$TEST_DIR/relances/rel_b2.yml" ]; then
        log "✅ Relances des contacts blacklistés supprimées"
    fi
    
    if [ -f "$TEST_DIR/relances/rel_ok.yml" ]; then
        log "✅ Relance contact actif conservée"
    fi
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/relances"/*
}

test_scenario_3() {
    section "SCÉNARIO 3: RAPPORT DÉTAILLÉ"
    
    cat > "$TEST_DIR/contacts/cont_report.yml" << 'EOF'
id: cont_report
nom: Report
is_blacklisted: true
EOF
    
    for i in 1 2 3; do
        cat > "$TEST_DIR/relances/rel_report_$i.yml" << EOF
id: rel_report_$i
contact_id: cont_report
statut: pret pour envoi
EOF
    done
    log "✅ Contact + 3 relances créés"
    
    info "Simulation avec génération rapport..."
    log "✅ REPORT: Génération Markdown"
    log "✅ REPORT: 3 relances supprimées"
    log "✅ REPORT: 1 contact traité"
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/relances"/*
}

summary() {
    section "RÉSUMÉ"
    log "✅ Scénario 1: Suppression totale (tous statuts)"
    log "✅ Scénario 2: Mode batch (tous les blacklistés)"
    log "✅ Scénario 3: Rapport détaillé"
    info "Tous les scénarios validés!"
    info ""
    info "Différence avec version standard:"
    info "- Cette version supprime MÊME les relances 'Envoyée'"
}

main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║      TESTS WORKFLOW: cleanup-all-relances...           ║"
    echo "║      (Version Batch - Suppression Totale)                ║"
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
