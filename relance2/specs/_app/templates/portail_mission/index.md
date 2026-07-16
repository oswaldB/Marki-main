# portail_mission/index.html - Spécification Template

## Description

Template du portail mission.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page |
| `portail_nom` | string | Nom du portail (ex: "Portail Mission") |
| `portail_sous_titre` | string | Sous-titre (ex: "Espace courtier") |

## Template HTML

Voir `mockups/portail-mission.html` pour la structure complète.

## Structure

```html
<!-- templates/portail_mission/index.html -->
{% extends 'layouts/layout_portail.html' %}

{% set page_title = 'Mission' %}
{% set portail_nom = 'Portail Mission' %}
{% set portail_sous_titre = 'Espace courtier' %}

{% block content %}
<div x-data="portailMission" x-init="init()">
    
    <!-- Informations de la mission -->
    
    <!-- Actions: télécharger facture -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'portail_mission/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial
- `download-facture.md` - Télécharger une facture
- `regler-facture.md` - Régler une facture
- `logout.md` - Déconnexion

## Mockups de Référence

- `mockups/portail-mission.html`
