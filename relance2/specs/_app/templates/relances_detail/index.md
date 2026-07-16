# relances_detail/index.html - Spécification Template

## Description

Template du détail d'une relance.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/relances-detail.html` pour la structure complète.

## Structure

```html
<!-- templates/relances_detail/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Détail Relance' %}
{% set active_page = 'relances' %}

{% block content %}
<div x-data="relancesDetail" x-init="init()">
    
    <!-- Détails de la relance -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'relances_detail/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement du détail

## Mockups de Référence

- `mockups/relances-detail.html`
