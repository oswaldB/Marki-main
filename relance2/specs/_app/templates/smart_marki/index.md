# smart_marki/index.html - Spécification Template

## Description

Template de la page Smart Marki (insights IA).

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page (défaut: "Smart Marki") |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/smart-marki.html` pour la structure complète.

## Structure

```html
<!-- templates/smart_marki/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Smart Marki' %}
{% set active_page = 'smart-marki' %}

{% block content %}
<div x-data="smartMarki" x-init="init()">
    
    <!-- Stats cards -->
    
    <!-- Liste des insights -->
    
    <!-- Modal de détail -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'smart_marki/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial
- `open-insight.md` - Ouvrir un insight
- `close-insight.md` - Fermer
- `apply-insight.md` - Appliquer
- `dismiss-insight.md` - Ignorer
- `mark-all-read.md` - Tout marquer comme lu

## Mockups de Référence

- `mockups/smart-marki.html`
