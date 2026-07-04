# Marki

> **La plateforme tout-en-un pour les diagnostiqueurs immobiliers**

Marki est une solution modulaire conçue pour simplifier la gestion quotidienne des diagnostiqueurs immobiliers indépendants et des bureaux d'études. Chaque module fonctionne indépendamment tout en pouvant s'intégrer aux autres pour créer un écosystème complet.

---

## 🎯 Vision

Libérer les diagnostiqueurs des contraintes administratives et commerciales pour leur permettre de se concentrer sur leur cœur de métier : le diagnostic technique.

---

## 🏗️ Architecture Modulaire

Marki repose sur une architecture **plugin-based** :

- **Chaque module est indépendant** et peut être utilisé seul
- Les modules peuvent **communiquer entre eux** via une API interne si vous en activez plusieurs
- **Déploiement progressif** : activez uniquement ceux dont vous avez besoin, quand vous en avez besoin
- **Pas de dépendances obligatoires** : pas de "core" imposé

```
┌────────────────────────────────────────────────────────────┐
│                      PLUGINS MARKI                           │
│                   (Tous indépendants)                        │
└────────────────────────────────────────────────────────────┘

    ┌──────────┬───────────┬───────────┬──────────┐
    ▼          ▼           ▼           ▼          ▼
┌───────┐  ┌───────┐   ┌───────┐   ┌───────┐  ┌───────┐
│  RDV  │  │Command│   │Relance│   │Espace │  │Agents │
│Manager│  │  e    │   │Auto   │   │Client │  │Immo   │
└───────┘  └───────┘   └───────┘   └───────┘  └───────┘
    │          │           │           │          │
┌───────┐  ┌───────┐   ┌───────┐   ┌───────┐
│Agenda │  │Commis-│   │Notaires│   │Tantium│
│Optimiz│  │sion   │   │Sync    │   │Manager│
│  er   │  │Manager│   │        │   │       │
└───────┘  └───────┘   └───────┘   └───────┘
                           │
                    ┌──────┴──────┐
                    │ Marki       │
                    │ Paiement    │
                    │ (QR Code)   │
                    └─────────────┘
```

---

## 💰 Business Model

### Gratuit pour les Indépendants

Marki est **100% gratuit** pour les diagnostiqueurs indépendants sous une condition :

> ✅ Utiliser **Marki Paiement** comme solution de paiement

**Marki Paiement**, c'est :
- Paiement par **QR Code** pour vos clients
- Basé sur l'**Open Banking** (connexion directe banque)
- Un petit **markup** sur chaque transaction qui finance la plateforme
- Pas de frais d'abonnement, pas de surprise

### Abonnement Premium

Si vous ne souhaitez pas utiliser Marki Paiement :

| Formule | Prix | Inclus |
|---------|------|--------|
| **Premium** | 5 000€/an minimum | Tous les modules sans limitation |

---

## 🚀 Stratégie d'Acquisition

Notre funnel d'acquisition repose sur une stratégie de **contenu-value** :

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Blog Post  │────▶│   Outils    │────▶│ Livre Blanc │
│  (SEO/Ads)  │     │  Gratuits   │     │  (Gated)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                                                ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Upselling  │◀────│   Modules   │◀────│   Mailing   │
│  (Modules   │     │   Payants   │     │   Campaign  │
│   +)        │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Logique du Tunnel

1. **Blog Post** → Attirer via le SEO sur des problématiques métier
2. **Outils Gratuits** → Livres blancs interactifs, calculateurs, générateurs
3. **Campagne Mailing** → Nurture des leads avec du contenu éducatif
4. **Vente Modules** → Conversion vers les modules payants Marki
5. **Upselling** → Activation de modules supplémentaires selon les besoins

---

## 🧰 Modules & Outils

### Modules Indépendants

**Chaque module fonctionne seul.** Choisissez ceux qui répondent à vos besoins.

#### Gestion & Administration

| Module | Description | Public | Statut |
|--------|-------------|--------|--------|
| **rdv** | Gestion des rendez-vous et planning | Tous | 🚧 Planifié |
| **commande** | Suivi des commandes et dossiers clients | Tous | 🚧 Planifié |
| **espaceClient** | Portail client pour consultation rapports | Tous | 🚧 Planifié |
| **relance** | Relances automatiques (email/SMS) | Tous | 🚧 Planifié |

#### Connect & Sync

| Module | Description | Public | Statut |
|--------|-------------|--------|--------|
| **agentsImmo** | Connexion avec les réseaux d'agents immobiliers | Tous | 🚧 Planifié |
| **notaires** | Synchronisation avec les études notariales | Tous | 🚧 Planifié |

#### Spécialisés

| Module | Description | Public | Statut |
|--------|-------------|--------|--------|
| **tantiumManager** | Gestion des diagnostics TANTIUM (ERP, ICPE) | Bureaux d'études | 🚧 Planifié |

### Outils Gratuits (Lead Generation)

Ces outils fonctionnent comme des **livres blancs interactifs** :

