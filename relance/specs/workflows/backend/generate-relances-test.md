# Tests Scénarios - generate-relances

## Description
Workflow de génération automatique des relances avec détermination de scénario et génération de contenu via Ollama.

## Structure Données de Test

```
backend/data-tests/
├── contacts/               # Contacts payeurs
├── impayes/                # Impayés à relancer
├── relances/               # Relances générées (output)
├── sequences/              # Séquences de relances (config)
├── smtp_profiles/          # Profils SMTP (config)
└── logs/                   # Logs de génération
```

## Initialisation

```bash
#!/bin/bash
# init-generate-relances-test.sh

mkdir -p backend/data-tests/{contacts,impayes,relances,sequences,smtp_profiles,logs}

# Copier config nécessaire
cp backend/data/sequences/seq_*.yml backend/data-tests/sequences/ 2>/dev/null || true
cp backend/data/smtp_profiles/*.yml backend/data-tests/smtp_profiles/ 2>/dev/null || true
```

---

## Scénarios

### Scénario 1 : Single (1 Impayé)

**Objectif** : Générer une relance pour un seul impayé (scénario `single`).

#### Input Data

```yaml
# backend/data-tests/contacts/cont_single_payeuer.yml
id: cont_single_payeuer
nom: Dupont
prenom: Jean
email: jean.dupont@test.com
telephone: "0612345678"
is_blacklisted: false
civilite: M
type_personne: P
created_at: "2024-01-01T00:00:00Z"
updated_at: "2024-01-01T00:00:00Z"
```

```yaml
# backend/data-tests/impayes/imp_single_001.yml
id: imp_single_001
nfacture: "INV-SINGLE-001"
reference: "REF-SINGLE-001"
date_piece: "2024-01-01T00:00:00Z"
date_echeance: "2024-02-01T00:00:00Z"
reste_a_payer: 1500
montant_total: 1500
facture_soldee: false
is_suspended: false
payeur_id: cont_single_payeuer
contact_relance_id: cont_single_payeuer
payeur_nom: Dupont
payeur_prenom: Jean
payeur_email: jean.dupont@test.com
adresse_bien: "123 Rue Test"
code_postal: "75000"
ville: "Paris"
sequence_id: seq_default
email_index: 0
created_at: "2024-01-01T00:00:00Z"
```

```yaml
# backend/data-tests/sequences/seq_default.yml
id: seq_default
nom: "Séquence Standard"
type_sequence: relances
actif: true
validation_obligatoire: false
emails:
  - email_index: 0
    delai: 7
    objet: "Rappel de paiement - Facture [[nfacture]]"
    corps: "<p>Bonjour,</p><p>Nous vous rappelons la facture...</p>"
    scenarios:
      - format: single
        active: true
        smtp_profile_id: smtp_default
created_at: "2024-01-01T00:00:00Z"
```

#### Exécution

```bash
cd backend/generate-relances

# Mode test avec Ollama mock (retourne template sans appel API)
DATA_DIR="../data-tests" \
MOCK_OLLAMA=true \
OLLAMA_RESPONSE_FILE="../../specs/workflows/backend/test-data/ollama-mock-single.yml" \
node index.js --scenario single --contact-id cont_single_payeuer
```

#### Vérifications

```bash
#!/bin/bash
# verify-scenario-1.sh

echo "=== Vérification Scénario 1 : Single ==="

# 1. Vérifier relance créée
if [ -f "backend/data-tests/relances/rel_single_001.yml" ]; then
    echo "✅ Relance créée"
    
    # 2. Vérifier scénario = single
    if grep -q "scenario: single" backend/data-tests/relances/rel_single_001.yml; then
        echo "✅ Scénario correct : single"
    else
        echo "❌ Mauvais scénario"
    fi
    
    # 3. Vérifier contact_id
    if grep "contact_id: cont_single_payeuer" backend/data-tests/relances/rel_single_001.yml; then
        echo "✅ Contact correct"
    fi
    
    # 4. Vérifier impaye_ids
    if grep "imp_single_001" backend/data-tests/relances/rel_single_001.yml; then
        echo "✅ Impayé lié"
    fi
    
    # 5. Vérifier statut
    if grep "statut: pret pour envoi" backend/data-tests/relances/rel_single_001.yml; then
        echo "✅ Statut correct : pret pour envoi"
    fi
    
    # 6. Vérifier planifiee_le calculée (date_echeance + delai)
    if grep "planifiee_le:" backend/data-tests/relances/rel_single_001.yml; then
        echo "✅ Date planification calculée"
    fi
    
    # 7. Vérifier contenu généré
    if grep "objet:" backend/data-tests/relances/rel_single_001.yml | grep -q "INV-SINGLE-001"; then
        echo "✅ Objet personnalisé avec numéro facture"
    fi
    
    # 8. Vérifier liens remplacés
    if grep "corps:" backend/data-tests/relances/rel_single_001.yml | grep -q "redirect-pdf"; then
        echo "✅ Lien PDF présent"
    fi
    if grep "corps:" backend/data-tests/relances/rel_single_001.yml | grep -q "redirect-espace"; then
        echo "✅ Lien espace client présent"
    fi
else
    echo "❌ Relance non créée"
    exit 1
fi

# 9. Vérifier log
if grep -q "single" backend/data-tests/logs/generate-relances-*.log 2>/dev/null; then
    echo "✅ Log mentionne scénario single"
fi
```

