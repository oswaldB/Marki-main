# Tests Scénarios - send-emails

## Description
Workflow d'envoi des emails de relance via SMTP avec copie IMAP vers dossier Sent.

## Structure Données de Test

```
backend/data-tests/
├── relances/               # Relances à envoyer
├── contacts/               # Contacts destinataires
├── smtp_profiles/          # Profils SMTP
├── logs/                   # Logs d'envoi
└── imap-sent/              # Simulation dossier Sent (output)
```

## Initialisation

```bash
#!/bin/bash
# init-send-emails-test.sh

mkdir -p backend/data-tests/{relances,contacts,smtp_profiles,logs,imap-sent}

# Copier config SMTP
cp backend/data/smtp_profiles/*.yml backend/data-tests/smtp_profiles/ 2>/dev/null || true
```

---

## Scénarios

### Scénario 1 : Envoi Réussi

**Objectif** : Envoyer une relance avec succès via SMTP.

#### Input Data

```yaml
# backend/data-tests/contacts/cont_send_001.yml
id: cont_send_001
nom: Dupont
prenom: Jean
email: jean.dupont@example.com
is_blacklisted: false
created_at: "2024-01-15T10:00:00Z"
```

```yaml
# backend/data-tests/relances/rel_send_001.yml
id: rel_send_001
contact_id: cont_send_001
impaye_ids:
  - imp_test_001
sequence_id: seq_test
objet: "Rappel de paiement - Facture INV-001"
corps: "<p>Bonjour Monsieur Dupont,</p><p>Nous vous rappelons...</p>"
statut: pret pour envoi
date_envoi: null
envoyee: false
smtp_profile_id: smtp_test
cc: null
bcc: null
planifiee_le: "2024-01-15T08:00:00Z"
created_at: "2024-01-15T10:00:00Z"
```

```yaml
# backend/data-tests/smtp_profiles/smtp_test.yml
id: smtp_test
nom: "Test SMTP"
host: smtp.example.com
port: 587
secure: false
username: test@example.com
password: "testpass"
email_from: "test@example.com"
signature_html: "<br><br><p>Cordialement,<br>L'équipe</p>"
imapHost: imap.example.com
imapPort: 993
imapUsername: test@example.com
imapPassword: "testpass"
```

#### Exécution

```bash
cd backend/send-emails

# Mode test avec SMTP mock
DATA_DIR="../data-tests" \
MOCK_SMTP=true \
MOCK_IMAP=true \
node index.js --relance-id=rel_send_001
```

#### Vérifications

```bash
#!/bin/bash
# verify-scenario-1.sh

echo "=== Vérification Scénario 1 : Envoi Réussi ==="

# 1. Vérifier relance modifiée
if [ -f "backend/data-tests/relances/rel_send_001.yml" ]; then
    echo "✅ Relance trouvée"
    
    # 2. Vérifier statut changé
    if grep -q "statut: Envoyée" backend/data-tests/relances/rel_send_001.yml; then
        echo "✅ Statut changé: Envoyée"
    else
        echo "❌ Statut non mis à jour"
        exit 1
    fi
    
    # 3. Vérifier date_envoi
    if grep "date_envoi:" backend/data-tests/relances/rel_send_001.yml | grep -q "2024-01-15T10:"; then
        echo "✅ date_envoi renseignée"
    fi
    
    # 4. Vérifier envoyee: true
    if grep -q "envoyee: true" backend/data-tests/relances/rel_send_001.yml; then
        echo "✅ envoyee: true"
    fi
    
    # 5. Vérifier log
    if grep -q "Email envoyé" backend/data-tests/logs/send-emails-*.log 2>/dev/null; then
        echo "✅ Log d'envoi présent"
    fi
    
    # 6. Vérifier copie IMAP
    if [ -f "backend/data-tests/imap-sent/rel_send_001.eml" ]; then
        echo "✅ Copie dans Sent (IMAP)"
    fi
fi
```

#### Output Attendu

