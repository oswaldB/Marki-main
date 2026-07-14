# TODO - Développement App (par Écran)

## Architecture
- Alpine.js (pas de JS vanilla)
- Tailwind CSS en CDN
- Static pure (HTML + Alpine.js)
- Backend: Node.js avec flat-file DB

---

## ✅ Phase 1: Setup & Structure (TERMINÉ)

- [x] Structure `frontend/` avec dossiers
- [x] `index.html` racine → redirection login
- [x] Composants: sidebar, utils, templates
- [x] Logo et assets communs

---

## Phase 2: Développement par Écran

Pour chaque écran:
1. Créer le backend (API endpoints)
2. Créer le frontend (HTML + Alpine.js)
3. Tester l'intégration

---

### Écran 1: Login
**Priorité:** Critique (bloquant pour tout le reste)

**Backend:**
- [x] `backend/auth-login/index.js` - Endpoint POST `/api/auth/login`
- [x] `backend/api-server.js` - Serveur HTTP minimal
- [x] JWT token generation
- [ ] Middleware de validation JWT (pour les autres routes)

**Frontend:**
- [x] `frontend/login/index.html` - Page de connexion
- [ ] Connecter au vrai endpoint API (actuellement mocké)

**Workflows:**
- [ ] `auth-submit` - Soumission formulaire
- [ ] `initial-load` - Vérifier si déjà connecté

---

### Écran 2: Dashboard
**Priorité:** Haute (premier écran post-login)

**Backend:**
- [ ] `backend/workflows/dashboard/get-dashboard-data.js` - KPIs, événements, top débiteurs
- [ ] `backend/workflows/events/get-events.js` - Liste événements
- [ ] `backend/workflows/sync/sync-data.js` - Synchronisation ADTI

**Frontend:**
- [ ] `frontend/dashboard/index.html` - Tableau de bord complet

**Workflows:**
- [ ] `initial-load` - Charger KPIs et graphiques
- [ ] `sync-data` - Bouton synchroniser
- [ ] `clear-events` - Effacer événements
- [ ] `switch-view-card/list` - Toggle top débiteurs

---

### Écran 3: Contacts
**Priorité:** Haute (données de base)

**Backend:**
- [ ] `backend/workflows/contacts/get-contacts.js` - Liste paginée
- [ ] `backend/workflows/contacts/sync-contacts.js` - Sync ADTI
- [ ] `backend/workflows/contacts/update-contact.js` - Update (email, blacklist)

**Frontend:**
- [ ] `frontend/contacts/index.html` - Liste avec filtres

**Workflows:**
- [ ] `initial-load` - Charger liste
- [ ] `pagination-next/prev` - Pagination
- [ ] `sort-by-*` - Tris (date impayé, nb impayés)
- [ ] `toggle-blacklist` - Blacklister contact
- [ ] `set-email-force` - Forcer email
- [ ] `view-contact` - Voir détail (slideover)
- [ ] `export-data` - Export CSV

---

### Écran 4: Impayés (Liste)
**Priorité:** Haute (core business)

**Backend:**
- [ ] `backend/workflows/impayes/get-impayes.js` - Liste factures impayées
- [ ] `backend/workflows/impayes/save-note.js` - Sauvegarder note

**Frontend:**
- [ ] `frontend/impayes/index.html` - Liste des impayés

**Workflows:**
- [ ] `initial-load` - Charger impayés
- [ ] `pagination-next/prev` - Pagination
- [ ] `sort-by-*` - Tris (dossier, montant, payeur, etc.)
- [ ] `save-note` - Ajouter note
- [ ] `open-detail` - Ouvrir détail
- [ ] `suspend/unsuspend-facture` - Suspendre facture

---

### Écran 5: Impayés Détail
**Priorité:** Haute

**Backend:**
- [ ] `backend/workflows/impayes/get-impaye-detail.js` - Détail facture
- [ ] `backend/workflows/impayes/impayes-suspend.js` - Suspendre
- [ ] `backend/workflows/impayes/impayes-unsuspend.js` - Désuspendre

