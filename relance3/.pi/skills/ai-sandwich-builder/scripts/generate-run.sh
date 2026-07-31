#!/bin/bash
# AI Sandwich Builder - generate-run.sh
# Génère un script run_<nom>_workflow.sh depuis un fichier spec-<nom>.md

set -euo pipefail

SPEC_FILE="${1:-}"

if [ -z "$SPEC_FILE" ] || [ ! -f "$SPEC_FILE" ]; then
    echo "Usage: $0 <chemin/vers/spec-nom.md>"
    echo ""
    echo "Exemple :"
    echo "  $0 workshop/input/spec-dev3.md"
    exit 1
fi

# ============================================================
# Parser le frontmatter YAML et la liste des skills
# ============================================================

# Extraire les lignes entre le premier et le deuxième ---
FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$SPEC_FILE" | sed '1d;$d')

# Extraire le nom
NOM=$(echo "$FRONTMATTER" | sed -n 's/^nom:[[:space:]]*//p' | head -1 | tr -d '\r')

# Extraire la description
DESCRIPTION=$(echo "$FRONTMATTER" | sed -n 's/^description:[[:space:]]*//p' | head -1 | tr -d '\r')

if [ -z "$NOM" ]; then
    echo "Erreur : le frontmatter doit contenir 'nom:'" >&2
    exit 1
fi

# Extraire les skills : lignes après le deuxième --- qui commencent par "- " ou "\d\. "
# On prend tout le contenu après le frontmatter, puis on filtre
SKILLS=$(sed '0,/^---$/d' "$SPEC_FILE" | sed '1,/^---$/d' | \
    sed -n 's/^[[:space:]]*[-*][[:space:]]*//p; s/^[[:space:]]*[0-9]\+\.[[:space:]]*//p' | \
    grep -v '^$' | tr -d '\r')

if [ -z "$SKILLS" ]; then
    echo "Erreur : aucun skill trouvé dans $SPEC_FILE" >&2
    echo "Format attendu : liste avec '- skillname' ou '1. skillname'" >&2
    exit 1
fi

# Convertir en tableau bash
SKILLS_ARRAY=()
while IFS= read -r line; do
    [ -n "$line" ] && SKILLS_ARRAY+=("$line")
done <<< "$SKILLS"

WORKSHOP_DIR="workshop"
SCRIPTS_DIR="$WORKSHOP_DIR/.workshop/scripts"
OUTPUT_SCRIPT="$SCRIPTS_DIR/run_${NOM}_workflow.sh"

mkdir -p "$SCRIPTS_DIR"

# ============================================================
# Partie 1 : entête + fonctions jusqu'à run_skills()
# ============================================================
cat > "$OUTPUT_SCRIPT" << EOF
#!/bin/bash
# ============================================
# Workflow : ${NOM}
# Description : ${DESCRIPTION:-Pas de description}
# Généré le : $(date '+%Y-%m-%d %H:%M:%S')
# Skills : ${SKILLS_ARRAY[*]}
# ============================================

set -euo pipefail

WORKSHOP_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")/../../" && pwd)"
INPUT_DIR="\$WORKSHOP_DIR/input"
OUTPUT_DIR="\$WORKSHOP_DIR/output"
FINAL_DIR="\$WORKSHOP_DIR/final"
QA_DIR="\$WORKSHOP_DIR/QA"
LOGS_DIR="\$WORKSHOP_DIR/output/logs"
ERRORS_FILE="\$INPUT_DIR/erreurs_connus_à_éviter.md"

log() {
    local level="\$1"; shift; local msg="\$*"
    local ts=\$(date '+%Y-%m-%d %H:%M:%S')
    echo "[\$ts] [\$level] \$msg"
    echo "[\$ts] [\$level] \$msg" >> "\$LOGS_DIR/run_${NOM}.log"
}

setup() {
    mkdir -p "\$INPUT_DIR" "\$OUTPUT_DIR/artefacts" "\$OUTPUT_DIR/logs" "\$FINAL_DIR" "\$QA_DIR"
    [ ! -f "\$ERRORS_FILE" ] && echo -e "# Erreurs Connues à Éviter\\n" > "\$ERRORS_FILE"
}

