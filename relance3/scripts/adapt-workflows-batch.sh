#!/bin/bash

# Script d'adaptation des workflows frontend pour PouchDB/CouchDB
# Traitement par lots avec picode_batch

set -e

# Répertoire des workflows frontend
FRONTEND_DIR="/home/ubuntu/marki/relance3/workflows/frontend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/batch-adapt.log"

# Vider le log
> "$LOG_FILE"

echo "=========================================="
echo "  ADAPTATION BATCH POUCHDB"
echo "=========================================="
echo ""

# Trouver tous les fichiers .md à adapter
MD_FILES=()
while IFS= read -r -d '' file; do
    MD_FILES+=("$file")
done < <(find "$FRONTEND_DIR" -name "*.md" ! -name "README.md" -print0)

echo "Fichiers trouvés: ${#MD_FILES[@]}"
echo ""

# Générer un fichier JSON avec tous les workflows
echo "=== Génération du fichier de traitement ==="

# Créer un fichier temporaire avec la liste
LIST_FILE="$SCRIPT_DIR/workflows-to-adapt.txt"
> "$LIST_FILE"

for f in "${MD_FILES[@]}"; do
    echo "$f" >> "$LIST_FILE"
done

echo "Liste sauvegardée dans: $LIST_FILE"
echo ""

# Instruction pour picode_generate
INSTRUCTION=$(cat << 'EOF'
Adapte ce workflow Markdown pour une utilisation de PouchDB connecté en live avec CouchDB.

RÈGLES IMPORTANTES:
1. Utilise PouchDB côté frontend avec réplication live vers CouchDB
2. Remplace tous les appels API directs par des opérations PouchDB (db.get, db.put, db.query, etc.)
3. Gère la synchronisation bidirectionnelle avec db.sync() ou db.replicate.to()/from()
4. Gère les conflits de réplication (conflicts: true)
5. Utilise les _design documents pour les vues Mango
6. Implémente le pattern 'local-first' : lectures depuis PouchDB local, écritures vers PouchDB (qui réplique vers CouchDB)
7. Gère les états offline/online avec l'event 'paused'/'active' de la réplication
8. Conserve la structure Alpine.js x-data du workflow
9. Ajoute une propriété 'syncStatus' pour suivre l'état de la sync
10. Utilise les ID CouchDB (_id) et révisions (_rev) appropriés

Le fichier doit être créé avec le suffixe -pouchdb.js dans le même dossier.
EOF
)

echo "=== Démarrage du traitement batch ==="
echo ""

# Traiter par lots de 5 pour éviter de surcharger
BATCH_SIZE=5
TOTAL=${#MD_FILES[@]}
PROCESSED=0

for ((i=0; i<TOTAL; i+=BATCH_SIZE)); do
    END=$((i + BATCH_SIZE))
    [ $END -gt $TOTAL ] && END=$TOTAL
    
    echo "----------------------------------------"
    echo "Lot $((i/BATCH_SIZE + 1)): fichiers $((i+1)) à $END sur $TOTAL"
    echo ""
    
    for ((j=i; j<END; j++)); do
        file="${MD_FILES[$j]}"
        filename=$(basename "$file" .md)
        dirname=$(dirname "$file")
        
        # Vérifier si déjà adapté
        if [ -f "$dirname/$filename-pouchdb.js" ]; then
            echo "  [SKIP] Déjà adapté: $filename"
            continue
        fi
        
        echo "  [ADAPT] $filename"
        
        # Appel picode_generate
        pi -p "$INSTRUCTION" "$file" 2>&1 | tee -a "$LOG_FILE" > /dev/null &
        
        PROCESSED=$((PROCESSED + 1))
    done
    
    # Attendre la fin du lot
    echo ""
    echo "Attente fin du lot..."
    wait
    
    # Pause entre les lots
    if [ $END -lt $TOTAL ]; then
        echo "Pause de 3 secondes..."
        sleep 3
    fi
    
    echo ""
done

echo "=========================================="
echo "  RÉCAPITULATIF"
echo "=========================================="
echo ""
echo "Total fichiers: $TOTAL"
echo "Traité dans ce run: $PROCESSED"
echo ""

# Compter les fichiers adaptés
ADAPTED=$(find "$FRONTEND_DIR" -name "*-pouchdb.js" | wc -l)
echo "Fichiers -pouchdb.js créés: $ADAPTED"
echo ""
echo "Log complet: $LOG_FILE"
