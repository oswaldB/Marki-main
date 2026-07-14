#!/bin/bash

# Configuration Parse
PARSE_URL="http://localhost:1556/api/parse"
APP_ID="adti-marki"
MASTER_KEY="e2f4e4e89056af61dd95a71226fa0e51917313e09b68aca8bf434e5eb9bd8aa9"
DATA_DIR="backend/data"
TMP_DIR="/tmp/backend_migration"

# Mapping Parse class → dossier backend
# Format: "ParseClassName:folder_name"
CLASS_MAPPINGS=(
    "_User:users"
    "_Session:sessions"
    "Contact:contacts"
    "Impaye:impayes"
    "Relance:relances"
    "Sequence:sequences"
    "SmtpProfile:smtp_profiles"
    "LienPaiement:payment_links"
    "Activite:activities"
    "OptionsDynamiques:options"
    "Suivi:suivis"
    "AppliquerReglesAttributionAutomatiqueLog:attribution_logs"
)

mkdir -p "$TMP_DIR"

# Hash bcrypt pour "coucou"
COUCOU_HASH='$2b$12$bQiaGuMIXSrBKXy3umILW.nv9byU/MsHR6Qt5VkakncgbVqf2Q3va'

# Fonction pour convertir JSON en YAML
json_to_yaml() {
    local json_file=$1
    local yaml_file=$2
    python3 -c "import yaml, json, sys; data=json.load(open('$json_file')); yaml.dump(data, open('$yaml_file', 'w'), default_flow_style=False, allow_unicode=True, sort_keys=False)" 2>/dev/null || jq '.' "$json_file" > "$yaml_file"
}

# Fonction pour migrer une classe
migrate_class() {
    local parse_class=$1
    local folder_name=$2
    local class_dir="$DATA_DIR/$folder_name"
    
    mkdir -p "$class_dir"
    
    local skip=0
    local limit=1000
    local page_num=0
    local total=0
    
    echo "→ $parse_class → $folder_name/"
    
    while true; do
        local tmp_page="$TMP_DIR/${parse_class}_${page_num}.json"
        
        response=$(curl -s -H "X-Parse-Application-Id: $APP_ID" \
            -H "X-Parse-Master-Key: $MASTER_KEY" \
            "$PARSE_URL/classes/$parse_class?limit=$limit\&skip=$skip\&order=createdAt" 2>/dev/null)
        
        # Vérifier erreur
        if echo "$response" | jq -e 'has("error")' > /dev/null 2>&1; then
            echo "   Erreur: $(echo "$response" | jq -r '.error')"
            break
        fi
        
        echo "$response" | jq '.results // []' > "$tmp_page"
        count=$(jq 'length' "$tmp_page")
        
        [ "$count" -eq 0 ] && { rm -f "$tmp_page"; break; }
        
        # Créer un YAML par record
        for i in $(seq 0 $((count - 1))); do
            record=$(jq -r ".[$i]" "$tmp_page")
            object_id=$(echo "$record" | jq -r '.objectId // empty')
            
            [ -z "$object_id" ] && object_id="unknown_${page_num}_$i"
            
            record_json="$TMP_DIR/record.json"
            
            # Pour _User, ajouter le password haché et le role
            if [ "$parse_class" = "_User" ]; then
                echo "$record" | jq --arg pwd "$COUCOU_HASH" '. + {password: $pwd, role: "admin"}' > "$record_json"
            else
                echo "$record" > "$record_json"
            fi
            
            json_to_yaml "$record_json" "$class_dir/${object_id}.yml"
            rm -f "$record_json"
            
            total=$((total + 1))
        done
        
        rm -f "$tmp_page"
        skip=$((skip + limit))
        page_num=$((page_num + 1))
        
        [ "$count" -lt "$limit" ] && break
    done
    
    echo "   ✓ $total fichiers"
}

# VIDAGE COMPLET DE backend/data/
echo "=== VIDAGE DE backend/data/ ==="
rm -rf "$DATA_DIR"/*
echo "✓ Dossier vidé"
echo ""

# MIGRATION
echo "=== MIGRATION PARSE → backend/data/ ==="
for mapping in "${CLASS_MAPPINGS[@]}"; do
    IFS=':' read -r parse_class folder_name <<< "$mapping"
    migrate_class "$parse_class" "$folder_name"
done

# Nettoyer
rm -rf "$TMP_DIR"

# RÉSUMÉ
echo ""
echo "=== RÉSUMÉ ==="
find "$DATA_DIR" -name "*.yml" | while read f; do
    dir=$(dirname "$f")
    class=$(basename "$dir")
    count=$(find "$dir" -name "*.yml" | wc -l)
    printf "  %-25s %5d fichiers\n" "$class/" "$count"
    break
    done
    
# Compter total par dossier
for d in "$DATA_DIR"/*/; do
    if [ -d "$d" ]; then
        name=$(basename "$d")
        count=$(find "$d" -name "*.yml" 2>/dev/null | wc -l)
        printf "  %-25s %5d fichiers\n" "$name/" "$count"
    fi
done

echo ""
echo "=== TERMINÉ ==="
