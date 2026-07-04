# Écran : Contacts

## Informations
- **Route** : `/contacts`
- **Type** : Gestion contacts avec onglets
- **Style** : Pines UI - onglets pills, tableaux épurés

---

## Layout Global
- Fond : `bg-gray-50 min-h-screen`
- Container : `max-w-7xl mx-auto px-6 py-8`

---

## Zone 1 : Header

### Layout
`flex items-center justify-between mb-6`

### Éléments
- Titre : `text-2xl font-semibold text-gray-900`
- Bouton Sync : `border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2`
  - **État loading** : spinner + "Synchronisation..."
  - **État success** : `text-emerald-600 border-emerald-200 bg-emerald-50`

---

## Zone 2 : Onglets Navigation

### Container
`mb-6`

### Tabs (style pills)
`bg-gray-100 p-1 rounded-xl inline-flex`

**Boutons** :
- **Inactif** : `px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:text-gray-900 transition-all flex items-center gap-2`
- **Actif** : `bg-white text-sky-600 shadow-sm rounded-lg` (transition douce)

### Onglets

1. **Tous les contacts** (users icon)
   - Badge : `bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full ml-2`

2. **Sans email** (envelope-open icon)
   - Badge : `bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full ml-2`

3. **Par entité** (building-office icon)

4. **Par groupe** (user-group icon)

---

## Zone 3 : Vue "Tous" et "Sans email"

### Filtres
`flex items-center gap-3 mb-4 flex-wrap`

**Recherche**
- Input : `max-w-sm bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm`
- Icon search : `absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`

**Select Source**
- `bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm`
- Options : "Toutes les sources", "BD externe", "Upload"

### Tableau

