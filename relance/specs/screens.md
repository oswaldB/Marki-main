# Inventaire des écrans frontend Marki Relance

**Source** : specs/mockups/*.html  
**Date** : 2026-07-09  
**Architecture** : Static HTML + AlpineJS + Tailwind CSS

---

## Écrans et leurs états

### 1. Login (`login.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `login.html` | Formulaire de connexion affiché |

---

### 2. Dashboard (`dashboard.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `dashboard.html` | KPIs affichés, graphiques chargés |

---

### 3. Impayés - Liste (`impayes.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `impayes.html` | Tableau paginé avec données |

---

### 4. Impayés - Par payeur (`impayes-payeur.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `impayes-payeur.html` | Factures du payeur affichées |

---

### 5. Impayés - Détail facture (`impayes-detail.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `impayes-detail.html` | Détails de la facture |

---

### 6. Impayés - Suspendus (`impayes-suspendus.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `impayes-suspendus.html` | Liste des factures en attente |

---

### 7. Relances - Tableau (`relances.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `relances.html` | Tableau des relances programmées |

---

### 9. Relances - Calendrier (`relances-calendrier.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `relances-calendrier.html` | Vue mensuelle avec relances |

---

### 10. Relances - Validation (`relances-validation.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `relances-validation.html` | Liste des relances à approuver |

---

### 11. Séquences - Liste (`sequences.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `sequences.html` | Liste des workflows |

---

### 12. Séquences - Détail relance (`sequences-relance-detail.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `sequences-relance-detail.html` | Détails de la séquence relance |

---

### 13. Séquences - Détail suivi (`sequences-suivi-detail.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `sequences-suivi-detail.html` | Détails de la séquence suivi |

---

### 14. Contacts - Tous (`contacts.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `contacts.html` | Liste complète des contacts |

---


### 15. Settings - SMTP (`settings-smtp.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `settings-smtp.html` | Configuration SMTP (liste des profils) |

---

### 16. Settings - SMTP Détail (`settings-smtp-detail.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `settings-smtp-detail.html` | Formulaire détail profil SMTP |

---

### 17. Settings - Utilisateurs (`settings-utilisateurs.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `settings-utilisateurs.html` | Gestion utilisateurs |

---

### 18. Portail Mission (`portail-mission.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `portail-mission.html` | Dashboard mission affiché |

---

### 19. Portail Client (`portail-client.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `portail-client.html` | Dashboard client affiché |

---

### 20. Événements (`evenements.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `evenements.html` | Historique des événements |

---

### 21. Smart Marki (`smart-marki.html`)

| État | Fichier | Description |
|------|---------|-------------|
| `nominal` | `smart-marki.html` | Interface IA Smart Marki |

---

## Arborescence des mockups

```
specs/mockups/
├── components/                    → Composants réutilisables
├── tests/                         → Tests et validations
│
├── login.html                     → Connexion (authentification)
├── dashboard.html                 → Vue d'ensemble (KPIs et stats)
│
├── impayes.html                   → Liste des factures
├── impayes-payeur.html            → Factures par payeur
├── impayes-detail.html            → Détail facture
├── impayes-suspendus.html         → Factures en attente
│
├── relances.html                  → Liste des relances
├── relances-calendrier.html       → Vue mensuelle
├── relances-validation.html       → Approuver les envois
│
├── sequences.html                 → Liste des workflows
├── sequences-relance-detail.html  → Détail séquence relance
├── sequences-suivi-detail.html    → Détail séquence suivi
│
├── contacts.html                  → Vue complète contacts
│
├── settings-smtp.html             → Liste profils SMTP
├── settings-smtp-detail.html      → Détail profil SMTP
├── settings-utilisateurs.html     → Gestion utilisateurs
│
├── portail-mission.html           → Dashboard mission
├── portail-client.html            → Dashboard client
│
├── evenements.html                → Historique événements
├── smart-marki.html               → Interface IA Smart Marki
│
└── marki-logo.png                 → Logo
```

---

## Récapitulatif

| Écran | Fichier | Route logique |
|-------|---------|---------------|
| Login | `login.html` | `/login` |
| Dashboard | `dashboard.html` | `/dashboard` |
| Impayés - Liste | `impayes.html` | `/impayes` |
| Impayés - Par payeur | `impayes-payeur.html` | `/impayes/payeur/:id` |
| Impayés - Détail | `impayes-detail.html` | `/impayes/facture/:id` |
| Impayés - Suspendus | `impayes-suspendus.html` | `/impayes/suspendus` |
| Relances - Tableau | `relances.html` | `/relances` |
| Relances - Calendrier | `relances-calendrier.html` | `/relances/calendrier` |
| Relances - Validation | `relances-validation.html` | `/relances/validation` |
| Séquences - Liste | `sequences.html` | `/sequences` |
| Séquences - Détail relance | `sequences-relance-detail.html` | `/sequences/relance/:id` |
| Séquences - Détail suivi | `sequences-suivi-detail.html` | `/sequences/suivi/:id` |
| Contacts - Tous | `contacts.html` | `/contacts` |
| Settings - SMTP | `settings-smtp.html` | `/settings/smtp` |
| Settings - SMTP Détail | `settings-smtp-detail.html` | `/settings/smtp/:id` |
| Settings - Utilisateurs | `settings-utilisateurs.html` | `/settings/utilisateurs` |
| Portail Mission | `portail-mission.html` | `/portail/mission` |
| Portail Client | `portail-client.html` | `/portail/client` |
| Événements | `evenements.html` | `/evenements` |
| Smart Marki | `smart-marki.html` | `/smart-marki` |

**Total** : 20 écrans HTML réels
