# db.py - Helper SQLite

**Fichier** : `app/db.py`  
**Type** : Module utilitaire

## Description

Helper simple pour la gestion de la base de données SQLite. Pas d'ORM, juste des fonctions utilitaires.

## Fonctions principales

### `get_db()`

Retourne une connexion à la base de données SQLite.

```python
def get_db():
    """Get database connection."""
    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
    return g.db
```

### `close_db(e=None)`

Ferme la connexion à la fin de la requête.

```python
def close_db(e=None):
    """Close database connection."""
    db = g.pop('db', None)
    if db is not None:
        db.close()
```

### `init_db()`

Initialise la base avec le schéma.

```python
def init_db():
    """Initialize database from schema.sql"""
    db = get_db()
    with current_app.open_resource('schema.sql') as f:
        db.executescript(f.read().decode('utf8'))
```

## Utilisation

```python
from db import get_db, close_db

# Dans une route
db = get_db()
cursor = db.execute("SELECT * FROM impayes WHERE id = ?", (id,))
result = cursor.fetchone()
```

## Schéma

Voir `data/schema.sql` pour la structure complète des tables.