**Frontend:**
- [ ] `frontend/impayes-detail/index.html` - Détail facture (?id=)

**Workflows:**
- [ ] `initial-load` - Charger détail
- [ ] `suspend/unsuspend-facture` - Toggle suspension
- [ ] `blacklist-facture` - Blacklister
- [ ] `changer-sequence` - Changer séquence
- [ ] `open-pdf` - Voir PDF

---

### Écran 6: Impayés par Payeur
**Priorité:** Moyenne

**Backend:**
- [ ] `backend/workflows/impayes/get-contact-impayes.js` - Impayés d'un contact

**Frontend:**
- [ ] `frontend/impayes-payeur/index.html` - Vue payeur (?id=)

**Workflows:**
- [ ] `initial-load` - Charger impayés du payeur
- [ ] `pagination-next/prev` - Pagination
- [ ] `save-note` - Note sur payeur
- [ ] `open-detail` - Voir facture

---

### Écran 7: Impayés Suspendus
**Priorité:** Moyenne

**Backend:**
- [ ] `backend/workflows/impayes/get-suspended-impayes.js` - Liste suspendus

**Frontend:**
- [ ] `frontend/impayes-suspendus/index.html` - Liste suspendus

**Workflows:**
- [ ] `initial-load` - Charger suspendus
- [ ] `reactivate-impaye` - Réactiver

---

### Écran 8: Relances (Liste)
**Priorité:** Haute (core business)

**Backend:**
- [ ] `backend/workflows/generate-relances/generate-relances.js` - Générer relances
- [ ] `backend/workflows/relances/get-relances.js` - Liste relances
- [ ] `backend/workflows/relances/update-relance.js` - Update statut/note

**Frontend:**
- [ ] `frontend/relances/index.html` - Liste relances

**Workflows:**
- [ ] `initial-load` - Charger relances
- [ ] `create-relance` - Créer nouvelle
- [ ] `edit-relance` - Modifier
- [ ] `cancel-relance` - Annuler
- [ ] `edit-note` - Modifier note
- [ ] `toggle-payeur` - Toggle vue par payeur
- [ ] `view-relance` - Voir détail

---

### Écran 9: Relances Calendrier
**Priorité:** Moyenne

**Backend:**
- [ ] `backend/workflows/relances/get-relances-calendar.js` - Relances par date

**Frontend:**
- [ ] `frontend/relances-calendrier/index.html` - Vue calendrier

**Workflows:**
- [ ] `initial-load` - Charger calendrier
- [ ] `next/previous-period` - Navigation mois/semaine
- [ ] `go-today` - Aller à aujourd'hui
- [ ] `switch-view-month/week` - Toggle vue
- [ ] `open-edit-relance` - Éditer depuis calendrier
- [ ] `save-edit` - Sauver modifications

---

### Écran 10: Relances Validation
**Priorité:** Haute (workflow métier important)

**Backend:**
- [ ] `backend/workflows/relances/validate-relance.js` - Valider relance
- [ ] `backend/workflows/relances/bulk-update.js` - Actions massives

**Frontend:**
- [ ] `frontend/relances-validation/index.html` - Validation en masse

**Workflows:**
- [ ] `initial-load` - Charger relances à valider
- [ ] `filter-*` - Filtres (all, email, today)
- [ ] `select/deselect-relance` - Sélection
- [ ] `valider-relance` - Valider
- [ ] `blacklister-relance` - Blacklister
- [ ] `suspendre-relance` - Suspendre
- [ ] `supprimer-relance` - Supprimer
- [ ] `save-changes` - Sauver modifications

---

### Écran 11: Séquences (Liste)
**Priorité:** Moyenne

**Backend:**
- [ ] `backend/workflows/sequences/get-sequences.js` - Liste séquences
- [ ] `backend/workflows/sequences/create-sequence.js` - Créer
- [ ] `backend/workflows/sequences/update-sequence.js` - Modifier

**Frontend:**
- [ ] `frontend/sequences/index.html` - Liste séquences

