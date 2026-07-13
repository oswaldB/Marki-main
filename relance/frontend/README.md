# Marki Frontend

## Architecture

- **Static pur** : HTML + Alpine.js + Tailwind CDN
- **Pas de build step** : fichiers servis tels quels
- **Composants** : Web Components + Alpine.js

## Structure

```
frontend/
├── components/
│   ├── sidebar-nav-dual.js          # Navigation sidebar
│   ├── utils.js                     # Fonctions utilitaires
│   ├── template-authenticated.html  # Template pages auth
│   └── template-portail.html        # Template portail
├── login/index.html                 # Page de connexion
├── dashboard/index.html             # Tableau de bord
├── contacts/index.html              # Liste contacts
├── impayes/index.html               # Liste impayés
├── impayes-detail/index.html        # Détail impayé (?id=)
├── impayes-payeur/index.html        # Impayés par payeur (?id=)
├── impayes-suspendus/index.html     # Impayés suspendus
├── relances/index.html              # Liste relances
├── relances-calendrier/index.html   # Calendrier
├── relances-validation/index.html   # Validation
├── sequences/index.html             # Liste séquences
├── sequences-relance-detail/        # Détail relance (?id=)
├── sequences-suivi-detail/          # Détail suivi (?id=)
├── settings-smtp/index.html         # Profils SMTP
├── settings-smtp-detail/index.html    # Détail SMTP (?id=)
├── settings-utilisateurs/index.html # Gestion utilisateurs
├── evenements/index.html            # Journal événements
├── smart-marki/index.html           # Assistant IA
├── portail-client/index.html        # Portail client (?token=)
└── portail-mission/index.html       # Portail mission (?token=)
```

## Template de base (page authentifiée)

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Ma Page | Marki</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdn.tailwindcss.com"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <script src="../components/sidebar-nav-dual.js"></script>
  <script src="../components/utils.js"></script>
  <style>html { font-family: 'Inter', system-ui, sans-serif; }[x-cloak]{display:none!important;}</style>
</head>
<body x-data="pageData()" x-init="init()">
  
  <sidebar-nav-dual page="dashboard"></sidebar-nav-dual>
  
  <div class="md:ml-[72px] min-h-screen bg-slate-50">
    <main class="p-6">
      <!-- Votre contenu -->
    </main>
  </div>

  <script>
    function pageData() {
      return {
        loading: false,
        error: null,
        init() { this.checkAuth(); this.loadData(); },
        checkAuth() { if (!localStorage.getItem('marki_token')) window.location.href = '../login/'; },
        async loadData() { /* ... */ }
      }
    }
  </script>
</body>
</html>
```

## Utilitaires disponibles

- `formatMoney(amount)` → "1 234,56 €"
- `formatNumber(num)` → "1 234"
- `formatDate(date)` → "15/01/2024"
- `formatRelativeDate(date)` → "Il y a 2 heures"
- `getInitials(name)` → "JD"
- `copyToClipboard(text)` → Promise<boolean>
- `getUrlParam('id')` → valeur ou null
