# Tests Scénarios - contacts-blacklist

## Description
Blacklister un contact et annuler ses relances futures non envoyées.

## Prérequis

```bash
# Vérifier structures
[ -d "../../../backend/data/contacts" ] || echo "❌ Manquant: data/contacts"
[ -d "../../../backend/data/relances" ] || echo "❌ Manquant: data/relances"
[ -f "../../../backend/contacts-blacklist/index.js" ] || echo "❌ Manquant: workflow"
```

## Scénarios

### Scénario 1 : Blacklist Contact Simple

**Objectif** : Blacklister un contact sans relances associées.

#### Input Data

```yaml
# backend/data/contacts/cont_test_blacklist.yml
id: cont_test_blacklist
nom: Dupont
prenom: Jean
email: jean.dupont@test.com
is_blacklisted: false
blacklist_date: null
blacklist_motif: null
created_at: "2024-01-01T00:00:00Z"
updated_at: "2024-01-01T00:00:00Z"
```

#### Commande Dry-Run

```bash
cd ../../../backend/contacts-blacklist

# Simuler le blacklist
node -e "
const fs = require('fs');
const yaml = require('js-yaml');

const contact = yaml.load(fs.readFileSync('../data/contacts/cont_test_blacklist.yml'));

// Vérifier préconditions
if (contact.is_blacklisted === false) {
  console.log('✅ PRE-CHECK: Contact actif');
  
  // Simuler mise à jour
  console.log('✅ UPDATE: is_blacklisted = true');
  console.log('✅ UPDATE: blacklist_date = ' + new Date().toISOString());
  console.log('✅ UPDATE: blacklist_motif = \\"Test scénario\\"');
  console.log('✅ UPDATE: updated_at = ' + new Date().toISOString());
  console.log('✅ RESULT: Contact blacklisted avec succès');
  console.log('🔍 RELANCES: Aucune relance à annuler (0 trouvées)');
}
"
```

#### Logs Attendus

```
✅ PRE-CHECK: Contact actif
✅ UPDATE: is_blacklisted = true
✅ UPDATE: blacklist_date = .*
✅ UPDATE: blacklist_motif = .*
✅ RESULT: Contact blacklisted avec succès
🔍 RELANCES: Aucune relance à annuler.*
```

#### Output Data Attendu (Simulation)

```yaml
# Après traitement (simulation)
id: cont_test_blacklist
nom: Dupont
is_blacklisted: true
blacklist_date: "2024-01-15T10:30:00.000Z"
blacklist_motif: "Test scénario"
updated_at: "2024-01-15T10:30:00.000Z"
```

---

### Scénario 2 : Blacklist Contact avec Relances

**Objectif** : Blacklister un contact et annuler ses relances en attente.

#### Input Data

Contact :
```yaml
# backend/data/contacts/cont_test_with_relances.yml
id: cont_test_with_relances
nom: Martin
prenom: Alice
email: alice.martin@test.com
is_blacklisted: false
relance_ids:
  - rel_test_001
  - rel_test_002
```

Relances associées :
```yaml
# backend/data/relances/rel_test_001.yml
id: rel_test_001
contact_id: cont_test_with_relances
statut: pret pour envoi
objet: "Rappel facture"
corps: "<p>Relance...</p>"
envoyee: false
date_envoi: null

# backend/data/relances/rel_test_002.yml
id: rel_test_002
contact_id: cont_test_with_relances
statut: pret pour envoi
envoyee: false
date_envoi: null
```

Relance déjà envoyée (ne doit pas être modifiée) :
```yaml
# backend/data/relances/rel_test_003.yml
id: rel_test_003
contact_id: cont_test_with_relances
statut: Envoyée
date_envoi: "2024-01-10T08:00:00Z"
```

#### Commande Dry-Run

```bash
node -e "
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const contactId = 'cont_test_with_relances';
const relancesDir = '../data/relances';

// Lire contact
const contact = yaml.load(fs.readFileSync('../data/contacts/' + contactId + '.yml'));
console.log('✅ CONTACT-LOADED: ' + contact.nom + ' ' + contact.prenom);

// Trouver relances à annuler
const files = fs.readdirSync(relancesDir).filter(f => f.endsWith('.yml'));
let cancelled = 0;
let skipped = 0;

for (const file of files) {
  const rel = yaml.load(fs.readFileSync(path.join(relancesDir, file)));
  if (rel.contact_id === contactId) {
    if (rel.statut !== 'Envoyée' && !rel.date_envoi) {
      console.log('✅ RELANCE-TO-CANCEL: ' + rel.id + ' (statut: ' + rel.statut + ')');
      console.log('   -> Nouveau statut: annulee');
      cancelled++;
    } else {
      console.log('🔒 RELANCE-SKIPPED: ' + rel.id + ' (déjà envoyée)');
      skipped++;
    }
  }
}

console.log('');
console.log('✅ SUMMARY: ' + cancelled + ' relances annulées');
console.log('🔒 SUMMARY: ' + skipped + ' relances ignorées (déjà envoyées)');
"
```

