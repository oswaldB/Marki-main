#!/bin/bash
# Admin CouchDB - Commandes utiles

cd "$(dirname "$0")"

# Charger config
if [ -f "./config.js" ]; then
    COUCH_URL=$(node -e "console.log(require('./config.js').url)")
else
    COUCH_URL="${COUCHDB_URL:-http://localhost:5984}"
fi

DB_NAME="${COUCHDB_DB:-marki}"

case "$1" in
    status|s)
        echo "=== CouchDB Status ==="
        curl -s "$COUCH_URL" | jq . 2>/dev/null || curl -s "$COUCH_URL"
        ;;
    
    databases|dbs)
        echo "=== Bases de données ==="
        curl -s "$COUCH_URL/_all_dbs" | jq . 2>/dev/null || curl -s "$COUCH_URL/_all_dbs"
        ;;
    
    info|i)
        echo "=== Info $DB_NAME ==="
        curl -s "$COUCH_URL/$DB_NAME" | jq . 2>/dev/null || curl -s "$COUCH_URL/$DB_NAME"
        ;;
    
    docs|count)
        echo "=== Documents $DB_NAME ==="
        curl -s "$COUCH_URL/$DB_NAME/_all_docs?limit=0" | jq . 2>/dev/null || curl -s "$COUCH_URL/$DB_NAME/_all_docs?limit=0"
        ;;
    
    views|v)
        echo "=== Vues $DB_NAME ==="
        curl -s "$COUCH_URL/$DB_NAME/_all_docs?startkey=\"_design/\"\u0026endkey=\"_design0\"\u0026include_docs=false" | jq .rows[].key 2>/dev/null || echo "Voir: curl $COUCH_URL/$DB_NAME/_all_docs"
        ;;
    
    compact|c)
        echo "=== Compactage $DB_NAME ==="
        curl -X POST -H "Content-Type: application/json" "$COUCH_URL/$DB_NAME/_compact"
        ;;
    
    cleanup)
        echo "=== Nettoyage vues $DB_NAME ==="
        curl -X POST -H "Content-Type: application/json" "$COUCH_URL/$DB_NAME/_view_cleanup"
        ;;
    
    delete|rm)
        read -p "⚠️  Supprimer $DB_NAME ? [y/N] " confirm
        if [ "$confirm" = "y" ]; then
            curl -X DELETE "$COUCH_URL/$DB_NAME"
        else
            echo "Annulé"
        fi
        ;;
    
    logs)
        sudo tail -f /var/log/couchdb/couch.log
        ;;
    
    restart)
        sudo systemctl restart couchdb
        echo "CouchDB redémarré"
        ;;
    
    ping|p)
        if curl -s "$COUCH_URL" > /dev/null; then
            echo "✓ CouchDB OK"
        else
            echo "✗ CouchDB ne répond pas"
            exit 1
        fi
        ;;
    
    help|h|*)
        cat << EOF
Usage: ./couch-admin.sh [commande]

Commandes:
  status, s       Statut CouchDB
  databases, dbs  Liste des bases
  info, i         Info base marki
  docs, count     Nombre de documents
  views, v        Liste des vues
  compact, c      Compacter la base
  cleanup         Nettoyer les vues
  delete, rm      ⚠️  Supprimer la base
  logs            Voir les logs
  restart         Redémarrer CouchDB
  ping, p         Test connexion
  help, h         Cette aide

Config: $COUCH_URL
EOF
        ;;
esac
