#!/usr/bin/env python3
"""
Script de migration complet de SQLite (marki.db) vers CouchDB
"""

import sqlite3
import json
import requests
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import sys
import logging
from urllib.parse import quote_plus

# Configuration
SQLITE_DB_PATH = "marki.db"
COUCHDB_URL = "http://localhost:5984"
COUCHDB_USER = "oswald"
COUCHDB_PASSWORD = "Citron6-Mustang8"
BATCH_SIZE = 100

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('migration.log')
    ]
)
logger = logging.getLogger(__name__)


class CouchDBClient:
    """Client CouchDB simple et robuste"""
    
    def __init__(self, url: str, username: str, password: str):
        self.url = url.rstrip('/')
        self.auth = (username, password)
        self.session = requests.Session()
        self.session.auth = self.auth
        self.session.headers.update({'Content-Type': 'application/json'})
    
    def create_database(self, db_name: str) -> bool:
        """Crée une base de données si elle n'existe pas"""
        try:
            response = self.session.put(f"{self.url}/{db_name}")
            if response.status_code == 201:
                logger.info(f"✅ Base '{db_name}' créée")
                return True
            elif response.status_code == 412:
                logger.info(f"ℹ️ Base '{db_name}' existe déjà")
                return True
            else:
                logger.error(f"❌ Erreur création base '{db_name}': {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Exception création base '{db_name}': {e}")
            return False
    
    def bulk_insert(self, db_name: str, docs: List[Dict]) -> Dict:
        """Insère des documents en batch"""
        if not docs:
            return {"ok": True, "count": 0}
        
        payload = {"docs": docs}
        try:
            response = self.session.post(
                f"{self.url}/{db_name}/_bulk_docs",
                json=payload
            )
            response.raise_for_status()
            results = response.json()
            
            errors = [r for r in results if 'error' in r]
            success = len(results) - len(errors)
            
            return {
                "ok": len(errors) == 0,
                "inserted": success,
                "errors": errors,
                "total": len(docs)
            }
        except Exception as e:
            logger.error(f"❌ Erreur bulk insert: {e}")
            return {"ok": False, "error": str(e), "total": len(docs)}
    
    def get_doc(self, db_name: str, doc_id: str) -> Optional[Dict]:
        """Récupère un document par ID"""
        try:
            response = self.session.get(f"{self.url}/{db_name}/{quote_plus(doc_id)}")
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"❌ Erreur récupération doc {doc_id}: {e}")
            return None


