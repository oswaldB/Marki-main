# sequences/index.html - Spécification Template

## Description

Template de la page des séquences.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page (défaut: "Séquences") |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/sequences.html` pour la structure complète.

## Structure

```html
<!-- templates/sequences/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Séquences' %}
{% set active_page = 'sequences' %}

{% block content %}
<div x-data="sequences" x-init="init()">
    
    <!-- Liste des séquences -->
    
    <!-- Filtres: relance/suivi -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'sequences/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial
- `filter-relance.md` - Filtrer relances
- `filter-suivi.md` - Filtrer suivis
- `new-sequence.md` - Nouvelle séquence
- `create-sequence.md` - Créer
- `duplicate-sequence.md` - Dupliquer

## Mockups de Référence

- `mockups/sequences.html`
