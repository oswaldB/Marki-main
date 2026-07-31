#!/usr/bin/env python3
"""Data Mapping - Génère schema.sql et types depuis marki.db."""

import shutil
import sqlite3
import sys
from pathlib import Path


def data_mapping(project_dir: Path = None) -> tuple[bool, str]:
    """Génère schema.sql et types TypeScript depuis marki.db.
    
    Returns:
        (success, message)
    """
    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)
    
    api_dir = project_dir / "app" / "api"
    db_dir = api_dir / "db"
    db_path = db_dir / "marki.db"
    
    # Créer le dossier db si nécessaire
    db_dir.mkdir(parents=True, exist_ok=True)
    
    # Copier marki.db si nécessaire
    if not db_path.exists():
        root_db = project_dir / "marki.db"
        if root_db.exists():
            shutil.copy2(root_db, db_path)
            print(f"    ✅ marki.db copié")
        else:
            return False, "marki.db non trouvé"
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Récupérer les tables
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        tables = [row[0] for row in cursor.fetchall()]
        
        # Générer schema.sql
        schema_sql = "-- Schéma généré depuis marki.db\n\n"
        
        for table in tables:
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            
            schema_sql += f"CREATE TABLE IF NOT EXISTS {table} (\n"
            col_defs = []
            for col in columns:
                cid, name, type_, notnull, dflt_value, pk = col
                col_def = f"    {name} {type_}"
                if pk:
                    col_def += " PRIMARY KEY"
                if notnull:
                    col_def += " NOT NULL"
                col_defs.append(col_def)
            schema_sql += ",\n".join(col_defs)
            schema_sql += "\n);\n\n"
        
        (db_dir / "schema.sql").write_text(schema_sql)
        
        # Générer types TypeScript
        ts_types = "// Types générés depuis marki.db\n\n"
        ts_types += "import { Database } from 'bun:sqlite';\n\n"
        ts_types += "let db: Database | null = null;\n\n"
        ts_types += "export function getDB(): Database {\n"
        ts_types += "  if (!db) { db = new Database('" + str(db_path) + "'); }\n"
        ts_types += "  return db;\n}\n\n"
        
        for table in tables:
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            
            # Nom de l'interface: snake_case -> PascalCase
            interface_name = table.replace('_', ' ').title().replace(' ', '')
            
            ts_types += f"export interface {interface_name} {{\n"
            for col in columns:
                cid, name, type_, notnull, dflt_value, pk = col
                
                # Mapping SQLite -> TypeScript
                if "INTEGER" in type_ or "REAL" in type_:
                    ts_type = "number"
                elif "BOOLEAN" in type_:
                    ts_type = "boolean"
                else:
                    ts_type = "string"
                
                optional = "" if notnull or pk else "?"
                ts_types += f"  {name}{optional}: {ts_type};\n"
            
            ts_types += "}\n\n"
        
        (db_dir / "index.ts").write_text(ts_types)
        
        conn.close()
        return True, f"Schéma généré: {len(tables)} tables"
        
    except Exception as e:
        return False, str(e)


if __name__ == "__main__":
    project_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    
    success, msg = data_mapping(project_dir)
    
    if success:
        print(f"✅ {msg}")
        sys.exit(0)
    else:
        print(f"❌ {msg}")
        sys.exit(1)
