# relances/index.html - Spécification Template

## Description

Template de la page des relances.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page (défaut: "Relances") |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/relances.html` pour la structure complète.
n## Structure

```html
<!-- templates/relances/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Relances'
{% set active_page = 'relances' %}

{% block content %}
<div x-data="relances" x-init="init()">
    
    <!-- Table des relances -->
    
    <!-- Actions: nouvelle, modifier, annuler -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'relances/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial
- `new-relance.md` - Nouvelle relance
- `view-relance.md` - Voir une relance
- `edit-relance.md` - Modifier une relance
- `cancel-relance.md` - Annuler une relance

## Mockups de Référence

- `mockups/relances.html`
