# TODO - Développement App

## Architecture
- Alpine.js (pas de JS vanilla)
- Tailwind CSS en CDN
- Static pure (HTML + Alpine.js)

---

## Phase 1: Setup & Structure

- [x] Créer la structure `frontend/` avec tous les dossiers
- [x] Setup `index.html` racine avec redirection vers `/frontend/login/`
- [x] Template de base (layout commun: header, nav, etc.)
- [x] Composants Alpine.js réutilisables

**Fichiers créés:**
- `index.html` - Redirection racine
- `frontend/login/index.html` - Page de connexion
- `frontend/components/sidebar-nav-dual.js` - Navigation sidebar
- `frontend/components/utils.js` - Fonctions utilitaires (formatMoney, etc.)
- `frontend/components/template-authenticated.html` - Template pages auth
- `frontend/README.md` - Documentation structure

---

## Phase 2: Frontend - Écrans (20 écrans)

### Auth
- [x] `login/index.html` - Page de connexion

### Dashboard
- [ ] `dashboard/index.html` - Tableau de bord

### Contacts
- [ ] `contacts/index.html` - Liste des contacts

### Impayés (4 écrans)
- [ ] `impayes/index.html` - Liste des impayés
- [ ] `impayes-detail/index.html` - Détail impayé (param: `?id=`)
- [ ] `impayes-payeur/index.html` - Impayés par payeur (param: `?id=`)
- [ ] `impayes-suspendus/index.html` - Impayés suspendus

### Relances (3 écrans)
- [ ] `relances/index.html` - Liste des relances
- [ ] `relances-calendrier/index.html` - Calendrier
- [ ] `relances-validation/index.html` - Validation

### Séquences (3 écrans)
- [ ] `sequences/index.html` - Liste des séquences
- [ ] `sequences-relance-detail/index.html` - Détail séquence relance (param: `?id=`)
- [ ] `sequences-suivi-detail/index.html` - Détail séquence suivi (param: `?id=`)

### Paramètres (3 écrans)
- [ ] `settings-smtp/index.html` - Profils SMTP
- [ ] `settings-smtp-detail/index.html` - Détail SMTP (param: `?id=`)
- [ ] `settings-utilisateurs/index.html` - Gestion utilisateurs

### Autres (4 écrans)
- [ ] `evenements/index.html` - Journal événements
- [ ] `smart-marki/index.html` - Assistant IA
- [ ] `portail-client/index.html` - Portail client (param: `?token=`)
- [ ] `portail-mission/index.html` - Portail mission (param: `?token=`)

---

## Phase 3: Frontend - Workflows (par écran)

### contacts/ (9 workflows)
- [ ] `close-detail-slideover.md`
- [ ] `export-data.md`
- [ ] `initial-load.md`
- [ ] `pagination-next.md`
- [ ] `pagination-prev.md`
- [ ] `set-email-force.md`
- [ ] `sort-by-date-impaye.md`
- [ ] `sort-by-impayes.md`
- [ ] `toggle-blacklist.md`
- [ ] `toggle-dropdown.md`
- [ ] `view-contact.md`

### dashboard/ (6 workflows)
- [ ] `clear-events.md`
- [ ] `initial-load.md`
- [ ] `switch-view-card.md`
- [ ] `switch-view-list.md`
- [ ] `sync-data.md`

### evenements/ (7 workflows)
- [ ] `close-modal.md`
- [ ] `filter-all.md`
- [ ] `filter-unread.md`
- [ ] `initial-load.md`
- [ ] `mark-all-read.md`
- [ ] `mark-as-read.md`
- [ ] `open-event.md`

### impayes/ (11 workflows)
- [ ] `initial-load.md`
- [ ] `open-detail.md`
- [ ] `pagination-next.md`
- [ ] `pagination-prev.md`
- [ ] `save-note.md`
- [ ] `sort-by-dossier.md`
- [ ] `sort-by-montant.md`
- [ ] `sort-by-numero.md`
- [ ] `sort-by-payeur.md`
- [ ] `sort-by-reste.md`
- [ ] `suspend-facture.md`
- [ ] `sync-data.md`
- [ ] `unsuspend-facture.md`

