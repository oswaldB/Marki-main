#!/bin/bash
# migrate_to_marki2.sh - Script complet de migration vers la base CouchDB marki2

set -e

echo "=========================================="
echo "  Migration Marki.db → CouchDB marki2"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Vérifier que Node.js est installé
echo ""
echo "🔍 Vérification des prérequis..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    exit 1
fi

# Installer les dépendances si nécessaire
echo ""
echo "📦 Installation des dépendances Node.js..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/nano" ]; then
    npm install nano sqlite3 2>&1 | grep -E "(added|installed|error)" || true
fi

# Étape 1: Export SQLite
echo ""
echo "📤 Étape 1: Export des données SQLite..."
node scripts/export_sqlite.js

# Étape 2: Transformation des données
echo ""
echo "🔄 Étape 2: Transformation des données..."

# Transformer les demandes (doit être fait avant les contacts car les contacts dépendent des demandes)
node scripts/transformer.js

# Transformer les autres données
node scripts/transformer_contacts.js
node scripts/transformer_sequences.js
node scripts/transformer_smtp.js
node scripts/transformer_users.js

# Étape 3: Créer la base CouchDB marki2
echo ""
echo "🗃️  Étape 3: Création de la base CouchDB marki2..."
curl -s -X PUT http://oswald:coucou@localhost:5984/marki2 | grep -q '"ok":true' && \
    echo "✓ Base marki2 existe ou créée" || \
    echo "⚠️ Impossible de créer la base marki2"

# Étape 4: Import Design Documents
echo ""
echo "📄 Étape 4: Import des Design Documents..."
for design_file in designs/*.json; do
    if [ -f "$design_file" ]; then
        echo "  Import de $(basename $design_file)..."
        curl -s -X PUT http://oswald:coucou@localhost:5984/marki2/_design/$(basename $design_file .json) \
            -H "Content-Type: application/json" \
            -d @"$design_file" | grep -q '"ok":true' && \
            echo "  ✓ Importé" || \
            echo "  ⚠️ Erreur lors de l'import"
    fi
done

# Étape 5: Import des données
echo ""
echo "📥 Étape 5: Import des données vers CouchDB marki2..."
node scripts/importer.js

# Étape 6: Vérification
echo ""
echo "✅ Migration terminée!"
echo ""
echo "📊 Statistiques de la base marki2:"
curl -s http://oswald:coucou@localhost:5984/marki2/_all_docs | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'  Total documents: {data.get(\"total_rows\", 0)}')"

echo ""
echo "🎯 Vous pouvez maintenant utiliser la base CouchDB marki2"
echo "   URL: http://localhost:5984/marki2/_utils/"
echo "   User: oswald"
echo "   Password: coucou"
echo ""
