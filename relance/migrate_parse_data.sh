#!/bin/bash

# Configuration Parse
PARSE_URL="http://localhost:1556/api/parse"
APP_ID="adti-marki"
MASTER_KEY="e2f4e4e89056af61dd95a71226fa0e51917313e09b68aca8bf434e5eb9bd8aa9"
DATA_DIR="data"
TMP_DIR="/tmp/parse_migration"

# Créer les dossiers
mkdir -p "$DATA_DIR"
mkdir -p "$TMP_DIR"

# Classes à migrer
CLASSES=("_User" "_Role" "_Session" "Activite" "Contact" "LienPaiement" "OptionsDynamiques" "Relance" "Sequence" "SmtpProfile" "Impaye" "AppliquerReglesAttributionAutomatiqueLog" "Suivi")

# Fonction pour récupérer toutes les données d'une classe avec pagination
fetch_class_data() {
    local class_name=$1
    local output_file="$DATA_DIR/${class_name}.json"
    local skip=0
    local limit=1000
    local page_num=0
    local total_records=0
    
    # Nettoyer les fichiers temporaires précédents
    rm -f "$TMP_DIR/${class_name}_"*.json 2>/dev/null
    
    echo "Migration de la classe: $class_name"
    
    while true; do
        local tmp_file="$TMP_DIR/${class_name}_${page_num}.json"
        
        response=$(curl -s -H "X-Parse-Application-Id: $APP_ID" \
            -H "X-Parse-Master-Key: $MASTER_KEY" \
            "$PARSE_URL/classes/$class_name?limit=$limit\&skip=$skip\&order=createdAt")
        
        # Vérifier si erreur
        if echo "$response" | jq -e 'has("error")' > /dev/null 2>&1; then
            echo "  Erreur sur $class_name: $(echo "$response" | jq -r '.error')"
            break
        fi
        
        # Extraire les résultats et sauvegarder dans fichier temporaire
        echo "$response" | jq '.results // []' > "$tmp_file"
        count=$(jq 'length' "$tmp_file")
        
        if [ "$count" -eq 0 ]; then
            rm -f "$tmp_file"
            break
        fi
        
        echo "  Page $page_num: $count records (skip: $skip)"
        total_records=$((total_records + count))
        
        # Incrémenter
        skip=$((skip + limit))
        page_num=$((page_num + 1))
        
        # Si moins de limit résultats, c'est la fin
        if [ "$count" -lt "$limit" ]; then
            break
        fi
    done
    
    # Fusionner tous les fichiers temporaires en un seul
    if [ $page_num -gt 0 ]; then
        # Utiliser jq -s pour concaténer tous les tableaux
        jq -s 'add' "$TMP_DIR/${class_name}_"*.json > "$output_file" 2>/dev/null || echo "[]" > "$output_file"
    else
        echo "[]" > "$output_file"
    fi
    
    # Nettoyer les fichiers temporaires
    rm -f "$TMP_DIR/${class_name}_"*.json 2>/dev/null
    
    echo "  ✓ Total: $total_records records → $output_file"
    echo ""
}

# Vider le dossier data avant migration
rm -f "$DATA_DIR"/*.json

echo "=== MIGRATION DES DONNÉES PARSE ==="
echo "URL: $PARSE_URL"
echo "Dossier de sortie: $DATA_DIR/"
echo ""

# Migrer chaque classe
for class in "${CLASSES[@]}"; do
    fetch_class_data "$class"
done

# Nettoyer
rm -rf "$TMP_DIR"

# Résumé
echo "=== RÉSUMÉ ==="
for f in "$DATA_DIR"/*.json; do
    if [ -f "$f" ]; then
        count=$(jq 'length' "$f" 2>/dev/null || echo "0")
        basename=$(basename "$f")
        size=$(du -h "$f" | cut -f1)
        printf "  %-50s %6s records (%s)\n" "$basename" "$count" "$size"
    fi
done

echo ""
echo "Migration terminée!"