### impayes-detail/ (6 workflows)
- [ ] `blacklist-facture.md`
- [ ] `changer-sequence.md`
- [ ] `initial-load.md`
- [ ] `open-pdf.md`
- [ ] `suspend-facture.md`
- [ ] `unsuspend-facture.md`

### impayes-payeur/ (7 workflows)
- [ ] `close-detail.md`
- [ ] `initial-load.md`
- [ ] `open-detail.md`
- [ ] `pagination-next.md`
- [ ] `pagination-prev.md`
- [ ] `save-note.md`
- [ ] `sync-data.md`

### impayes-suspendus/ (2 workflows)
- [ ] `initial-load.md`
- [ ] `reactivate-impaye.md`

### login/ (2 workflows)
- [ ] `auth-submit.md`
- [ ] `initial-load.md`

### portail-client/ (4 workflows)
- [ ] `download-facture.md`
- [ ] `initial-load.md`
- [ ] `regler-facture.md`
- [ ] `switch-tab-apporteur.md`
- [ ] `switch-tab-factures.md`

### portail-mission/ (4 workflows)
- [ ] `download-facture.md`
- [ ] `initial-load.md`
- [ ] `logout.md`
- [ ] `regler-facture.md`

### relances/ (8 workflows)
- [ ] `cancel-relance.md`
- [ ] `close-modal.md`
- [ ] `create-relance.md`
- [ ] `edit-note.md`
- [ ] `edit-relance.md`
- [ ] `initial-load.md`
- [ ] `new-relance.md`
- [ ] `toggle-payeur.md`
- [ ] `view-relance.md`

### relances-calendrier/ (8 workflows)
- [ ] `close-modal.md`
- [ ] `go-today.md`
- [ ] `initial-load.md`
- [ ] `next-period.md`
- [ ] `open-edit-relance.md`
- [ ] `previous-period.md`
- [ ] `save-edit.md`
- [ ] `switch-view-month.md`
- [ ] `switch-view-week.md`

### relances-validation/ (9 workflows)
- [ ] `blacklister-relance.md`
- [ ] `deselect-relance.md`
- [ ] `filter-all.md`
- [ ] `filter-email.md`
- [ ] `filter-today.md`
- [ ] `initial-load.md`
- [ ] `save-changes.md`
- [ ] `select-relance.md`
- [ ] `supprimer-relance.md`
- [ ] `suspendre-relance.md`
- [ ] `valider-relance.md`

### sequences/ (7 workflows)
- [ ] `close-modal.md`
- [ ] `create-sequence.md`
- [ ] `duplicate-sequence.md`
- [ ] `filter-all.md`
- [ ] `filter-relance.md`
- [ ] `filter-suivi.md`
- [ ] `initial-load.md`
- [ ] `new-sequence.md`
- [ ] `set-type-relance.md`

### sequences-relance-detail/ (18 workflows)
- [ ] `ajouter-email.md`
- [ ] `copy-lien.md`
- [ ] `copy-variable.md`
- [ ] `initial-load.md`
- [ ] `lancer-attribution.md`
- [ ] `open-chatgpt.md`
- [ ] `open-ia-modal.md`
- [ ] `open-liens-paiement.md`
- [ ] `sauvegarder.md`
- [ ] `select-scenario-broker.md`
- [ ] `select-scenario-impayes-broker.md`
- [ ] `select-scenario-multiple.md`
- [ ] `select-scenario-single.md`
- [ ] `supprimer-email.md`
- [ ] `supprimer-groupe.md`
- [ ] `tester-email.md`
- [ ] `toggle-attribution-auto.md`
- [ ] `toggle-email.md`
- [ ] `toggle-publication.md`
- [ ] `toggle-scenario-active.md`
- [ ] `toggle-validation.md`

