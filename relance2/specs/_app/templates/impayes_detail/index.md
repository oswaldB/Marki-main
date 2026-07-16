# impayes_detail/index.html - Spécification Template

## Description

Template du détail d'un impayé.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/impayes-detail.html` pour la structure complète.

## Structure

```html
<!-- templates/impayes_detail/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Détail Impayé' %}
{% set active_page = 'impayes' %}

{% block content %}
<div x-data="impayesDetail" x-init="init()">
    <!-- Détails de la facture -->
    <!-- Actions: suspendre, voir PDF -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'impayes_detail/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement du détail
- `open-pdf.md` - Ouvrir le PDF
- `suspend-facture.md` - Suspendre la facture

## Mockups de Référence

- `mockups/impayes-detail.html`