**Container**
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`

**Header**
`bg-gray-50 border-b border-gray-200 px-4 py-3 grid grid-cols-[2fr_1.5fr_1.5fr_1fr_100px_120px] gap-4 items-center`

**Colonnes** :
1. Nom (triable)
2. Prénom
3. Email
4. Source
5. Impayés
6. Actions

**Rows**

*État normal*
`border-b border-gray-100 px-4 py-3 grid grid-cols-[2fr_1.5fr_1.5fr_1fr_100px_120px] gap-4 items-center hover:bg-gray-50 transition-colors`

*Cellules*

**Nom**
- `text-sm font-medium text-gray-900`

**Prénom**
- `text-sm text-gray-700`
- *Empty* : `text-gray-400 italic`

**Email**
- `text-sm text-gray-700`
- *Empty* : `bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full inline-flex` "Manquant"

**Source**
- Badge :
  - "BD externe" : `bg-blue-50 text-blue-700`
  - "Upload" : `bg-purple-50 text-purple-700`

**Impayés**
- `text-sm font-semibold text-gray-900` si > 0
- `text-sm text-gray-400` si 0

**Actions**
- "Définir email" : `text-sky-600 hover:text-sky-700 text-sm font-medium`
- "Blacklister" / "Blacklisté" : bouton avec changement de couleur
  - Rouge : `text-rose-600 hover:bg-rose-50`
  - Vert : `text-emerald-600 bg-emerald-50`

### Pagination

**Container**
`px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between`

**Gauche**
- Select : `bg-white border border-gray-200 rounded-lg text-sm px-2 py-1`
- Options : 10, 25, 50, 100

**Centre**
- Info : `text-sm text-gray-500`
- Format : "Affichage 1 - 25 sur 147"

**Droite**
- Pagination : boutons numérotés
- Page active : `bg-sky-600 text-white`
- Page inactive : `text-gray-700 hover:bg-gray-100`

---

## Zone 4 : Vue "Par entité"

### Tableau hiérarchique

**Row groupe (Entité)**
`bg-gray-50 border-b border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors`

**Layout**
`flex items-center gap-3`

**Éléments**
- Chevron : `h-4 w-4 text-gray-400 transition-transform` (rotate-90 si expanded)
- Icon building : `h-5 w-5 text-gray-500`
- Nom : `text-sm font-semibold text-gray-900`
- Badge : `bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full`
- Montant total : `ml-auto text-sm font-bold text-gray-900`

**Row enfant (Membre)**
`pl-12 border-b border-gray-100 hover:bg-gray-50`
- Mêmes colonnes que vue liste

### État expanded
- Chevron down
- Liste des membres visible

### État collapsed
- Chevron right
- Liste cachée

---

## Zone 5 : Vue "Par groupe de particuliers"

### Tableau hiérarchique (2 niveaux)

**Niveau 1 - Groupe**
`bg-gray-50 border-b border-gray-200 px-4 py-3`

**Layout**
`flex items-center gap-3`

**Éléments**
- Chevron
- Icon user-group : `h-5 w-5 text-emerald-500`
- Nom : `text-sm font-semibold text-gray-900`
- Badge : `bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full` ("3 membres")

**Niveau 2 - Rôle**
`bg-gray-100/50 border-b border-gray-200 px-8 py-2`
- Texte : `text-xs font-medium text-gray-500 uppercase tracking-wider`

**Niveau 3 - Contact**
`pl-12 border-b border-gray-100 hover:bg-gray-50`
- Icon user : `h-4 w-4 text-gray-400`
- Nom complet
- Mêmes colonnes

---

## Zone 6 : Slideover Définir Email

### Overlay
`fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50`

### Panel
`fixed inset-y-0 right-0 w-96 bg-white shadow-2xl flex flex-col`

**Header**
`px-6 py-4 border-b border-gray-200 flex items-center justify-between`
- Titre : "Définir l'email de relance"
- Close : `h-5 w-5 text-gray-400 hover:text-gray-600`

**Content**
`p-6 flex-1 overflow-y-auto`

**Recherche**
- Input : `w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm mb-4`
- Placeholder : "Rechercher un email..."

**Résultats**
- Liste : `space-y-2`
- Item : `border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-sky-300 hover:bg-sky-50 transition-all`
- **Sélectionné** : `border-sky-500 bg-sky-50 ring-1 ring-sky-500`

**Contenu item**
- Email : `text-sm font-medium text-gray-900`
- Nom : `text-xs text-gray-500 mt-0.5`
- Utilisations : `text-xs text-gray-400 mt-1`

**Création nouvel email**
- Button : `w-full border border-dashed border-gray-300 rounded-lg p-3 text-sm text-gray-600 hover:border-sky-400 hover:text-sky-600 transition-colors`
- Icon plus

**Footer**
`px-6 py-4 border-t border-gray-200 bg-gray-50`
- "Annuler" : `text-gray-700 hover:text-gray-900 font-medium text-sm mr-3`
- "Sauvegarder" : `bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50`

---

## Zone 7 : Modal Confirmation Blacklist

### Overlay
`fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4`

### Card
`bg-white rounded-xl shadow-xl max-w-md w-full p-6`

**Content**
- Icon : `h-12 w-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4`
- Titre : `text-lg font-semibold text-gray-900 text-center`
- Description : `text-sm text-gray-500 text-center mt-2`
- Alert : `bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4 text-sm text-amber-700`
  - Texte : "Les relances seront supprimées"

**Actions**
`flex gap-3 mt-6`
- "Annuler" : `flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50`
- "Blacklister" : `flex-1 bg-rose-600 text-white py-2 rounded-lg font-medium hover:bg-rose-700`

---

## États Complémentaires

### Alert résultat sync
`mb-6 rounded-lg p-4 flex items-start gap-3`

**Succès**
- `bg-emerald-50 border border-emerald-200 text-emerald-800`
- Icon check-circle

**Erreur**
- `bg-rose-50 border border-rose-200 text-rose-800`
- Icon alert-triangle
- Liste des erreurs si batch

### Toast confirmation
`fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg`
- Texte : "Contact blacklisté avec succès"
