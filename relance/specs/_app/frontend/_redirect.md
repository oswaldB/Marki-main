# Routes Frontend

## Routes principales

| Route | Description | Dossier |
|-------|-------------|---------|
| `/login` | Page de connexion | `login/` |
| `/dashboard` | Tableau de bord | `dashboard/` |

## Gestion des contacts

| Route | Description | Dossier |
|-------|-------------|---------|
| `/contacts` | Liste des contacts | `contacts/` |

## Gestion des impayés

| Route | Description | Dossier |
|-------|-------------|---------|
| `/impayes` | Liste des impayés | `impayes/` |
| `/impayes/detail/:id` | Détail d'un impayé | `impayes-detail/` |
| `/impayes/payeur/:id` | Impayés par payeur | `impayes-payeur/` |
| `/impayes/suspendus` | Impayés suspendus | `impayes-suspendus/` |

## Gestion des relances

| Route | Description | Dossier |
|-------|-------------|---------|
| `/relances` | Liste des relances | `relances/` |
| `/relances/calendrier` | Calendrier des relances | `relances-calendrier/` |
| `/relances/validation` | Validation des relances | `relances-validation/` |

## Gestion des séquences

| Route | Description | Dossier |
|-------|-------------|---------|
| `/sequences` | Liste des séquences | `sequences/` |
| `/sequences/relance/:id` | Détail séquence de relance | `sequences-relance-detail/` |
| `/sequences/suivi/:id` | Détail séquence de suivi | `sequences-suivi-detail/` |

## Paramètres

| Route | Description | Dossier |
|-------|-------------|---------|
| `/settings/smtp` | Profils SMTP | `settings-smtp/` |
| `/settings/smtp/:id` | Détail profil SMTP | `settings-smtp-detail/` |
| `/settings/utilisateurs` | Gestion des utilisateurs | `settings-utilisateurs/` |

## Événements et IA

| Route | Description | Dossier |
|-------|-------------|---------|
| `/evenements` | Journal des événements | `evenements/` |
| `/smart-marki` | Assistant IA Smart Marki | `smart-marki/` |

## Portails externes

| Route | Description | Dossier |
|-------|-------------|---------|
| `/portail/client/:token` | Portail client (accès factures) | `portail-client/` |
| `/portail/mission/:token` | Portail mission (accès mission) | `portail-mission/` |