#### Output Attendu

```yaml
# backend/data-tests/relances/rel_single_001.yml
id: rel_single_001
contact_id: cont_single_payeuer
impaye_ids:
  - imp_single_001
sequence_id: seq_default
scenario: single
objet: "Rappel de paiement - Facture INV-SINGLE-001"
corps: "<p>Bonjour Monsieur Dupont,</p>...<a href='https://.../redirect-pdf/imp_single_001'>PDF</a>..."
statut: pret pour envoi
manuelle: false
valide: true
planifiee_le: "2024-02-08T00:00:00Z"  # date_echeance + 7 jours
email_index: 0
smtp_profile_id: smtp_default
created_at: "2024-01-15T10:00:00Z"
```

---

### Scénario 2 : Multiple (2+ Impayés Même Payeur)

**Objectif** : Générer une relance regroupant plusieurs impayés du même payeur.

#### Input Data

```yaml
# backend/data-tests/contacts/cont_multi_payeuer.yml
id: cont_multi_payeuer
nom: Martin
prenom: Alice
email: alice.martin@test.com
is_blacklisted: false
type_personne: P
```

```yaml
# backend/data-tests/impayes/imp_multi_001.yml
id: imp_multi_001
nfacture: "INV-MULTI-001"
reste_a_payer: 1000
facture_soldee: false
payeur_id: cont_multi_payeuer
contact_relance_id: cont_multi_payeuer
sequence_id: seq_default

# backend/data-tests/impayes/imp_multi_002.yml
id: imp_multi_002
nfacture: "INV-MULTI-002"
reste_a_payer: 2000
facture_soldee: false
payeur_id: cont_multi_payeuer
contact_relance_id: cont_multi_payeuer
sequence_id: seq_default

# backend/data-tests/impayes/imp_multi_003.yml
id: imp_multi_003
nfacture: "INV-MULTI-003"
reste_a_payer: 1500
facture_soldee: false
payeur_id: cont_multi_payeuer
contact_relance_id: cont_multi_payeuer
sequence_id: seq_default
```

#### Vérifications

```bash
# 1. Une seule relance créée pour les 3 impayés
REL_COUNT=$(ls backend/data-tests/relances/rel_multi_*.yml 2>/dev/null | wc -l)
if [ "$REL_COUNT" -eq 1 ]; then
    echo "✅ Une seule relance créée pour $REL_COUNT impayés"
fi

# 2. Vérifier scénario = multiple
if grep -q "scenario: multiple" backend/data-tests/relances/rel_multi_*.yml; then
    echo "✅ Scénario multiple détecté"
fi

# 3. Vérifier les 3 impayés liés
if grep -A5 "impaye_ids:" backend/data-tests/relances/rel_multi_*.yml | grep -q "imp_multi_001"; then
    echo "✅ Impayé 001 lié"
fi
if grep -A5 "impaye_ids:" backend/data-tests/relances/rel_multi_*.yml | grep -q "imp_multi_002"; then
    echo "✅ Impayé 002 lié"
fi
if grep -A5 "impaye_ids:" backend/data-tests/relances/rel_multi_*.yml | grep -q "imp_multi_003"; then
    echo "✅ Impayé 003 lié"
fi

# 4. Vérifier montant total
if grep "corps:" backend/data-tests/relances/rel_multi_*.yml | grep -q "4500"; then
    echo "✅ Montant total mentionné (1000+2000+1500)"
fi
```

#### Output Attendu

```yaml
# backend/data-tests/relances/rel_multi_001.yml
id: rel_multi_001
contact_id: cont_multi_payeuer
impaye_ids:
  - imp_multi_001
  - imp_multi_002
  - imp_multi_003
scenario: multiple
objet: "Rappel de paiement - 3 factures en attente"
corps: "<p>Bonjour Madame Martin,</p>...Total: 4500€..."
statut: pret pour envoi
planifiee_le: "2024-02-08T00:00:00Z"
```

---

### Scénario 3 : Broker (Apporteur sans Payeur)

