# Cells Listing

## Cell: dashboard
- **Type**: ecran
- **Description**: Tableau de bord avec KPIs et graphiques
- **Structure**:
```
app/dashboard/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_detect_anomalies.py
├── models/
│   ├── __init__.py
│   ├── kpi.py
│   └── chart.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── detect-anomalies.md
    ├── models/
    │   ├── kpi.md
    │   └── chart.md
    └── routes/
        └── index.md
```

## Cell: liste_impayes
- **Type**: ecran
- **Description**: Liste des impayés avec filtres
- **Structure**:
```
app/liste_impayes/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_query_impayes.py
├── models/
│   ├── __init__.py
│   ├── impaye.py
│   └── filtre.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── query-impayes.md
    ├── models/
    │   ├── impaye.md
    │   └── filtre.md
    └── routes/
        └── index.md
```

## Cell: detail_impaye
- **Type**: ecran
- **Description**: Détail d'un impayé (fiche)
- **Structure**:
```
app/detail_impaye/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_impayes_suspend.py
├── models/
│   ├── __init__.py
│   ├── impaye.py
│   └── relance.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── impayes-suspend.md
    ├── models/
    │   ├── impaye.md
    │   └── relance.md
    └── routes/
        └── index.md
```

## Cell: impayes_payeur
- **Type**: ecran
- **Description**: Impayés par payeur
- **Structure**:
```
app/impayes_payeur/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_query_impayes.py
├── models/
│   ├── __init__.py
│   ├── impaye.py
│   └── payeur.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── query-impayes.md
    ├── models/
    │   ├── impaye.md
    │   └── payeur.md
    └── routes/
        └── index.md
```

## Cell: reparer_impayes
- **Type**: ecran
- **Description**: Impayés à réparer
- **Structure**:
```
app/reparer_impayes/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_query_impayes.py
├── models/
│   ├── __init__.py
│   └── impaye.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── query-impayes.md
    ├── models/
    │   └── impaye.md
    └── routes/
        └── index.md
```

## Cell: suspendus
- **Type**: ecran
- **Description**: Impayés suspendus/blacklistés
- **Structure**:
```
app/suspendus/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_impayes_unsuspend.py
├── models/
│   ├── __init__.py
│   └── impaye.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── impayes-unsuspend.md
    ├── models/
    │   └── impaye.md
    └── routes/
        └── index.md
```

## Cell: liste_contacts
- **Type**: ecran
- **Description**: Liste des contacts/payeurs
- **Structure**:
```
app/liste_contacts/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_export_data.py
├── models/
│   ├── __init__.py
│   └── contact.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── export-data.md
    ├── models/
    │   └── contact.md
    └── routes/
        └── index.md
```

## Cell: detail_contact
- **Type**: ecran
- **Description**: Détail d'un contact
- **Structure**:
```
app/detail_contact/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   ├── wf_get_contact_with_impayes.py
│   ├── wf_calculer_score_contact.py
│   └── wf_contacts_toggle_blacklist.py
├── models/
│   ├── __init__.py
│   ├── contact.py
│   └── score.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   ├── get-contact-with-impayes.md
    │   ├── calculer-score-contact.md
    │   └── contacts-toggle-blacklist.md
    ├── models/
    │   ├── contact.md
    │   └── score.md
    └── routes/
        └── index.md
```

## Cell: contacts_blacklist
- **Type**: ecran
- **Description**: Contacts blacklistés
- **Structure**:
```
app/contacts_blacklist/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_query_impayes.py
├── models/
│   ├── __init__.py
│   └── contact.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── query-impayes.md
    ├── models/
    │   └── contact.md
    └── routes/
        └── index.md
```

## Cell: contacts_sans_email
- **Type**: ecran
- **Description**: Contacts sans email
- **Structure**:
```
app/contacts_sans_email/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_query_impayes.py
├── models/
│   ├── __init__.py
│   └── contact.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── query-impayes.md
    ├── models/
    │   └── contact.md
    └── routes/
        └── index.md
```