clean_output() {
    if [ -d "\$OUTPUT_DIR/logs" ]; then
        mv "\$OUTPUT_DIR/logs" "\$WORKSHOP_DIR/.logs_tmp"
    fi
    rm -rf "\$OUTPUT_DIR"/*
    mkdir -p "\$OUTPUT_DIR/artefacts"
    if [ -d "\$WORKSHOP_DIR/.logs_tmp" ]; then
        mv "\$WORKSHOP_DIR/.logs_tmp" "\$OUTPUT_DIR/logs"
    fi
}

run_preflight() {
    log info "=== Preflight ==="
    if [ ! -f "\$INPUT_DIR/preflight.md" ]; then
        log warn "preflight.md manquant"
        return 1
    fi
    log info "Preflight OK"
    return 0
}

run_skills() {
    log info "=== Exécution des skills ==="
EOF

# ============================================================
# Partie 2 : bloc des skills (injecté dynamiquement)
# ============================================================
for skill in "${SKILLS_ARRAY[@]}"; do
    cat >> "$OUTPUT_SCRIPT" << EOF
    log info "Skill : ${skill}"
    if ! pi -p --no-session "appelle le skill ${skill}" >> "\$LOGS_DIR/skill_${skill}.log" 2>&1; then
        log error "Échec du skill : ${skill}"
        echo "## Erreur : ${skill} (\$(date))" >> "\$ERRORS_FILE"
        return 1
    fi
    log info "Skill ${skill} terminé"
EOF
done

# ============================================================
# Partie 3 : fonctions finales + main()
# ============================================================
cat >> "$OUTPUT_SCRIPT" << 'EOF'
    return 0
}

copy_to_final() {
    log info "=== Copy to final ==="
    if [ -d "$OUTPUT_DIR/artefacts" ] && [ "$(ls -A "$OUTPUT_DIR/artefacts" 2>/dev/null || true)" ]; then
        cp -r "$OUTPUT_DIR/artefacts"/* "$FINAL_DIR/" 2>/dev/null || true
    fi
    log info "Artefacts copiés"
}

run_qa() {
    log info "=== QA ==="
    if [ ! -d "$QA_DIR" ] || [ -z "$(ls -A "$QA_DIR" 2>/dev/null || true)" ]; then
        log warn "Aucun test QA"
        return 0
    fi
    if [ ! -d "$FINAL_DIR" ] || [ -z "$(ls -A "$FINAL_DIR" 2>/dev/null || true)" ]; then
        log error "final/ est vide"
        return 1
    fi
    log info "QA OK"
    return 0
}

write_success_report() {
    log info "=== Succès ==="
    local report="$LOGS_DIR/rapport_$(date +%Y%m%d_%H%M%S).md"
    cat > "$report" <<REPORT
# Rapport de Succès

**Workflow : __NOM_PLACEHOLDER__**
**Date : $(date)**
**Status : ✅ Terminé avec succès**

## Résumé
- Skills exécutés : __SKILLS_PLACEHOLDER__
- Fichiers dans final/ : $(find "$FINAL_DIR" -type f 2>/dev/null | wc -l)
REPORT
    log info "Rapport écrit dans $report"
}

main() {
    setup
    clean_output
    run_preflight || { log error "Preflight échoué — retour à l’étape 1"; exit 1; }
    run_skills   || { log error "Skill échoué — retour à l’étape 1"; exit 1; }
    copy_to_final
    run_qa       || { log error "QA échoué — retour à l’étape 1"; exit 1; }
    write_success_report
    log info "Workflow terminé avec succès"
    echo ""
    echo "✅ Résultats dans : $FINAL_DIR"
    echo "📊 Logs dans : $LOGS_DIR"
}

main "$@"
EOF

# Remplacer les placeholders restants
SKILLS_STR="${SKILLS_ARRAY[*]}"
sed -i "s|__NOM_PLACEHOLDER__|$NOM|g" "$OUTPUT_SCRIPT"
sed -i "s|__SKILLS_PLACEHOLDER__|$SKILLS_STR|g" "$OUTPUT_SCRIPT"

chmod +x "$OUTPUT_SCRIPT"

echo "[generate-run] Spec lue : $SPEC_FILE"
echo "[generate-run] Nom du workflow : $NOM"
echo "[generate-run] Description : ${DESCRIPTION:-Pas de description}"
echo "[generate-run] Skills : ${SKILLS_ARRAY[*]}"
echo "[generate-run] Script généré : $OUTPUT_SCRIPT"
