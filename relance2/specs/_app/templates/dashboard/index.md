# dashboard/index.html - Spécification Template

## Description

Template du tableau de bord.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page (défaut: "Tableau de bord") |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/dashboard.html` pour la structure complète.

## Structure

```html
<!-- templates/dashboard/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Tableau de bord' %}
{% set active_page = 'dashboard' %}

{% block content %}
<div x-data="dashboard" x-init="init()">
    <!-- Stats cards -->
    <!-- Events section -->
    <!-- View toggle (card/list) -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'dashboard/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial des données
- `sync-data.md` - Synchronisation
- `clear-events.md` - Vider les notifications
- `switch-view-card.md` - Vue carte
- `switch-view-list.md` - Vue liste

## Mockups de Référence

- `mockups/dashboard.html`