| Outil | Description | Objectif |
|-------|-------------|----------|
| **Calculateur de Rentabilité** | Estimez votre taux journalier optimal | Capturer emails indépendants |
| **Générateur de Rapport Express** | Template de rapport de visite | Démonstration valeur Marki |
| **Carte des DPE** | Visualisation des zones DPE par commune | SEO local |
| **Simulateur Amiante** | Évaluation préliminaire des obligations amiante | Éducation réglementaire |
| **Checklist Diagnostic** | Liste interactive pré-visite | Engagement métier |
| **Comparateur Offres Logiciels** | Comparez les solutions du marché | Positionnement Marki |

### 🆕 Outils Internes en Développement

| Outil | Description | Public |
|-------|-------------|--------|
| **Commission Manager** | Gestion de la rémunération à la performance des techniciens. Définition des paliers, calcul automatique des commissions, reporting individuel. | Bureaux d'études |
| **Agenda Optimizer** | Optimisation automatique des tournées : regroupement géographique des RDV, calcul des temps de trajet, suggestion des créneaux, minimisation des déplacements. | Tous |

---

## 📋 Modules en Détail

### 🔷 Commission Manager

**Problème résolu** : Les bureaux d'études peinent à gérer équitablement la rémunération variable de leurs techniciens.

**Fonctionnalités** :
- Définition de règles de commission personnalisables (%, montant fixe, paliers)
- Calcul automatique selon type de diagnostic, zone géographique, ancienneté
- Tableaux de bord individuels pour chaque technicien
- Export pour paie et comptabilité
- Simulation "what-if" pour nouvelles règles

**Cas d'usage** : Un bureau avec 15 techniciens définit une commission de 8% sur les DPE + 12% sur les diagnostics amiante + bonus de 100€ au-delà de 15 diagnostics/mois.

---

### 🔷 Agenda Optimizer

**Problème résolu** : Les diagnostiqueurs perdent trop de temps en déplacement et mal optimisent leur journée.

**Fonctionnalités** :
- Regroupement intelligent des RDV par zone géographique
- Calcul automatique des temps de trajet (Google Maps API)
- Suggestion de créneaux horaires en fonction des contraintes
- Alertes en cas de trajet trop long entre deux RDV
- Mode "tournée du jour" avec itinéraire optimisé
- Intégration GPS pour navigation

**Cas d'usage** : L'optimizer suggère de décaler un RDV de 14h à 15h30 pour permettre un regroupement avec un autre client à proximité, réduisant les kilomètres de 45 à 12.

---

## 🔗 Intégrations

### Paiement
- **Marki Paiement** (QR Code + Open Banking)
- Stripe (optionnel)
- PayPal (optionnel)

### Calendriers
- Google Calendar
- Outlook/Exchange
- Apple Calendar

### Logiciels Tiers
- TANTIUM
- DIAGIMMO
- Améliore Mon Logement (AML)

### Communication
- SendGrid (emails)
- Twilio (SMS)
- WhatsApp Business API

---

## 🛠️ Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | Node.js / API REST |
| Base de données | PostgreSQL |
| Cache | Redis |
| Files | AWS S3 / MinIO |
| Auth | Supabase Auth |
| Paiement | Open Banking (Bridge/Tink) |
| Hébergement | Docker + VPS Cloud |

---

## 📁 Structure du Repository

```
marki/
├── README.md                 # Ce fichier
├── site/                     # Site web de l'offre Marki (vitrine, blog, landing pages)
│                             # → N'est PAS un module client, c'est le site marketing
├── rdv/                      # Module gestion des rendez-vous
├── commande/                 # Module suivi des commandes
├── espaceClient/             # Module portail client
├── relance/                  # Module relances automatiques
├── agentsImmo/               # Module intégration agents immobiliers
├── notaires/                 # Module synchronisation notaires
├── tantiumManager/           # Module gestion TANTIUM
├── commission-manager/       # Module rémunération techniciens ⭐
├── agenda-optimizer/         # Module optimisation planning ⭐
├── marki-paiement/           # Module paiement QR Code
└── tools/                    # Outils gratuits (lead gen)
    ├── calculateur-rentabilite/
    ├── generateur-rapport/
    ├── carte-dpe/
    ├── simulateur-amiante/
    ├── checklist-diagnostic/
    └── comparateur-logiciels/
```

---

## 🚀 Démarrage Rapide

```bash
# Cloner le repository
git clone https://github.com/votre-org/marki.git
cd marki

# Lancer un module spécifique
cd rdv
npm install
npm run dev

# Ou lancer tout l'écosystème (nécessite Docker)
docker-compose up -d
```

---

## 📄 Licence

Propriétaire - © 2026 Marki. Tous droits réservés.

---

## 🤝 Contact

- **Site** : https://marki.io
- **Email** : contact@marki.io
- **Support** : support@marki.io

---

> *"Marki, c'est le GPS de votre activité de diagnostiqueur : il vous montre le chemin le plus court vers votre rentabilité."*
