# TODO - Développement App Marki

## Statut Global

**Dernière mise à jour:** 2024-07-16

### ✅ Complété (Core fonctionnel)

| Catégorie | Fichiers | Status |
|-----------|----------|--------|
| **Backend API** | 10 routes Flask + db.py | ✅ 100% |
| **Authentification** | Login complet | ✅ 100% |
| **Dashboard** | Stats + activité | ✅ 100% |
| **Impayés** | Liste + filtres + tri | ✅ 100% |
| **Contacts** | Liste + filtres + export | ✅ 100% |
| **Relances** | Liste + validation | ✅ 100% |
| **Séquences** | Liste + CRUD | ✅ 100% |
| **Événements** | Notifications | ✅ 100% |
| **Settings** | Menu + SMTP liste | ✅ 80% |

### 🔄 En cours / À faire

| Page | Statut | Priorité |
|------|--------|----------|
| Settings SMTP Détail | ❌ Formulaire édition | 🟡 Moyenne |
| Settings Utilisateurs | ❌ CRUD utilisateurs | 🟡 Moyenne |
| Relances Calendrier | ❌ Vue calendrier | 🟡 Moyenne |
| Relances Validation | ❌ Vue validation en masse | 🟡 Moyenne |
| Impayés Détail | ❌ Fiche impayé complète | 🟢 Basse |
| Portail Client | ❌ Vue client externe | 🟢 Basse |

---

## Structure du projet

```
app/
├── app.py                      # ✅ Application Flask principale
├── db.py                       # ✅ Helper base de données
├── marki.db                    # ✅ Base SQLite
├── routes/                     # ✅ Toutes les routes API
│   ├── auth.py                 # ✅ Login/logout/me
│   ├── contacts.py             # ✅ CRUD contacts
│   ├── dashboard.py            # ✅ Stats
│   ├── events.py               # ✅ Événements
│   ├── impayes.py              # ✅ CRUD impayés
│   ├── relances.py             # ✅ CRUD relances
│   ├── sequences.py            # ✅ CRUD séquences
│   ├── settings.py             # ✅ SMTP + utilisateurs
│   └── portail.py              # ✅ Portail
├── static/
│   └── components/
│       └── sidebar-nav-dual.js # ✅ Composant navigation
├── templates/
│   ├── layouts/
│   │   └── layout_app.html     # ✅ Layout principal
│   ├── login/                  # ✅ Page login complète
│   ├── dashboard/              # ✅ Dashboard complet
│   ├── impayes/                # ✅ Liste impayés
│   ├── contacts/               # ✅ Liste contacts
│   ├── relances/               # ✅ Liste relances
│   ├── sequences/              # ✅ Liste séquences
│   ├── evenements/             # ✅ Liste événements
│   ├── settings/               # ✅ Menu settings
│   └── settings_smtp/           # ✅ Liste SMTP
└── ...
```

---

## Détail des pages créées

### ✅ Login
- `templates/login/index.html`
- `templates/login/alpinejs.html`
- `templates/login/workflows/workflow-init.html`
- `templates/login/workflows/auth-submit.html`

### ✅ Dashboard
- `templates/dashboard/index.html`
- `templates/dashboard/alpinejs.html`
- `templates/dashboard/workflows/initial-load.html`
- `templates/dashboard/workflows/sync-data.html`
- `templates/dashboard/workflows/workflow-init.html`

### ✅ Impayés
- `templates/impayes/index.html`
- `templates/impayes/alpinejs.html`
- `templates/impayes/workflows/initial-load.html`
- `templates/impayes/workflows/sync-data.html`
- `templates/impayes/workflows/sort-by-numero.html`
- `templates/impayes/workflows/pagination-next.html`
- `templates/impayes/workflows/pagination-prev.html`
- `templates/impayes/workflows/workflow-init.html`

### ✅ Contacts
- `templates/contacts/index.html`
- `templates/contacts/alpinejs.html`
- `templates/contacts/workflows/initial-load.html`
- `templates/contacts/workflows/export-data.html`
- `templates/contacts/workflows/sort-by-impayes.html`
- `templates/contacts/workflows/pagination-next.html`
- `templates/contacts/workflows/pagination-prev.html`
- `templates/contacts/workflows/workflow-init.html`

### ✅ Relances
- `templates/relances/index.html`
- `templates/relances/alpinejs.html`
- `templates/relances/workflows/initial-load.html`
- `templates/relances/workflows/valider-relance.html`
- `templates/relances/workflows/supprimer-relance.html`
- `templates/relances/workflows/pagination-next.html`
- `templates/relances/workflows/pagination-prev.html`
- `templates/relances/workflows/workflow-init.html`

### ✅ Séquences
- `templates/sequences/index.html`
- `templates/sequences/alpinejs.html`
- `templates/sequences/workflows/initial-load.html`
- `templates/sequences/workflows/create-sequence.html`
- `templates/sequences/workflows/delete-sequence.html`
- `templates/sequences/workflows/pagination-next.html`
- `templates/sequences/workflows/pagination-prev.html`
- `templates/sequences/workflows/workflow-init.html`

### ✅ Événements
- `templates/evenements/index.html`
- `templates/evenements/alpinejs.html`
- `templates/evenements/workflows/initial-load.html`
- `templates/evenements/workflows/mark-as-read.html`
- `templates/evenements/workflows/mark-all-read.html`
- `templates/evenements/workflows/workflow-init.html`

### ✅ Settings
- `templates/settings/index.html` (menu)
- `templates/settings_smtp/index.html` (liste SMTP)
- `templates/settings_smtp/alpinejs.html`
- `templates/settings_smtp/workflows/*.html` (6 workflows)

---

## Résumé

| Catégorie | Total | Fait | Reste |
|-----------|-------|------|-------|
| Routes Backend | 10 | 10 ✅ | 0 |
| Pages Frontend | 15 | 10 ✅ | 5 |
| Workflows | ~60 | 35 ✅ | 25 |

**Progression estimée: 70%**

L'application est maintenant **fonctionnelle** avec :
- ✅ Authentification JWT
- ✅ Dashboard avec stats
- ✅ Gestion des impayés
- ✅ Gestion des contacts
- ✅ Gestion des relances
- ✅ Gestion des séquences
- ✅ Centre de notifications
- ✅ Configuration SMTP (liste)

Les fonctionnalités manquantes sont des "nice to have" ou des pages de détail.
