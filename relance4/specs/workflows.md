# Inventaire des workflows ADTI

**Source** : specs/features/*.md  
**Date** : 2026-06-30  
**Architecture** : Frontend Static + AlpineJS / Backend Flat-Files (LokiJS + YAML)

---

## Architecture Backend

Le backend utilise une **Flat Files Database** avec les principes suivants :
- **Stockage** : 1 fichier YAML = 1 entité
- **Indexation** : LokiJS en mémoire (rebuild au démarrage)
- **Locking** : proper-lockfile pour accès concurrents
- **API** : Express REST JSON

### Collections YAML

| Collection | Dossier | Fichier |
|-------------|---------|---------|
| Factures | `data/factures/` | `facture_{id}.yml` |
| Payers | `data/payers/` | `payer_{id}.yml` |
| Contacts | `data/contacts/` | `contact_{id}.yml` |
| Impayés | `data/impayes/` | `impaye_{id}.yml` |
| Relances | `data/relances/` | `relance_{id}.yml` |
| Séquences | `data/sequences/` | `sequence_{id}.yml` |
| Logs | `data/logs/` | `log_{timestamp}.yml` |

---

## F-001 : Import de données

### Workflows frontend (écran : importer)

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `upload-fichier` | `specs/_app/frontend/importer/workflows/upload-fichier/` | Gérer le drag & drop et sélection fichier |
| `preview-import` | `specs/_app/frontend/importer/workflows/preview-import/` | Afficher l'aperçu des données et mapping |
| `valider-import` | `specs/_app/frontend/importer/workflows/valider-import/` | Valider et envoyer au backend |

### Workflows backend

| Workflow | Dossier spec | Justification |
|----------|--------------|---------------|
| `parse-csv` | `specs/_app/backend/workflows/parse-csv/` | Parsing CSV/Excel avec validation format |
| `enregistrer-factures` | `specs/_app/backend/workflows/enregistrer-factures/` | Création fichiers YAML avec locking |

---

## F-002 : Tableau de bord

### Workflows frontend (écran : dashboard)

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `charger-kpis` | `specs/_app/frontend/dashboard/workflows/charger-kpis/` | Calculer et afficher les KPIs globaux via API |
| `charger-top-debiteurs` | `specs/_app/frontend/dashboard/workflows/charger-top-debiteurs/` | Charger les 10 plus gros débiteurs |
| `charger-graphique` | `specs/_app/frontend/dashboard/workflows/charger-graphique/` | Générer le graphique évolution 12 mois |
| `refresh-auto` | `specs/_app/frontend/dashboard/workflows/refresh-auto/` | Rafraîchir toutes les 5 minutes |

### Workflows backend

**Pas de routes `/api/dashboard/` dédiées.** Les KPIs sont calculés côté frontend en agrégeant les données des API existantes :
- `GET /api/impayes` → stats impayés
- `GET /api/relances` → stats relances  
- `GET /api/contacts` → stats contacts
- `GET /api/events` → données temporelles

Le frontend effectue les calculs (totaux, moyennes, agrégations).

---

## F-003 : Liste des factures

### Workflows frontend (écran : liste-factures)

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `charger-factures` | `specs/_app/frontend/liste-factures/workflows/charger-factures/` | Charger la liste paginée via API |
| `filtrer-statut` | `specs/_app/frontend/liste-factures/workflows/filtrer-statut/` | Appliquer le filtre par statut |
| `trier-colonnes` | `specs/_app/frontend/liste-factures/workflows/trier-colonnes/` | Gérer le tri ASC/DESC sur colonnes |
| `rechercher` | `specs/_app/frontend/liste-factures/workflows/rechercher/` | Recherche temps réel numéro/client |
| `paginer` | `specs/_app/frontend/liste-factures/workflows/paginer/` | Gérer la pagination |

### Workflows backend

**Opérations CRUD natives** (via `flat-file-db.js`) :
- `GET /api/factures` → `db.query('factures')` avec filtres/pagination
- `GET /api/factures/:id` → `db.read('factures', id)`

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `query-factures` | `specs/_app/backend/workflows/query-factures/` | Query LokiJS avec filtres, tri, pagination |

---

## F-004 : Fiche client

### Workflows frontend (écran : fiche-client)

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `charger-client` | `specs/_app/frontend/fiche-client/workflows/charger-client/` | Charger les infos du payer |
| `charger-historique` | `specs/_app/frontend/fiche-client/workflows/charger-historique/` | Charger l'historique des factures |
| `calculer-score` | `specs/_app/frontend/fiche-client/workflows/calculer-score/` | Calculer le score A/B/C/D |
| `afficher-solde` | `specs/_app/frontend/fiche-client/workflows/afficher-solde/` | Calculer et afficher le solde débiteur |

### Workflows backend

**Opérations CRUD natives** (via `flat-file-db.js`) :
- `GET /api/payers` → `db.query('payers')`
- `GET /api/payers/:id` → `db.read('payers', id)`

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `get-payer-with-factures` | `specs/_app/backend/workflows/get-payer-with-factures/` | Requête avec jointure via facturesParPayer view |
| `calculer-score-payer` | `specs/_app/backend/workflows/calculer-score-payer/` | Algorithme de scoring basé sur historique YAML |

---

## F-005 : Détection anomalies

### Workflows frontend (écran : dashboard)

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `detecter-risques` | `specs/_app/frontend/dashboard/workflows/detecter-risques/` | Algorithme de détection clients à risque |
| `afficher-alertes` | `specs/_app/frontend/dashboard/workflows/afficher-alertes/` | Afficher la liste des alertes détectées |
| `ignorer-alerte` | `specs/_app/frontend/dashboard/workflows/ignorer-alerte/` | Masquer une alerte avec raison |

### Workflows backend

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `detect-anomalies` | `specs/_app/backend/workflows/detect-anomalies/` | Analyse des patterns sur collections LokiJS |

---

## F-006 : Export rapports

### Workflows frontend (global)

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `preparer-export` | `specs/_app/frontend/global/workflows/preparer-export/` | Ouvrir le modal et préparer les données |
| `generer-pdf` | `specs/_app/frontend/global/workflows/generer-pdf/` | Générer le PDF côté client (ou appel API) |
| `generer-excel` | `specs/_app/frontend/global/workflows/generer-excel/` | Générer le fichier Excel côté client |
| `telecharger` | `specs/_app/frontend/global/workflows/telecharger/` | Déclencher le téléchargement |

### Workflows backend

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `export-data` | `specs/_app/backend/workflows/export-data/` | Export JSON/CSV depuis collections LokiJS |

---

## F-007 : Relances email

### Workflows frontend (global)

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `preparer-template` | `specs/_app/frontend/global/workflows/preparer-template/` | Pré-remplir le template de relance |
| `editer-message` | `specs/_app/frontend/global/workflows/editer-message/` | Gérer l'édition du message |
| `envoyer-email` | `specs/_app/frontend/global/workflows/envoyer-email/` | Appeler l'API d'envoi d'email |
| `historiser-relance` | `specs/_app/frontend/fiche-client/workflows/historiser-relance/` | Mettre à jour l'historique après envoi |

### Workflows backend

**Opérations CRUD natives** (via `flat-file-db.js`) :
- `GET /api/relances` → `db.query('relances')` avec filtres
- `POST /api/relances` → `db.create('relances', {...})` avec validation basique

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `send-emails` | `specs/workflows/backend/send-emails.md` | Envoi SMTP réel avec retry |
| `relances-validate` | `specs/workflows/backend/relances-validate.md` | Validation + envoi conditionnel |
| `relances-cancel` | `specs/workflows/backend/relances-cancel.md` | Annulation relance programmée |
| `log-relance` | `specs/_app/backend/workflows/log-relance/` | Création fichier YAML de log |

---

## F-008 : Blacklist des Impayés

### Workflows frontend (écran : fiche-facture)

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `toggle-blacklist-impaye` | `specs/_app/frontend/fiche-facture/workflows/toggle-blacklist-impaye/` | Met/retirer blacklist avec régénération |
| `verifier-blacklist` | `specs/_app/frontend/fiche-facture/workflows/verifier-blacklist/` | Vérifier si blacklisté avant action |
| `afficher-badge-blacklist` | `specs/_app/frontend/fiche-facture/workflows/afficher-badge-blacklist/` | Afficher le badge statut blacklist |

### Workflows frontend (écran : dashboard)

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `charger-blacklistes` | `specs/_app/frontend/dashboard/workflows/charger-blacklistes/` | Charger liste impayés blacklistés |
| `filtrer-blacklistes` | `specs/_app/frontend/dashboard/workflows/filtrer-blacklistes/` | Filtrer par motif/type |
| `unblacklist-depuis-liste` | `specs/_app/frontend/dashboard/workflows/unblacklist-depuis-liste/` | Réactiver depuis vue liste |

### Workflows backend

**Opérations CRUD natives** (via `flat-file-db.js`) :
- `GET /api/impayes` → `db.query('impayes')`
- `GET /api/impayes/:id` → `db.read('impayes', id)`

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `impayes-suspend` | `specs/workflows/backend/impayes-suspend.md` | Suspendre + annuler relances |
| `impayes-unsuspend` | `specs/workflows/backend/impayes-unsuspend.md` | Réactiver + régénérer relances |
| `contacts-toggle-blacklist` | `specs/workflows/backend/contacts-toggle-blacklist.md` | Toggle blacklist + cascade annulation |
| `generate-relances` | `specs/workflows/backend/generate-relances.md` | Génération automatique depuis impayés |
| `regenerate-relances-contact` | `specs/_app/backend/workflows/regenerate-relances-contact/` | Régénère relances après blacklist/unblacklist |

---

## F-010 : Génération automatique des relances

### Workflows backend (CRON)

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `generate-relances` | `specs/_app/backend/workflows/generate-relances/` | CRON quotidien, génère relances depuis impayés |
| `apply-sequence` | `specs/_app/backend/workflows/apply-sequence/` | Applique règles séquence (J+15, J+30...) |
| `group-by-contact` | `specs/_app/backend/workflows/group-by-contact/` | Regroupe impayés par contact pour relances groupées |

---

## F-011 : Configuration séquences de relances

### Workflows frontend (écran : config-sequences)

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `charger-sequences` | `specs/_app/frontend/config-sequences/workflows/charger-sequences/` | Liste des séquences actives |
| `editer-sequence` | `specs/_app/frontend/config-sequences/workflows/editer-sequence/` | Modification template/délai |
| `reorder-sequences` | `specs/_app/frontend/config-sequences/workflows/reorder-sequences/` | Changer ordre des séquences |

### Workflows backend

**Opérations CRUD natives** (via `flat-file-db.js`) :
- `GET /api/sequences` → `db.query('sequences')`
- `POST /api/sequences` → `db.create('sequences', {...})`
- `PUT /api/sequences/:id` → `db.update('sequences', id, {...})`

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `update-sequence-order` | `specs/_app/backend/workflows/update-sequence-order/` | Update niveau séquences avec locking |

---

## F-012 : Historique des relances

### Workflows frontend (écran : historique-relances)

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `charger-historique` | `specs/_app/frontend/historique-relances/workflows/charger-historique/` | Liste des relances envoyées |
| `filtrer-historique` | `specs/_app/frontend/historique-relances/workflows/filtrer-historique/` | Filtres par date/statut |

### Workflows backend

| Workflow | Dossier spec | Description |
|----------|--------------|-------------|
| `historique-relances-query` | `specs/_app/backend/workflows/historique-relances-query/` | Query collection relances avec filtres |

---

## Workflows globaux (frontend)

**Dossier** : `specs/_app/frontend/global/workflows/`

| Workflow | Description |
|----------|-------------|
| `router` | Gestion SPA routing via `_redirects` + AlpineJS |
| `auth` | Vérifier authentification utilisateur (si implémentée) |
| `logger` | Émettre checkpoints console `[CHECKPOINT]` |
| `notifications` | Système de toasts succès/erreur/info |
| `offline-detector` | Détecter et afficher statut hors ligne |
| `gestion-erreurs` | Intercepter et afficher erreurs globales |
| `api-client` | Wrapper fetch() avec retry et error handling |

---

## Récapitulatif par type

| Type | Nombre | Description |
|------|--------|-------------|
| Frontend écran | ~30 | Composants AlpineJS par écran |
| Frontend global | 7 | Utilitaires réutilisables |
| Backend API | ~6 | Workflows métier (hors CRUD natif) |
| Backend CRUD | Natif | Via `flat-file-db.js` (search, read, update) |
| Backend CRON | 3 | Jobs quotidiens/automatiques |
| **Total** | **~46** | |

---

## Endpoints API Backend

### Factures
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/factures` | Liste avec pagination/filtres (natif) |
| GET | `/api/factures/:id` | Détail facture (natif) |
| POST | `/api/factures` | Créer facture (natif) |
| PUT | `/api/factures/:id` | Modifier facture (natif) |
| DELETE | `/api/factures/:id` | Supprimer facture (natif) |

### Payers
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/payers` | Liste payers (natif) |
| GET | `/api/payers/:id` | Détail avec factures (natif) |
| POST | `/api/payers` | Créer payer (natif) |
| PUT | `/api/payers/:id` | Modifier payer (natif) |
| GET | `/api/payers/:id/factures` | Factures du payer (natif) |

### Impayés
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/impayes` | Liste impayés (natif) |
| GET | `/api/impayes/:id` | Détail impayé (natif) |
| POST | `/api/impayes/:id/suspend` | Suspendre (workflow) |
| POST | `/api/impayes/:id/unsuspend` | Réactiver (workflow) |
| POST | `/api/contacts/:id/toggle-blacklist` | Toggle blacklist (workflow) |
| GET | `/api/impayes/blacklistes` | Liste blacklistés (natif) |

### Relances
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/relances` | Liste relances (natif) |
| POST | `/api/relances` | Créer relance (natif) |
| POST | `/api/relances/:id/validate` | Valider relance (workflow) |
| POST | `/api/relances/:id/cancel` | Annuler relance (workflow) |
| POST | `/api/relances/:id/send` | Envoyer email (workflow) |

### Séquences
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/sequences` | Liste séquences (natif) |
| POST | `/api/sequences` | Créer séquence (natif) |
| PUT | `/api/sequences/:id` | Modifier séquence (natif) |
| DELETE | `/api/sequences/:id` | Supprimer séquence (natif) |

### Configuration _redirects

```
# API Backend (proxy)
/api/*  https://dev.markidiags.com/api/:splat  200

# Routes SPA
/dashboard      /index.html   200
/importer       /index.html   200
/factures       /index.html   200
/factures/*     /index.html   200
/clients        /index.html   200
/client/*       /index.html   200
/sequences      /index.html   200
/historique     /index.html   200
/config/*       /index.html   200

# Assets statiques
/static/*       /static/:splat   200

# Fallback
/*              /index.html   200
```