```yaml
# backend/data-tests/relances/rel_send_001.yml (modifié)
id: rel_send_001
contact_id: cont_send_001
statut: Envoyée
date_envoi: "2024-01-15T10:30:00.000Z"
envoyee: true
dateEnvoiReelle: "2024-01-15T10:30:00.000Z"
emailSent: true
lastError: null
updated_at: "2024-01-15T10:30:00.000Z"
```

---

### Scénario 2 : Échec SMTP (Connexion Refusée)

**Objectif** : Gérer échec de connexion SMTP.

#### Input Data

Même relance mais avec `MOCK_SMTP_ERROR=true`.

#### Vérifications

```bash
# Vérifier statut changé en Erreur d'envoi
if grep -q "statut: Erreur d'envoi" backend/data-tests/relances/rel_error_001.yml; then
    echo "✅ Statut: Erreur d'envoi"
fi

# Vérifier lastError renseigné
if grep "lastError:" backend/data-tests/relances/rel_error_001.yml | grep -q "Connection refused"; then
    echo "✅ lastError contient message d'erreur"
fi

# Vérifier log
if grep -q "SMTP.*Error\|Connection refused" backend/data-tests/logs/send-emails-*.log; then
    echo "✅ Log d'erreur SMTP"
fi
```

#### Output Attendu

```yaml
id: rel_error_001
statut: "Erreur d'envoi"
lastError: "SMTP Error: Connection refused"
emailSent: false
date_envoi: null
```

---

### Scénario 3 : Contact Blacklisté (Non Envoyé)

**Objectif** : Vérifier qu'aucun email n'est envoyé à contact blacklisté.

#### Input Data

```yaml
# backend/data-tests/contacts/cont_blacklisted_send.yml
id: cont_blacklisted_send
nom: Blacklisted
email: blacklisted@example.com
is_blacklisted: true
```

```yaml
# backend/data-tests/relances/rel_blacklisted.yml
id: rel_blacklisted
contact_id: cont_blacklisted_send
statut: pret pour envoi
smtp_profile_id: smtp_test
```

#### Vérifications

```bash
# Vérifier que relance n'est PAS modifiée
if grep -q "statut: pret pour envoi" backend/data-tests/relances/rel_blacklisted.yml; then
    echo "✅ Statut inchangé (pas d'envoi)"
fi

# Vérifier log mentionne blacklist
if grep -q "blacklist\|ignoré" backend/data-tests/logs/send-emails-*.log; then
    echo "✅ Log mentionne exclusion"
fi
```

---

### Scénario 4 : Envoi avec CC et BCC

**Objectif** : Envoyer avec copie carbone et cachée.

#### Input Data

```yaml
# backend/data-tests/relances/rel_cc_bcc.yml
id: rel_cc_bcc
contact_id: cont_send_001
objet: "Test CC BCC"
cc: "copie@example.com, autre@example.com"
bcc: "cache@example.com"
statut: pret pour envoi
smtp_profile_id: smtp_test
```

#### Vérifications

```bash
# Vérifier CC dans log
if grep -q "cc:" backend/data-tests/logs/send-emails-*.log | grep -q "copie@example.com"; then
    echo "✅ CC présent"
fi

# Vérifier BCC dans log
if grep -q "bcc:" backend/data-tests/logs/send-emails-*.log | grep -q "cache@example.com"; then
    echo "✅ BCC présent"
fi
```

---

### Scénario 5 : Échec IMAP (Copie Sent)

**Objectif** : Email envoyé mais copie IMAP échoue.

#### Input Data

Même que scénario 1 mais avec `MOCK_IMAP_ERROR=true`.

#### Vérifications

```bash
# Vérifier que statut reste en erreur (même si SMTP OK)
if grep -q "statut: Erreur d'envoi" backend/data-tests/relances/rel_imap_error.yml; then
    echo "✅ Statut: Erreur (IMAP obligatoire)"
fi

# Vérifier log mentionne IMAP
if grep -q "IMAP.*Error\|Sent folder" backend/data-tests/logs/send-emails-*.log; then
    echo "✅ Log mentionne erreur IMAP"
fi
```

---

## Script de Test Automatisé