**Workflows:**
- [ ] `initial-load` - Charger séquences
- [ ] `filter-*` - Filtres (all, relance, suivi)
- [ ] `create-sequence` - Créer nouvelle
- [ ] `duplicate-sequence` - Dupliquer
- [ ] `set-type-relance` - Changer type

---

### Écran 12: Séquences Détail (Relance)
**Priorité:** Moyenne (complexe)

**Backend:**
- [ ] `backend/workflows/sequences/get-sequence-detail.js` - Détail séquence
- [ ] `backend/workflows/sequences/save-sequence.js` - Sauvegarder
- [ ] `backend/workflows/sequences/appliquer-regles-attribution.js` - Attribution auto

**Frontend:**
- [ ] `frontend/sequences-relance-detail/index.html` - Configuration relance (?id=)

**Workflows:**
- [ ] `initial-load` - Charger configuration
- [ ] `sauvegarder` - Sauver
- [ ] `ajouter/supprimer-email` - Gérer emails
- [ ] `toggle-*` - Toggles (attribution, validation, publication, etc.)
- [ ] `select-scenario-*` - Sélection scénarios
- [ ] `lancer-attribution` - Lancer attribution
- [ ] `tester-email` - Tester email
- [ ] `open-*` - Ouvrir modaux (ChatGPT, IA, liens)
- [ ] `copy-*` - Copier lien/variable

---

### Écran 13: Séquences Détail (Suivi)
**Priorité:** Moyenne

**Backend:**
- [ ] `backend/workflows/sequences/get-sequence-suivi.js` - Détail suivi

**Frontend:**
- [ ] `frontend/sequences-suivi-detail/index.html` - Configuration suivi (?id=)

**Workflows:**
- [ ] `initial-load` - Charger configuration
- [ ] `sauvegarder` - Sauvegarder
- [ ] `set-frequence-*` - Fréquences (quotidien, hebdo, mensuel)
- [ ] `select-*` - Sélections (heure, jour)
- [ ] `ajouter/supprimer-email` - Gérer emails
- [ ] `tester-email` - Tester

---

### Écran 14: Événements
**Priorité:** Basse

**Backend:**
- [ ] `backend/workflows/events/get-events.js` - Liste événements
- [ ] `backend/workflows/events/mark-read.js` - Marquer comme lu

**Frontend:**
- [ ] `frontend/evenements/index.html` - Journal événements

**Workflows:**
- [ ] `initial-load` - Charger événements
- [ ] `filter-*` - Filtres (all, unread)
- [ ] `mark-as-read` - Marquer lu
- [ ] `mark-all-read` - Tout marquer lu
- [ ] `open-event` - Voir détail

---

### Écran 15: Smart Marki (IA)
**Priorité:** Basse (feature avancée)

**Backend:**
- [ ] `backend/workflows/smart-marki/get-insights.js` - Recommandations IA

**Frontend:**
- [ ] `frontend/smart-marki/index.html` - Assistant IA

**Workflows:**
- [ ] `initial-load` - Charger insights
- [ ] `open/close-insight` - Voir détail
- [ ] `apply-insight` - Appliquer recommandation
- [ ] `dismiss-insight` - Ignorer

---

### Écran 16: Settings SMTP (Liste)
**Priorité:** Moyenne

**Backend:**
- [ ] `backend/workflows/smtp/get-smtp-profiles.js` - Liste profils
- [ ] `backend/workflows/smtp/create-update-profile.js` - CRUD

**Frontend:**
- [ ] `frontend/settings-smtp/index.html` - Liste profils SMTP

**Workflows:**
- [ ] `initial-load` - Charger profils
- [ ] `create/edit/delete-profil` - CRUD
- [ ] `test-profil` - Tester connexion

---

### Écran 17: Settings SMTP Détail
**Priorité:** Moyenne

**Backend:**
- [ ] `backend/workflows/smtp/test-smtp-connection.js` - Test connexion

