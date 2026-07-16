# evenements/index.html - Spécification Template

## Description

Template de la page des événements.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page (défaut: "Événements") |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/evenements.html` pour la structure complète.

## Structure

```html
<!-- templates/evenements/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Événements' %}
{% set active_page = 'evenements' %}

{% block content %}
<div x-data="evenements" x-init="init()">
    <!-- Liste des événements -->
    <!-- Filtres (tous/non lus) -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'evenements/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial
- `filter-all.md` - Filtrer tous
- `filter-unread.md` - Filtrer non lus
- `mark-all-read.md` - Marquer tout comme lu

## Mockups de Référence

- `mockups/evenements.html`
