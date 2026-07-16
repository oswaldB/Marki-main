# contacts/index.html - Spécification Template

## Description

Template de la page des contacts.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page (défaut: "Contacts") |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/contacts.html` pour la structure complète.

## Structure

```html
<!-- templates/contacts/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Contacts' %}
{% set active_page = 'contacts' %}

{% block content %}
<div x-data="contacts" x-init="init()">
    <!-- Table des contacts -->
    <!-- Actions: toggle-blacklist -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'contacts/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial des contacts
- `toggle-blacklist.md` - Toggle blacklist d'un contact

## Mockups de Référence

- `mockups/contacts.html`