**Frontend:**
- [ ] `frontend/settings-smtp-detail/index.html` - Configuration profil (?id=)

**Workflows:**
- [ ] `initial-load` - Charger profil
- [ ] `save-changes` - Sauver
- [ ] `tester-connexion` - Tester
- [ ] `toggle-password` - Show/hide password

---

### Écran 18: Settings Utilisateurs
**Priorité:** Haute (admin)

**Backend:**
- [ ] `backend/workflows/users/get-users.js` - Liste utilisateurs
- [ ] `backend/workflows/users/create-user.js` - Créer
- [ ] `backend/workflows/users/update-user.js` - Modifier

**Frontend:**
- [ ] `frontend/settings-utilisateurs/index.html` - Gestion utilisateurs

**Workflows:**
- [ ] `initial-load` - Charger utilisateurs
- [ ] `open-add-user` - Ouvrir modal création
- [ ] `create-user` - Créer
- [ ] `edit/update-user` - Modifier

---

### Écran 19: Portail Client
**Priorité:** Haute (externe)

**Backend:**
- [ ] `backend/workflows/portail-client/validate-token.js` - Validation token
- [ ] `backend/workflows/portail-client/get-factures.js` - Factures client
- [ ] `backend/workflows/portail-client/get-portail-data.js` - Données portail

**Frontend:**
- [ ] `frontend/portail-client/index.html` - Portail client (?token=)

**Workflows:**
- [ ] `initial-load` - Valider token + charger données
- [ ] `switch-tab-*` - Onglets (factures, apporteur)
- [ ] `download-facture` - Télécharger PDF
- [ ] `regler-facture` - Payer (redirection)

---

### Écran 20: Portail Mission
**Priorité:** Haute (externe)

**Backend:**
- [ ] `backend/workflows/portail-mission/get-mission-data.js` - Données mission

**Frontend:**
- [ ] `frontend/portail-mission/index.html` - Portail mission (?token=)

**Workflows:**
- [ ] `initial-load` - Charger données
- [ ] `logout` - Déconnexion
- [ ] `download-facture` - Télécharger
- [ ] `regler-facture` - Payer

---

## Phase 3: Workflows Backend Additionnels (Non liés à un écran)

### Import & Synchronisation
- [ ] `backend/workflows/import/import-invoice.js` - Import factures ADTI
- [ ] `backend/workflows/cleanup/*.js` - Cleanup jobs (orphan, blacklist, etc.)

### Génération & Envoi
- [ ] `backend/workflows/generate-relances/generate-pdf-links.js` - Générer liens PDF
- [ ] `backend/workflows/generate-relances/generate-contact-token.js` - Tokens portail
- [ ] `backend/workflows/generate-relances/generate-suivi.js` - Générer suivis

### Vérification & Regénération
- [ ] `backend/workflows/impayes/verify-paid-invoices.js` - Vérifier paiements
- [ ] `backend/workflows/regenerate-relances/*.js` - Régénération

### Envoi Emails
- [ ] `backend/workflows/send-emails/send-emails.js` - Envoi relances
- [ ] `backend/workflows/send-emails/send-suivi.js` - Envoi suivis
- [ ] `backend/workflows/send-emails/test-single.js` - Test single email

---

## Phase 4: Intégration & Tests Finaux

- [ ] Tests end-to-end critiques (login → dashboard → relances)
- [ ] Tests portails (client/mission)
- [ ] Tests responsives tous écrans
- [ ] Audit accessibilité
- [ ] Documentation API

---

## Notes

**Structure fichiers:**
- Frontend: `frontend/{ecran}/index.html`
- Backend: `backend/workflows/{domaine}/{workflow}.js`
- Specs: `specs/_app/frontend/{ecran}/workflows/{workflow}.md`

**Priorité de développement suggérée:**
1. Login (backend auth)
2. Dashboard (lecture seule, bon pour tester)
3. Contacts (CRUD simple)
4. Impayés (core métier)
5. Relances (core métier)
6. Séquences (config)
7. Portails (externes)
8. Le reste
