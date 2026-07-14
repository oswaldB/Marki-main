#!/bin/bash

PARSE_URL="http://localhost:1556/api/parse"
APP_ID="adti-marki"
MASTER_KEY="e2f4e4e89056af61dd95a71226fa0e51917313e09b68aca8bf434e5eb9bd8aa9"
DATA_DIR="backend/data"
TMP_DIR="/tmp/migration_final"

COUCOU_HASH='$2b$12$bQiaGuMIXSrBKXy3umILW.nv9byU/MsHR6Qt5VkakncgbVqf2Q3va'

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

get_pointer_fields() {
    local class_name=$1
    curl -s -H "X-Parse-Application-Id: $APP_ID" \
         -H "X-Parse-Master-Key: $MASTER_KEY" \
         "$PARSE_URL/schemas/$class_name" 2>/dev/null | jq -r '.fields | to_entries | map(select(.value.type == "Pointer") | .key) | join(",")'
}

json_to_yaml() {
    python3 -c "import yaml, json, sys; data=json.load(open('$1')); yaml.dump(data, open('$2', 'w'), default_flow_style=False, allow_unicode=True, sort_keys=False)" 2>/dev/null || jq '.' "$1" > "$2"
}

migrate_class() {
    local parse_class=$1
    local folder_name=$2
    local class_dir="$DATA_DIR/$folder_name"
    
    mkdir -p "$class_dir"
    
    local pointers=$(get_pointer_fields "$parse_class")
    local include_param=""
    [ -n "$pointers" ] && include_param="&include=$pointers"
    
    echo "→ $parse_class → $folder_name/"
    
    local skip=0
    local limit=1000
    local total=0
    local page=0
    
    while true; do
        page=$((page + 1))
        local response=$(curl -s -H "X-Parse-Application-Id: $APP_ID" \
            -H "X-Parse-Master-Key: $MASTER_KEY" \
            "$PARSE_URL/classes/$parse_class?limit=$limit&skip=$skip&order=createdAt$include_param" 2>/dev/null)
        
        if [ -z "$response" ] && [ "$total" -eq 0 ]; then
            echo "   (vide)"
            break
        fi
        
        if echo "$response" | jq -e 'has("error")' >/dev/null 2>&1; then
            echo "   Erreur: $(echo "$response" | jq -r '.error')"
            break
        fi
        
        local count=$(echo "$response" | jq '.results | length')
        [ "$count" -eq 0 ] && break
        
        for i in $(seq 0 $((count - 1))); do
            local record=$(echo "$response" | jq ".results[$i]")
            local object_id=$(echo "$record" | jq -r '.objectId // empty')
            [ -z "$object_id" ] && continue
            
            # _User: ajouter password et role
            if [ "$parse_class" = "_User" ]; then
                record=$(echo "$record" | jq --arg pwd "$COUCOU_HASH" '. + {password: $pwd, role: "admin"}')
            fi
            
            # Transformer les dates: {__type: Date, iso: "..."} → "..."
            record=$(echo "$record" | jq 'walk(if type == "object" and .__type == "Date" then .iso else . end)')
            
            # Supprimer les relations vides (champs avec __type: Relation)
            record=$(echo "$record" | jq 'with_entries(select(.value | type != "object" or .__type != "Relation"))')
            
            local tmp_json="$TMP_DIR/${parse_class}_${object_id}.json"
            echo "$record" > "$tmp_json"
            json_to_yaml "$tmp_json" "$class_dir/${object_id}.yml"
            rm -f "$tmp_json"
            
            total=$((total + 1))
        done
        
        echo "   Page $page: $count records (total: $total)"
        skip=$((skip + limit))
        [ "$count" -lt "$limit" ] && break
    done
    
    echo "   ✓ $total fichiers"
}

echo "=== VIDAGE DE backend/data/ ==="
rm -rf "$DATA_DIR"/*
echo "✓ Dossier vidé"
echo ""

echo "=== MIGRATION ==="
for mapping in "${CLASS_MAPPINGS[@]}"; do
    IFS=':' read -r parse_class folder_name <<< "$mapping"
    migrate_class "$parse_class" "$folder_name"
    echo ""
done

rm -rf "$TMP_DIR"

echo "=== RÉSUMÉ ==="
for d in "$DATA_DIR"/*/; do
    [ -d "$d" ] && printf "  %-30s %5d fichiers\n" "$(basename "$d")/" "$(find "$d" -name '*.yml' | wc -l)"
done

echo ""
echo "=== TERMINÉ ==="
