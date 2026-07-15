# app.py - Point d'entrée Flask

**Fichier** : `app/app.py`  
**Type** : Application Factory

## Description

Point d'entrée principal de l'application Flask. Utilise le pattern Factory pour créer l'application avec toutes ses configurations et blueprints.

## Structure

```python
def create_app(test_config=None):
    """Application factory."""
    app = Flask(__name__, instance_relative_config=True)
    
    # Configuration
    # Enregistrement des blueprints
    # Teardown handlers
    
    return app
```

## Blueprints enregistrés

| Blueprint | Préfixe | Fichier |
|-----------|---------|---------|
| auth_bp | `/api/auth` | routes/auth.py |
| users_bp | `/api/users` | routes/users.py |
| contacts_bp | `/api/contacts` | routes/contacts.py |
| impayes_bp | `/api/impayes` | routes/impayes.py |
| relances_bp | `/api/relances` | routes/relances.py |
| sequences_bp | `/api/sequences` | routes/sequences.py |
| smtp_bp | `/api/smtp-profiles` | routes/smtp.py |
| portail_bp | `/api/portail` | routes/portail.py |
| tokens_bp | `/api/tokens` | routes/tokens.py |
| dashboard_bp | `/api/dashboard` | routes/dashboard.py |
| events_bp | `/api/events` | routes/events.py |
| cleanup_bp | `/api/cleanup` | routes/cleanup.py |
| import_bp | `/api/import` | routes/import_data.py |
| workflow_bp | `/api/workflow` | routes/workflow.py |
| pages_bp | `/` | routes/pages.py |

## Configuration

```python
app.config.from_mapping(
    SECRET_KEY=os.environ.get('SECRET_KEY', 'dev'),
    DATABASE=os.path.join(..., 'data', 'marki.db'),
    JWT_SECRET=os.environ.get('JWT_SECRET', 'votre-secret'),
)
```

## Dépendances

- Flask
- os (natif)
- db (module local)
