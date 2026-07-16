# sequences_relance_detail/index.html - Spécification Template

## Description

Template du détail d'une séquence de relance.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/sequences-relance-detail.html` pour la structure complète.

## Structure

```html
<!-- templates/sequences_relance_detail/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Détail Séquence Relance' %}
{% set active_page = 'sequences' %}

{% block content %}
<div x-data="sequencesRelanceDetail" x-init="init()">
    
    <!-- Configuration de la séquence -->
    
    <!-- Liste des étapes -->
    
    <!-- Actions: ajouter, supprimer -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'sequences_relance_detail/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial
- `select-scenario-*.md` - Sélection du scénario
- `toggle-validation.md` - Toggle validation
- `toggle-publication.md` - Toggle publication
- `ajouter-email.md` - Ajouter un email
- `supprimer-email.md` - Supprimer un email
- `sauvegarder.md` - Sauvegarder

## Mockups de Référence

- `mockups/sequences-relance-detail.html`
