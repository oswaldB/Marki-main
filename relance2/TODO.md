# TODO - Développement App Marki

## Structure du projet

```
app/
├── app.py                      # Application Flask principale
├── db.py                       # Module base de données
├── __init__.py
├── marki.db                    # Base de données SQLite
├── routes/                     # Blueprints Flask (endpoints API)
│   ├── __init__.py
│   ├── auth.py                 # Authentification (login/logout/me)
│   ├── contacts.py             # CRUD contacts
│   ├── dashboard.py            # Dashboard stats
│   ├── events.py               # Événements/notifications
│   ├── impayes.py              # Gestion impayés
│   ├── relances.py             # Gestion relances
│   ├── sequences.py            # CRUD séquences
│   ├── settings.py             # Paramètres (SMTP, utilisateurs)
│   └── portail.py              # Portail client/mission
├── static/
│   ├── components/             # Web Components
│   │   └── sidebar-nav-dual.js # ✅ FAIT
│   ├── css/
│   └── js/
├── templates/
│   ├── layouts/
│   │   └── layout_app.html     # ✅ FAIT
│   ├── login/                  # ✅ FAIT
│   │   ├── index.html
│   │   ├── alpinejs.html
│   │   └── workflows/
│   │       ├── auth-submit.html
│   │       └── workflow-init.html
│   └── [pages]/...             # À créer
└── workflows/                  # Megafunctions Python (optionnel)
```

---

## Fichiers Backend (Routes Flask)

| Fichier | Priorité | Statut | Description |
|---------|----------|--------|-------------|
| `app/routes/__init__.py` | 🔴 Haute | ❌ | Initialisation blueprints |
| `app/routes/auth.py` | 🔴 Haute | 🔄 | Login/logout/token (partiel) |
| `app/routes/contacts.py` | 🔴 Haute | ❌ | CRUD contacts + blacklist |
| `app/routes/impayes.py` | 🔴 Haute | ❌ | CRUD impayés + suspendre/réactiver |
| `app/routes/relances.py` | 🔴 Haute | ❌ | Gestion relances + validation |
| `app/routes/sequences.py` | 🟡 Moyenne | ❌ | CRUD séquences emails |
| `app/routes/events.py` | 🟡 Moyenne | ❌ | Événements + mark-all-read |
| `app/routes/dashboard.py` | 🟡 Moyenne | ❌ | Stats dashboard (calculées) |
| `app/routes/settings.py` | 🟡 Moyenne | ❌ | SMTP + utilisateurs |
| `app/routes/portail.py` | 🟢 Basse | ❌ | Portail client/mission |
| `app/db.py` | 🔴 Haute | ❌ | Helper connexion DB |

---

## Pages Frontend (Templates Jinja2)

### 🔴 Priorité Haute (Core)

| Page | Fichiers | Statut | Spécification |
|------|----------|--------|---------------|
| **Dashboard** | `templates/dashboard/index.html` | ❌ | `specs/_app/templates/dashboard/index.md` |
| | `templates/dashboard/alpinejs.html` | ❌ | `specs/_app/templates/dashboard/alpinejs.md` |
| | `templates/dashboard/workflows/initial-load.html` | ❌ | Workflow init |
| | `templates/dashboard/workflows/sync-data.html` | ❌ | Workflow sync |
| | `templates/dashboard/workflows/switch-view-card.html` | ❌ | Workflow vue carte |
| | `templates/dashboard/workflows/switch-view-list.html` | ❌ | Workflow vue liste |
| | `templates/dashboard/workflows/clear-events.html` | ❌ | Workflow clear events |
| **Impayés (Liste)** | `templates/impayes/index.html` | ❌ | `specs/_app/templates/impayes/index.md` |
| | `templates/impayes/alpinejs.html` | ❌ | `specs/_app/templates/impayes/alpinejs.md` |
| | `templates/impayes/workflows/initial-load.html` | ❌ | Workflow init |
| | `templates/impayes/workflows/pagination-next.html` | ❌ | Workflow pagination |
| | `templates/impayes/workflows/pagination-prev.html` | ❌ | Workflow pagination |
| | `templates/impayes/workflows/sort-by-*.html` (x5) | ❌ | Workflows tri |
| | `templates/impayes/workflows/open-detail.html` | ❌ | Workflow ouverture détail |
| | `templates/impayes/workflows/suspend-facture.html` | ❌ | Workflow suspension |
| | `templates/impayes/workflows/unsuspend-facture.html` | ❌ | Workflow réactivation |
| | `templates/impayes/workflows/save-note.html` | ❌ | Workflow sauvegarde note |
| | `templates/impayes/workflows/sync-data.html` | ❌ | Workflow synchro |
| **Contacts** | `templates/contacts/index.html` | ❌ | `specs/_app/templates/contacts/index.md` |
| | `templates/contacts/alpinejs.html` | ❌ | `specs/_app/templates/contacts/alpinejs.md` |
| | `templates/contacts/workflows/initial-load.html` | ❌ | Workflow init |
| | `templates/contacts/workflows/toggle-blacklist.html` | ❌ | Workflow blacklist |
| | `templates/contacts/workflows/view-contact.html` | ❌ | Workflow vue contact |
| | `templates/contacts/workflows/pagination-*.html` (x2) | ❌ | Workflows pagination |
| | `templates/contacts/workflows/sort-by-*.html` (x2) | ❌ | Workflows tri |
| | `templates/contacts/workflows/export-data.html` | ❌ | Workflow export |
| | `templates/contacts/workflows/close-detail-slideover.html` | ❌ | Workflow fermeture |
| | `templates/contacts/workflows/toggle-dropdown.html` | ❌ | Workflow dropdown |
| | `templates/contacts/workflows/set-email-force.html` | ❌ | Workflow email force |

