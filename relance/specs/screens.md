# Inventaire des écrans frontend ADTI

**Source** : specs/mockups/*.html  
**Date** : 2026-07-02  
**Architecture** : Static HTML + AlpineJS + Tailwind CSS

---

## Écrans et leurs états

### 1. Login (`/login`)

| État | Description |
|------|-------------|
| `nominal` | Formulaire de connexion affiché |
| `loading` | Authentification en cours |
| `error` | Identifiants invalides |

---

### 2. Dashboard (`/dashboard`)

| État | Description |
|------|-------------|
| `nominal` | KPIs affichés, graphiques chargés |
| `loading` | Skeleton cards et graphiques |
| `empty` | Aucune donnée importée, message + CTA |
| `error` | Erreur de chargement données |

---

### 3. Impayés - Liste (`/impayes`)

| État | Description |
|------|-------------|
| `nominal` | Tableau paginé avec données |
| `loading` | Skeleton rows |
| `empty` | Aucune facture trouvée |
| `filtered` | Résultats filtrés affichés |
| `error` | Erreur de chargement |

---

### 4. Impayés - Par payeur (`/impayes/payeur/:id`)

| État | Description |
|------|-------------|
| `nominal` | Factures du payeur affichées |
| `loading` | Skeleton rows |
| `empty` | Aucune facture pour ce payeur |
| `error` | Payeur non trouvé |

---

### 5. Impayés - Par facture (`/impayes/facture/:id`)

| État | Description |
|------|-------------|
| `nominal` | Détails de la facture |
| `loading` | Chargement |
| `error` | Facture non trouvée |

---

### 6. Impayés - Par contact (`/impayes/contact/:id`)

| État | Description |
|------|-------------|
| `nominal` | Factures liées au contact |
| `loading` | Skeleton rows |
| `empty` | Aucune facture pour ce contact |
| `error` | Contact non trouvé |

---

### 7. Impayés - Suspendus (`/impayes/suspendus`)

| État | Description |
|------|-------------|
| `nominal` | Liste des factures en attente |
| `loading` | Skeleton rows |
| `empty` | Aucune facture suspendue |
| `filtered` | Résultats filtrés |

---

### 8. Impayés - À réparer (`/impayes/a-reparer`)

| État | Description |
|------|-------------|
| `nominal` | Liste des factures avec erreurs |
| `loading` | Skeleton rows |
| `empty` | Aucune facture à réparer |
| `editing` | Correction en cours |
| `saving` | Sauvegarde des corrections |
| `success` | Factures corrigées |

---

### 9. Relances - Tableau (`/relances`)

| État | Description |
|------|-------------|
| `nominal` | Tableau des relances programmées |
| `loading` | Skeleton rows |
| `empty` | Aucune relance planifiée |
| `filtered` | Résultats filtrés |

---

### 10. Relances - Calendrier (`/relances/calendrier`)

| État | Description |
|------|-------------|
| `nominal` | Vue mensuelle avec relances |
| `loading` | Chargement du calendrier |
| `empty` | Aucune relance ce mois |
| `slideover-detail` | Slideover infos relance ouvert |

**Slideover** : `\u003ctemplate x-if="slideoverOpen"\u003e` (panneau latéral vertical)

---

### 11. Relances - Validation (`/relances/validation`)

| État | Description |
|------|-------------|
| `nominal` | Liste des relances à approuver |
| `loading` | Skeleton rows |
| `empty` | Rien à valider |
| `slideover-detail` | Slideover infos relance ouvert |
| `validating` | Validation en cours |
| `success` | Relances approuvées |

**Slideover** : `\u003ctemplate x-if="slideoverOpen"\u003e` (panneau latéral vertical)

---

### 12. Suivi - Tableau (`/suivi`)

| État | Description |
|------|-------------|
| `nominal` | Tableau des suivis programmés |
| `loading` | Skeleton rows |
| `empty` | Aucun suivi planifié |
| `filtered` | Résultats filtrés |

---

### 13. Suivi - Calendrier (`/suivi/calendrier`)

| État | Description |
|------|-------------|
| `nominal` | Vue mensuelle avec suivis |
| `loading` | Chargement du calendrier |
| `empty` | Aucun suivi ce mois |
| `slideover-detail` | Slideover infos suivi ouvert |

**Slideover** : `\u003ctemplate x-if="slideoverOpen"\u003e` (panneau latéral vertical)

---

### 14. Suivi - Validation (`/suivi/validation`)

| État | Description |
|------|-------------|
| `nominal` | Liste des suivis à approuver |
| `loading` | Skeleton rows |
| `empty` | Rien à valider |
| `slideover-detail` | Slideover infos suivi ouvert |
| `validating` | Validation en cours |
| `success` | Suivis approuvés |

**Slideover** : `\u003ctemplate x-if="slideoverOpen"\u003e` (panneau latéral vertical)

---

### 15. Séquences - Liste (`/sequences`)

| État | Description |
|------|-------------|
| `nominal` | Liste des workflows |
| `loading` | Skeleton rows |
| `empty` | Aucune séquence |

---

### 16. Séquences - Détail relance (`/sequences/relance/:id`)

| État | Description |
|------|-------------|
| `nominal` | Détails de la séquence relance |
| `loading` | Chargement |
| `editing` | Modal édition ouvert |
| `slideover-test-email` | Test d'un email spécifique |
| `slideover-test-sequence` | Test de toute la séquence |
| `testing` | Test en cours |
| `saving` | Sauvegarde en cours |
| `success` | Action réussie |
| `error` | Erreur |

**Modal** : `\u003ctemplate x-if="modalOpen"\u003e` (overlay centré)

**Slideover** : `\u003ctemplate x-if="slideoverOpen"\u003e` (panneau latéral vertical)

---

### 17. Séquences - Détail suivi (`/sequences/suivi/:id`)

| État | Description |
|------|-------------|
| `nominal` | Détails de la séquence suivi |
| `loading` | Chargement |
| `editing` | Modal édition ouvert |
| `slideover-test-email` | Test d'un email spécifique |
| `slideover-test-sequence` | Test de toute la séquence |
| `testing` | Test en cours |
| `saving` | Sauvegarde en cours |
| `success` | Action réussie |
| `error` | Erreur |

**Modal** : `\u003ctemplate x-if="modalOpen"\u003e` (overlay centré)

**Slideover** : `\u003ctemplate x-if="slideoverOpen"\u003e` (panneau latéral vertical)

---

### 18. Contacts - Tous (`/contacts`)

| État | Description |
|------|-------------|
| `nominal` | Liste complète des contacts |
| `loading` | Skeleton rows |
| `empty` | Aucun contact |
| `filtered` | Résultats filtrés |

---

### 19. Contacts - Sans email (`/contacts/sans-email`)

| État | Description |
|------|-------------|
| `nominal` | Liste des contacts incomplets |
| `loading` | Skeleton rows |
| `empty` | Tous les contacts ont un email |

---

### 20. Contacts - Blacklist (`/contacts/blacklist`)

| État | Description |
|------|-------------|
| `nominal` | Liste des contacts exclus |
| `loading` | Skeleton rows |
| `empty` | Aucun contact black-listé |
| `filtered` | Résultats filtrés |

---

### 21. Settings - SMTP (`/settings/smtp-profil`)

| État | Description |
|------|-------------|
| `nominal` | Formulaire SMTP affiché |
| `editing` | Champs en modification |
| `testing` | Test de connexion en cours |
| `saving` | Sauvegarde en cours |
| `success` | Configuration enregistrée |
| `error` | Erreur de connexion SMTP |

---

### 22. Settings - Utilisateurs (`/settings/utilisateurs`)

| État | Description |
|------|-------------|
| `nominal` | Liste des utilisateurs |
| `loading` | Skeleton rows |
| `empty` | Aucun utilisateur |
| `modal-add` | Modal ajout utilisateur |
| `modal-edit` | Modal édition utilisateur |
| `saving` | Sauvegarde en cours |
| `success` | Utilisateur enregistré |
| `error` | Erreur de sauvegarde |

**Modal** : `\u003ctemplate x-if="modal === 'add' || modal === 'edit'"\u003e` (overlay centré)

---

### 23. Portail Mission (`/portail/mission`)

| État | Description |
|------|-------------|
| `nominal` | Dashboard mission affiché |
| `loading` | Chargement des données |
| `empty` | Aucune mission en cours |
| `error` | Erreur de chargement |

---

### 24. Portail Client (`/portail/client`)

| État | Description |
|------|-------------|
| `nominal` | Dashboard client affiché |
| `loading` | Chargement des données |
| `empty` | Aucune donnée client |
| `error` | Erreur de chargement |

---

## Modaux globaux

### Modal export

| État | Description |
|------|-------------|
| `nominal` | Modal avec choix format |
| `loading` | Génération en cours |
| `success` | Fichier prêt, bouton télécharger |
| `error` | Erreur génération |

**Modal** : `\u003ctemplate x-if="modal === 'export'"\u003e` (overlay centré)

---

### Modal relance

| État | Description |
|------|-------------|
| `nominal` | Template pré-rempli, éditable |
| `loading` | Envoi en cours |
| `success` | Email envoyé, confirmation |
| `error` | Erreur SMTP |

**Modal** : `\u003ctemplate x-if="modal === 'relance'"\u003e` (overlay centré)

---

## Arborescence des routes

```
/
├── /login                        → Connexion (authentification)
├── /dashboard                    → Vue d'ensemble (KPIs et stats)
│
├── /impayes                      → Liste des factures
│   ├── /payeurs/                 → Factures par payeur
│   ├── /factures/                → Détail facture
│   ├── /contacts/                → Factures par contact
│   ├── /suspendus                → Factures en attente
│   └── /a-reparer                → Factures avec erreurs
│
├── /relances                     → Liste des relances
│   ├── /calendrier               → Vue mensuelle
│   │   └── /#:relanceId          → Slideover détail relance
│   └── /validation               → Approuver les envois
│       └── /#:relanceId          → Slideover détail relance  
│
├── /suivi                        → Liste des suivis
│   ├── /calendrier               → Vue mensuelle
│   │   └── /#:suiviId            → Slideover détail suivi
│   └── /validation               → Approuver les envois
│       └── /#:suiviId            → Slideover détail suivi  
│
├── /sequences                    → Liste des workflows
│   ├── /relance/:id              → Détail séquence relance
│   │   └── /#test-email          → Slideover test email
│   │   └── /#test-sequence       → Slideover test séquence
│   └── /suivi/:id                → Détail séquence suivi
│       └── /#test-email          → Slideover test email
│       └── /#test-sequence       → Slideover test séquence
│
├── /contacts                     → Vue complète
│   ├── /sans-email               → Contacts incomplets
│   └── /blacklist                → Contacts exclus
│
├── /settings                     → Paramètres
│   ├── /smtp-profil              → Configuration email
│   └── /utilisateurs             → Gestion utilisateurs
│
└── /portail
    ├── /mission                  → Dashboard mission
    └── /client                   → Dashboard client

Modaux (pas de route dédiée):
├── modal-export                  → Export rapports
└── modal-relance                 → Envoi relance email
```

---

## Récapitulatif

| Écran | Route | Nb états |
|-------|-------|----------|
| Login | `/login` | 3 |
| Dashboard | `/dashboard` | 4 |
| Impayés - Liste | `/impayes` | 5 |
| Impayés - Par payeur | `/impayes/payeur/:id` | 4 |
| Impayés - Par facture | `/impayes/facture/:id` | 3 |
| Impayés - Par contact | `/impayes/contact/:id` | 4 |
| Impayés - Suspendus | `/impayes/suspendus` | 4 |
| Impayés - À réparer | `/impayes/a-reparer` | 6 |
| Relances - Tableau | `/relances` | 4 |
| Relances - Calendrier | `/relances/calendrier` | 4 |
| Relances - Validation | `/relances/validation` | 6 |
| Suivi - Tableau | `/suivi` | 4 |
| Suivi - Calendrier | `/suivi/calendrier` | 4 |
| Suivi - Validation | `/suivi/validation` | 6 |
| Séquences - Liste | `/sequences` | 3 |
| Séquences - Détail relance | `/sequences/relance/:id` | 9 |
| Séquences - Détail suivi | `/sequences/suivi/:id` | 9 |
| Contacts - Tous | `/contacts` | 4 |
| Contacts - Sans email | `/contacts/sans-email` | 3 |
| Contacts - Blacklist | `/contacts/blacklist` | 4 |
| Settings - SMTP | `/settings/smtp-profil` | 6 |
| Settings - Utilisateurs | `/settings/utilisateurs` | 8 |
| Portail Mission | `/portail/mission` | 4 |
| Portail Client | `/portail/client` | 4 |
| **Modaux** | - | 4+4 |

**Total** : 24 écrans + 2 modaux globaux
