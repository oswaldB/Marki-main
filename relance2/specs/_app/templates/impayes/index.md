# impayes/index.html - Spécification Template

## Description

Template de la page des impayés.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page (défaut: "Impayés") |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/impayes.html` pour la structure complète.

## Structure

```html
<!-- templates/impayes/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Impayés' %}
{% set active_page = 'impayes' %}

{% block content %}
<div x-data="impayes" x-init="init()">
    <!-- Filtres -->
    <!-- Table -->
    <!-- Pagination -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'impayes/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial des impayés
- `sync-data.md` - Synchronisation des données
- `sort-by-*.md` - Tri du tableau
- `pagination-next.md` - Pagination
- `pagination-prev.md` - Pagination
- `open-detail.md` - Ouverture du détail
- `suspend-facture.md` - Suspendre une facture

## Mockups de Référence

- `mockups/impayes.html`