### 🟡 Priorité Moyenne

| Page | Fichiers | Statut | Spécification |
|------|----------|--------|---------------|
| **Impayés Détail** | `templates/impayes_detail/index.html` | ❌ | `specs/_app/templates/impayes_detail/index.md` |
| | `templates/impayes_detail/alpinejs.html` | ❌ | `specs/_app/templates/impayes_detail/alpinejs.md` |
| | `templates/impayes_detail/workflows/initial-load.html` | ❌ | Workflow init |
| | `templates/impayes_detail/workflows/open-pdf.html` | ❌ | Workflow PDF |
| | `templates/impayes_detail/workflows/suspend-facture.html` | ❌ | Workflow suspension |
| | `templates/impayes_detail/workflows/unsuspend-facture.html` | ❌ | Workflow réactivation |
| | `templates/impayes_detail/workflows/blacklist-facture.html` | ❌ | Workflow blacklist |
| | `templates/impayes_detail/workflows/changer-sequence.html` | ❌ | Workflow changement séquence |
| **Impayés Par Payeur** | `templates/impayes_payeur/index.html` | ❌ | `specs/_app/templates/impayes_payeur/index.md` |
| | `templates/impayes_payeur/alpinejs.html` | ❌ | `specs/_app/templates/impayes_payeur/alpinejs.md` |
| | `templates/impayes_payeur/workflows/*.html` (x6) | ❌ | Workflows divers |
| **Impayés Suspendus** | `templates/impayes_suspendus/index.html` | ❌ | `specs/_app/templates/impayes_suspendus/index.md` |
| | `templates/impayes_suspendus/alpinejs.html` | ❌ | `specs/_app/templates/impayes_suspendus/alpinejs.md` |
| | `templates/impayes_suspendus/workflows/*.html` (x2) | ❌ | Workflows |
| **Relances (Liste)** | `templates/relances/index.html` | ❌ | `specs/_app/templates/relances/index.md` |
| | `templates/relances/alpinejs.html` | ❌ | `specs/_app/templates/relances/alpinejs.md` |
| | `templates/relances/workflows/*.html` (x7) | ❌ | Workflows |
| **Relances Validation** | `templates/relances_validation/index.html` | ❌ | `specs/_app/templates/relances_validation/index.md` |
| | `templates/relances_validation/alpinejs.html` | ❌ | `specs/_app/templates/relances_validation/alpinejs.md` |
| | `templates/relances_validation/workflows/*.html` (x10) | ❌ | Workflows validation |
| **Relances Calendrier** | `templates/relances_calendrier/index.html` | ❌ | `specs/_app/templates/relances_calendrier/index.md` |
| | `templates/relances_calendrier/alpinejs.html` | ❌ | `specs/_app/templates/relances_calendrier/alpinejs.md` |
| | `templates/relances_calendrier/workflows/*.html` (x9) | ❌ | Workflows calendrier |
| **Séquences** | `templates/sequences/index.html` | ❌ | `specs/_app/templates/sequences/index.md` |
| | `templates/sequences/alpinejs.html` | ❌ | `specs/_app/templates/sequences/alpinejs.md` |
| | `templates/sequences/workflows/*.html` (x7) | ❌ | Workflows séquences |
| **Événements** | `templates/evenements/index.html` | ❌ | `specs/_app/templates/evenements/index.md` |
| | `templates/evenements/alpinejs.html` | ❌ | `specs/_app/templates/evenements/alpinejs.md` |
| | `templates/evenements/workflows/*.html` (x6) | ❌ | Workflows événements |
| **Smart Marki** | `templates/smart_marki/index.html` | ❌ | `specs/_app/templates/smart_marki/index.md` |
| | `templates/smart_marki/alpinejs.html` | ❌ | `specs/_app/templates/smart_marki/alpinejs.md` |
| | `templates/smart_marki/workflows/*.html` (x6) | ❌ | Workflows IA |

### 🟢 Priorité Basse

