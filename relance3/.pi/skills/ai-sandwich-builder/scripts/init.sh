#!/bin/bash
# AI Sandwich Builder - init.sh
# Crée la structure workshop/ avec .workshop/scripts/ vide

set -euo pipefail

WORKSHOP_DIR="${1:-workshop}"

echo "[init] Création de la structure workshop dans : $WORKSHOP_DIR"

mkdir -p "$WORKSHOP_DIR"/{input,output/artefacts,output/logs,final,QA,.workshop/scripts}

# Fichiers par défaut input
cat > "$WORKSHOP_DIR/input/README.md" << 'EOF'
# Documentation du projet

Ce dossier contient les fichiers sources pour le traitement.
EOF

cat > "$WORKSHOP_DIR/input/preflight.md" << 'EOF'
# Tests Preflight

Liste des vérifications à effectuer avant production :

- [ ] Vérifier la structure des fichiers input
- [ ] Valider les dépendances
EOF

cat > "$WORKSHOP_DIR/input/erreurs_connus_à_éviter.md" << 'EOF'
# Erreurs Connues à Éviter

Ce fichier documente les erreurs rencontrées et leurs solutions.
EOF

# Fichier QA par défaut
cat > "$WORKSHOP_DIR/QA/tests.md" << 'EOF'
# Tests QA

Liste des tests à effectuer après production :

- [ ] Vérifier que final/ contient des fichiers
- [ ] Valider la structure des artefacts
EOF

# Fichier spec d'exemple
cat > "$WORKSHOP_DIR/input/spec-exemple.md" << 'EOF'
---
nom: exemple
description: Workflow exemple pour démontrer le sandwich builder
---

1. skill-a
2. skill-b
3. skill-c
EOF

echo "[init] Structure créée :"
find "$WORKSHOP_DIR" -type d | sed "s|^$WORKSHOP_DIR/||" | sort
echo ""
echo "[init] Fichiers créés :"
find "$WORKSHOP_DIR" -type f | sed "s|^$WORKSHOP_DIR/||" | sort
