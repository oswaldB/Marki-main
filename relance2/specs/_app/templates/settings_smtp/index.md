# settings_smtp/index.html - Spécification Template

## Description

Template de la page des paramètres SMTP.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/settings-smtp.html` pour la structure complète.

## Structure

```html
<!-- templates/settings_smtp/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Paramètres SMTP' %}
{% set active_page = 'settings' %}

{% block content %}
<div x-data="settingsSmtp" x-init="init()">
    
    <!-- Liste des profils SMTP -->
    
    <!-- Actions: ajouter, modifier, supprimer, tester -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'settings_smtp/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial
- `new-profil.md` - Nouveau profil
- `edit-profil.md` - Modifier
- `delete-profil.md` - Supprimer
- `test-profil.md` - Tester

## Mockups de Référence

- `mockups/settings-smtp.html`