| Page | Fichiers | Statut | Spécification |
|------|----------|--------|---------------|
| **Séquences Relance Détail** | `templates/sequences_relance_detail/index.html` | ❌ | `specs/_app/templates/sequences_relance_detail/index.md` |
| | `templates/sequences_relance_detail/alpinejs.html` | ❌ | `specs/_app/templates/sequences_relance_detail/alpinejs.md` |
| | `templates/sequences_relance_detail/workflows/*.html` (x17) | ❌ | Workflows édition |
| **Séquences Suivi Détail** | `templates/sequences_suivi_detail/index.html` | ❌ | `specs/_app/templates/sequences_suivi_detail/index.md` |
| | `templates/sequences_suivi_detail/alpinejs.html` | ❌ | `specs/_app/templates/sequences_suivi_detail/alpinejs.md` |
| | `templates/sequences_suivi_detail/workflows/*.html` (x15) | ❌ | Workflows édition |
| **Relances Détail** | `templates/relances_detail/index.html` | ❌ | `specs/_app/templates/relances_detail/index.md` |
| | `templates/relances_detail/alpinejs.html` | ❌ | `specs/_app/templates/relances_detail/alpinejs.md` |
| | `templates/relances_detail/workflows/initial-load.html` | ❌ | Workflow minimal |
| **Impayés Réparer** | `templates/impayes_reparer/index.html` | ❌ | `specs/_app/templates/impayes_reparer/index.md` |
| | `templates/impayes_reparer/alpinejs.html` | ❌ | `specs/_app/templates/impayes_reparer/alpinejs.md` |
| | `templates/impayes_reparer/workflows/*.html` (x1) | ❌ | Workflow |
| **Settings** | `templates/settings/index.html` | ❌ | `specs/_app/templates/settings/index.md` |
| | `templates/settings/alpinejs.html` | ❌ | `specs/_app/templates/settings/alpinejs.md` |
| | `templates/settings/workflows/initial-load.html` | ❌ | Workflow |
| **Settings SMTP** | `templates/settings_smtp/index.html` | ❌ | `specs/_app/templates/settings_smtp/index.md` |
| | `templates/settings_smtp/alpinejs.html` | ❌ | `specs/_app/templates/settings_smtp/alpinejs.md` |
| | `templates/settings_smtp/workflows/*.html` (x7) | ❌ | Workflows |
| **Settings SMTP Détail** | `templates/settings_smtp_detail/index.html` | ❌ | `specs/_app/templates/settings_smtp_detail/index.md` |
| | `templates/settings_smtp_detail/alpinejs.html` | ❌ | `specs/_app/templates/settings_smtp_detail/alpinejs.md` |
| | `templates/settings_smtp_detail/workflows/*.html` (x4) | ❌ | Workflows |
| **Settings Utilisateurs** | `templates/settings_utilisateurs/index.html` | ❌ | `specs/_app/templates/settings_utilisateurs/index.md` |
| | `templates/settings_utilisateurs/alpinejs.html` | ❌ | `specs/_app/templates/settings_utilisateurs/alpinejs.md` |
| | `templates/settings_utilisateurs/workflows/*.html` (x5) | ❌ | Workflows |
| **Portail Client** | `templates/portail_client/index.html` | ❌ | `specs/_app/templates/portail_client/index.md` |
| | `templates/portail_client/alpinejs.html` | ❌ | `specs/_app/templates/portail_client/alpinejs.md` |
| | `templates/portail_client/workflows/*.html` (x4) | ❌ | Workflows portail |
| **Portail Mission** | `templates/portail_mission/index.html` | ❌ | `specs/_app/templates/portail_mission/index.md` |
| | `templates/portail_mission/alpinejs.html` | ❌ | `specs/_app/templates/portail_mission/alpinejs.md` |
| | `templates/portail_mission/workflows/*.html` (x5) | ❌ | Workflows portail |

---

## Layouts Additionnels

| Fichier | Statut | Description |
|---------|--------|-------------|
| `templates/layouts/layout_portail.html` | ❌ | Layout pour portail client/mission |
| `templates/layouts/layout_standard.html` | ❌ | Layout simple (pages sans nav) |

---

## Résumé

### Fichiers créés (✅)
- ✅ `app/templates/layouts/layout_app.html`
- ✅ `app/static/components/sidebar-nav-dual.js`
- ✅ `app/templates/login/` (index.html, alpinejs.html, workflows/)
- ✅ `app/app.py` (routes login/auth de base)

### À créer (❌)
- **23 pages** x (index.html + alpinejs.html + workflows/) = ~200+ fichiers
- **10 routes backend** Flask
- **1 module db.py** helper

### Priorité de développement recommandée:
1. 🔴 Backend: db.py, auth.py (compléter), contacts.py, impayes.py, relances.py
2. 🔴 Frontend: dashboard/, impayes/, contacts/
3. 🟡 Frontend: impayes_detail/, relances/, relances_validation/
4. 🟢 Le reste...

---

**Total fichiers estimés:** ~250 fichiers
**Déjà faits:** 8 fichiers
**Reste à faire:** ~242 fichiers