## Cell: liste_relances
- **Type**: ecran
- **Description**: Liste des relances programmées
- **Structure**:
```
app/liste_relances/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   ├── wf_historique_relances_query.py
│   └── wf_relances_cancel.py
├── models/
│   ├── __init__.py
│   ├── relance.py
│   └── evenement.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   ├── historique-relances-query.md
    │   └── relances-cancel.md
    ├── models/
    │   ├── relance.md
    │   └── evenement.md
    └── routes/
        └── index.md
```

## Cell: calendrier_relances
- **Type**: ecran
- **Description**: Vue calendrier des relances
- **Structure**:
```
app/calendrier_relances/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_historique_relances_query.py
├── models/
│   ├── __init__.py
│   ├── relance.py
│   └── calendrier.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── historique-relances-query.md
    ├── models/
    │   ├── relance.md
    │   └── calendrier.md
    └── routes/
        └── index.md
```

## Cell: validation_relances
- **Type**: ecran
- **Description**: Validation des relances à envoyer
- **Structure**:
```
app/validation_relances/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_relances_validate.py
├── models/
│   ├── __init__.py
│   ├── relance.py
│   └── validation.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── relances-validate.md
    ├── models/
    │   ├── relance.md
    │   └── validation.md
    └── routes/
        └── index.md
```

## Cell: liste_sequences
- **Type**: ecran
- **Description**: Séquences de relance actives
- **Structure**:
```
app/liste_sequences/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_update_sequence_order.py
├── models/
│   ├── __init__.py
│   └── sequence.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── update-sequence-order.md
    ├── models/
    │   └── sequence.md
    └── routes/
        └── index.md
```

## Cell: detail_sequence
- **Type**: ecran
- **Description**: Détail d'une séquence
- **Structure**:
```
app/detail_sequence/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_apply_sequence.py
├── models/
│   ├── __init__.py
│   ├── sequence.py
│   └── etape.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── apply-sequence.md
    ├── models/
    │   ├── sequence.md
    │   └── etape.md
    └── routes/
        └── index.md
```

## Cell: historique_evenements
- **Type**: ecran
- **Description**: Historique des événements
- **Structure**:
```
app/historique_evenements/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_historique_relances_query.py
├── models/
│   ├── __init__.py
│   └── evenement.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── historique-relances-query.md
    ├── models/
    │   └── evenement.md
    └── routes/
        └── index.md
```

## Cell: portail_client
- **Type**: ecran
- **Description**: Portail client externe
- **Structure**:
```
app/portail_client/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_query_impayes.py
├── models/
│   ├── __init__.py
│   ├── impaye.py
│   └── payeur.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── query-impayes.md
    ├── models/
    │   ├── impaye.md
    │   └── payeur.md
    └── routes/
        └── index.md
```

## Cell: portail_mission
- **Type**: ecran
- **Description**: Portail mission (interne)
- **Structure**:
```
app/portail_mission/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_query_impayes.py
├── models/
│   ├── __init__.py
│   ├── mission.py
│   └── impaye.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── query-impayes.md
    ├── models/
    │   ├── mission.md
    │   └── impaye.md
    └── routes/
        └── index.md
```

## Cell: settings_smtp
- **Type**: ecran
- **Description**: Configuration SMTP
- **Structure**:
```
app/settings_smtp/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_send_emails.py
├── models/
│   ├── __init__.py
│   └── config_smtp.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── send-emails.md
    ├── models/
    │   └── config_smtp.md
    └── routes/
        └── index.md
```

## Cell: settings_utilisateurs
- **Type**: ecran
- **Description**: Gestion utilisateurs
- **Structure**:
```
app/settings_utilisateurs/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_export_data.py
├── models/
│   ├── __init__.py
│   └── utilisateur.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── export-data.md
    ├── models/
    │   └── utilisateur.md
    └── routes/
        └── index.md
```

## Cell: login
- **Type**: ecran
- **Description**: Page de connexion
- **Structure**:
```
app/login/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_auth.py
├── models/
│   ├── __init__.py
│   └── utilisateur.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── auth.md
    ├── models/
    │   └── utilisateur.md
    └── routes/
        └── index.md
```

