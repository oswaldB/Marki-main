# Routes Frontend (Static Pur)

Structure HTML statique sans framework - chaque écran = dossier avec `index.html`.
Les paramètres dynamiques (`:id`, `:token`) passent par query string ou hash.

---

## Routes principales

| URL | Fichier | Description |
|-----|---------|-------------|
| `/` ou `/login/` | `login/index.html` | Page de connexion |
| `/dashboard/` | `dashboard/index.html` | Tableau de bord |

## Gestion des contacts

| URL | Fichier | Description |
|-----|---------|-------------|
| `/contacts/` | `contacts/index.html` | Liste des contacts |

## Gestion des impayés

| URL | Fichier | Description |
|-----|---------|-------------|
| `/impayes/` | `impayes/index.html` | Liste des impayés |
| `/impayes/detail/?id=xxx` | `impayes-detail/index.html` | Détail d'un impayé (param: `?id=`) |
| `/impayes/payeur/?id=xxx` | `impayes-payeur/index.html` | Impayés par payeur (param: `?id=`) |
| `/impayes/suspendus/` | `impayes-suspendus/index.html` | Impayés suspendus |

## Gestion des relances

| URL | Fichier | Description |
|-----|---------|-------------|
| `/relances/` | `relances/index.html` | Liste des relances |
| `/relances/calendrier/` | `relances-calendrier/index.html` | Calendrier des relances |
| `/relances/validation/` | `relances-validation/index.html` | Validation des relances |

## Gestion des séquences

| URL | Fichier | Description |
|-----|---------|-------------|
| `/sequences/` | `sequences/index.html` | Liste des séquences |
| `/sequences/relance/?id=xxx` | `sequences-relance-detail/index.html` | Détail séquence relance (param: `?id=`) |
| `/sequences/suivi/?id=xxx` | `sequences-suivi-detail/index.html` | Détail séquence suivi (param: `?id=`) |

## Paramètres

| URL | Fichier | Description |
|-----|---------|-------------|
| `/settings/smtp/` | `settings-smtp/index.html` | Profils SMTP |
| `/settings/smtp/detail/?id=xxx` | `settings-smtp-detail/index.html` | Détail profil SMTP (param: `?id=`) |
| `/settings/utilisateurs/` | `settings-utilisateurs/index.html` | Gestion des utilisateurs |

## Événements et IA

| URL | Fichier | Description |
|-----|---------|-------------|
| `/evenements/` | `evenements/index.html` | Journal des événements |
| `/smart-marki/` | `smart-marki/index.html` | Assistant IA Smart Marki |

## Portails externes (accès public)

| URL | Fichier | Description |
|-----|---------|-------------|
| `/portail/client/?token=xxx` | `portail-client/index.html` | Portail client (param: `?token=`) |
| `/portail/mission/?token=xxx` | `portail-mission/index.html` | Portail mission (param: `?token=`) |

---

## Notes d'architecture

- **Navigation** : liens HTML standard `<a href="/impayes/">`
- **Paramètres** : query string `?id=123` lue via `new URLSearchParams(location.search)`
- **State** : Alpine.js pour l'état local (pas de router)
- **API** : appels fetch vers endpoints backend statiques
