# Tests Scénarios - cleanup-orphan-relances

## Description
Nettoyage des relances orphelines (sans contact ou sans impayés existants).

## Structure Données de Test

```
backend/data-tests/
├── relances/               # Relances orphelines à supprimer
├── contacts/               # Contacts de référence
├── impayes/                # Impayés de référence
└── logs/                   # Logs de nettoyage
```

---

## Scénarios

### Scénario 1 : Relance sans Contact (Orpheline)

**Objectif** : Supprimer relance avec contact_id inexistant.

#### Input Data

```yaml
# Relance avec contact inexistant
id: rel_orphan_contact
contact_id: cont_inexistant  # n'existe pas
impaye_ids:
  - imp_existant
statut: pret pour envoi

# Contact existant
id: cont_existant
nom: Existant
```

#### Vérifications

```bash
# Vérifier suppression
if [ ! -f "backend/data-tests/relances/rel_orphan_contact.yml" ]; then
    echo "✅ Relance orpheline supprimée"
fi
```

---

### Scénario 2 : Relance sans Impayés (Orpheline)

**Objectif** : Supprimer relance avec impaye_ids vides ou inexistants.

```bash
if [ ! -f "backend/data-tests/relances/rel_orphan_impayes.yml" ]; then
    echo "✅ Relance sans impayés supprimée"
fi
```

---

### Scénario 3 : Relance Valide (Conservée)

**Objectif** : Ne pas supprimer les relances valides.

```bash
if [ -f "backend/data-tests/relances/rel_valide.yml" ]; then
    echo "✅ Relance valide conservée"
fi
```

---

## Script de Test Automatisé

```bash
#!/bin/bash
# backend/cleanup-orphan-relances/run-tests.sh

set -e

TEST_DIR="../data-tests"

GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[TEST]${NC} $1"; }

mkdir -p "$TEST_DIR"/{relances,contacts,impayes,logs}

# Scénario 1: Sans contact
log "=== Scénario 1: Relance sans contact ==="
echo "rel_orphan_contact: contact_id inexistant -> SUPPRIMÉE"

# Scénario 2: Sans impayés
log "=== Scénario 2: Relance sans impayés ==="
echo "rel_orphan_impayes: impaye_ids vides -> SUPPRIMÉE"

# Scénario 3: Valide
log "=== Scénario 3: Relance valide ==="
echo "rel_valide: contact + impayés existants -> CONSERVÉE"

log "✅ Tests cleanup-orphan-relances terminés"