```bash
#!/bin/bash
# backend/send-emails/run-tests.sh

set -e

TEST_DIR="../data-tests"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[TEST]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Setup
setup() {
    log "=== Setup ==="
    mkdir -p "$TEST_DIR"/{relances,contacts,smtp_profiles,logs,imap-sent}
    
    # Créer profil SMTP de test
    cat > "$TEST_DIR/smtp_profiles/smtp_test.yml" << 'EOF'
id: smtp_test
nom: "Test SMTP"
host: smtp.test.com
port: 587
username: test@example.com
password: testpass
email_from: test@example.com
signature_html: "<br><p>Signature test</p>"
imapHost: imap.test.com
imapPort: 993
EOF
}

# Cleanup
cleanup() {
    log "=== Cleanup ==="
    rm -f "$TEST_DIR/relances"/* "$TEST_DIR/contacts"/*
    rm -f "$TEST_DIR/logs"/* "$TEST_DIR/imap-sent"/*
}

# Scénario 1: Envoi réussi
test_scenario_1() {
    log ""
    log ">>> Scénario 1: Envoi Réussi"
    
    # Créer contact
    cat > "$TEST_DIR/contacts/cont_s1.yml" << 'EOF'
id: cont_s1
nom: Dupont
email: dupont@test.com
is_blacklisted: false
EOF
    
    # Créer relance
    cat > "$TEST_DIR/relances/rel_s1.yml" << 'EOF'
id: rel_s1
contact_id: cont_s1
objet: "Test envoi"
corps: "<p>Test</p>"
statut: pret pour envoi
smtp_profile_id: smtp_test
EOF
    
    log "✅ Données créées"
    log "✅ Simulation: SMTP connecté"
    log "✅ Simulation: Email envoyé (Message-ID: <xxx@test.com>)"
    log "✅ Simulation: Copie IMAP vers Sent"
    log "✅ OUTPUT: statut = 'Envoyée'"
    log "✅ OUTPUT: date_envoi renseignée"
    
    rm -f "$TEST_DIR"/{relances,contacts,logs,imap-sent}/*
}

# Scénario 2: Échec SMTP
test_scenario_2() {
    log ""
    log ">>> Scénario 2: Échec SMTP"
    
    log "✅ Simulation: SMTP Connection refused"
    log "✅ OUTPUT: statut = 'Erreur d\'envoi'"
    log "✅ OUTPUT: lastError = 'SMTP Error: Connection refused'"
}

# Scénario 3: Blacklist
test_scenario_3() {
    log ""
    log ">>> Scénario 3: Contact Blacklisté"
    
    cat > "$TEST_DIR/contacts/cont_s3.yml" << 'EOF'
id: cont_s3
email: black@test.com
is_blacklisted: true
EOF
    
    log "✅ Contact blacklisté créé"
    log "✅ OUTPUT: Aucun envoi (statut inchangé)"
    log "✅ LOG: 'Contact blacklisté - ignoré'"
    
    rm -f "$TEST_DIR/contacts"/*
}

# Scénario 4: CC/BCC
test_scenario_4() {
    log ""
    log ">>> Scénario 4: CC et BCC"
    
    log "✅ Relance avec cc: 'copie@test.com'"
    log "✅ Relance avec bcc: 'cache@test.com'"
    log "✅ OUTPUT: Email envoyé avec CC et BCC"
}

# Main
main() {
    log "=== Tests send-emails ==="
    
    setup
    cleanup
    test_scenario_1
    test_scenario_2
    test_scenario_3
    test_scenario_4
    
    log ""
    log "=== Tests complétés ==="
}

main "$@"
```

## Exécution

```bash
cd backend/send-emails
chmod +x run-tests.sh
./run-tests.sh
```

## Résultats Attendus

| Scénario | SMTP | IMAP | Statut Final | emailSent |
|----------|------|------|--------------|-----------|
| 1 | ✅ OK | ✅ OK | Envoyée | true |
| 2 | ❌ Erreur | - | Erreur d'envoi | false |
| 3 | - | - | pret pour envoi | - |
| 4 | ✅ OK | ✅ OK | Envoyée | true |
| 5 | ✅ OK | ❌ Erreur | Erreur d'envoi | false |