class SQLiteToCouchDBMigrator:
    """Outil de migration SQLite vers CouchDB"""
    
    def __init__(self, sqlite_path: str, couchdb_client: CouchDBClient):
        self.sqlite_path = sqlite_path
        self.couchdb = couchdb_client
        self.stats = {
            "tables": {},
            "total_docs": 0,
            "total_inserted": 0,
            "total_errors": 0,
            "start_time": None,
            "end_time": None
        }
    
    def connect_sqlite(self) -> sqlite3.Connection:
        """Établit la connexion SQLite"""
        conn = sqlite3.connect(self.sqlite_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def get_tables(self, conn: sqlite3.Connection) -> List[str]:
        """Récupère la liste des tables"""
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        return [row['name'] for row in cursor.fetchall()]
    
    def get_table_schema(self, conn: sqlite3.Connection, table_name: str) -> List[Dict]:
        """Récupère le schéma d'une table"""
        cursor = conn.execute(f"PRAGMA table_info({table_name})")
        return [
            {
                "name": row['name'],
                "type": row['type'].upper(),
                "notnull": row['notnull'],
                "default": row['dflt_value'],
                "pk": row['pk']
            }
            for row in cursor.fetchall()
        ]
    
    def convert_value(self, value: Any, col_type: str, col_name: str = '') -> Any:
        """Convertit une valeur SQLite pour CouchDB"""
        if value is None:
            return None
        
        col_type = col_type.upper()
        
        # Conversion des types SQLite
        if 'INTEGER' in col_type:
            # Boolean seulement pour colonnes spécifiques
            if col_name in ['is_active', 'is_admin', 'is_verified', 'enabled'] and value in (0, 1):
                return bool(value)
            return int(value)
        
        elif 'REAL' in col_type or 'FLOAT' in col_type or 'DOUBLE' in col_type:
            return float(value)
        
        elif 'TEXT' in col_type or 'VARCHAR' in col_type or 'CHAR' in col_type:
            # Détection des dates ISO
            if isinstance(value, str):
                # Essayer de parser comme date ISO
                for fmt in ['%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d']:
                    try:
                        dt = datetime.strptime(value.split('.')[0] if '.' in value else value, fmt)
                        return dt.isoformat() + 'Z'
                    except ValueError:
                        continue
            return value
        
        elif 'BLOB' in col_type:
            return value.hex() if isinstance(value, bytes) else value
        
        return value
    
    def row_to_doc(self, row: sqlite3.Row, schema: List[Dict], table_name: str) -> Dict:
        """Convertit une ligne SQLite en document CouchDB"""
        doc = {
            "_id": f"{table_name}:{row['id']}" if 'id' in row.keys() else f"{table_name}:{hash(str(row))}",
            "table": table_name,
            "migrated_at": datetime.now(timezone.utc).isoformat(),
            "source": 'sqlite'
        }
        
        for col in schema:
            col_name = col['name']
            if col_name in row.keys():
                value = row[col_name]
                doc[col_name] = self.convert_value(value, col['type'], col_name)
        
        return doc
    
    def migrate_table(self, conn: sqlite3.Connection, table_name: str, db_name: str = 'marki') -> Dict:
        """Migre une table entière"""
        logger.info(f"\n📦 Migration de la table '{table_name}'...")
        
        # Créer la base si nécessaire
        if not self.couchdb.create_database(db_name):
            return {"ok": False, "error": "Impossible de créer la base"}
        
        # Récupérer le schéma
        schema = self.get_table_schema(conn, table_name)
        logger.info(f"   Schéma: {[c['name'] for c in schema]}")
        
        # Compter les enregistrements
        count = conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
        logger.info(f"   {count} enregistrements à migrer")
        
        if count == 0:
            return {"ok": True, "inserted": 0, "total": 0}
        
        # Migrer par batch
        inserted = 0
        errors = 0
        cursor = conn.execute(f"SELECT * FROM {table_name}")
        
        batch = []
        for row in cursor:
            doc = self.row_to_doc(row, schema, table_name)
            batch.append(doc)
            
            if len(batch) >= BATCH_SIZE:
                result = self.couchdb.bulk_insert(db_name, batch)
                if result.get('ok'):
                    inserted += result.get('inserted', 0)
                    errors += len(result.get('errors', []))
                batch = []
        
        # Dernier batch
        if batch:
            result = self.couchdb.bulk_insert(db_name, batch)
            if result.get('ok'):
                inserted += result.get('inserted', 0)
                errors += len(result.get('errors', []))
        
        result = {
            "ok": errors == 0,
            "table": table_name,
            "total": count,
            "inserted": inserted,
            "errors": errors
        }
        
        self.stats["tables"][table_name] = result
        self.stats["total_docs"] += count
        self.stats["total_inserted"] += inserted
        self.stats["total_errors"] += errors
        
        logger.info(f"   ✅ {inserted}/{count} migrés, {errors} erreurs")
        
        return result
    
    def run(self, db_name: str = 'marki') -> Dict:
        """Lance la migration complète"""
        self.stats["start_time"] = datetime.now(timezone.utc).isoformat()
        
        logger.info("=" * 60)
        logger.info("🚀 DÉBUT DE LA MIGRATION SQLITE → COUCHDB")
        logger.info(f"   Source: {self.sqlite_path}")
        logger.info(f"   Destination: {COUCHDB_URL}/{db_name}")
        logger.info("=" * 60)
        
        try:
            conn = self.connect_sqlite()
            tables = self.get_tables(conn)
            
            logger.info(f"\n📋 Tables trouvées: {tables}")
            
            for table in tables:
                self.migrate_table(conn, table, db_name)
            
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Erreur critique: {e}")
            self.stats["error"] = str(e)
        
        self.stats["end_time"] = datetime.now(timezone.utc).isoformat()
        
        self.print_summary()
        
        return self.stats
    
    def print_summary(self):
        """Affiche le résumé de la migration"""
        logger.info("\n" + "=" * 60)
        logger.info("📊 RÉSUMÉ DE LA MIGRATION")
        logger.info("=" * 60)
        
        for table, result in self.stats["tables"].items():
            status = "✅" if result["ok"] else "❌"
            logger.info(f"{status} {table}: {result['inserted']}/{result['total']}")
        
        logger.info("-" * 60)
        logger.info(f"📈 Total: {self.stats['total_inserted']}/{self.stats['total_docs']} documents")
        
        if self.stats['total_errors'] > 0:
            logger.error(f"⚠️ {self.stats['total_errors']} erreurs")
        else:
            logger.info("✅ Aucune erreur")
        
        logger.info(f"⏱️ Début: {self.stats['start_time']}")
        logger.info(f"⏱️ Fin: {self.stats['end_time']}")
        logger.info("=" * 60)


def verify_migration(couchdb: CouchDBClient, db_name: str = 'marki'):
    """Vérifie la migration en listant les documents"""
    logger.info("\n🔍 VÉRIFICATION DE LA MIGRATION")
    
    try:
        # Compter les documents par table
        for table in ['users', 'sessions']:
            response = requests.get(
                f"{COUCHDB_URL}/{db_name}/_all_docs",
                auth=(COUCHDB_USER, COUCHDB_PASSWORD),
                params={"start_key": f'"{table}:"', "end_key": f'"{table}:\ufff0"'}
            )
            if response.status_code == 200:
                data = response.json()
                count = len(data.get('rows', []))
                logger.info(f"   {table}: {count} documents dans CouchDB")
                
                # Afficher un exemple
                if count > 0:
                    doc_id = data['rows'][0]['id']
                    doc = couchdb.get_doc(db_name, doc_id)
                    if doc:
                        logger.info(f"   Exemple {table}:")
                        for key, value in doc.items():
                            if not key.startswith('_'):
                                logger.info(f"      {key}: {value}")
    
    except Exception as e:
        logger.error(f"❌ Erreur vérification: {e}")


def main():
    """Point d'entrée principal"""
    # Vérifier les dépendances
    try:
        import requests
    except ImportError:
        logger.error("❌ Module 'requests' manquant. Installez-le avec: pip install requests")
        sys.exit(1)
    
    # Créer le client CouchDB
    couchdb = CouchDBClient(COUCHDB_URL, COUCHDB_USER, COUCHDB_PASSWORD)
    
    # Vérifier la connexion CouchDB
    try:
        response = requests.get(COUCHDB_URL, auth=(COUCHDB_USER, COUCHDB_PASSWORD))
        if response.status_code != 200:
            logger.error("❌ Impossible de se connecter à CouchDB")
            sys.exit(1)
        logger.info(f"✅ Connecté à CouchDB v{response.json().get('version')}")
    except Exception as e:
        logger.error(f"❌ Erreur connexion CouchDB: {e}")
        sys.exit(1)
    
    # Lancer la migration
    migrator = SQLiteToCouchDBMigrator(SQLITE_DB_PATH, couchdb)
    stats = migrator.run('marki')
    
    # Vérification
    verify_migration(couchdb, 'marki')
    
    # Sauvegarder les stats
    with open('migration_stats.json', 'w') as f:
        json.dump(stats, f, indent=2)
    logger.info("\n💾 Stats sauvegardées dans migration_stats.json")
    
    # Code de retour
    sys.exit(0 if stats.get('total_errors', 0) == 0 else 1)


if __name__ == "__main__":
    main()