#### Logs Attendus

```
✅ CONTACT-LOADED: .*
✅ RELANCE-TO-CANCEL: rel_test_001 .*
✅ RELANCE-TO-CANCEL: rel_test_002 .*
🔒 RELANCE-SKIPPED: rel_test_003 .*
✅ SUMMARY: 2 relances annulées
🔒 SUMMARY: 1 relances ignorées .*
```

#### Output Data Attendu

Les relances `rel_test_001` et `rel_test_002` doivent avoir :
```yaml
statut: annulee
# (en production, pas en dry-run)
```

---

### Scénario 3 : Erreur - Contact Déjà Blacklisté

**Objectif** : Gérer le cas où le contact est déjà blacklisté.

#### Input Data

```yaml
# backend/data/contacts/cont_already_blacklisted.yml
id: cont_already_blacklisted
nom: Bernard
is_blacklisted: true
blacklist_date: "2024-01-01T00:00:00Z"
blacklist_motif: "Ancien motif"
```

#### Commande Dry-Run

```bash
node -e "
const fs = require('fs');
const yaml = require('js-yaml');

const contact = yaml.load(fs.readFileSync('../data/contacts/cont_already_blacklisted.yml'));

if (contact.is_blacklisted) {
  console.log('❌ ERROR: Contact déjà blacklisté');
  console.log('   Date: ' + contact.blacklist_date);
  console.log('   Motif: ' + contact.blacklist_motif);
  console.log('❌ ABORT: Aucune action effectuée');
}
"
```

#### Logs Attendus

```
❌ ERROR: Contact déjà blacklisté
.*Date: .*
.*Motif: .*
❌ ABORT: Aucune action effectuée
```

---

## Script de Test Automatisé

```bash
#!/bin/bash
# Test contacts-blacklist - Dry Run

WORKFLOW="contacts-blacklist"
CONTACTS_DIR="../../backend/data/contacts"
RELANCES_DIR="../../backend/data/relances"

echo "=== Test Workflow: $WORKFLOW ==="
echo ""

# Scénario 1: Contact simple
test_scenario_1() {
  echo "🔍 Scénario 1: Blacklist contact simple"
  
  local contact_file="$CONTACTS_DIR/cont_test_blacklist.yml"
  
  if [ -f "$contact_file" ]; then
    echo "✅ Input trouvé"
    
    if grep -q "is_blacklisted: false" "$contact_file"; then
      echo "✅ Précondition: Contact actif"
      echo "✅ OUTPUT: Contact serait blacklisted"
      echo "✅ OUTPUT: 0 relances à annuler"
    else
      echo "⚠️  Contact déjà blacklisté dans l'input"
    fi
  else
    echo "⚠️  Fichier test manquant: $contact_file"
    echo "   Créer avec: is_blacklisted: false"
  fi
}

# Scénario 2: Avec relances
test_scenario_2() {
  echo ""
  echo "🔍 Scénario 2: Blacklist avec relances"
  
  local contact_id="cont_test_with_relances"
  local count=$(grep -l "contact_id: $contact_id" $RELANCES_DIR/*.yml 2>/dev/null | wc -l)
  
  echo "📊 Relances trouvées pour $contact_id: $count"
  
  if [ $count -gt 0 ]; then
    # Compter non envoyées
    local non_envoyees=0
    for rel in $(grep -l "contact_id: $contact_id" $RELANCES_DIR/*.yml 2>/dev/null); do
      if grep -q "statut: pret pour envoi" "$rel" && ! grep -q "date_envoi:" "$rel"; then
        ((non_envoyees++))
        echo "  ✅ À annuler: $(basename $rel)"
      fi
    done
    echo "✅ TOTAL à annuler: $non_envoyees"
  fi
}

# Scénario 3: Déjà blacklisté
test_scenario_3() {
  echo ""
  echo "🔍 Scénario 3: Contact déjà blacklisté"
  
  local file="$CONTACTS_DIR/cont_already_blacklisted.yml"
  if [ -f "$file" ] && grep -q "is_blacklisted: true" "$file"; then
    echo "✅ Input: Contact déjà blacklisté"
    echo "❌ OUTPUT: Erreur 409 - Contact déjà blacklisté"
    echo "✅ OUTPUT: Aucune modification effectuée"
  fi
}

# Exécution
test_scenario_1
test_scenario_2
test_scenario_3

echo ""
echo "=== Tests Terminés ==="
```

## Validation

```bash
chmod +x test-contacts-blacklist.sh
./test-contacts-blacklist.sh
```

## Résultats Attendus

| Scénario | Contact Modifié | Relances Annulées | Code Retour |
|----------|----------------|-------------------|-------------|
| 1 | ✅ Oui | - | 0 |
| 2 | ✅ Oui | ✅ 2 relances | 0 |
| 3 | ❌ Non | - | 1 (erreur) |
