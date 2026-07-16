# relances_validation/index.html - Spécification Template

## Description

Template de la validation des relances.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/relances-validation.html` pour la structure complète.

## Structure

```html
<!-- templates/relances_validation/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Validation Relances' %}
{% set active_page = 'relances-validation' %}

{% block content %}
<div x-data="relancesValidation" x-init="init()">
    
    <!-- Liste des relances à valider -->
    
    <!-- Filtres: tous/email/today -->
    
    <!-- Actions: valider, supprimer, blacklister -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'relances_validation/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial
- `filter-all.md` - Tous
- `filter-email.md` - Email
- `filter-today.md` - Aujourd'hui
- `select-relance.md` - Sélectionner
- `valider-relance.md` - Valider
- `supprimer-relance.md` - Supprimer
- `blacklister-relance.md` - Blacklister

## Mockups de Référence

- `mockups/relances-validation.html`