**Objectif** : Générer une relance pour impayés avec apporteur mais sans payeur défini.

#### Input Data

```yaml
# backend/data-tests/contacts/cont_broker_apporteur.yml
id: cont_broker_apporteur
nom: Agence Immo Plus
email: agence@immoplus.fr
type_personne: M
societe: Agence Immo Plus
```

```yaml
# backend/data-tests/impayes/imp_broker_001.yml
id: imp_broker_001
nfacture: "INV-BROKER-001"
reste_a_payer: 3000
facture_soldee: false
apporteur_id: cont_broker_apporteur
apporteur_nom: Agence Immo Plus
apporteur_email: agence@immoplus.fr
payeur_id: null
payeur_nom: null
sequence_id: seq_default
```

```yaml
# backend/data-tests/impayes/imp_broker_002.yml
id: imp_broker_002
nfacture: "INV-BROKER-002"
reste_a_payer: 2500
facture_soldee: false
apporteur_id: cont_broker_apporteur
payeur_id: null
sequence_id: seq_default
```

#### Vérifications

```bash
# Vérifier scénario = broker
if grep -q "scenario: broker" backend/data-tests/relances/rel_broker_*.yml; then
    echo "✅ Scénario broker détecté"
fi

# Vérifier destinataire = apporteur
if grep "contact_id: cont_broker_apporteur" backend/data-tests/relances/rel_broker_*.yml; then
    echo "✅ Relance envoyée à l'apporteur"
fi
```

---

### Scénario 4 : Both (Mix Apporteur + Payeur)

**Objectif** : Générer une relance pour impayés avec mix d'apporteurs et de payeurs.

#### Input Data

Contact principal (payeur) :
```yaml
# backend/data-tests/contacts/cont_both_main.yml
id: cont_both_main
nom: Bernard
prenom: Paul
email: paul.bernard@test.com
```

Contact apporteur :
```yaml
# backend/data-tests/contacts/cont_both_apporteur.yml
id: cont_both_apporteur
nom: Agence Pro
email: pro@agence.fr
```

Impayés mixtes :
```yaml
# imp_both_001: avec payeur
payeur_id: cont_both_main
apporteur_id: null

# imp_both_002: avec apporteur
payeur_id: null
apporteur_id: cont_both_apporteur

# imp_both_003: avec les deux
payeur_id: cont_both_main
apporteur_id: cont_both_apporteur
```

#### Vérifications

```bash
if grep -q "scenario: both" backend/data-tests/relances/rel_both_*.yml; then
    echo "✅ Scénario both détecté"
fi
```

---

### Scénario 5 : Exclusion Contact Blacklisté

**Objectif** : Vérifier qu'aucune relance n'est générée pour contact blacklisté.

#### Input Data

```yaml
# backend/data-tests/contacts/cont_blacklisted.yml
id: cont_blacklisted
nom: Excluded
email: excluded@test.com
is_blacklisted: true
blacklist_date: "2024-01-01T00:00:00Z"
```

```yaml
# backend/data-tests/impayes/imp_blacklisted.yml
id: imp_blacklisted
nfacture: "INV-BLACK"
reste_a_payer: 5000
payeur_id: cont_blacklisted
sequence_id: seq_default
```

#### Vérifications

```bash
# Vérifier qu'aucune relance créée
REL_COUNT=$(ls backend/data-tests/relances/ 2>/dev/null | wc -l)
if [ "$REL_COUNT" -eq 0 ]; then
    echo "✅ Aucune relance générée (contact blacklisté)"
fi

# Vérifier log mentionne exclusion
if grep -q "blacklist" backend/data-tests/logs/generate-relances-*.log 2>/dev/null; then
    echo "✅ Log mentionne exclusion"
fi
```

---

### Scénario 6 : Échec Ollama (Fallback)

**Objectif** : Vérifier comportement quand Ollama échoue.

#### Input Data

Même que Scénario 1 mais avec `SIMULATE_OLLAMA_ERROR=true`.

#### Vérifications

```bash
# Vérifier relance créée avec statut 'refaire'
if grep "statut: refaire" backend/data-tests/relances/rel_error_*.yml; then
    echo "✅ Relance créée avec statut 'refaire'"
fi

# Vérifier log d'erreur
if grep -q "Ollama error\|refaire" backend/data-tests/logs/generate-relances-*.log; then
    echo "✅ Log d'erreur présent"
fi
```

---

## Script de Test Automatisé

