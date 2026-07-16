# Layouts - Documentation

## Overview

Les layouts définissent la structure visuelle commune aux pages de l'application Marki.
Ils utilisent le système de templating Jinja2 et Tailwind CSS.

## Layouts Disponibles

### 1. Layout App Standard (`layout_app.md`)

**Usage**: Pages d'administration internes avec navigation dual (rail + menu)

```
Pages concernées:
├── dashboard
├── impayes/*
├── relances/*
├── contacts
├── sequences/*
├── evenements
├── smart-marki
└── settings/*
```

**Caractéristiques**:
- ✅ Sidebar dual (64px rail + 220px menu)
- ✅ Navigation par application (Relance, Tantiem, etc.)
- ❌ Pas de footer
- Authentification JWT classique

**Composant**: `sidebar-nav-dual.js`

### 2. Layout Portail (`layout_portail.md`)

**Usage**: Pages d'accès externe pour clients

```
Pages concernées:
├── portail-client
└── portail-mission
```

**Caractéristiques**:
- ❌ Pas de sidebar
- ✅ Navigation minimale (logo + déconnexion)
- ✅ Footer avec copyright
- Authentification par token URL

## Structure des Layouts

```
app/templates/layouts/
├── base.html              # Template de base commun
├── layout_standard.html   # Avec sidebar
└── layout_portail.html    # Sans sidebar (portails)
```

## Utilisation dans une Page

### Layout Standard

```html
{% extends 'layouts/layout_standard.html' %}

{% set page_title = 'Mes Impayés' %}
{% set active_page = 'impayes' %}

{% block content %}
<!-- Contenu de la page -->
{% endblock %}

{% block page_scripts %}
{% include 'impayes/alpinejs.html' %}
{% endblock %}
```

### Layout Portail

```html
{% extends 'layouts/layout_portail.html' %}

{% set page_title = 'Mon Espace' %}
{% set portail_nom = 'Portail Client' %}
{% set portail_sous_titre = 'Espace payeur' %}

{% block content %}
<!-- Contenu du portail -->
{% endblock %}

{% block page_scripts %}
{% include 'portail_client/alpinejs.html' %}
{% endblock %}
```

## Variables Communes

Tous les layouts supportent ces variables:

| Variable | Description |
|----------|-------------|
| `page_title` | Titre de la page (onglet + header) |
| `content` | Contenu principal |
| `page_scripts` | Scripts Alpine.js spécifiques |

## CSS Commun

```css
/* Tailwind + Custom */
html { font-family: 'Inter', system-ui, sans-serif; }
[x-cloak] { display: none !important; }

/* Couleurs Marki */
--color-primary: #0ea5e9;      /* sky-500 */
--color-secondary: #64748b;    /* slate-500 */
--color-background: #f8fafc;   /* slate-50 */
```

## Responsive

| Breakpoint | Layout Standard | Layout Portail |
|------------|-----------------|----------------|
| Mobile | Sidebar cachée, menu hamburger | Navigation compacte |
| Desktop | Sidebar visible (284px) | Navigation complète |

## Notes

- Les layouts sont indépendants des workflows Alpine.js
- Chaque page inclut son propre `alpinejs.html` via `page_scripts`
- Les composants réutilisables sont dans `components/` (sidebar, etc.)
