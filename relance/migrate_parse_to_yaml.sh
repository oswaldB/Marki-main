#!/bin/bash

# Configuration Parse
PARSE_URL="http://localhost:1556/api/parse"
APP_ID="adti-marki"
MASTER_KEY="e2f4e4e89056af61dd95a71226fa0e51917313e09b68aca8bf434e5eb9bd8aa9"
DATA_DIR="data"
TMP_DIR="/tmp/parse_yaml_migration"

# Créer les dossiers
mkdir -p "$DATA_DIR"
mkdir -p "$TMP_DIR"

# Classes à migrer
CLASSES=("_User" "_Role" "_Session" "Activite" "Contact" "LienPaiement" "OptionsDynamiques" "Relance" "Sequence" "SmtpProfile" "Impaye" "AppliquerReglesAttributionAutomatiqueLog" "Suivi")

# Fonction pour convertir JSON en YAML
json_to_yaml() {
    local json_file=$1
    local yaml_file=$2
    
    # Utiliser yq ou python pour conversion
    if command -v yq &> /dev/null; then
        yq -P "$json_file" > "$yaml_file"
    elif command -v python3 &> /dev/null; then
        python3 -c "import yaml, json, sys; data=json.load(sys.stdin); yaml.dump(data, sys.stdout, default_flow_style=False, allow_unicode=True, sort_keys=False)" < "$json_file" > "$yaml_file"
    else
        # Fallback: écrire en JSON formaté si pas de convertisseur YAML
        jq '.' "$json_file" > "$yaml_file"
    fi
}

# Fonction pour récupérer et sauvegarder les données
fetch_and_save() {
    local class_name=$1
    local class_dir="$DATA_DIR/$class_name"
    
    mkdir -p "$class_dir"
    
    local skip=0
    local limit=1000
    local page_num=0
    local total_records=0
    
    echo "Migration de la classe: $class_name"
    
    while true; do
        local tmp_file="$TMP_DIR/${class_name}_page_${page_num}.json"
        
        response=$(curl -s -H "X-Parse-Application-Id: $APP_ID" \
            -H "X-Parse-Master-Key: $MASTER_KEY" \
            "$PARSE_URL/classes/$class_name?limit=$limit\&skip=$skip\&order=createdAt")
        
        # Vérifier si erreur
        if echo "$response" | jq -e 'has("error")' > /dev/null 2>&1; then
            echo "  Erreur sur $class_name: $(echo "$response" | jq -r '.error')"
            break
        fi
        
        # Extraire les résultats
        echo "$response" | jq '.results // []' > "$tmp_file"
        count=$(jq 'length' "$tmp_file")
        
        if [ "$count" -eq 0 ]; then
            rm -f "$tmp_file"
            break
        fi
        
        # Pour chaque record, créer un fichier YAML
        for i in $(seq 0 $((count - 1))); do
            record=$(jq -r ".[$i]" "$tmp_file")
            object_id=$(echo "$record" | jq -r '.objectId // empty')
            
            if [ -z "$object_id" ]; then
                object_id="unknown_$(date +%s)_$i"
            fi
            
            # Créer le fichier JSON temporaire pour ce record
            record_file="$TMP_DIR/record_${object_id}.json"
            echo "$record" > "$record_file"
            
            # Convertir en YAML
            yaml_file="$class_dir/${object_id}.yml"
            json_to_yaml "$record_file" "$yaml_file"
            
            # Nettoyer le temp
            rm -f "$record_file"
            
            total_records=$((total_records + 1))
        done
        
        echo "  Page $page_num: $count records → $class_dir/"
        
        # Nettoyer fichier page
        rm -f "$tmp_file"
        
        skip=$((skip + limit))
        page_num=$((page_num + 1))
        
        if [ "$count" -lt "$limit" ]; then
            break
        fi
    done
    
    echo "  ✓ Total: $total_records fichiers YAML dans $class_dir/"
    echo ""
}

# Vider le dossier data avant migration
echo "Nettoyage de $DATA_DIR/..."
rm -rf "$DATA_DIR"/*

echo "=== MIGRATION DES DONNÉES PARSE → YAML ==="
echo "URL: $PARSE_URL"
echo "Dossier de sortie: $DATA_DIR/"
echo ""

# Migrer chaque classe
for class in "${CLASSES[@]}"; do
    fetch_and_save "$class"
done

# Nettoyer
rm -rf "$TMP_DIR"

# Résumé
echo "=== RÉSUMÉ ==="
for class_dir in "$DATA_DIR"/*/; do
    if [ -d "$class_dir" ]; then
        class_name=$(basename "$class_dir")
        count=$(find "$class_dir" -name "*.yml" | wc -l)
        printf "  %-40s %5d fichiers\n" "$class_name/" "$count"
    fi
done

echo ""
echo "Migration terminée!"
