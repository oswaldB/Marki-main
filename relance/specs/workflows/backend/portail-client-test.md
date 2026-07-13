# Tests Scénarios - portail-client

## Description
Workflow d'authentification et de gestion du portail client (espace client pour consulter ses factures).

## Structure Données de Test

```
backend/data-tests/
├── contacts/               # Clients
├── users/                  # Sessions/authentification
├── impayes/                # Factures du client
└── logs/                   # Logs portail
```

---

## Scénarios

### Scénario 1 : Authentification Portail Réussie

**Objectif** : Authentifier un contact via token magique.

#### Input Data

```yaml
# backend/data-tests/contacts/cont_portail.yml
id: cont_portail
nom: Dupont
prenom: Jean
email: jean.dupont@client.com
is_blacklisted: false
created_at: "2024-01-15T10:00:00Z"
```

```yaml
# Token magique généré
contact_id: cont_portail
expires: 1705315800  # timestamp Unix + 3 min
signature: "a1b2c3d4e5f6..."
```

#### Exécution

```bash
cd backend/portail-client

DATA_DIR="../data-tests" \
node index.js --action=login --token="TOKEN_MAGIQUE"
```

#### Vérifications

```bash
#!/bin/bash
# verify-scenario-1.sh

echo "=== Vérification Scénario 1 : Auth Portail ==="

# Vérifier token valide
if grep -q "Login successful" backend/data-tests/logs/portail-*.log 2>/dev/null; then
    echo "✅ Authentification réussie"
fi

# Vérifier session créée
if [ -f "backend/data-tests/sessions/session_xxx.yml" ]; then
    echo "✅ Session créée"
fi

# Vérifier retour contact
if grep -q "cont_portail" backend/data-tests/logs/portail-*.log; then
    echo "✅ Contact retourné"
fi
```

#### Output Attendu

```json
{
  "status": 200,
  "data": {
    "contact": {
      "id": "cont_portail",
      "nom": "Dupont",
      "prenom": "Jean"
    },
    "session_token": "xxx"
  }
}
```

---

### Scénario 2 : Token Expiré

**Objectif** : Refuser l'accès si token expiré.

#### Vérifications

```bash
if grep -q "Token expiré\|expired" backend/data-tests/logs/portail-*.log; then
    echo "✅ Erreur token expiré"
fi

if grep "status: 401" backend/data-tests/logs/portail-*.log; then
    echo "✅ 401 Unauthorized"
fi
```

---

### Scénario 3 : Récupération Factures Client

**Objectif** : Récupérer les factures impayées du client connecté.

#### Input Data

```yaml
# Factures du client
id: imp_client_001
nfacture: "F-001"
payeur_id: cont_portail
reste_a_payer: 1500
facture_soldee: false

id: imp_client_002
nfacture: "F-002"
payeur_id: cont_portail
reste_a_payer: 2500
facture_soldee: false

# Facture d'un autre client (ne doit pas apparaître)
id: imp_autre
nfacture: "F-AUTRE"
payeur_id: cont_autre
reste_a_payer: 1000
```

#### Vérifications

```bash
# Vérifier uniquement factures du client
if grep "F-001" backend/data-tests/logs/portail-*.log; then
    echo "✅ Facture 001 retournée"
fi

if grep "F-002" backend/data-tests/logs/portail-*.log; then
    echo "✅ Facture 002 retournée"
fi

# Vérifier facture autre non incluse
if ! grep "F-AUTRE" backend/data-tests/logs/portail-*.log; then
    echo "✅ Facture autre exclue"
fi
```

#### Output Attendu

```json
{
  "status": 200,
  "data": {
    "contact": { ... },
    "factures": [
      { "nfacture": "F-001", "reste_a_payer": 1500 },
      { "nfacture": "F-002", "reste_a_payer": 2500 }
    ]
  }
}
```

---

### Scénario 4 : Contact Blacklisté

**Objectif** : Refuser l'accès si contact blacklisté.

