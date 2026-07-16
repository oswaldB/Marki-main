# portail_client/index.html - Spécification Template

## Description

Template du portail client.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page |
| `portail_nom` | string | Nom du portail (ex: "Portail Client") |
| `portail_sous_titre` | string | Sous-titre (ex: "Espace payeur") |

## Template HTML

Voir `mockups/portail-client.html` pour la structure complète.

## Structure

```html
<!-- templates/portail_client/index.html -->
{% extends 'layouts/layout_portail.html' %}

{% set page_title = 'Mon Espace' %}
{% set portail_nom = 'Portail Client' %}
{% set portail_sous_titre = 'Espace payeur' %}

{% block content %}
<div x-data="portailClient" x-init="init()">
    
    <!-- Informations client -->
    
    <!-- Liste des factures -->
    
    <!-- Actions: télécharger, payer -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'portail_client/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial
- `download-facture.md` - Télécharger une facture
- `regler-facture.md` - Régler une facture
- `switch-tab-factures.md` - Onglet factures
- `switch-tab-apporteur.md` - Onglet apporteur
- `logout.md` - Déconnexion

## Mockups de Référence

- `mockups/portail-client.html`