## Cell: parse_csv
- **Type**: wf-bg
- **Description**: Parsing CSV/Excel avec validation format
- **Structure**:
```
app/parse_csv/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_parse_csv.py
├── models/
│   ├── __init__.py
│   ├── fichier.py
│   └── validation.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── parse-csv.md
    ├── models/
    │   ├── fichier.md
    │   └── validation.md
    └── routes/
        └── wf_parse_csv.md
```

## Cell: enregistrer_impayes
- **Type**: wf-bg
- **Description**: Création fichiers YAML impayés avec locking
- **Structure**:
```
app/enregistrer_impayes/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_enregistrer_impayes.py
├── models/
│   ├── __init__.py
│   ├── impaye.py
│   └── lock.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── enregistrer-impayes.md
    ├── models/
    │   ├── impaye.md
    │   └── lock.md
    └── routes/
        └── wf_enregistrer_impayes.md
```

## Cell: query_impayes
- **Type**: wf-bg
- **Description**: Query LokiJS avec filtres, tri, pagination
- **Structure**:
```
app/query_impayes/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_query_impayes.py
├── models/
│   ├── __init__.py
│   ├── impaye.py
│   └── query.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── query-impayes.md
    ├── models/
    │   ├── impaye.md
    │   └── query.md
    └── routes/
        └── wf_query_impayes.md
```

## Cell: get_contact_with_impayes
- **Type**: wf-bg
- **Description**: Requête contact avec jointure impayés
- **Structure**:
```
app/get_contact_with_impayes/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_get_contact_with_impayes.py
├── models/
│   ├── __init__.py
│   ├── contact.py
│   └── impaye.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── get-contact-with-impayes.md
    ├── models/
    │   ├── contact.md
    │   └── impaye.md
    └── routes/
        └── wf_get_contact_with_impayes.md
```

## Cell: calculer_score_contact
- **Type**: wf-bg
- **Description**: Algorithme de scoring basé sur historique
- **Structure**:
```
app/calculer_score_contact/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_calculer_score_contact.py
├── models/
│   ├── __init__.py
│   ├── contact.py
│   └── score.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── calculer-score-contact.md
    ├── models/
    │   ├── contact.md
    │   └── score.md
    └── routes/
        └── wf_calculer_score_contact.md
```

## Cell: detect_anomalies
- **Type**: wf-bg
- **Description**: Analyse des patterns sur collections LokiJS
- **Structure**:
```
app/detect_anomalies/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_detect_anomalies.py
├── models/
│   ├── __init__.py
│   ├── collection.py
│   └── anomalie.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── detect-anomalies.md
    ├── models/
    │   ├── collection.md
    │   └── anomalie.md
    └── routes/
        └── wf_detect_anomalies.md
```

## Cell: export_data
- **Type**: wf-bg
- **Description**: Export JSON/CSV depuis collections LokiJS
- **Structure**:
```
app/export_data/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_export_data.py
├── models/
│   ├── __init__.py
│   ├── collection.py
│   └── export.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── export-data.md
    ├── models/
    │   ├── collection.md
    │   └── export.md
    └── routes/
        └── wf_export_data.md
```

## Cell: send_emails
- **Type**: wf-bg
- **Description**: Envoi SMTP réel avec retry
- **Structure**:
```
app/send_emails/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_send_emails.py
├── models/
│   ├── __init__.py
│   ├── email.py
│   └── smtp.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── send-emails.md
    ├── models/
    │   ├── email.md
    │   └── smtp.md
    └── routes/
        └── wf_send_emails.md
```

## Cell: relances_validate
- **Type**: wf-bg
- **Description**: Validation + envoi conditionnel
- **Structure**:
```
app/relances_validate/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_relances_validate.py
├── models/
│   ├── __init__.py
│   ├── relance.py
│   └── validation.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── relances-validate.md
    ├── models/
    │   ├── relance.md
    │   └── validation.md
    └── routes/
        └── wf_relances_validate.md
```

