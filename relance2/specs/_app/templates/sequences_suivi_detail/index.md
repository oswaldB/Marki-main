# sequences_suivi_detail/index.html - Spécification Template

## Description

Template du détail d'une séquence de suivi.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/sequences-suivi-detail.html` pour la structure complète.

## Structure

```html
<!-- templates/sequences_suivi_detail/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Détail Séquence Suivi' %}
{% set active_page = 'sequences' %}

{% block content %}
<div x-data="sequencesSuiviDetail" x-init="init()">
    
    <!-- Configuration de la séquence -->
    
    <!-- Fréquence -->
    
    <!-- Liste des étapes -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'sequences_suivi_detail/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial
- `set-frequence-*.md` - Définir la fréquence
- `select-jour-semaine.md` - Sélection jour de la semaine
- `select-jour-mois.md` - Sélection jour du mois
- `select-heure.md` - Sélection heure
- `ajouter-email.md` - Ajouter un email
- `supprimer-email.md` - Supprimer un email
- `sauvegarder.md` - Sauvegarder

## Mockups de Référence

- `mockups/sequences-suivi-detail.html`
