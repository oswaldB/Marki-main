# Layout App (Standard) - Spécifications

## Description

Layout principal de l'application Marki avec navigation "dual" (rail + menu détaillé).
Utilisé par toutes les pages d'administration internes.

## Structure Visuelle

```
┌─────────────────────────────────────────────────────────────┐
│ ████ │ ┌─────────────────────────────────────────────────┐ │
│ RE   │ │ Header (titre + actions)                          │ │
│ TM   │ └─────────────────────────────────────────────────┘ │
│ CP   │                                                     │
│ RT   │  Contenu principal de la page                     │
│ CT   │                                                     │
│ AO   │                                                     │
│ PC   │                                                     │
│      │                                                     │
│ 🚪   │                                                     │
└──────┴─────────────────────────────────────────────────────┘

Légende:
████ = Rail d'applications (64px)
RE/TM/... = Icônes des applications Marki
     = Menu détaillé (220px) - dépliable par section
```

## Dimensions

| Élément | Largeur | Description |
|---------|---------|-------------|
| **Rail** | 64px | Colonne fixe avec icônes des apps |
| **Menu** | 220px | Navigation détaillée de l'app active |
| **Contenu** | `calc(100% - 284px)` | Zone principale décalée de 284px |

## Composant Sidebar

**Fichier**: `static/components/sidebar-nav-dual.js` (servi à `/static/components/sidebar-nav-dual.js`)

### Rail d'Applications (64px)

```javascript
const apps = [
  { id: 'relance', label: 'Relance', abbr: 'RE', color: 'sky-500' },
  { id: 'tantiem', label: 'Tantiem Manager', abbr: 'TM', color: 'emerald-500' },
  { id: 'commande', label: 'Commande plus', abbr: 'CP', color: 'violet-500' },
  { id: 'regie', label: 'Régie totale', abbr: 'RT', color: 'amber-500' },
  { id: 'commissions', label: 'Commissions transparentes', abbr: 'CT', color: 'orange-500' },
  { id: 'agenda-optimise', label: 'Agenda optimisé', abbr: 'AO', color: 'cyan-500' },
  { id: 'portail', label: 'Portail client', abbr: 'PC', color: 'indigo-500' }
];
```

### Menu Détaillé - App "Relance"

```javascript
const relanceMenu = {
  header: { icon: 'RE', label: 'Relance', color: 'sky' },
  sections: [
    {
      id: 'tableau-de-bord',
      label: 'Tableau de bord',
      icon: 'fa-home',
      href: '/dashboard'
    },
    {
      id: 'impayes',
      label: 'Impayés',
      icon: 'fa-file-invoice-dollar',
      expandable: true,
      items: [
        { id: 'impayes', label: 'Tous les impayés', href: '/impayes' },
        { id: 'impayes-payeur', label: 'Par payeur', href: '/impayes-payeur' },
        { id: 'impayes-suspendus', label: 'Suspendus', href: '/impayes-suspendus' }
      ]
    },
    {
      id: 'relances',
      label: 'Relances',
      icon: 'fa-envelope',
      expandable: true,
      items: [
        { id: 'relances-liste', label: 'Liste des relances', href: '/relances' },
        { id: 'relances-calendrier', label: 'Calendrier', href: '/relances-calendrier' },
        { id: 'relances-validation', label: 'Validation', href: '/relances-validation' }
      ]
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: 'fa-address-book',
      href: '/contacts'
    },
    {
      id: 'sequences',
      label: 'Séquences',
      icon: 'fa-stream',
      href: '/sequences'
    },
    {
      id: 'evenements',
      label: 'Événements',
      icon: 'fa-bell',
      href: '/evenements',
      badge: '3' // Nombre de non-lus
    },
    {
      id: 'smart-marki',
      label: 'Smart Marki',
      icon: 'fa-brain',
      href: '/smart-marki',
      badge: 'IA'
    }
  ],
  footer: [
    { id: 'settings', label: 'Paramètres', icon: 'fa-cog', href: '/settings' }
  ]
};
```