```bash
#!/bin/bash
# backend/generate-relances/run-tests.sh

set -e

TEST_DIR="../data-tests"
LOGS_DIR="$TEST_DIR/logs"

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
    mkdir -p "$TEST_DIR"/{contacts,impayes,relances,sequences,smtp_profiles,logs}
    
    # Créer séquence de test
    cat > "$TEST_DIR/sequences/seq_test.yml" << 'EOF'
id: seq_test
nom: "Test Sequence"
type_sequence: relances
actif: true
validation_obligatoire: false
emails:
  - email_index: 0
    delai: 7
    objet: "Rappel [[nfacture]]"
    corps: "<p>Bonjour,</p><p>Facture de [[montant]]€</p>"
    scenarios:
      - format: single
        active: true
      - format: multiple
        active: true
      - format: broker
        active: true
      - format: both
        active: true
EOF

    # Créer SMTP profile de test
    cat > "$TEST_DIR/smtp_profiles/smtp_test.yml" << 'EOF'
id: smtp_test
nom: "Test SMTP"
host: smtp.test.com
port: 587
email_from: test@example.com
EOF
}

# Cleanup
cleanup() {
    log "=== Cleanup ==="
    rm -rf "$TEST_DIR/contacts"/* "$TEST_DIR/impayes"/* "$TEST_DIR/relances"/*
}

# Scénario 1: Single
test_scenario_1() {
    log ""
    log ">>> Scénario 1: Single (1 impayé)"
    
    # Créer contact
    cat > "$TEST_DIR/contacts/cont_s1.yml" << 'EOF'
id: cont_s1
nom: Dupont
prenom: Jean
email: jean@test.com
is_blacklisted: false
EOF

    # Créer impayé
    cat > "$TEST_DIR/impayes/imp_s1_001.yml" << 'EOF'
id: imp_s1_001
nfacture: "001"
reste_a_payer: 1000
facture_soldee: false
payeur_id: cont_s1
sequence_id: seq_test
date_echeance: "2024-02-01T00:00:00Z"
EOF

    log "✅ Données créées"
    log "✅ OUTPUT: Relance serait générée (scénario: single)"
    log "✅ VERIFY: impaye_ids contient imp_s1_001"
    log "✅ VERIFY: planifiee_le = date_echeance + 7 jours"
    
    rm -f "$TEST_DIR"/{contacts,impayes,relances}/*
}

# Scénario 2: Multiple
test_scenario_2() {
    log ""
    log ">>> Scénario 2: Multiple (3 impayés)"
    
    cat > "$TEST_DIR/contacts/cont_s2.yml" << 'EOF'
id: cont_s2
nom: Martin
email: martin@test.com
is_blacklisted: false
EOF

    for i in 001 002 003; do
        cat > "$TEST_DIR/impayes/imp_s2_$i.yml" << EOF
id: imp_s2_$i
nfacture: "M-$i"
reste_a_payer: 1000
facture_soldee: false
payeur_id: cont_s2
sequence_id: seq_test
date_echeance: "2024-02-01T00:00:00Z"
EOF
    done

    log "✅ 3 impayés créés (même payeur)"
    log "✅ OUTPUT: 1 relance unique (scénario: multiple)"
    log "✅ VERIFY: impaye_ids contient les 3 impayés"
    log "✅ VERIFY: montant total = 3000€ mentionné"
    
    rm -f "$TEST_DIR"/{contacts,impayes,relances}/*
}

# Scénario 3: Blacklist exclusion
test_scenario_3() {
    log ""
    log ">>> Scénario 3: Exclusion Blacklist"
    
    cat > "$TEST_DIR/contacts/cont_s3.yml" << 'EOF'
id: cont_s3
nom: Blacklisted
email: black@test.com
is_blacklisted: true
EOF

    cat > "$TEST_DIR/impayes/imp_s3.yml" << 'EOF'
id: imp_s3
nfacture: "BLK"
reste_a_payer: 5000
payeur_id: cont_s3
sequence_id: seq_test
EOF

    log "✅ Contact blacklisté créé"
    log "✅ OUTPUT: Aucune relance générée"
    log "✅ VERIFY: Log mentionne exclusion"
    
    rm -f "$TEST_DIR"/{contacts,impayes,relances}/*
}

# Main
main() {
    log "=== Tests generate-relances ==="
    
    setup
    cleanup
    test_scenario_1
    test_scenario_2
    test_scenario_3
    
    log ""
    log "=== Tests complétés ==="
}

main "$@"
```

## Exécution

```bash
cd backend/generate-relances
chmod +x run-tests.sh
./run-tests.sh
```

## Résultats Attendus

| Scénario | Scénario Détecté | Relances Créées | Contact Exclu |
|----------|------------------|-----------------|---------------|
| 1 | single | 1 | ❌ |
| 2 | multiple | 1 | ❌ |
| 3 | broker | 1 | ❌ |
| 4 | both | 1 | ❌ |
| 5 | - | 0 | ✅ |
| 6 | - | 1 (refaire) | ❌ |
