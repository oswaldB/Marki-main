#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# Preflight Test — dev.markidiags.com
# -----------------------------------------------------------------------------
# Vérifie :
#   1. https://dev.markidiags.com/healthy  → healthy screen
#   2. https://dev.markidiags.com/parse     → schema JSON
#   3. Enregistrement du schema dans output/artefacts/schema
# -----------------------------------------------------------------------------

WORKSHOP_DIR="${1:-./workshop}"
OUTPUT_DIR="$WORKSHOP_DIR/output/artefacts"
LOG_FILE="$OUTPUT_DIR/preflight.log"
KO_FILE="$OUTPUT_DIR/preflight-ko.md"

HEALTHY_URL="https://dev.markidiags.com/healthy"
SCHEMA_URL="https://dev.markidiags.com/parse"

mkdir -p "$OUTPUT_DIR"

# Redirection des logs
echo "[preflight] Démarrage — $(date -Iseconds)" > "$LOG_FILE"
exec > >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

# --- Fonction utilitaire : écrire le rapport KO et quitter -------------------
write_ko() {
    local reason="$1"
    cat > "$KO_FILE" << EOF
# Rapport Preflight — KO

**Date :** $(date -Iseconds)
**Workshop :** $WORKSHOP_DIR

## Échec

$reason

## Logs

\`\`\`
$(cat "$LOG_FILE")
\`\`\`
EOF
    echo "[preflight] Rapport KO écrit dans $KO_FILE"
    exit 1
}

# --- Test 1 : Healthy check --------------------------------------------------
echo "[preflight] Test 1/3 — Vérification de $HEALTHY_URL ..."
HEALTHY_RESPONSE=""
if ! HEALTHY_RESPONSE=$(curl -sSf "$HEALTHY_URL" 2>&1); then
    write_ko "Impossible de joindre \`$HEALTHY_URL\`. La requête curl a échoué (HTTP non-2xx ou connexion refusée)."
fi

if ! echo "$HEALTHY_RESPONSE" | grep -qi "healthy"; then
    write_ko "L'URL \`$HEALTHY_URL\` répond mais le corps ne contient pas le texte attendu (insensible à la casse) : \`healthy\`.\n\nRéponse reçue :\n\n\`\`\`\n$HEALTHY_RESPONSE\n\`\`\`"
fi

echo "[preflight] Healthy OK : $HEALTHY_RESPONSE"

# --- Test 2 : Récupération du schema -----------------------------------------
echo "[preflight] Test 2/3 — Récupération du schema sur $SCHEMA_URL ..."
SCHEMA_RESPONSE=""
if ! SCHEMA_RESPONSE=$(curl -sSf "$SCHEMA_URL" 2>&1); then
    write_ko "Impossible de récupérer le schema depuis \`$SCHEMA_URL\`. La requête curl a échoué (HTTP non-2xx ou connexion refusée)."
fi

# --- Test 3 : Enregistrement du schema ---------------------------------------
echo "[preflight] Test 3/3 — Enregistrement du schema dans $OUTPUT_DIR/schema ..."
if ! echo "$SCHEMA_RESPONSE" > "$OUTPUT_DIR/schema"; then
    write_ko "Impossible d'écrire le schema dans \`$OUTPUT_DIR/schema\` (droits d'écriture manquants ?)."
fi

# Vérification que le fichier n'est pas vide
if [ ! -s "$OUTPUT_DIR/schema" ]; then
    write_ko "Le fichier \`$OUTPUT_DIR/schema\` a été créé mais est vide."
fi

echo "[preflight] Schema enregistré ($(wc -c < "$OUTPUT_DIR/schema") octets)."

# --- Succès ------------------------------------------------------------------
echo "[preflight] Tous les tests sont OK — $(date -Iseconds)"
exit 0
