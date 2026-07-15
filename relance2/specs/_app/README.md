# _app/ - Shadow App Specifications

**Dossier** : `specs/_app/`  
**Description** : Structure miroir de l'application Flask (`app/`)

## Principe

Chaque fichier dans `app/` a son équivalent dans `specs/_app/` :
- **Fichiers Python** → `.md` (documentation)
- **Fichiers JS/CSS** → `.md` (documentation)
- **Fichiers HTML** → `.html` (mockups uniquement)

## Structure

```
specs/_app/                    ← Correspond à →    app/
├── app.md                                          app.py
├── db.md                                           db.py
├── requirements.md                                 requirements.txt
├── routes/
│   ├── auth.md                                     auth.py
│   ├── users.md                                    users.py
│   ├── contacts.md                                 contacts.py
│   ├── impayes.md                                  impayes.py
│   ├── relances.md                                 relances.py
│   ├── sequences.md                                sequences.py
│   ├── smtp.md                                     smtp.py
│   ├── portail.md                                  portail.py
│   ├── tokens.md                                   tokens.py
│   ├── events.md                                   events.py
│   ├── import_data.md                              import_data.py
│   ├── workflow.md                                 workflow.py
│   └── pages.md                                    pages.py
├── workflows/
│   ├── auth-login.md                               auth-login.py
│   ├── contacts-blacklist.md                       contacts-blacklist.py
│   ├── generate-relances.md                        generate-relances.py
│   ├── generate-suivi.md                           generate-suivi.py
│   ├── send-emails.md                              send-emails.py
│   ├── send-suivi.md                               send-suivi.py
│   ├── impayes-suspend.md                          impayes-suspend.py
│   ├── impayes-unsuspend.md                        impayes-unsuspend.py
│   ├── import-invoice.md                           import-invoice.py
│   ├── cleanup-*.md                                cleanup-*.py
│   ├── regenerate-*.md                             regenerate-*.py
│   ├── generate-contact-token.md                   generate-contact-token.py
│   ├── generate-pdf-links.md                       generate-pdf-links.py
│   ├── appliquer-regles-attribution.md             appliquer-regles-attribution.py
│   ├── users-management.md                         users-management.py
│   ├── get-contact-impayes.md                      get-contact-impayes.py
│   ├── sync-contacts.md                            sync-contacts.py
│   ├── verify-paid-invoices.md                     verify-paid-invoices.py
│   └── portail-client.md                           portail-client.py
└── static/
    ├── css/
    │   └── app.md                                  app.css
    └── pages/                                      pages/
        ├── login/
        │   ├── index.md                            index.html
        │   ├── store/
        │   │   └── store.js                        store.js
        │   ├── workflows/
        │   │   ├── initial-load.md                 initial-load.js
        │   │   └── auth-submit.md                  auth-submit.js
        │   └── mockups/                            ← HTML uniquement ici
        │       ├── default.html
        │       ├── erreur.html
        │       └── loading.html
        ├── dashboard/
        │   ├── index.md
        │   ├── store/
        │   │   └── store.md
        │   ├── workflows/
        │   │   ├── initial-load.md
        │   │   └── refresh-stats.md
        │   └── mockups/
        │       └── default.html
        ├── impayes/
        │   ├── index.md
        │   ├── store/
        │   │   └── store.md
        │   ├── workflows/
        │   │   └── *.md
        │   └── mockups/
        │       └── default.html
        ├── impayes-detail/
        │   ├── index.md
        │   ├── store/
        │   │   └── store.md
        │   ├── workflows/
        │   │   └── *.md
        │   └── mockups/
        │       └── default.html
        └── [autres pages...]

```

## Conventions

### Fichiers `.md`

Contiennent :
- Description du fichier
- Code source (ou pseudo-code)
- Documentation API (routes, paramètres)
- Checkpoints pour les workflows

### Fichiers `.html` (mockups)

Localisés uniquement dans `mockups/` :
- `default.html` : État normal de la page
- `empty.html` : Liste vide / premier démarrage
- `loading.html` : État de chargement
- `erreur.html` : Erreurs de validation
- `modal-*.html` : Modales ouvertes

## Mapping des extensions

| Type dans `app/` | Extension dans `specs/_app/` |
|------------------|------------------------------|
| `.py` | `.md` |
| `.js` | `.md` |
| `.css` | `.md` |
| `.html` | `.md` (sauf mockups → `.html`) |

## Usage

Les fichiers dans `_app/` servent à :
1. **Documenter** le code source existant
2. **Planifier** les développements futurs
3. **Valider** les maquettes HTML avant implémentation
4. **Générer** le code source (optionnel via scripts)