### sequences-suivi-detail/ (14 workflows)
- [ ] `ajouter-email.md`
- [ ] `initial-load.md`
- [ ] `open-ia-modal.md`
- [ ] `sauvegarder.md`
- [ ] `select-heure.md`
- [ ] `select-jour-mois.md`
- [ ] `select-jour-semaine.md`
- [ ] `select-scenario-multiple.md`
- [ ] `select-scenario-single.md`
- [ ] `set-frequence-hebdomadaire.md`
- [ ] `set-frequence-mensuel.md`
- [ ] `set-frequence-quotidien.md`
- [ ] `supprimer-email.md`
- [ ] `tester-email.md`
- [ ] `toggle-collapse.md`
- [ ] `toggle-publication.md`
- [ ] `toggle-validation.md`

### settings-smtp/ (8 workflows)
- [ ] `close-delete-modal.md`
- [ ] `confirm-delete.md`
- [ ] `create-profil.md`
- [ ] `delete-profil.md`
- [ ] `edit-profil.md`
- [ ] `initial-load.md`
- [ ] `new-profil.md`
- [ ] `test-profil.md`

### settings-smtp-detail/ (4 workflows)
- [ ] `initial-load.md`
- [ ] `save-changes.md`
- [ ] `tester-connexion.md`
- [ ] `toggle-password.md`

### settings-utilisateurs/ (5 workflows)
- [ ] `create-user.md`
- [ ] `edit-user.md`
- [ ] `initial-load.md`
- [ ] `open-add-user.md`
- [ ] `update-user.md`

### smart-marki/ (7 workflows)
- [ ] `apply-insight.md`
- [ ] `close-insight.md`
- [ ] `dismiss-insight.md`
- [ ] `initial-load.md`
- [ ] `mark-all-read.md`
- [ ] `open-insight.md`

---

## Phase 4: Backend (29 workflows)

### Auth
- [ ] `auth/auth-login.js` + test

### Cleanup
- [ ] `cleanup/cleanup-all-relances-contact-blackliste.js` + test
- [ ] `cleanup/cleanup-all-relances-paid-impayes.js` + test
- [ ] `cleanup/cleanup-orphan-relances.js` + test
- [ ] `cleanup/cleanup-relances-contact-blackliste.js` + test

### Contacts
- [ ] `contacts/sync-contacts.js` + test
- [ ] `contacts/contacts-blacklist.js` + test

### Generate-relances
- [ ] `generate-relances/generate-contact-token.js` + test
- [ ] `generate-relances/generate-pdf-links.js` + test
- [ ] `generate-relances/generate-relances.js` + test
- [ ] `generate-relances/generate-suivi.js` + test

### Impayes
- [ ] `impayes/get-contact-impayes.js` + test
- [ ] `impayes/impayes-suspend.js` + test
- [ ] `impayes/impayes-unsuspend.js` + test
- [ ] `impayes/verify-paid-invoices.js` + test

### Import
- [ ] `import/import-invoice.js` + test

### Portail-client
- [ ] `portail-client/portail-client.js` + test

### Regenerate-relances
- [ ] `regenerate-relances/regenerate-relances-contact.js` + test
- [ ] `regenerate-relances/regenerate-relances-with-status.js` + test

### Send-emails
- [ ] `send-emails/send-emails.js` + test
- [ ] `send-emails/send-suivi.js` + test
- [ ] `send-emails/test-single.js` + test
- [ ] `send-emails/test-single-suivi.js` + test

### Sequences
- [ ] `sequences/appliquer-regles-attribution.js` + test

### Users-management
- [ ] `users-management/users-management.js` + test

---

## Phase 5: Intégration & Tests

- [ ] Test end-to-end des workflows critiques
- [ ] Validation des routes API
- [ ] Test des portails (client/mission)
- [ ] Vérification responsive
- [ ] Audit accessibilité

---

## Notes

- Les specs sont dans `specs/_app/`
- Les workflows frontend sont dans `specs/_app/frontend/{ecran}/workflows/`
- Les workflows backend sont dans `specs/_app/backend/workflows/`
- Chaque workflow a un fichier `-test.md` associé pour les scénarios de validation
