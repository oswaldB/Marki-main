# Sitemap Marki

> Structure du site statique - Marketplace de deals pour diagnostiqueurs immobiliers + Content site

---

## 1. Pages Landing & Conversion

### 1.1 Home
**URL:** `/`  
**Objectif:** Conversion principale + découverte  
**Contenu:**
- Hero: valeur proposition "Les meilleurs outils pour diagnostiqueurs, prix négociés, accès à vie"
- Deals en cours (top 3)
- Derniers articles du magazine
- Cours mis en avant (gratuit)
- Communauté : questions récentes du forum
- Témoignages utilisateurs
- Stats communauté (membres, cours suivis, topics résolus)
- Newsletter CTA
- Logos partenaires/confiance

### 1.2 Landing Deals (par catégorie)
**URLs:**
- `/deals` - Tous les deals actifs
- `/deals/outils-erp` - Logiciels de gestion
- `/deals/rapports` - Outils de rédaction de rapports
- `/deals/formation` - Formations en ligne
- `/deals/productivite` - Outils productivité
- `/deals/crm` - Gestion client

### 1.3 Landing Lead Magnets
**URLs:**
- `/ressources` - Hub ressources gratuites
- `/templates` - Templates téléchargeables
- `/guides` - Guides PDF
- `/outils-gratuits` - Applications freemium

---

## 2. Marketplace (Catalogue)

### 2.1 Produit (Deal Page)
**URL:** `/deal/{slug}`  
**Contenu:**
- Hero produit (image, titre, tagline)
- Prix + compteur temps limité
- Description longue
- Galerie screenshots/vidéo
- Features list
- Avis utilisateurs
- FAQ produit
- CTA achat
- Produits similaires

### 2.2 Vendeur (Creator Page)
**URL:** `/creator/{slug}`  
**Contenu:**
- Profil vendeur
- Liste de ses produits
- Bio / story
- Avis globaux
- Contact

### 2.3 Panier & Checkout
**URLs:**
- `/cart` - Panier
- `/checkout` - Paiement (Stripe)
- `/checkout/success` - Confirmation
- `/mes-achats` - Library produits achetés

---

## 3. Magazine / Content Hub

### 3.1 Home Magazine
**URL:** `/magazine`  
**Contenu:**
- Article mis en avant
- Derniers articles
- Articles populaires
- Catégories
- Auteurs en vedette

### 3.2 Catégories Articles
**URLs:**
- `/magazine/actualites` - Actualités métier
- `/magazine/reglementation` - Veille réglementaire
- `/magazine/guides` - Guides pratiques
- `/magazine/business` - Conseils business
- `/magazine/tech` - Veille techno
- `/magazine/interviews` - Interviews pros

### 3.3 Article
**URL:** `/magazine/{categorie}/{slug}`  
**Contenu:**
- Header article (titre, meta, image)
- Contenu riche
- Tags
- Partage social
- Auteur box
- Articles similaires
- Newsletter CTA
- Commentaires (optionnel)

### 3.4 Auteurs
**URL:** `/magazine/auteur/{slug}`  
**Contenu:**
- Profil auteur
- Ses articles
- Bio
- Liens sociaux

---

## 4. École / Cours

> Hub éducatif communautaire : cours vidéo, mentorat, certifications

### 4.1 Home École
**URL:** `/ecole`  
**Objectif:** Découverte formations + preuve sociale  
**Contenu:**
- Hero: "Apprends avec ceux qui font le métier"
- Cours mis en avant (gratuits + payants)
- Parcours certifiants
- Témoignages élèves
- Stats communauté (X apprenants, Y heures de contenu)
- Professeurs en vedette
- Derniers topics du forum école

### 4.2 Catalogue Cours
**URL:** `/ecole/cours`  
**Filtres:**
- Par thème : DPE, Amiante, Plomb, Termites, Carrez, Métrage
- Par niveau : Débutant, Intermédiaire, Confirmé
- Par format : Vidéo, Live, Atelier pratique
- Par prix : Gratuit, Payant, Abonnement École

### 4.3 Page Cours
**URL:** `/ecole/cours/{slug}`  
**Contenu:**
- Bande-annonce vidéo
- Programme détaillé (leçons/modules)
- Profil formateur
- Avis élèves
- Communauté élèves (nombre inscrits)
- CTA inscription/achat
- FAQ cours
- Prérequis

### 4.4 Leçon
**URL:** `/ecole/cours/{slug}/lecons/{ordre}`  
**Contenu:**
- Lecteur vidéo
- Transcript
- Ressources téléchargeables
- Discussion/Q&A sous la vidéo
- Navigation module précédent/suivant
- Marqueur progression

