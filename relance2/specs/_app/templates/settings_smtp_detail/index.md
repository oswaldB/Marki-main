# settings_smtp_detail/index.html - Spécification Template

## Description

Template du détail d'un profil SMTP.

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page |
| `active_page` | string | Identifiant de la page active pour la sidebar |

## Template HTML

Voir `mockups/settings-smtp-detail.html` pour la structure complète.

## Structure

```html
<!-- templates/settings_smtp_detail/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Détail Profil SMTP' %}
{% set active_page = 'settings' %}

{% block content %}
<div x-data="settingsSmtpDetail" x-init="init()">
    
    <!-- Formulaire du profil -->
    
    <!-- Actions: sauvegarder, tester, toggle password -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'settings_smtp_detail/alpinejs.html' %}
{% endblock %}
```

## Workflows Utilisés

- `initial-load.md` - Chargement initial
- `save-changes.md` - Sauvegarder
- `tester-connexion.md` - Tester
- `toggle-password.md` - Toggle affichage mot de passe

## Mockups de Référence

- `mockups/settings-smtp-detail.html`
