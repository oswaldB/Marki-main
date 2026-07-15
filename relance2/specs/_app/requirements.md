# requirements.txt - Dépendances Python

**Fichier** : `app/requirements.txt`

## Liste des dépendances

```
flask>=2.3.0
bcrypt>=4.0.0
PyJWT>=2.8.0
```

## Description

| Package | Version | Usage |
|---------|---------|-------|
| flask | >=2.3.0 | Framework web |
| bcrypt | >=4.0.0 | Hashage des mots de passe |
| PyJWT | >=2.8.0 | Gestion des tokens JWT |

## Installation

```bash
pip install -r requirements.txt
```

## Dépendances transitives

- Werkzeug
- Jinja2 (templates - optionnel pour static-first)
- click
- itsdangerous
- MarkupSafe