### 4.5 Parcours Certifiants
**URLs:**
- `/ecole/parcours` - Tous les parcours
- `/ecole/parcours/{slug}` - Parcours spécifique

**Contenu:**
- Suite de cours obligatoires + optionnels
- Projet final à valider
- Certification Marki (badge profil)
- Durée estimée
- Prérequis

### 4.6 Formateurs
**URL:** `/ecole/formateurs`  
**Contenu:**
- Grille profils formateurs
- Leur expertise
- Leurs cours
- Leur disponibilité mentorat

### 4.7 Profil Formateur
**URL:** `/ecole/formateur/{slug}`  
**Contenu:**
- Bio complète
- Expertise métier
- Cours publiés
- Avis élèves
- Disponibilité mentorat
- Contact

### 4.8 Mentorat
**URLs:**
- `/ecole/mentorat` - Présentation service
- `/ecole/mentorat/reserver` - Booking session
- `/ecole/mentorat/mes-sessions` - Dashboard mentorat

**Contenu:**
- Liste mentors disponibles
- Spécialités
- Tarifs/session (30min / 1h)
- Calendrier disponibilité
- Système de visio intégrée

### 4.9 Mon Apprentissage (Dashboard)
**URL:** `/ecole/moi`  
**Contenu:**
- Cours en cours (progression %)
- Certifications obtenues (badges)
- Historique apprentissage
- Favoris/À regarder plus tard
- Notes personnelles
- Rendez-vous mentorat

### 4.10 Communauté Apprenants
**URL:** `/ecole/communaute`  
**Contenu:**
- Forum par thème (DPE, Amiante, etc.)
- Questions/réponses
- Partage de cas pratiques
- Défis/Exercices communautaires
- Groupe étude (trouver des pairs)
- Événements live à venir

---

## 5. Communauté (élargie)

> Espace d'échange entre pros, entraide et networking

### 5.1 Forum Communautaire
**URL:** `/communaute/forum`  
**Catégories:**
- Questions techniques (DPE, Amiante, Plomb...)
- Matériel et outillage
- Juridique / Assurance
- Développement de clientèle
- Recrutement / Offres d'emploi
- Bon plans / Ventes entre pros
- Présentation des membres

### 5.2 Discussion
**URL:** `/communaute/forum/{categorie}/{slug}`  
**Contenu:**
- Fil de discussion
- Réponses threaded
- Upvote/downvote
- Partager une réussite/cas concret
- Notifier mentions

### 5.3 Poser une question
**URL:** `/communaute/poser-question`  
**Formulaire:**
- Titre
- Catégorie
- Description détaillée
- Photos/documents joints
- Niveau urgence

### 5.4 Annuaire Pros
**URL:** `/communaute/annuaire`  
**Contenu:**
- Liste diagnostiqueurs
- Filtres (région, spécialités, disponibilité)
- Profil simplifié
- Badge "certifié Marki" pour ceux qui ont suivi des cours
- Partenaires de confiance (notaires, agents...)

### 5.5 Profil Public Membre
**URL:** `/communaute/u/{username}`  
**Contenu:**
- Avatar, bio
- Badges (cours suivis, certifications, contributions forum)
- Avis laissés sur outils
- Contributions forum (questions/réponses)
- Produits achetés (public optionnel)
- Spécialités métier
- Zone géographique
- Contact professionnel

### 5.6 Événements
**URLs:**
- `/communaute/evenements` - Liste événements
- `/communaute/evenements/{slug}` - Détail événement

**Types:**
- Webinaires gratuits
- Ateliers pratiques (présentiel)
- Rencontres régionales
- Conférences annuelles Marki
- Sessions networking

### 5.7 Direct / Chat
**URL:** `/communaute/discussion`  
**Contenu:**
- Liste conversations privées
- Groupes thématiques (DPE 2024, nouvelles réglementations...)
- Statut en ligne/hors ligne
- Partage fichiers

---

## 6. Pages Utilisateur (Auth)

### 6.1 Auth
**URLs:**
- `/login` - Connexion
- `/register` - Inscription
- `/forgot-password` - Mot de passe oublié
- `/reset-password` - Réinitialisation

### 6.2 Dashboard Utilisateur
**URL:** `/dashboard`  
**Contenu:**
- Mes achas (library)
- Mes avis
- Mes favoris
- Mes cours (si inscrit école)
- Mon mentorat (si sessions réservées)
- Paramètres profil
- Factures

### 6.3 Paramètres
**URL:** `/settings`  
**Sous-pages:**
- `/settings/profile` - Profil
- `/settings/notifications` - Notifications
- `/settings/billing` - Facturation

---

## 7. Pages Vendeur (Creator)

