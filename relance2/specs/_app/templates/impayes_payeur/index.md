# impayes_payeur/index.html - Spécification Template

## Description

Template des impayés par payeur.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/impayes-payeur.html` pour la structure complète.

## Structure

```html
<!-- templates/impayes_payeur/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Impayés par Payeur' %}
{% set active_page = 'impayes' %}

{% block content %}
<div x-data="impayesPayeur" x-init="init()">
    <!-- Liste des impayés du payeur -->
    <!-- Pagination -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'impayes_payeur/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial
- `open-detail.md` - Ouvrir le détail
- `pagination-next.md` - Page suivante
- `pagination-prev.md` - Page précédente

## Mockups de Référence

- `mockups/impayes-payeur.html`
