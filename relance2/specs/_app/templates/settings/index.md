# settings/index.html - Spécification Template

## Description

Template de la page des paramètres.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page (défaut: "Paramètres") |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

## Structure

```html
<!-- templates/settings/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Paramètres' %}
{% set active_page = 'settings' %}

{% block content %}
<div x-data="settings" x-init="init()">
    
    <!-- Menu des paramètres -->
    
    <!-- Liens: Utilisateurs, SMTP, etc. -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'settings/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial

## Mockups de Référence

- (Pas de mockup spécifique, navigation vers sous-pages)
