# relances_calendrier/index.html - Spécification Template

## Description

Template du calendrier des relances.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/relances-calendrier.html` pour la structure complète.

## Structure

```html
<!-- templates/relances_calendrier/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Calendrier Relances' %}
{% set active_page = 'relances-calendrier' %}

{% block content %}
<div x-data="relancesCalendrier" x-init="init()">
    
    <!-- Navigation calendrier -->
    
    <!-- Vue mois / semaine -->
    
    <!-- Modal d'édition -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'relances_calendrier/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial
- `previous-period.md` - Période précédente
- `next-period.md` - Période suivante
- `go-today.md` - Aller à aujourd'hui
- `switch-view-month.md` - Vue mois
- `switch-view-week.md` - Vue semaine
- `open-edit-relance.md` - Ouvrir l'édition
- `save-edit.md` - Sauvegarder

## Mockups de Référence

- `mockups/relances-calendrier.html`
