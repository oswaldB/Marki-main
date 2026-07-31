# Application Map

## Écrans
| URL | Nom | Description |
|-----|-----|-------------|
| / | dashboard | Tableau de bord avec KPIs et graphiques |
| /impayes | liste-impayes | Liste des impayés avec filtres |
| /impaye/:id | detail-impaye | Détail d'un impayé (fiche) |
| /impayes/:payeur | impayes-payeur | Impayés par payeur |
| /impayes/reparer | reparer-impayes | Impayés à réparer |
| /impayes/suspendus | suspendus | Impayés suspendus/blacklistés |
| /contacts | liste-contacts | Liste des contacts/payeurs |
| /contact/:id | detail-contact | Détail d'un contact |
| /contacts/blacklist | contacts-blacklist | Contacts blacklistés |
| /contacts/sans-email | contacts-sans-email | Contacts sans email |
| /relances | liste-relances | Liste des relances programmées |
| /relances/calendrier | calendrier-relances | Vue calendrier des relances |
| /relances/validation | validation-relances | Validation des relances à envoyer |
| /sequences | liste-sequences | Séquences de relance actives |
| /sequence/:id | detail-sequence | Détail d'une séquence |
| /evenements | historique-evenements | Historique des événements |
| /portail-client | portail-client | Portail client externe |
| /portail-mission | portail-mission | Portail mission (interne) |
| /settings/smtp | settings-smtp | Configuration SMTP |
| /settings/utilisateurs | settings-utilisateurs | Gestion utilisateurs |
| /login | login | Page de connexion |

## Workflows Backend
| ID | Type | Attaché à | Description |
|----|------|-----------|-------------|
| parse-csv | wf-bg | importer | Parsing CSV/Excel avec validation format |
| enregistrer-impayes | wf-bg | importer | Création fichiers YAML impayés avec locking |
| query-impayes | wf-bg | liste-impayes | Query LokiJS avec filtres, tri, pagination |
| get-contact-with-impayes | wf-bg | detail-contact | Requête contact avec jointure impayés |
| calculer-score-contact | wf-bg | detail-contact | Algorithme de scoring basé sur historique |
| detect-anomalies | wf-bg | dashboard | Analyse des patterns sur collections LokiJS |
| export-data | wf-bg | global | Export JSON/CSV depuis collections LokiJS |
| send-emails | wf-bg | global | Envoi SMTP réel avec retry |
| relances-validate | wf-bg | validation-relances | Validation + envoi conditionnel |
| relances-cancel | wf-bg | liste-relances | Annulation relance programmée |
| impayes-suspend | wf-bg | detail-impaye | Suspendre + annuler relances |
| impayes-unsuspend | wf-bg | suspendus | Réactiver + régénérer relances |
| contacts-toggle-blacklist | wf-bg | detail-contact | Toggle blacklist + cascade annulation |
| generate-relances | cron | global | CRON quotidien, génère relances depuis impayés |
| apply-sequence | wf-bg | generate-relances | Applique règles séquence (J+15, J+30...) |
| group-by-contact | wf-bg | generate-relances | Regroupe impayés par contact pour relances groupées |
| update-sequence-order | wf-bg | liste-sequences | Update niveau séquences avec locking |
| historique-relances-query | wf-bg | liste-relances | Query collection relances avec filtres |
