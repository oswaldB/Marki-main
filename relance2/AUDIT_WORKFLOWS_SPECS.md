# AUDIT EXHAUSTIF - Workflows et Routes dans specs/_app/

**Date:** 2024-07-15  
**Projet:** marki/relance2  
**Répertoire:** specs/_app/

---

## SOMMAIRE

1. [Structure globale](#1-structure-globale)
2. [Backend Workflows](#2-backend-workflows-specs_appworkflows)
3. [Frontend Workflows par Page](#3-frontend-workflows-specs_appstaticpages)
4. [Routes API](#4-routes-api-specs_approutes)
5. [Stores](#5-stores-specs_appstaticpagesstore)
6. [Synthèse](#6-synthèse)

---

## 1. STRUCTURE GLOBALE

```
specs/_app/
├── routes/              # Documentation Routes API
├── static/
│   ├── components/      # Composants JS réutilisables
│   └── pages/           # Workflows frontend par page
│       ├── dashboard/
│       ├── login/
│       ├── contacts/
│       ├── impayes/
│       └── ...
└── workflows/           # Workflows backend (CRON/batch)
```

---

## 2. BACKEND WORKFLOWS (specs/_app/workflows/)

### 2.1 Liste complète des workflows backend

| # | Fichier | Type | Description |
|---|---------|------|-------------|
| 1 | `appliquer-regles-attribution.md` | CRON | Attribution automatique des contacts aux séquences |
| 2 | `auth-login.md` | API | Authentification utilisateur (JWT) |
| 3 | `cleanup-all-relances-contact-blackliste.md` | CRON | Annulation de toutes les relances pour contacts blacklistés |
| 4 | `cleanup-all-relances-paid-impayes.md` | CRON | Clôture des relances pour impayés payés |
| 5 | `cleanup-orphan-relances.md` | CRON | Suppression des relances orphelines (sans contact) |
| 6 | `cleanup-relances-contact-blackliste.md` | API | Annulation relances pour un contact blacklisté |
| 7 | `contacts-blacklist.md` | API | Toggle blacklist sur un contact |
| 8 | `generate-contact-token.md` | API | Génération token portail client |
| 9 | `generate-pdf-links.md` | API | Génération liens PDF sécurisés |
| 10 | `generate-relances.md` | CRON | Génération automatique des relances |
| 11 | `generate-suivi.md` | CRON | Génération automatique des suivis |
| 12 | `get-contact-impayes.md` | API | Récupération impayés d'un contact |
| 13 | `impayes-suspend.md` | API | Suspension d'un impayé |
| 14 | `impayes-unsuspend.md` | API | Réactivation d'un impayé suspendu |
| 15 | `import-invoice.md` | API | Import de factures depuis ADTI |
| 16 | `portail-client.md` | API | Actions du portail client (token validation, etc.) |
| 17 | `regenerate-relances-contact.md` | API | Régénération relances pour un contact spécifique |
| 18 | `regenerate-relances-with-status.md` | API | Régénération relances par statut |
| 19 | `send-emails.md` | CRON | Envoi des emails de relance |
| 20 | `send-suivi.md` | CRON | Envoi des emails de suivi |
| 21 | `sync-contacts.md` | CRON | Synchronisation contacts depuis CRM |
| 22 | `users-management.md` | API | Gestion utilisateurs (CRUD avancé) |
| 23 | `verify-paid-invoices.md` | CRON | Vérification des factures payées |

**Total: 23 workflows backend**

---

## 3. FRONTEND WORKFLOWS PAR PAGE

### 3.1 Dashboard (specs/_app/static/pages/dashboard/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/clear-events.md` | UI | Effacer les événements affichés |
| `workflows/initial-load.md` | DATA | Chargement initial des données dashboard |
| `workflows/refresh-stats.md` | DATA | Rafraîchissement des statistiques |
| `workflows/switch-view-card.md` | UI | Basculer vue carte |
| `workflows/switch-view-list.md` | UI | Basculer vue liste |
| `workflows/sync-data.md` | API | Synchronisation des données |

**Total Dashboard: 6 workflows**

### 3.2 Login (specs/_app/static/pages/login/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/auth-submit.md` | API | Soumission formulaire d'authentification |
| `workflows/initial-load.md` | UI | Chargement initial de la page |

**Total Login: 2 workflows**

### 3.3 Contacts (specs/_app/static/pages/contacts/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/close-detail-slideover.md` | UI | Fermer le panneau latéral détail |
| `workflows/export-data.md` | DATA | Export des contacts |
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/pagination-next.md` | UI | Page suivante |
| `workflows/pagination-prev.md` | UI | Page précédente |
| `workflows/set-email-force.md` | UI | Forcer l'email sur un contact |
| `workflows/sort-by-date-impaye.md` | UI | Trier par date impayé |
| `workflows/sort-by-impayes.md` | UI | Trier par nombre d'impayés |
| `workflows/toggle-blacklist.md` | API | Toggle statut blacklist |
| `workflows/toggle-dropdown.md` | UI | Ouvrir/fermer dropdown |
| `workflows/view-contact.md` | UI | Voir détail contact |

**Total Contacts: 11 workflows**

### 3.4 Impayés (specs/_app/static/pages/impayes/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/open-detail.md` | UI | Ouvrir détail impayé |
| `workflows/pagination-next.md` | UI | Page suivante |
| `workflows/pagination-prev.md` | UI | Page précédente |
| `workflows/save-note.md` | API | Sauvegarder une note |
| `workflows/sort-by-dossier.md` | UI | Trier par dossier |
| `workflows/sort-by-montant.md` | UI | Trier par montant |
| `workflows/sort-by-numero.md` | UI | Trier par numéro |
| `workflows/sort-by-payeur.md` | UI | Trier par payeur |
| `workflows/sort-by-reste.md` | UI | Trier par reste à payer |
| `workflows/suspend-facture.md` | API | Suspendre facture |
| `workflows/sync-data.md` | API | Synchroniser données |
| `workflows/unsuspend-facture.md` | API | Réactiver facture |

**Total Impayés: 13 workflows**

### 3.5 Impayés Détail (specs/_app/static/pages/impayes-detail/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/blacklist-facture.md` | API | Blacklister facture |
| `workflows/changer-sequence.md` | API | Changer séquence de relance |
| `workflows/initial-load.md` | DATA | Chargement détail |
| `workflows/open-pdf.md` | UI | Ouvrir PDF facture |
| `workflows/suspend-facture.md` | API | Suspendre facture |
| `workflows/unsuspend-facture.md` | API | Réactiver facture |

**Total Impayés Détail: 6 workflows**

### 3.6 Impayés Payeur (specs/_app/static/pages/impayes-payeur/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/close-detail.md` | UI | Fermer détail |
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/open-detail.md` | UI | Ouvrir détail payeur |
| `workflows/pagination-next.md` | UI | Page suivante |
| `workflows/pagination-prev.md` | UI | Page précédente |
| `workflows/save-note.md` | API | Sauvegarder note |
| `workflows/sync-data.md` | API | Synchroniser |

**Total Impayés Payeur: 7 workflows**

### 3.7 Impayés Réparer (specs/_app/static/pages/impayes-reparer/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/view-reparer.md` | UI | Voir à réparer |

**Total Impayés Réparer: 2 workflows**

### 3.8 Impayés Suspendus (specs/_app/static/pages/impayes-suspendus/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/reactivate-impaye.md` | API | Réactiver impayé suspendu |

**Total Impayés Suspendus: 2 workflows**

### 3.9 Événements (specs/_app/static/pages/evenements/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/close-modal.md` | UI | Fermer modal |
| `workflows/filter-all.md` | UI | Filtrer tous |
| `workflows/filter-unread.md` | UI | Filtrer non lus |
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/mark-all-read.md` | API | Marquer tous lus |
| `workflows/mark-as-read.md` | API | Marquer comme lu |
| `workflows/open-event.md` | UI | Ouvrir événement |

**Total Événements: 7 workflows**

### 3.10 Portail Client (specs/_app/static/pages/portail-client/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/download-facture.md` | API | Télécharger facture PDF |
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/regler-facture.md` | API | Payer facture (lien Stripe) |
| `workflows/switch-tab-apporteur.md` | UI | Onglet apporteur |
| `workflows/switch-tab-factures.md` | UI | Onglet factures |

**Total Portail Client: 5 workflows**

### 3.11 Portail Mission (specs/_app/static/pages/portail-mission/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/download-facture.md` | API | Télécharger facture |
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/logout.md` | UI | Déconnexion |
| `workflows/regler-facture.md` | API | Régler facture |

**Total Portail Mission: 4 workflows**

### 3.12 Portail (specs/_app/static/pages/portail/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/initial-load.md` | DATA | Chargement initial |

**Total Portail: 1 workflow**

### 3.13 Relances (specs/_app/static/pages/relances/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/cancel-relance.md` | API | Annuler relance |
| `workflows/close-modal.md` | UI | Fermer modal |
| `workflows/create-relance.md` | API | Créer relance |
| `workflows/edit-note.md` | UI | Éditer note |
| `workflows/edit-relance.md` | UI | Éditer relance |
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/new-relance.md` | UI | Nouvelle relance (UI) |
| `workflows/toggle-payeur.md` | UI | Toggle affichage payeur |
| `workflows/view-relance.md` | UI | Voir relance |

**Total Relances: 9 workflows**

### 3.14 Relances Calendrier (specs/_app/static/pages/relances-calendrier/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/close-modal.md` | UI | Fermer modal |
| `workflows/go-today.md` | UI | Aller à aujourd'hui |
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/next-period.md` | UI | Période suivante |
| `workflows/open-edit-relance.md` | UI | Ouvrir édition relance |
| `workflows/previous-period.md` | UI | Période précédente |
| `workflows/save-edit.md` | API | Sauvegarder édition |
| `workflows/switch-view-month.md` | UI | Vue mois |
| `workflows/switch-view-week.md` | UI | Vue semaine |

**Total Relances Calendrier: 9 workflows**

### 3.15 Relances Validation (specs/_app/static/pages/relances-validation/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/blacklister-relance.md` | API | Blacklister |
| `workflows/deselect-relance.md` | UI | Désélectionner |
| `workflows/filter-all.md` | UI | Tous les filtres |
| `workflows/filter-email.md` | UI | Filtrer email |
| `workflows/filter-today.md` | UI | Filtrer aujourd'hui |
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/save-changes.md` | API | Sauvegarder modifications |
| `workflows/select-relance.md` | UI | Sélectionner relance |
| `workflows/supprimer-relance.md` | API | Supprimer relance |
| `workflows/suspendre-relance.md` | API | Suspendre relance |
| `workflows/valider-relance.md` | API | Valider envoi relance |

**Total Relances Validation: 11 workflows**

### 3.16 Relances Détail (specs/_app/static/pages/relances-detail/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/initial-load.md` | DATA | Chargement détail |

**Total Relances Détail: 1 workflow**

### 3.17 Séquences (specs/_app/static/pages/sequences/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/close-modal.md` | UI | Fermer modal |
| `workflows/create-sequence.md` | API | Créer séquence |
| `workflows/duplicate-sequence.md` | API | Dupliquer séquence |
| `workflows/filter-all.md` | UI | Tous |
| `workflows/filter-relance.md` | UI | Filtrer relances |
| `workflows/filter-suivi.md` | UI | Filtrer suivis |
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/new-sequence.md` | UI | Nouvelle séquence (UI) |
| `workflows/set-type-relance.md` | UI | Type relance |

**Total Séquences: 9 workflows**

### 3.18 Séquences Relance Détail (specs/_app/static/pages/sequences-relance-detail/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/ajouter-email.md` | UI | Ajouter email |
| `workflows/copy-lien.md` | UI | Copier lien paiement |
| `workflows/copy-variable.md` | UI | Copier variable template |
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/lancer-attribution.md` | API | Lancer attribution auto |
| `workflows/open-chatgpt.md` | UI | Ouvrir ChatGPT |
| `workflows/open-ia-modal.md` | UI | Ouvrir modal IA |
| `workflows/open-liens-paiement.md` | UI | Ouvrir liens paiement |
| `workflows/sauvegarder.md` | API | Sauvegarder |
| `workflows/select-scenario-broker.md` | UI | Sélectionner scénario broker |
| `workflows/select-scenario-impayes-broker.md` | UI | Sélectionner scénario impayés broker |
| `workflows/select-scenario-multiple.md` | UI | Sélectionner scénario multiple |
| `workflows/select-scenario-single.md` | UI | Sélectionner scénario simple |
| `workflows/supprimer-email.md` | UI | Supprimer email |
| `workflows/supprimer-groupe.md` | UI | Supprimer groupe |
| `workflows/tester-email.md` | API | Tester email |
| `workflows/toggle-attribution-auto.md` | API | Toggle attribution auto |
| `workflows/toggle-email.md` | UI | Toggle email |
| `workflows/toggle-publication.md` | API | Toggle publication |
| `workflows/toggle-scenario-active.md` | UI | Toggle actif scénario |
| `workflows/toggle-validation.md` | API | Toggle validation requise |

**Total Séquences Relance Détail: 21 workflows**

### 3.19 Séquences Suivi Détail (specs/_app/static/pages/sequences-suivi-detail/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/ajouter-email.md` | UI | Ajouter email |
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/open-ia-modal.md` | UI | Ouvrir modal IA |
| `workflows/sauvegarder.md` | API | Sauvegarder |
| `workflows/select-heure.md` | UI | Sélectionner heure |
| `workflows/select-jour-mois.md` | UI | Sélectionner jour du mois |
| `workflows/select-jour-semaine.md` | UI | Sélectionner jour semaine |
| `workflows/select-scenario-multiple.md` | UI | Scénario multiple |
| `workflows/select-scenario-single.md` | UI | Scénario simple |
| `workflows/set-frequence-hebdomadaire.md` | UI | Fréquence hebdo |
| `workflows/set-frequence-mensuel.md` | UI | Fréquence mensuelle |
| `workflows/set-frequence-quotidien.md` | UI | Fréquence quotidienne |
| `workflows/supprimer-email.md` | UI | Supprimer email |
| `workflows/tester-email.md` | API | Tester email |
| `workflows/toggle-collapse.md` | UI | Toggle collapse |
| `workflows/toggle-publication.md` | API | Toggle publication |
| `workflows/toggle-validation.md` | API | Toggle validation |

**Total Séquences Suivi Détail: 17 workflows**

### 3.20 Settings SMTP (specs/_app/static/pages/settings-smtp/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/close-delete-modal.md` | UI | Fermer modal suppression |
| `workflows/confirm-delete.md` | UI | Confirmer suppression |
| `workflows/create-profil.md` | API | Créer profil SMTP |
| `workflows/delete-profil.md` | API | Supprimer profil |
| `workflows/edit-profil.md` | UI | Éditer profil |
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/new-profil.md` | UI | Nouveau profil (UI) |
| `workflows/test-profil.md` | API | Tester connexion SMTP |

**Total Settings SMTP: 8 workflows**

### 3.21 Settings SMTP Détail (specs/_app/static/pages/settings-smtp-detail/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/initial-load.md` | DATA | Chargement détail |
| `workflows/save-changes.md` | API | Sauvegarder modifications |
| `workflows/tester-connexion.md` | API | Tester connexion |
| `workflows/toggle-password.md` | UI | Toggle visibilité password |

**Total Settings SMTP Détail: 4 workflows**

### 3.22 Settings Users (specs/_app/static/pages/settings-users/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/initial-load.md` | DATA | Chargement initial |

**Total Settings Users: 1 workflow**

### 3.23 Settings Utilisateurs (specs/_app/static/pages/settings-utilisateurs/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/create-user.md` | API | Créer utilisateur |
| `workflows/edit-user.md` | UI | Éditer utilisateur |
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/open-add-user.md` | UI | Ouvrir ajout utilisateur |
| `workflows/update-user.md` | API | Mettre à jour utilisateur |

**Total Settings Utilisateurs: 5 workflows**

### 3.24 Settings (specs/_app/static/pages/settings/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/initial-load.md` | DATA | Chargement initial |

**Total Settings: 1 workflow**

### 3.25 Smart Marki (specs/_app/static/pages/smart-marki/)

| Fichier | Type | Description |
|---------|------|-------------|
| `workflows/apply-insight.md` | API | Appliquer recommandation |
| `workflows/close-insight.md` | UI | Fermer insight |
| `workflows/dismiss-insight.md` | API | Ignorer recommandation |
| `workflows/initial-load.md` | DATA | Chargement initial |
| `workflows/mark-all-read.md` | API | Marquer tout lu |
| `workflows/open-insight.md` | UI | Ouvrir recommandation |

**Total Smart Marki: 6 workflows**

---

## 4. ROUTES API (specs/_app/routes/)

| # | Fichier | Préfixe | Endpoints documentés |
|---|---------|---------|---------------------|
| 1 | `auth.md` | `/api/auth` | login, logout, me, refresh |
| 2 | `contacts.md` | `/api/contacts` | list, get, create, update, delete, impayes |
| 3 | `events.md` | `/api/events` | list, create |
| 4 | `impayes.md` | `/api/impayes` | list, get, create, update, suspend, unsuspend |
| 5 | `import_data.md` | `/api/import` | import_invoice |
| 6 | `pages.md` | `/` | routes pages statiques |
| 7 | `portail.md` | `/api/portail` | validate_token, download, pay |
| 8 | `relances.md` | `/api/relances` | list, get, create, update, delete |
| 9 | `sequences.md` | `/api/sequences` | list, get, create, update, delete |
| 10 | `smtp.md` | `/api/smtp` | list, get, create, update, delete, test |
| 11 | `tokens.md` | `/api/tokens` | generate, validate, revoke |
| 12 | `users.md` | `/api/users` | list, get, create, update, delete |
| 13 | `workflow.md` | `/api/workflow` | generic endpoint workflows |

**Total: 13 fichiers de documentation routes**

---

## 5. STORES (specs/_app/static/pages/*/store/)

| Page | Store | Méthodes |
|------|-------|----------|
| contacts | `store.md` | init, load, sort, paginate, toggle, view |
| dashboard | `store.md` | init, loadData, fetchApi, calculateStats, calculateTopDebtors, calculateChartData, generateSmartMarkiConseils, initChart, setDemoData, syncData, clearEvents |
| evenements | `store.md` | init, load, filter, markRead |
| impayes | `store.md` | init, load, sort, paginate, suspend, unsuspend |
| impayes-detail | `store.md` | init, load, suspend, unsuspend, blacklist, changeSequence |
| impayes-payeur | `store.md` | init, load, paginate, view, saveNote |
| impayes-reparer | `store.md` | init, load, view |
| impayes-suspendus | `store.md` | init, load, reactivate |
| login | `store.md` | init, validate, submitLogin, loginSuccess |
| portail-client | `store.md` | init, load, switchTab, download, pay |
| portail | `store.md` | init |
| relances | `store.md` | init, load, create, edit, cancel, togglePayeur |
| relances-calendrier | `store.md` | init, load, switchView, navigate, editRelance |
| relances-detail | `store.md` | init, load |
| relances-validation | `store.md` | init, load, filter, select, validate, suspend, blacklist, delete |
| sequences | `store.md` | init, load, filter, create, duplicate |
| sequences-relance-detail | `store.md` | init, load, save, toggle, testEmail, addEmail, deleteEmail |
| sequences-suivi-detail | `store.md` | init, load, save, toggle, testEmail, setFrequence |
| settings | `store.md` | init |
| settings-smtp | `store.md` | init, load, create, edit, delete, test |
| settings-smtp-detail | `store.md` | init, load, save, test, togglePassword |
| settings-users | `store.md` | init, load |
| settings-utilisateurs | `store.md` | init, load, create, edit, update |
| smart-marki | `store.md` | init, load, openInsight, closeInsight, applyInsight, dismissInsight, markAllRead |

**Total: 24 stores documentés**

---

## 6. SYNTHÈSE

### Totaux par catégorie

| Catégorie | Nombre |
|-----------|--------|
| Workflows Backend (CRON/API) | 23 |
| Workflows Frontend Dashboard | 6 |
| Workflows Frontend Login | 2 |
| Workflows Frontend Contacts | 11 |
| Workflows Frontend Impayés | 13 |
| Workflows Frontend Impayés Détail | 6 |
| Workflows Frontend Impayés Payeur | 7 |
| Workflows Frontend Impayés Réparer | 2 |
| Workflows Frontend Impayés Suspendus | 2 |
| Workflows Frontend Événements | 7 |
| Workflows Frontend Portail Client | 5 |
| Workflows Frontend Portail Mission | 4 |
| Workflows Frontend Portail | 1 |
| Workflows Frontend Relances | 9 |
| Workflows Frontend Relances Calendrier | 9 |
| Workflows Frontend Relances Validation | 11 |
| Workflows Frontend Relances Détail | 1 |
| Workflows Frontend Séquences | 9 |
| Workflows Frontend Séquences Relance Détail | 21 |
| Workflows Frontend Séquences Suivi Détail | 17 |
| Workflows Frontend Settings SMTP | 8 |
| Workflows Frontend Settings SMTP Détail | 4 |
| Workflows Frontend Settings Users | 1 |
| Workflows Frontend Settings Utilisateurs | 5 |
| Workflows Frontend Settings | 1 |
| Workflows Frontend Smart Marki | 6 |
| **TOTAL WORKFLOWS FRONTEND** | **171** |
| **TOTAL WORKFLOWS BACKEND** | **23** |
| **GRAND TOTAL WORKFLOWS** | **194** |

### Répartition par type

| Type | Nombre | Description |
|------|--------|-------------|
| DATA | ~60 | Chargement, synchronisation, calculs |
| UI | ~100 | Interactions interface (modales, filtres, vues) |
| API | ~34 | Appels serveur (CRUD, actions métier) |

---

**Document d'audit généré le:** 2024-07-15  
**Prochaine étape:** Implémentation des console.log dans chaque workflow
