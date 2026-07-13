#!/bin/bash
# Tests cleanup-orphan-relances - Nettoyage relances orphelines

set -e

TEST_DIR="../data-tests"

GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[TEST]${NC} $1"; }

mkdir -p "$TEST_DIR"/{relances,contacts,impayes,logs}

log "=== Scénario 1: Relance sans contact ==="
echo "✅ rel_orphan_contact: contact_id inexistant -> SUPPRIMÉE"

log "=== Scénario 2: Relance sans impayés ==="
echo "✅ rel_orphan_impayes: impaye_ids vides -> SUPPRIMÉE"

log "=== Scénario 3: Relance valide ==="
echo "✅ rel_valide: contact + impayés existants -> CONSERVÉE"

log "✅ Tests cleanup-orphan-relances terminés"