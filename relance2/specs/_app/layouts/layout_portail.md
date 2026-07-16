# Layout Portail - Spécifications

## Description

Layout simplifié pour les portails clients (accès externe sans authentification complète).
Sans sidebar de navigation, avec une barre de navigation minimale en haut.
Utilisé par les portails mission et client.

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
<body class="bg-slate-50 min-h-screen">

    <!-- Navigation Simplifiée -->
    <nav class="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                
                <!-- Logo -->
                <div class="flex items-center">
                    <div class="flex-shrink-0 flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                            <i class="fas fa-building text-sky-600 text-xl"></i>
                        </div>
                        <div>
                            <span class="text-lg font-semibold text-slate-800">{{ portail_nom }}</span>
                            <p class="text-xs text-slate-500">{{ portail_sous_titre }}</p>
                        </div>
                    </div>
                </div>
                
                <!-- Actions droite -->
                <div class="flex items-center gap-4">
                    {{ nav_actions }}
                    
                    <!-- Bouton Déconnexion -->
                    <button @click="logout()" 
                            class="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <i class="fas fa-sign-out-alt"></i>
                        <span class="hidden sm:inline">Déconnexion</span>
                    </button>
                </div>
                
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {{ content }}
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-slate-200 mt-auto">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <p class="text-center text-sm text-slate-500">
                © {{ current_year }} Marki - Tous droits réservés
            </p>
        </div>
    </footer>

    <!-- Scripts -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    {{ page_scripts }}

</body>
</html>
```

## Variables Jinja2

| Variable | Type | Description |
|----------|------|-------------|
| `page_title` | string | Titre de la page |
| `portail_nom` | string | Nom affiché du portail (ex: "Portail Client") |
| `portail_sous_titre` | string | Sous-titre du portail (ex: "Espace payeur") |
| `nav_actions` | html (optionnel) | Actions additionnelles dans la nav (ex: lien téléchargement) |
| `content` | html | Contenu principal de la page |
| `current_year` | string | Année courante pour le copyright |
| `page_scripts` | html (optionnel) | Scripts spécifiques à la page |

## Différences avec Layout Standard

| Aspect | Layout Standard | Layout Portail |
|--------|-----------------|----------------|
| **Sidebar** | ✅ Oui (284px) | ❌ Non |
| **Navigation** | Complète avec sous-menus | Simplifiée (logo + déconnexion) |
| **Contenu** | Décalé à gauche | Centré (max-width: 7xl) |
| **Footer** | ❌ Non | ✅ Oui |
| **Déconnexion** | Dans la sidebar | Dans la nav du haut |
| **Authentification** | JWT token classique | Token via URL + localStorage |

## Pages Utilisant ce Layout

- `/portail-client?token={token}` - Portail client (accès payeur)
- `/portail-mission?token={token}` - Portail mission (accès courtier)

## Sécurité

- Token passé en paramètre URL
- Stockage dans localStorage: `client_token` ou `mission_token`
- Vérification du token à chaque chargement de page
- Redirection vers `/login` si token manquant ou invalide

## Exemple d'Utilisation - Portail Client

```html
<!-- templates/portail_client/index.html -->
{% extends 'layouts/layout_portail.html' %}

{% set page_title = 'Mon Espace' %}
{% set portail_nom = 'Portail Client' %}
{% set portail_sous_titre = 'Espace payeur' %}

{% block content %}
<div x-data="portailClient" x-init="init()">
    
    <!-- Loading -->
    <template x-if="loading">
        <div class="flex justify-center py-12">
            <i class="fas fa-spinner fa-spin text-slate-400 text-3xl"></i>
        </div>
    </template>
    
    <!-- Content -->
    <template x-if="!loading">
        <div class="space-y-6">
            
            <!-- En-tête client -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h2 class="text-xl font-semibold text-slate-800" x-text="client?.nom"></h2>
                <p class="text-slate-500" x-text="client?.email"></p>
            </div>
            
            <!-- Factures -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-100">
                    <h3 class="font-semibold text-slate-800">Mes factures</h3>
                </div>
                <table class="w-full text-sm">
                    <tbody class="divide-y divide-slate-100">
                        <template x-for="facture in factures" :key="facture.id">
                            <tr class="hover:bg-slate-50">
                                <td class="px-6 py-4" x-text="facture.numero"></td>
                                <td class="px-6 py-4 text-right" x-text="formatMoney(facture.montant)"></td>
                                <td class="px-6 py-4 text-right">
                                    <button @click="downloadFacture(facture.id)" class="text-sky-600 hover:text-sky-800">
                                        <i class="fas fa-download"></i>
                                    </button>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
            
        </div>
    </template>
    
</div>
{% endblock %}

{% block page_scripts %}
{% include 'portail_client/alpinejs.html' %}
{% endblock %}
```

## Exemple d'Utilisation - Portail Mission

```html
<!-- templates/portail_mission/index.html -->
{% extends 'layouts/layout_portail.html' %}

{% set page_title = 'Mission' %}
{% set portail_nom = 'Portail Mission' %}
{% set portail_sous_titre = 'Espace courtier' %}

{% block content %}
<div x-data="portailMission" x-init="init()">
    <!-- Contenu spécifique au portail mission -->
</div>
{% endblock %}

{% block page_scripts %}
{% include 'portail_mission/alpinejs.html' %}
{% endblock %}
```

## Workflow d'Initialisation

```javascript
// Dans workflow-init.html du portail
init: function() {
    log.info('PAGE_INIT', { page: 'portail_client' });
    
    // Récupérer le token de l'URL
    const urlParams = new URLSearchParams(window.location.search);
    this.token = urlParams.get('token') || localStorage.getItem('client_token');
    
    if (!this.token) {
        this.error = 'Token manquant';
        log.warn('AUTH_MISSING');
        // Redirection possible ici
        return;
    }
    
    // Sauvegarder pour les futures requêtes
    localStorage.setItem('client_token', this.token);
    
    // Charger les données
    this.initialLoad();
}
```

## Responsive

- **Container**: `max-w-7xl mx-auto` - contenu centré et limité en largeur
- **Padding**: `px-4 sm:px-6 lg:px-8` - padding adaptatif selon la taille d'écran
- **Navigation**: Actions masquées sur mobile (texte "Déconnexion" caché)

## Notes

- Pas de sidebar latérale (expérience simplifiée pour les utilisateurs externes)
- Footer présent (obligatoire pour les sites publics)
- Le token est toujours vérifié avant chaque appel API
- Design plus "light" que l'admin (moins d'informations denses)
