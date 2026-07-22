# Route : Page Login

## Description

Route principale affichant la page de connexion.

## Définition

| Aspect | Valeur |
|--------|--------|
| **Méthode** | GET |
| **URL** | `/login` |
| **Fichier** | `app/screens/login/routes/index.py` |

## Fonction

```python
from flask import render_template
from .. import bp

@bp.route('/', methods=['GET'])
def index():
    """Affiche la page de login."""
    return render_template('login.html')
```

## Template

Rend `templates/login.html` avec Alpine.js pour la réactivité.

## Props passées au template

Aucune - le formulaire est géré côté client avec Alpine.js.

## Navigation

| Action | Cible |
|--------|-------|
| Soumission formulaire | Redirection vers `/dashboard` (si auth OK) |

## Dépendances

- Template `login.html`
- Workflow frontend `auth-submit`