## Cell: relances_cancel
- **Type**: wf-bg
- **Description**: Annulation relance programmée
- **Structure**:
```
app/relances_cancel/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_relances_cancel.py
├── models/
│   ├── __init__.py
│   ├── relance.py
│   └── annulation.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── relances-cancel.md
    ├── models/
    │   ├── relance.md
    │   └── annulation.md
    └── routes/
        └── wf_relances_cancel.md
```

## Cell: impayes_suspend
- **Type**: wf-bg
- **Description**: Suspendre + annuler relances
- **Structure**:
```
app/impayes_suspend/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_impayes_suspend.py
├── models/
│   ├── __init__.py
│   ├── impaye.py
│   └── suspension.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── impayes-suspend.md
    ├── models/
    │   ├── impaye.md
    │   └── suspension.md
    └── routes/
        └── wf_impayes_suspend.md
```

## Cell: impayes_unsuspend
- **Type**: wf-bg
- **Description**: Réactiver + régénérer relances
- **Structure**:
```
app/impayes_unsuspend/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_impayes_unsuspend.py
├── models/
│   ├── __init__.py
│   ├── impaye.py
│   └── reactivation.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── impayes-unsuspend.md
    ├── models/
    │   ├── impaye.md
    │   └── reactivation.md
    └── routes/
        └── wf_impayes_unsuspend.md
```

## Cell: contacts_toggle_blacklist
- **Type**: wf-bg
- **Description**: Toggle blacklist + cascade annulation
- **Structure**:
```
app/contacts_toggle_blacklist/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_contacts_toggle_blacklist.py
├── models/
│   ├── __init__.py
│   ├── contact.py
│   └── blacklist.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── contacts-toggle-blacklist.md
    ├── models/
    │   ├── contact.md
    │   └── blacklist.md
    └── routes/
        └── wf_contacts_toggle_blacklist.md
```

## Cell: apply_sequence
- **Type**: wf-bg
- **Description**: Applique règles séquence (J+15, J+30...)
- **Structure**:
```
app/apply_sequence/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_apply_sequence.py
├── models/
│   ├── __init__.py
│   ├── sequence.py
│   └── regle.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── apply-sequence.md
    ├── models/
    │   ├── sequence.md
    │   └── regle.md
    └── routes/
        └── wf_apply_sequence.md
```

## Cell: group_by_contact
- **Type**: wf-bg
- **Description**: Regroupe impayés par contact pour relances groupées
- **Structure**:
```
app/group_by_contact/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_group_by_contact.py
├── models/
│   ├── __init__.py
│   ├── contact.py
│   └── groupe.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── group-by-contact.md
    ├── models/
    │   ├── contact.md
    │   └── groupe.md
    └── routes/
        └── wf_group_by_contact.md
```

## Cell: update_sequence_order
- **Type**: wf-bg
- **Description**: Update niveau séquences avec locking
- **Structure**:
```
app/update_sequence_order/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_update_sequence_order.py
├── models/
│   ├── __init__.py
│   ├── sequence.py
│   └── ordre.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── update-sequence-order.md
    ├── models/
    │   ├── sequence.md
    │   └── ordre.md
    └── routes/
        └── wf_update_sequence_order.md
```

## Cell: historique_relances_query
- **Type**: wf-bg
- **Description**: Query collection relances avec filtres
- **Structure**:
```
app/historique_relances_query/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_historique_relances_query.py
├── models/
│   ├── __init__.py
│   ├── relance.py
│   └── historique.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── historique-relances-query.md
    ├── models/
    │   ├── relance.md
    │   └── historique.md
    └── routes/
        └── wf_historique_relances_query.md
```

## Cell: generate_relances
- **Type**: cron
- **Description**: CRON quotidien, génère relances depuis impayés
- **Structure**:
```
app/generate_relances/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── api_trigger.py
├── models/
│   ├── __init__.py
│   ├── relance.py
│   └── impaye.py
├── cron.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── generate-relances.md
    ├── models/
    │   ├── relance.md
    │   └── impaye.md
    └── routes/
        └── api_trigger.md
```
