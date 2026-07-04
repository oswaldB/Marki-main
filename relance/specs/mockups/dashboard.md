# Écran : Dashboard

## Informations
- **Route** : `/`
- **Type** : Page d'accueil
- **Titre** : "Dashboard"
- **Style** : Pines UI - épuré, fond gray-50, cards white avec border subtle

---

## Layout Global

### Structure
- Fond : `bg-gray-50`
- Container : `max-w-7xl mx-auto px-6 py-8`
- Gap entre sections : `space-y-8`

### Sidebar (seul composant réutilisable)
- Fixed left, `w-64`, `h-screen`
- Fond : `bg-white border-r border-gray-200`
- Logo ADTI en haut (p-6)
- Navigation : items avec `hover:bg-sky-50 hover:text-sky-600`
- Active : `bg-sky-50 text-sky-600 border-r-2 border-sky-600`

---

## Zone 1 : Header

### Éléments
- **Titre** : `text-3xl font-semibold text-gray-900 tracking-tight`
- **Sous-titre** : `text-sm text-gray-500 mt-1`
- **Bouton Sync** (à droite) :
  - État normal : `bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:border-sky-300 hover:text-sky-600 transition-all`
  - État loading : `opacity-50 cursor-wait` + spinner `animate-spin h-4 w-4 mr-2`
  - État success : `text-green-600 border-green-200 bg-green-50` + icône check

---

## Zone 2 : KPI Cards (5 cartes)

### Layout
- Grid : `grid grid-cols-5 gap-5`
- Card : `bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow`

### Carte 1 - Factures en attente
- **État normal** :
  - Icône : `h-10 w-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center`
  - Label : `text-sm font-medium text-gray-600 mt-4`
  - Valeur : `text-3xl font-bold text-gray-900 mt-1`
  - Sous-texte : `text-xs text-gray-400 mt-1`
- **État loading** :
  - Skeleton : `h-10 w-10 rounded-lg bg-gray-200 animate-pulse`
  - Lignes : `h-4 bg-gray-200 rounded animate-pulse mt-4 w-24`
- **État empty (0)** :
  - Valeur : `text-3xl font-bold text-gray-300` (grisé)

### Carte 2 - Impayés actifs
- Icône : `bg-orange-50 text-orange-600`
- Même structure

### Carte 3 - Montant total
- Icône : `bg-rose-50 text-rose-600`
- Valeur formatée : `42,5 k€` + `42 450 €` en dessous

### Carte 4 - Relances du jour
- Icône : `bg-sky-50 text-sky-600`

### Carte 5 - Taux de recouvrement
- Icône : `bg-emerald-50 text-emerald-600`
- Valeur avec % : `87%`

---

## Zone 3 : Ancienneté des impayés (5 buckets)

### Layout
- Grid : `grid grid-cols-5 gap-4`

### Cartes par période

**Moins de 7 jours (sky)**
- Card : `bg-white rounded-xl border border-gray-200 p-5`
- État normal :
  - Icon : `h-8 w-8 rounded-lg bg-sky-50 text-sky-600`
  - Label : `text-xs font-medium text-gray-500`
  - Count : `text-2xl font-bold text-gray-900`
  - Montant : `text-xs text-gray-400`
- **État hover** : `border-sky-200 shadow-sm`

**8-30 jours (amber)**
- Icon : `bg-amber-50 text-amber-600`

**31-60 jours (orange)**
- Icon : `bg-orange-50 text-orange-600`

**60-120 jours (purple)**
- Icon : `bg-purple-50 text-purple-600`

**+120 jours (rose)**
- Icon : `bg-rose-50 text-rose-600`

### État global loading
- Toutes les cartes en skeleton simultanément

---

## Zone 4 : Graphique

### Card
`bg-white rounded-xl border border-gray-200 p-6 shadow-sm`

### Header
- Titre : `text-base font-semibold text-gray-900`
- Badge info : `ml-2 text-gray-400 hover:text-sky-600 cursor-help`

### Zone graphique
- Hauteur : `h-72`
- **État loading** :
  - Skeleton bars : `h-full w-full bg-gray-100 animate-pulse rounded-lg`
  - Ou spinner central : `flex items-center justify-center h-full`
- **État data** :
  - ChartJS barres empilées
  - Couleurs : sky-500, emerald-500, violet-500
  - Tooltip personnalisé : `bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-lg`
- **État empty** :
  - Illustration + "Aucune donnée disponible" centré

---

## Zone 5 : Tableaux de suivi (2x2 grid)

### Layout
- Grid : `grid grid-cols-2 gap-5`

### Card générique
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`

### Header de card
`px-5 py-4 border-b border-gray-100 flex items-center justify-between`
- Titre : `text-sm font-semibold text-gray-900`
- Lien : `text-xs text-sky-600 hover:text-sky-700 font-medium`

### Content

#### Carte 1 - Relances du jour
**État normal (avec données)** :
- Liste : `divide-y divide-gray-100`
- Row : `px-5 py-3 hover:bg-gray-50 transition-colors`
- Row content :
  - Ligne 1 : `text-sm font-medium text-gray-900` (F°XXX · D°XXX)
  - Ligne 2 : `text-xs text-gray-500` (payeur_nom)
  - Ligne 3 : `text-xs text-sky-600` (relance N°)

**État empty** :
- `px-5 py-8 text-center`
- Icon : `h-8 w-8 text-gray-300 mx-auto`
- Text : `text-sm text-gray-400`

**État loading** :
- Rows skeleton : `h-12 bg-gray-100 animate-pulse` x3

#### Carte 2 - Relances à valider
- Même structure
- Badge urgent : `ml-2 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full`

#### Carte 3 - Contacts sans email
- Row style différent :
  - `text-sm font-medium text-gray-900` (nom)
  - `text-xs text-amber-600` (téléphone)
- Badge warning si pertinent

#### Carte 4 - Impayés récents
- Row avec action :
  - Content à gauche
  - Flèche `h-4 w-4 text-gray-300 hover:text-sky-600` à droite
- Badge jours échéance :
  - Rouge : `bg-rose-100 text-rose-700`
  - Orange : `bg-orange-100 text-orange-700`
  - Vert : `bg-emerald-100 text-emerald-700`

---

## États Globaux de la Page

### État Loading Initial
- Skeleton cards pour tous les KPIs
- Skeleton pour le graphique
- Skeleton rows pour les 4 tableaux
- Spinner global optionnel

### État Error
- Toast notification : `bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-4`
- Ou card error : `border-rose-200 bg-rose-50 p-6 text-center`

### État Empty Global
- Message : "Aucune donnée importée"
- CTA : "Importer des factures" (bouton primary)

---

## Style Guide Spécifique Pines UI

### Principes appliqués
- **Bordures** : `border-gray-200` partout, `hover:border-sky-200` sur interactifs
- **Ombres** : `shadow-sm` par défaut, `hover:shadow-md` au survol
- **Rayons** : `rounded-xl` pour cards, `rounded-lg` pour boutons
- **Transitions** : `transition-all duration-200` sur tout élément interactif
- **Focus** : `focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500`

### Couleurs Dominantes
- **Primaire** : `sky-600` (boutons, liens, accents)
- **Fond** : `gray-50`
- **Cards** : `white` avec `border-gray-200`
- **Texte** : `gray-900` titres, `gray-600` labels, `gray-400` hints

### Typographie
- Headings : `font-semibold tracking-tight`
- Body : `text-sm` par défaut
- Monospace pour données techniques (factures, montants)
