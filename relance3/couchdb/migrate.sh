#!/bin/bash
# Migration Marki SQLite → CouchDB (natif)
# Usage: ./migrate.sh [chemin_vers_marki.db]

set -e

cd "$(dirname "$0")"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SQLITE_DB="${1:-../marki.db}"
CONFIG_FILE="./config.js"

# Charger URL depuis config.js si existe
if [ -f "$CONFIG_FILE" ]; then
    COUCH_URL=$(node -e "console.log(require('./config.js').url)")
else
    COUCH_URL="${COUCHDB_URL:-http://localhost:5984}"
fi

echo -e "${GREEN}🚀 Migration Marki → CouchDB${NC}"
echo "================================"
echo "Source: $SQLITE_DB"
echo "Cible: $COUCH_URL"
echo ""

# Vérifier dépendances
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js non installé${NC}"
    exit 1
fi

# Vérifier modules Node
if [ ! -d "node_modules/nano" ] || [ ! -d "node_modules/sqlite3" ]; then
    echo -e "${YELLOW}📦 Installation des dépendances...${NC}"
    npm install
fi

# Vérifier CouchDB
echo -e "${YELLOW}⏳ Vérification CouchDB...${NC}"
if ! curl -s "$COUCH_URL" > /dev/null 2>&1; then
    echo -e "${RED}❌ CouchDB ne répond pas sur $COUCH_URL${NC}"
    echo ""
    echo "Vérifications:"
    echo "  • systemctl status couchdb"
    echo "  • sudo systemctl start couchdb"
    echo ""
    echo "Si auth activée, modifiez config.js:"
    echo "  url: 'http://admin:password@localhost:5984'"
    exit 1
fi
echo -e "${GREEN}✓ CouchDB OK${NC}"
echo ""

# Vérifier SQLite
if [ ! -f "$SQLITE_DB" ]; then
    echo -e "${RED}❌ Base SQLite non trouvée: $SQLITE_DB${NC}"
    exit 1
fi

# Stats SQLite
CONTACTS=$(node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('$SQLITE_DB'); db.get('SELECT COUNT(*) as c FROM contacts', (e,r) => console.log(r.c))")
IMPAYES=$(node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('$SQLITE_DB'); db.get('SELECT COUNT(*) as c FROM impayes', (e,r) => console.log(r.c))")

echo -e "${GREEN}✓ SQLite OK${NC} ($CONTACTS contacts, $IMPAYES impayés)"
echo ""

# Lancer migration
echo -e "${YELLOW}🔄 Migration en cours...${NC}"
node migrations/migrate-sqlite-to-couchdb.js --db="$SQLITE_DB" --url="$COUCH_URL"

# Vérification
echo ""
echo -e "${YELLOW}🔍 Vérification...${NC}"
node migrations/verify-migration.js --db="$SQLITE_DB" --url="$COUCH_URL"

echo ""
echo "================================"
echo -e "${GREEN}✅ Migration terminée!${NC}"
echo ""
echo "Commandes utiles:"
echo "  curl $COUCH_URL/marki"
echo "  npm run check"
echo "================================"