### 7.1 Espace Vendeur
**URL:** `/vendor/dashboard`  
**Contenu:**
- Stats ventes
- Liste produits
- Avis reçus
- Paiements

### 7.2 Gestion Produit
**URLs:**
- `/vendor/products` - Mes produits
- `/vendor/products/new` - Créer un deal
- `/vendor/products/{id}/edit` - Éditer

### 7.3 Analytics
**URL:** `/vendor/analytics`  
**Contenu:**
- Ventes
- Trafic
- Conversion
- Avis

---

## 8. Pages Statiques

### 8.1 Information
**URLs:**
- `/a-propos` - About / mission
- `/comment-ca-marche` - Process achat
- `/devenir-vendeur` - Onboarding vendeurs
- `/devenir-formateur` - Postuler pour donner des cours
- `/tarifs` - Pricing vendeurs
- `/contact` - Formulaire contact

### 8.2 Légal
**URLs:**
- `/cgv` - Conditions de vente
- `/cgu` - Conditions d'utilisation
- `/mentions-legales` - Mentions légales
- `/confidentialite` - Politique confidentialité (RGPD)
- `/cookies` - Gestion cookies

---

## 9. Pages Spéciales

### 9.1 Newsletter
**URLs:**
- `/newsletter` - Landing inscription
- `/newsletter/confirm` - Confirmation inscription
- `/newsletter/unsubscribe` - Désinscription

### 9.2 Recherche
**URL:** `/search`  
**Contenu:**
- Résultats deals + articles + cours
- Filtres avancés

### 9.3 Offres Spéciales
**URLs:**
- `/black-friday` - Landing temporaire
- `/lancement` - Early bird
- `/parrainage` - Programme parrainage

---

## 10. Emails & Pages Transactionnelles

### 10.1 Emails (templates)
- Welcome
- Confirmation achat
- Nouveau deal dispo
- Nouveau cours disponible
- Réponse à ta question sur le forum
- Mentions dans une discussion
- Rappel mentorat
- Reset password
- Newsletter

### 10.2 Pages Statut
**URLs:**
- `/maintenance` - Maintenance mode
- `/404` - Not found
- `/500` - Error

---

## 11. Structure URLs Résumée

```
/                           # Home
/deals                      # Tous les deals
/deals/{category}           # Deals par catégorie
/deal/{slug}                # Page produit
/creator/{slug}             # Page vendeur
/cart                       # Panier
/checkout                   # Paiement

/magazine                   # Hub content
/magazine/{category}        # Catégorie articles
/magazine/{category}/{slug} # Article
/magazine/auteur/{slug}     # Profil auteur

/ecole                      # Hub formation
/ecole/cours                # Catalogue cours
/ecole/cours/{slug}         # Page cours
/ecole/cours/{slug}/lecons/{ordre}  # Leçon individuelle
/ecole/parcours             # Parcours certifiants
/ecole/parcours/{slug}      # Parcours spécifique
/ecole/formateurs           # Liste formateurs
/ecole/formateur/{slug}     # Profil formateur
/ecole/mentorat             # Réservation mentorat
/ecole/communaute           # Forum apprenants
/ecole/moi                  # Dashboard apprentissage

/communaute/forum           # Forum communautaire
/communaute/forum/{cat}/{slug}  # Discussion
/communaute/poser-question  # Poser une question
/communaute/annuaire        # Annuaire pros
/communaute/u/{username}    # Profil public membre
/communaute/evenements      # Événements
/communaute/discussion      # Chat/Direct

/dashboard                  # Dashboard user
/settings                   # Paramètres
/vendor/*                   # Espace vendeur

/ressources                 # Lead magnets
/templates
/guides
/outils-gratuits

/a-propos
/comment-ca-marche
/devenir-vendeur
/devenir-formateur
/contact

/cgv /cgu /mentions-legales /confidentialite

/search                     # Recherche globale
```

---

## 12. Navigation Principale (Header)

1. **Deals** (dropdown catégories)
2. **École** (cours, parcours, mentorat)
3. **Communauté** (forum, annuaire, événements)
4. **Magazine** (Le Diagnostiqueur Déchaîné)
5. **Ressources** (lead magnets)
6. **Devenir vendeur**
7. **Search icon**
8. **Cart icon**
9. **User menu** (login/dashboard)

---

## 13. Navigation Footer

**Col 1: Produit**
- Tous les deals
- École (cours, mentorat)
- Catégories
- Nouveautés

**Col 2: Communauté**
- Forum
- Annuaire des pros
- Événements
- Devenir partenaire

**Col 3: Contenu**
- Le Diagnostiqueur Déchaîné
- Templates
- Guides
- Newsletter

**Col 4: Légal**
- CGV
- Confidentialité
- Cookies
- Contact
