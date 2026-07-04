# Écran : Liste Impayés

## Informations
- **Route** : `/impayes`
- **Type** : Liste avancée avec vues multiples
- **Style** : Pines UI - tables épurées, filtres inline

---

## Layout Global
- Fond : `bg-gray-50 min-h-screen`
- Container : `max-w-7xl mx-auto px-6 py-8`

---

## Zone 1 : Header et Toggle de Vues

### Layout
- Flex between : `flex items-center justify-between mb-6`

### Toggle de vues (segmented control)
- Container : `bg-gray-100 p-1 rounded-lg inline-flex`
- Boutons :
  - **État inactif** : `px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-md transition-all`
  - **État actif** : `bg-white text-sky-600 shadow-sm rounded-md` (avec transition)
  - **État hover inactif** : `text-gray-900`
  - **État disabled** : `opacity-50 cursor-not-allowed`

### Vues disponibles
1. **Unitaire** (vue par défaut)
2. **Par payeur** (groupement)
3. **Par contact** (hiérarchique)
4. **Sans séquence** (filtre auto)

---

## Zone 2 : Barre de Filtres

### Layout
- `flex items-center gap-3 mb-6 flex-wrap`

### Éléments

**Recherche globale**
- Container : `relative flex-1 max-w-md`
- Icône : `absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`
- Input :
  - `w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500`
  - **État focus** : `ring-2 ring-sky-500`
  - **État filled** : `text-gray-900`
  - **État clear** : bouton X à droite si texte présent

**Filtre Séquence**
- Select custom (ou dropdown) :
  - Trigger : `bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 hover:border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500`
  - Options : liste des séquences avec checkbox
  - Badge count si filtré

**Bouton Colonnes** (vue unitaire uniquement)
- `border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2`
- Icône : `h-4 w-4`
- Dropdown :
  - `bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48`
  - Item : `px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50`
  - Checkbox : `rounded border-gray-300 text-sky-600 focus:ring-sky-500`

---

## Zone 3 : Vue Unitaire - Tableau