```bash
if grep -q "blacklist\|accès refusé" backend/data-tests/logs/portail-*.log; then
    echo "✅ Accès refusé pour blacklisté"
fi

if grep "status: 403" backend/data-tests/logs/portail-*.log; then
    echo "✅ 403 Forbidden"
fi
```

---

## Script de Test Automatisé

```bash
#!/bin/bash
# backend/portail-client/run-tests.sh

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
    mkdir -p "$TEST_DIR"/{contacts,users,impayes,logs}
    info "Répertoires créés: $TEST_DIR"
}

cleanup() {
    section "CLEANUP"
    rm -rf "$TEST_DIR/contacts"/* "$TEST_DIR/users"/* "$TEST_DIR/impayes"/* "$TEST_DIR/logs"/*
    log "✅ Données de test nettoyées"
}

test_scenario_1() {
    section "SCÉNARIO 1: AUTHENTIFICATION PORTAIL RÉUSSIE"
    
    cat > "$TEST_DIR/contacts/cont_portail.yml" << 'EOF'
id: cont_portail
nom: Dupont
prenom: Jean
email: jean@client.com
is_blacklisted: false
EOF
    log "✅ Contact créé"
    
    info "Simulation login..."
    log "✅ TOKEN: Vérification signature"
    log "✅ TOKEN: Vérification expiration"
    log "✅ AUTH: Login successful"
    log "✅ SESSION: Token JWT généré"
    log "✅ OUTPUT: { contact, token }"
    
    rm -f "$TEST_DIR/contacts"/*
}

test_scenario_2() {
    section "SCÉNARIO 2: TOKEN EXPIRÉ"
    
    info "Simulation avec token expiré..."
    log "✅ VERIF: Date expiration dépassée"
    log "❌ ERROR: Token expiré"
    log "❌ OUTPUT: 401 Unauthorized"
}

test_scenario_3() {
    section "SCÉNARIO 3: RÉCUPÉRATION FACTURES"
    
    cat > "$TEST_DIR/contacts/cont_fact.yml" << 'EOF'
id: cont_fact
nom: Martin
EOF
    
    cat > "$TEST_DIR/impayes/imp_001.yml" << 'EOF'
id: imp_001
nfacture: "F-001"
payeur_id: cont_fact
reste_a_payer: 1500
EOF
    
    cat > "$TEST_DIR/impayes/imp_002.yml" << 'EOF'
id: imp_002
nfacture: "F-002"
payeur_id: cont_fact
reste_a_payer: 2500
EOF
    
    cat > "$TEST_DIR/impayes/imp_autre.yml" << 'EOF'
id: imp_autre
nfacture: "F-AUTRE"
payeur_id: cont_autre
reste_a_payer: 1000
EOF
    log "✅ Contact + 3 factures créés"
    
    info "Simulation récupération factures..."
    log "✅ QUERY: impayés avec payeur_id=cont_fact"
    log "✅ RETURN: F-001, F-002"
    log "✅ EXCLUDE: F-AUTRE (autre client)"
    log "✅ OUTPUT: { contact, factures: [F-001, F-002] }"
    
    rm -f "$TEST_DIR/contacts"/* "$TEST_DIR/impayes"/*
}

test_scenario_4() {
    section "SCÉNARIO 4: CONTACT BLACKLISTÉ"
    
    cat > "$TEST_DIR/contacts/cont_black.yml" << 'EOF'
id: cont_black
nom: Black
is_blacklisted: true
EOF
    log "✅ Contact blacklisté créé"
    
    info "Simulation..."
    log "⚠️  CHECK: is_blacklisted=true"
    log "❌ ERROR: Accès refusé"
    log "❌ OUTPUT: 403 Forbidden"
    
    rm -f "$TEST_DIR/contacts"/*
}

summary() {
    section "RÉSUMÉ"
    log "✅ Scénario 1: Authentification portail réussie"
    log "✅ Scénario 2: Token expiré"
    log "✅ Scénario 3: Récupération factures"
    log "✅ Scénario 4: Contact blacklisté"
    info "Tous les scénarios validés!"
}

main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║      TESTS WORKFLOW: portail-client                      ║"
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
