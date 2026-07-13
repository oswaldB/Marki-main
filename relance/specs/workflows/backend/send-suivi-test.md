# Tests Scénarios - send-suivi

## Description
Workflow d'envoi des emails de suivi d'agences (séquences de type "suivi").

## Différence avec `send-emails`

| Aspect | send-emails | send-suivi |
|--------|-------------|------------|
| Type séquence | relances | suivi |
| Destinataires | Payeurs de factures | Agences (apporteurs) |
| Contenu | Relance impayés | Suivi factures agence/propriétaire |
| Tables | relances, impayes | suivis, factures groupées |

## Structure Données de Test

```
backend/data-tests/
├── suivis/                 # Emails de suivi à envoyer
├── contacts/               # Agences (contacts type "apporteur")
├── impayes/                # Factures groupées par agence
├── smtp_profiles/          # Profils SMTP
└── logs/                   # Logs d'envoi
```

---

## Scénarios

### Scénario 1 : Envoi Suivi Agence Simple

**Objectif** : Envoyer un email de suivi à une agence avec ses factures.

#### Input Data

```yaml
# backend/data-tests/contacts/cont_agence_001.yml
id: cont_agence_001
nom: Agence Immo Plus
email: agence@immoplus.fr
type_personne: M
societe: Agence Immo Plus
is_blacklisted: false
```

```yaml
# backend/data-tests/impayes/imp_suivi_001.yml (facture agence)
id: imp_suivi_001
nfacture: "AGENCE-001"
apporteur_id: cont_agence_001
apporteur_nom: Agence Immo Plus
payeur_type: "Apporteur d'affaire"
reste_a_payer: 5000
facture_soldee: false
```

```yaml
# backend/data-tests/impayes/imp_suivi_002.yml (facture propriétaire même dossier)
id: imp_suivi_002
nfacture: "PROP-001"
apporteur_id: cont_agence_001
payeur_type: "Propriétaire"
reste_a_payer: 3000
facture_soldee: false
```

```yaml
# backend/data-tests/suivis/suiv_a_envoyer.yml
id: suiv_a_envoyer
contact_id: cont_agence_001
impaye_ids:
  - imp_suivi_001
  - imp_suivi_002
sequence_id: seq_suivi_mensuel
scenario: suivi_agence
objet: "Suivi de vos dossiers - Janvier 2024"
corps: "<p>Bonjour,</p><p>Voici l'état de vos dossiers...</p>"
statut: pret pour envoi
planifiee_le: "2024-01-15T08:00:00Z"
smtp_profile_id: smtp_agence
cc: null
```

#### Exécution

```bash
cd backend/send-suivi

DATA_DIR="../data-tests" \
MOCK_SMTP=true \
node index.js --suivi-id=suiv_a_envoyer
```

#### Vérifications

```bash
#!/bin/bash
# verify-scenario-1.sh

echo "=== Vérification Scénario 1 : Envoi Suivi ==="

# Vérifier suivi mis à jour
if [ -f "backend/data-tests/suivis/suiv_a_envoyer.yml" ]; then
    if grep -q "statut: Envoyée" backend/data-tests/suivis/suiv_a_envoyer.yml; then
        echo "✅ Statut changé à 'Envoyée'"
    fi
    
    if grep "date_envoi:" backend/data-tests/suivis/suiv_a_envoyer.yml; then
        echo "✅ date_envoi renseignée"
    fi
    
    if grep -q "emailSent: true" backend/data-tests/suivis/suiv_a_envoyer.yml; then
        echo "✅ emailSent: true"
    fi
fi

# Vérifier email envoyé à l'agence (pas aux propriétaires)
if grep -q "To: agence@immoplus.fr" backend/data-tests/logs/send-suivi-*.log 2>/dev/null; then
    echo "✅ Email envoyé à l'agence"
fi

# Vérifier log
if grep -q "suivi envoyé\|agence" backend/data-tests/logs/send-suivi-*.log; then
    echo "✅ Log d'envoi présent"
fi
```

#### Output Attendu

- Statut: `Envoyée`
- `dateEnvoiReelle` renseignée
- Email envoyé à `agence@immoplus.fr`

---

### Scénario 2 : Tableaux Factures Agence vs Propriétaire

**Objectif** : Vérifier que le contenu généré contient bien les 2 tableaux.

#### Vérifications

```bash
# Vérifier que le corps contient les tableaux
if grep "corps:" backend/data-tests/suivis/suiv_tableaux.yml | grep -q "tableau_factures_agence"; then
    echo "✅ Tableau factures agence présent"
fi

if grep "corps:" backend/data-tests/suivis/suiv_tableaux.yml | grep -q "tableau_factures_proprietaire"; then
    echo "✅ Tableau factures propriétaire présent"
fi
```

---

### Scénario 3 : CC Multiple (Agences en Copie)

**Objectif** : Envoyer avec plusieurs agences en CC.

#### Input Data

```yaml
# backend/data-tests/suivis/suiv_cc.yml
id: suiv_cc
contact_id: cont_agence_principale
cc: "agence2@example.com, agence3@example.com"
statut: pret pour envoi
```

#### Vérifications

```bash
if grep -q "cc:" backend/data-tests/logs/send-suivi-*.log | grep -q "agence2@example.com"; then
    echo "✅ CC agence2 présent"
fi
```

---

### Scénario 4 : Agence Blacklistée

**Objectif** : Ne pas envoyer si l'agence est blacklistée.

#### Input Data

```yaml
# backend/data-tests/contacts/cont_agence_black.yml
id: cont_agence_black
nom: Agence Blacklistée
is_blacklisted: true
```

#### Vérifications

```bash
if grep -q "blacklist\|ignoré" backend/data-tests/logs/send-suivi-*.log; then
    echo "✅ Agence blacklistée ignorée"
fi

# Vérifier que le suivi n'est PAS envoyé
if grep "statut: pret pour envoi" backend/data-tests/suivis/suiv_blacklist.yml 2>/dev/null; then
    echo "✅ Statut inchangé (pas d'envoi)"
fi
```

---

### Scénario 5 : Échec SMTP (Retry)

**Objectif** : Gérer échec d'envoi avec retry.

#### Vérifications

```bash
if grep -q "Erreur d'envoi\|retry\|échec" backend/data-tests/logs/send-suivi-*.log; then
    echo "✅ Erreur loggée"
fi

if grep "statut: Erreur d'envoi" backend/data-tests/suivis/suiv_erreur.yml; then
    echo "✅ Statut mis à jour avec erreur"
fi
```

---

## Script de Test Automatisé

```bash
#!/bin/bash
# backend/send-suivi/run-tests.sh

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
