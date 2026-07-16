# impayes_suspendus/index.html - Spécification Template

## Description

Template des impayés suspendus.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/impayes-suspendus.html` pour la structure complète.

## Structure

```html
<!-- templates/impayes_suspendus/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Impayés Suspendus' %}
{% set active_page = 'impayes' %}

{% block content %}
<div x-data="impayesSuspendus" x-init="init()">
    <!-- Liste des impayés suspendus -->
    <!-- Action: réactiver -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'impayes_suspendus/alpinejs.html' %}
{% endblock %>
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial
- `reactivate-impaye.md` - Réactiver un impayé

## Mockups de Référence

- `mockups/impayes-suspendus.html`