## HTML Structure

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

  <!-- Sidebar Navigation Dual -->
  <sidebar-nav-dual page="{{ active_page }}"></sidebar-nav-dual>

  <!-- Main Content -->
  <div class="ml-[284px] min-h-screen">
    
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
| `page_title` | string | Titre affiché dans l'onglet et le header |
| `active_page` | string | ID de la page active pour la sidebar (ex: 'impayes', 'relances-liste') |
| `header_actions` | html (optionnel) | Breadcrumb ou actions dans le header gauche |
| `header_right` | html (optionnel) | Boutons/actions à droite du header |
| `content` | html | Contenu principal de la page |
| `page_scripts` | html | Scripts spécifiques (inclure alpinejs.html) |

## Détection Active Page

Le composant détecte automatiquement la page active via :

```javascript
// Attribut "page" passé au composant
<sidebar-nav-dual page="impayes"></sidebar-nav-dual>

// Ou détection URL côté client
isActive(page) {
  if (page === this.current) return true;
  if (page === 'impayes' && this.url.includes('impayes')) return true;
  if (page === 'relances-liste' && this.url.includes('relances.html')) return true;
  // etc.
}
```

## Comportement Interactif

### Sections Dépliables

```javascript
// Sections avec sous-menus (impayés, relances)
toggle(section) {
  this.expanded[section] = !this.expanded[section];
}

// Auto-expand si URL match
if (this.url.includes('impayes')) this.expanded.impayes = true;
if (this.url.includes('relances')) this.expanded.relances = true;
```

### Switch Application

```javascript
switchApp(rail) {
  this.activeRail = rail;
  // Redirection optionnelle vers la home de l'app
}
```

## Pages Utilisant ce Layout

| Page | `active_page` | Section dépliée |
|------|---------------|-----------------|
| `/dashboard` | `dashboard` | - |
| `/impayes` | `impayes` | ✅ Impayés |
| `/impayes/{id}` | `impayes` | ✅ Impayés |
| `/impayes-payeur` | `impayes-payeur` | ✅ Impayés |
| `/impayes-suspendus` | `impayes-suspendus` | ✅ Impayés |
| `/relances` | `relances-liste` | ✅ Relances |
| `/relances-calendrier` | `relances-calendrier` | ✅ Relances |
| `/relances-validation` | `relances-validation` | ✅ Relances |
| `/contacts` | `contacts` | - |
| `/sequences` | `sequences` | - |
| `/evenements` | `evenements` | Badge "3" |
| `/smart-marki` | `smart-marki` | Badge "IA" |
| `/settings` | `settings` | Footer |

## Responsive

### Desktop (>1024px)
- Sidebar complète : 64px + 220px = 284px
- Contenu décalé de 284px

### Tablet (768px - 1024px)
- Menu détaillé masquable
- Rail visible toujours

### Mobile (<768px)
- Sidebar complètement masquée
- Bouton hamburger pour ouvrir
- Overlay sombre en arrière-plan

## CSS Spécifique

```css
/* Décalage contenu principal */
.ml-\[284px\] {
  margin-left: 284px;
}

/* Header sticky sous la sidebar */
header {
  position: sticky;
  top: 0;
  z-index: 40; /* En dessous de la sidebar (z-[100]) */
}

/* Sidebar fixe */
aside {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
}
```

## Exemple Complet

```html
<!-- templates/impayes/index.html -->
{% extends 'layouts/layout_app.html' %}

{% set page_title = 'Impayés' %}
{% set active_page = 'impayes' %}

{% block header_right %}
<button @click="syncData()" class="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
  <i class="fas fa-sync"></i>
  <span>Synchroniser</span>
</button>
{% endblock %}

{% block content %}
<div x-data="impayes" x-init="init()">
  <!-- Contenu de la page -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'impayes/alpinejs.html' %}
{% endblock %}
```

## Notes

- Le composant `sidebar-nav-dual` est un Web Component (Custom Element)
- Il inclut son propre état Alpine.js interne pour la navigation
- Les badges s'affichent automatiquement (nombre d'événements, etc.)
- La déconnexion est toujours visible en bas du rail
