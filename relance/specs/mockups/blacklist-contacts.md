# Écran : Blacklist Contacts

## Informations
- **Route** : `/blacklist`
- **Type** : Liste + ajout via slideover
- **Style** : Pines UI - alertes visuelles importantes

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
- Bouton : `bg-sky-600 text-white hover:bg-sky-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm`
  - Icon : `plus` `h-4 w-4`
  - Texte : "Ajouter à la blacklist"
  - **État loading** : spinner + "Chargement..."

---

## Zone 2 : Filtres

### Layout
`flex items-center gap-3 mb-4 flex-wrap`

### Éléments

**Recherche**
- Input : `w-64 bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm`
- Icon : `magnifying-glass` `absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`

**Select Source**
- `bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm`
- Clearable : bouton X si valeur sélectionnée

---

## Zone 3 : Actions Groupées (conditionnel)

### Container
`bg-gray-100 rounded-lg p-3 mb-4 flex items-center justify-between`

### Content
- Texte : `text-sm text-gray-700` ("3 contact(s) sélectionné(s)")
- Bouton : `bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2`
  - Icon : `check-circle` `h-4 w-4`
  - "Retirer de la blacklist"

---

## Zone 4 : Tableau

### Container
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`

### Header
`bg-gray-50 border-b border-gray-200 px-4 py-3 grid grid-cols-[2fr_2fr_1.5fr_100px_100px_100px_60px] gap-4 items-center`

**Colonnes** :
1. Nom (triable)
2. Email
3. Téléphone
4. Source
5. Impayés
6. Date Blacklist
7. Actions

### Rows

**État normal**
`border-b border-gray-100 px-4 py-3 grid grid-cols-[2fr_2fr_1.5fr_100px_100px_100px_60px] gap-4 items-center hover:bg-gray-50 transition-colors`

**Cellules**

*Nom*
- `text-sm font-medium text-gray-900`

*Email*
- `text-sm text-gray-700`
- *Empty* : `text-gray-400 italic`

*Téléphone*
- `text-sm text-gray-600`

*Source*
- Badge : `bg-blue-50 text-blue-700` ou `bg-purple-50 text-purple-700`

*Impayés*
- `text-sm font-semibold text-gray-900` si > 0

*Date Blacklist*
- `text-sm text-gray-600 tabular-nums`
- Format : "12 juin 2026 14:30"
- *Empty* : `text-gray-400`

*Actions*
- Bouton : `p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all`
  - Icon : `x-circle` `h-4 w-4`
  - Tooltip : "Retirer de la blacklist"

### Empty state
`py-16 text-center`
- Icon : `shield-check` `h-12 w-12 text-gray-200 mx-auto mb-4`
- Titre : "Aucun contact blacklisté"
- Desc : `text-sm text-gray-500 mt-1`

---

## Zone 5 : Slideover Ajouter

### Overlay
`fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50`

### Panel
`fixed inset-y-0 right-0 w-96 bg-white shadow-2xl flex flex-col`

**Header**
`px-6 py-4 border-b border-gray-200 flex items-center justify-between`
- Titre : "Ajouter à la blacklist"
- Close : `h-5 w-5 text-gray-400 hover:text-gray-600` (disabled si loading)

**Content**
`p-6 flex-1 overflow-y-auto space-y-6`

### Section Recherche

**Input**
- `w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm`
- Icon search : `absolute left-3`
- Placeholder : "Rechercher un contact..."
- **État focus** : `ring-2 ring-sky-500 border-sky-500`

### Section Option

**Checkbox**
`flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors`
- Input : `mt-0.5 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500`
- Label : `text-sm text-gray-700`
  - "Supprimer toutes les relances associées"

### Section Progression (si loading)

**Alert**
`bg-sky-50 border border-sky-200 rounded-lg p-4`
- Icon : `arrow-path` `h-5 w-5 text-sky-600 animate-spin` (spinner)
- Titre : "Traitement en cours..."
- Desc : `text-sm text-sky-700`
  - "Suppression des relances (3/12) - 8 supprimées"

### Section Résultats

**Header**
`text-sm text-gray-600 mb-2` ("12 résultat(s) trouvé(s)")

**Liste**
`border border-gray-200 rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto`

*Item*
`flex items-center gap-3 p-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors`

**État normal**
- Checkbox : `h-4 w-4 rounded border-gray-300 text-sky-600`
- Content :
  - Nom : `text-sm font-medium text-gray-900`
  - Coordonnées : `text-xs text-gray-500 mt-0.5`

**État sélectionné**
`bg-sky-50`

**État déjà blacklisté**
- Badge : `bg-rose-100 text-rose-700 text-xs px-1.5 py-0.5 rounded` "Déjà blacklisté"
- Checkbox disabled : `opacity-50 cursor-not-allowed`

**État recherche en cours**
- Skeleton : `h-12 bg-gray-100 animate-pulse` x3

**État pas de résultats**
`p-8 text-center text-sm text-gray-500`

### Footer

**Container**
`px-6 py-4 border-t border-gray-200 bg-gray-50`

**Layout**
`flex justify-end gap-3`

**Boutons**
- "Annuler" : `text-gray-700 hover:text-gray-900 font-medium text-sm px-4 py-2`
- "Ajouter {X} contact(s)" : `bg-sky-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-sky-700 disabled:opacity-50`
  - Disabled si 0 sélection

---

## États Complémentaires

### Toast succès
`fixed bottom-4 right-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 shadow-lg`
- "3 contacts ajoutés à la blacklist"

### Toast erreur
`bg-rose-50 border border-rose-200 text-rose-800`
- "Impossible d'ajouter les contacts"

### Loading table
Skeleton sur toutes les rows du tableau principal
