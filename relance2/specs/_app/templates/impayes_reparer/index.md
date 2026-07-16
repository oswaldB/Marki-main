# impayes_reparer/index.html - Spécification Template

## Description

Template des impayés à réparer.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/impayes-reparer.html` pour la structure complète.

## Structure

```html
<!-- templates/impayes_reparer/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Impayés à Réparer' %}
{% set active_page = 'impayes' %}

{% block content %}
<div x-data="impayesReparer" x-init="init()">
    <!-- Liste des impayés à réparer -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'impayes_reparer/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial
- `view-reparer.md` - Voir les détails à réparer

## Mockups de Référence

- `mockups/impayes-reparer.html`