### Container
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`

### Header du tableau
- `bg-gray-50 border-b border-gray-200`
- Colonnes avec padding : `px-4 py-3`
- Texte : `text-xs font-semibold text-gray-500 uppercase tracking-wider`

### Colonnes visibles

**Checkbox (sélection)**
- `w-12 px-4`
- Input : `rounded border-gray-300 text-sky-600 focus:ring-sky-500`
- **État header** : checkbox indéterminée si sélection partielle

**N° Facture**
- `text-xs font-mono text-gray-900`
- **État hover** : `text-sky-600 cursor-pointer` (si triable)
- **État sorted** : flèche up/down icon après le texte

**Date pièce**
- `text-xs text-gray-500`

**N° Dossier**
- `text-xs font-mono text-gray-500`

**Adresse**
- `text-sm text-gray-700 max-w-xs truncate`

**Payeur**
- `text-sm font-medium text-gray-900`

**Retard**
- État normal : `text-xs font-medium`
  - Rouge : `text-rose-600` (>30j)
  - Orange : `text-amber-600` (>7j)
  - Vert : `text-emerald-600` (<7j)
- **État payé** : `text-gray-400` avec badge "Payé"

**Reste à payer**
- `text-sm font-semibold text-gray-900 tabular-nums`

**Séquence**
- Badge : `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium`
  - Assigné : `bg-sky-50 text-sky-700`
  - Non assigné : `text-gray-400` avec tiret

**Actions**
- `w-20 text-right`
- Boutons :
  - PDF : `p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-all`
  - Menu : `p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded`

### Row states

**État normal**
- `border-b border-gray-100 hover:bg-gray-50 transition-colors`

**État sélectionné**
- `bg-sky-50 hover:bg-sky-100 border-b border-sky-100`

**État expanded** (si détail inline)
- `bg-gray-50 border-b border-gray-200`
- Content : padding supplémentaire

### Empty state
- `py-12 text-center`
- Icône : `h-12 w-12 text-gray-200 mx-auto mb-4`
- Texte : `text-sm text-gray-500` ("Aucun impayé trouvé")
- CTA éventuel : bouton "Réinitialiser les filtres"

### Loading state
- Skeleton rows : `animate-pulse`
- Structure : lignes grises avec hauteurs variables

### Footer
- `px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between`
- Gauche : `text-sm text-gray-500` ("142 impayés chargés")
- Droite : pagination si applicable

---

## Zone 4 : Vue Par Payeur

### Tableau groupé

**Header**
- Checkbox groupée

**Row groupe (cliquable pour expand)**
- `bg-gray-50 border-b border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors`
- Chevron : `h-4 w-4 text-gray-400 transition-transform` (rotate-90 si expanded)
- Nom payeur : `text-sm font-semibold text-gray-900 ml-2`
- Badge count : `ml-3 bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full`
- Montant total : `ml-auto text-sm font-bold text-gray-900 tabular-nums`

**Row enfant** (indenté)
- `pl-12 border-b border-gray-100 hover:bg-gray-50`
- Mêmes colonnes que vue unitaire
- Colonne "Séquences" affiche les noms uniques séparés par virgules

### État collapsed
- Groupe fermé, montre uniquement header avec chevron right

### État expanded
- Groupe ouvert, montre toutes les lignes enfants

---

## Zone 5 : Vue Par Contact

### Tableau hiérarchique (2 niveaux)

**Niveau 1 - Contact**
- `bg-gray-50 border-b border-gray-200 px-4 py-3`
- Style similaire à "Par payeur"

**Niveau 2 - Rôle**
- `bg-gray-100/50 border-b border-gray-200 px-8 py-2`
- Texte : `text-xs font-medium text-gray-500 uppercase tracking-wider`
- "Ses propres impayés" ou "Apporteur d'affaire pour"

**Niveau 3 - Lignes**
- `pl-12` (indenté)
- Même style que vue unitaire

---

## Zone 6 : Vue Sans Séquence

### Filtre automatique
- Select séquence disabled avec valeur "Sans séquence"
- Badge "Sans séquence" dans le header

### Tableau
- Mêmes colonnes
- Colonne Séquence toujours vide avec `-`

---

## Zone 7 : Barre de Sélection Groupée (Fixed)

### Position
`fixed bottom-6 left-1/2 -translate-x-1/2 z-50`

### Container
`bg-gray-900 text-white rounded-xl shadow-xl px-6 py-4 flex items-center gap-4`

### Contenu
- Compteur : `text-sm font-medium` ("3 sélectionnés")
- Bouton "Assigner une séquence" : `bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors`
- Bouton "Annuler" : `text-gray-300 hover:text-white text-sm font-medium`

### État disabled
- Bouton assigner : `opacity-50 cursor-not-allowed`

---

## Zone 8 : Modal Assigner Séquence

### Overlay
`fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50`

### Container
`fixed inset-0 flex items-center justify-center p-4 z-50`
- Card : `bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col`

### Header
`px-6 py-4 border-b border-gray-200 flex items-center justify-between`
- Titre : `text-lg font-semibold text-gray-900`
- Close : `h-5 w-5 text-gray-400 hover:text-gray-600`

### Content
`p-6 overflow-y-auto`

**État normal (séquences disponibles)**
- Grid : `grid grid-cols-1 sm:grid-cols-2 gap-3`
- Card séquence :
  - `border-2 border-gray-200 rounded-xl p-4 cursor-pointer hover:border-sky-300 transition-all`
  - **État selected** : `border-sky-500 bg-sky-50`
  - Nom : `font-medium text-gray-900`
  - Description : `text-sm text-gray-500 mt-1 line-clamp-2`
  - Badge statut : `mt-3 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium`
    - Publiée : `bg-emerald-50 text-emerald-700`
    - Brouillon : `bg-gray-100 text-gray-600`

**État empty (aucune séquence)**
- Illustration + "Aucune séquence disponible"
- Lien : "Créer une séquence" (sky-600)

### Footer
`px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3`
- "Annuler" : `text-gray-700 hover:text-gray-900 font-medium text-sm`
- "Assigner" : `bg-sky-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-sky-700 disabled:opacity-50`

---

## États Complémentaires

### État erreur chargement
- Toast : `bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-4 shadow-lg`
- Bouton retry

### État filtre actif
- Badge "Filtres actifs" avec nombre
- Bouton "Effacer tout" (text-xs text-sky-600)
