#!/bin/bash

# Script d'adaptation des workflows frontend pour PouchDB/CouchDB
# Génère un tableau de tous les écrans et leurs workflows, puis adapte chacun

set -e

# Répertoire des workflows frontend
FRONTEND_DIR="/home/ubuntu/marki/relance3/workflows/frontend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Fichier de log
LOG_FILE="$SCRIPT_DIR/adapt-workflows.log"

# Compteurs
TOTAL_ECRANS=0
TOTAL_WORKFLOWS=0

# Vider le fichier de log
> "$LOG_FILE"

echo "=========================================="
echo "  ADAPTATION DES WORKFLOWS POUR POUCHDB"
echo "=========================================="
echo ""

# ============================================================
# ÉTAPE 1: LISTER TOUS LES ÉCRANS ET WORKFLOWS
# ============================================================
echo "=== ÉTAPE 1: Inventaire des écrans et workflows ==="
echo ""

# Tableau des écrans et workflows (format: ecran:workflow1,workflow2,...)
declare -A ECRANS_WORKFLOWS

# Parcourir tous les écrans
for ecran_dir in "$FRONTEND_DIR"/*/; do
    if [ -d "$ecran_dir" ]; then
        ecran=$(basename "$ecran_dir")
        TOTAL_ECRANS=$((TOTAL_ECRANS + 1))

        # Lister tous les workflows (.md sauf README.md)
        workflow_list=""
        while IFS= read -r -d '' workflow_file; do
            workflow=$(basename "$workflow_file" .md)
            if [ -z "$workflow_list" ]; then
                workflow_list="$workflow"
            else
                workflow_list="$workflow_list,$workflow"
            fi
            TOTAL_WORKFLOWS=$((TOTAL_WORKFLOWS + 1))
        done < <(find "$ecran_dir" -maxdepth 1 -name "*.md" ! -name "README.md" -print0 2>/dev/null)

        # Stocker dans le tableau associatif
        if [ -n "$workflow_list" ]; then
            ECRANS_WORKFLOWS["$ecran"]="$workflow_list"
        fi
    fi
done

# Afficher le tableau
echo "+----------------------------------------+"
echo "|         TABLEAU DES ÉCRANS              |"
echo "+----------------------------------------+"
printf "| %-20s | %15s |\n" "ÉCRAN" "NB WORKFLOWS"
echo "+----------------------+-----------------+"

for ecran in "${!ECRANS_WORKFLOWS[@]}"; do
    IFS=',' read -ra workflows <<< "${ECRANS_WORKFLOWS[$ecran]}"
    printf "| %-20s | %15s |\n" "$ecran" "${#workflows[@]}"
done

echo "+----------------------------------------+"
echo ""
echo "Total écrans: $TOTAL_ECRANS"
echo "Total workflows: $TOTAL_WORKFLOWS"
echo ""

# ============================================================
# ÉTAPE 2: GÉNÉRER LES COMMANDES PI -P
# ============================================================
echo "=== ÉTAPE 2: Génération des commandes pi -p ==="
echo ""

# Fichier de sortie pour les commandes
COMMANDS_FILE="$SCRIPT_DIR/run-pi-commands.sh"

# Créer le fichier de commandes
cat > "$COMMANDS_FILE" << 'HEADER'
#!/bin/bash
# Script généré automatiquement pour adapter les workflows pour PouchDB
# Exécute: pi -p "instruction" "fichier.md" pour chaque workflow

set -e

FRONTEND_DIR="/home/ubuntu/marki/relance3/workflows/frontend"
LOG_FILE="/home/ubuntu/marki/relance3/scripts/pi-execution.log"

# Instruction standard pour pi -p
INSTRUCTION='Adapte ces spécifications de workflow pour une utilisation de PouchDB connecté en live avec CouchDB. Tu dois mettre à jour les specifications au format.md avec les appels pouchdb et les appels API directs par des opérations PouchDB.'

RÈGLES IMPORTANTES:
1. Utilise PouchDB côté frontend avec réplication live vers CouchDB
2. Remplace tous les appels API directs par des opérations PouchDB (db.get, db.put, db.query, etc.)
3. Gère la synchronisation bidirectionnelle avec db.sync() ou db.replicate.to()/from()
4. Gère les conflits de réplication (conflicts: true)
5. Utilise les _design documents pour les vues Mango
6. Implémente le pattern local-first : lectures depuis PouchDB local, écritures vers PouchDB (qui réplique vers CouchDB)
7. Gère les états offline/online avec les events paused/active de la réplication
8. Conserve la structure Alpine.js x-data du workflow
9. Ajoute une propriété syncStatus pour suivre l état de la sync
10. Utilise les ID CouchDB (_id) et révisions (_rev) appropriés

Le workflow doit utiliser PouchDB pour toutes les opérations de données, avec réplication automatique vers CouchDB.'

echo "Démarrage de l adaptation des workflows..." > "$LOG_FILE"
echo "" >> "$LOG_FILE"

COUNTER=0

HEADER

# Générer une commande par workflow
for ecran in "${!ECRANS_WORKFLOWS[@]}"; do
    IFS=',' read -ra workflows <<< "${ECRANS_WORKFLOWS[$ecran]}"

    echo "" >> "$COMMANDS_FILE"
    echo "# Écran: $ecran (${#workflows[@]} workflows)" >> "$COMMANDS_FILE"
    echo "echo \"=== Traitement de l'écran: $ecran ===\"" >> "$COMMANDS_FILE"

    for workflow in "${workflows[@]}"; do
        workflow_path="$FRONTEND_DIR/$ecran/$workflow.md"

        if [ -f "$workflow_path" ]; then
            echo "" >> "$COMMANDS_FILE"
            echo "# Workflow: $workflow" >> "$COMMANDS_FILE"
            echo "echo \"→ Adaptation: $ecran/$workflow\"" >> "$COMMANDS_FILE"
            echo "pi -p \"\$INSTRUCTION\" \"$workflow_path\" 2>&1 | tee -a \"\$LOG_FILE\"" >> "$COMMANDS_FILE"
            echo "COUNTER=\$((COUNTER + 1))" >> "$COMMANDS_FILE"
            echo "sleep 1" >> "$COMMANDS_FILE"
        fi
    done
done

# Ajouter le footer
cat >> "$COMMANDS_FILE" << 'FOOTER'

echo ""
echo "========================================"
echo "  ADAPTATION TERMINÉE"
echo "========================================"
echo "Workflows traités: $COUNTER"
echo "Log: $LOG_FILE"
echo ""
FOOTER

chmod +x "$COMMANDS_FILE"

echo "Fichier de commandes généré: $COMMANDS_FILE"
echo "Nombre de commandes: $TOTAL_WORKFLOWS"
echo ""

# ============================================================
# ÉTAPE 3: EXÉCUTER LES COMMANDES (OPTIONNEL)
# ============================================================
echo "=== ÉTAPE 3: Exécution ==="
echo ""

if [ "$1" == "--exec" ] || [ "$1" == "-e" ]; then
    echo "Exécution des commandes pi -p..."
    echo ""
    "$COMMANDS_FILE"
else
    echo "Pour exécuter les adaptations, lancez:"
    echo "  $0 --exec"
    echo ""
    echo "Ou exécutez directement:"
    echo "  $COMMANDS_FILE"
    echo ""
fi

echo "========================================"
echo "  SCRIPT TERMINÉ"
echo "========================================"
