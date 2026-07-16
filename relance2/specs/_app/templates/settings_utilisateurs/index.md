# settings_utilisateurs/index.html - Spécification Template

## Description

Template de la page des paramètres des utilisateurs.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------.

## Template HTML

Voir `mockups/settings-utilisateurs.html` pour la structure complète.

## Structure

```html
<!-- templates/settings_utilisateurs/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Utilisateurs' %}
{% set active_page = 'settings' %}

{% block content %}
<div x-data="settingsUtilisateurs" x-init="init()">
    
    <!-- Liste des utilisateurs -->
    
    <!-- Actions: ajouter, modifier -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'settings_utilisateurs/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial
- `open-add-user.md` - Ouvrir formulaire d'ajout
- `edit-user.md` - Modifier
- `update-user.md` - Mettre à jour

## Mockups de Référence

- `mockups/settings-utilisateurs.html`
