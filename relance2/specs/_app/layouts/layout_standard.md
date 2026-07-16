# Layout Standard - Spécifications

## Description

Layout principal pour l'application Marki avec la barre de navigation latérale (sidebar).
Utilisé par toutes les pages d'administration (dashboard, impayes, relances, settings, etc.).

## Structure du Layout

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ page_title }} | Marki</title>
    
    <!-- Styles -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.tailwindcss.com"></script>
    
    <style>
        html { font-family: 'Inter', system-ui, sans-serif; }
        [x-cloak] { display: none !important; }
    </style>
</head>
<body class="bg-slate-50">

    <!-- Sidebar Navigation -->
    <sidebar-nav-dual page="{{ active_page }}"></sidebar-nav-dual>

    <!-- Main Content Area -->
    <div class="md:ml-[284px] min-h-screen bg-slate-50">
        
        <!-- Header -->
        <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
            <div class="flex items-center gap-3">
                <h1 class="text-base font-semibold text-slate-700">{{ page_title }}</h1>
                {{ header_actions }}
            </div>
            {{ header_right }}
        </header>

        <!-- Page Content -->
        <main class="p-6">
            {{ content }}
        </main>
        
    </div>

    <!-- Scripts -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <script src="/static/components/sidebar-nav-dual.js"></script>
    {{ page_scripts }}

</body>
</html>
```

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page affiché dans le header et l'onglet |
| `active_page` | string | Identifiant de la page active pour la sidebar (ex: 'impayes', 'dashboard') |
| `header_actions` | html (optionnel) | Actions supplémentaires dans le header gauche |
| `header_right` | html (optionnel) | Contenu à droite du header (boutons, etc.) |
| `content` | html | Contenu principal de la page |
| `page_scripts` | html (optionnel) | Scripts spécifiques à la page (inclure alpinejs.html) |

## Composant Sidebar

**Fichier**: `components/sidebar-nav-dual.js`

Le composant gère :
- La navigation principale avec icônes
- L'état actif de la page courante
- Le sous-menu pour les paramètres
- Le responsive (mobile)

### Navigation Items

```javascript
[
  { id: 'dashboard', label: 'Tableau de bord', icon: 'fa-home', href: '/dashboard' },
  { id: 'impayes', label: 'Impayés', icon: 'fa-file-invoice-dollar', href: '/impayes' },
  { id: 'relances', label: 'Relances', icon: 'fa-envelope', href: '/relances' },
  { id: 'contacts', label: 'Contacts', icon: 'fa-address-book', href: '/contacts' },
  { id: 'sequences', label: 'Séquences', icon: 'fa-stream', href: '/sequences' },
  { id: 'evenements', label: 'Événements', icon: 'fa-bell', href: '/evenements' },
  { id: 'smart-marki', label: 'Smart Marki', icon: 'fa-brain', href: '/smart-marki' },
  { id: 'settings', label: 'Paramètres', icon: 'fa-cog', href: '/settings', submenu: true }
]
```

## Pages Utilisant ce Layout

- `/dashboard` - Tableau de bord
- `/impayes` - Liste des impayés
- `/impayes/{id}` - Détail d'un impayé
- `/relances` - Liste des relances
- `/relances/{id}` - Détail d'une relance
- `/contacts` - Liste des contacts
- `/sequences` - Séquences de relance
- `/sequences/{id}` - Détail d'une séquence
- `/evenements` - Événements
- `/smart-marki` - Insights IA
- `/settings/*` - Toutes les pages de paramètres

## CSS Spécifique

```css
/* Décalage pour la sidebar */
.md\:ml-\[284px\] {
    margin-left: 284px; /* Largeur fixe de la sidebar */
}

/* Header sticky sous la sidebar */
header {
    position: sticky;
    top: 0;
    z-index: 40;
}
```

## Responsive

- **Desktop (>768px)**: Sidebar visible, contenu décalé de 284px
- **Mobile (≤768px)**: Sidebar masquée (menu hamburger), contenu pleine largeur

## Exemple d'Utilisation dans une Page

```html
<!-- templates/impayes/index.html -->
{% extends 'layouts/layout_standard.html' %}

{% set page_title = 'Impayés' %}
{% set active_page = 'impayes' %}

{% block header_right %}
<button @click="syncData()" class="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
    <i class="fas fa-sync"></i>
    <span>Synchroniser</span>
</button>
{% endblock %}

{% block content %}
<!-- Contenu de la page impayés -->
{% endblock %}

{% block page_scripts %}
{% include 'impayes/alpinejs.html' %}
{% endblock %}
```

## Notes

- Le composant `sidebar-nav-dual` doit être chargé avant Alpine.js
- Toutes les pages utilisent le même décalage de 284px à gauche
- Le header est sticky pour rester visible lors du scroll
