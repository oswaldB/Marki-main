# Écran : Liste Séquences

## Informations
- **Route** : `/sequences`
- **Type** : Liste avec CRUD
- **Style** : Pines UI - cards minimalistes

---

## Layout Global
- Fond : `bg-gray-50 min-h-screen`
- Container : `max-w-7xl mx-auto px-6 py-8`

---

## Zone 1 : Header

### Layout
`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6`

### Éléments
- Titre : `text-2xl font-semibold text-gray-900`

**Boutons création** (groupe à droite)
`flex items-center gap-3`

*Relances*
`bg-white border border-gray-200 text-gray-700 hover:border-sky-300 hover:text-sky-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all`
- Icon : `plus` `h-4 w-4`
- **État loading** : spinner + "Création..." + `opacity-70`

*Suivi*
Même style mais avec variante verte :
`hover:border-emerald-300 hover:text-emerald-600`

---

## Zone 2 : Info Alert

### Container
`bg-sky-50 border border-sky-100 rounded-xl p-4 mb-6`

### Content

**Ligne Relances**
`flex items-center gap-2 mb-2`
- Badge : `bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-medium`
- Texte : `text-sm text-gray-700`

**Ligne Suivi**
`flex items-center gap-2`
- Badge : `bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded font-medium`
- Texte : `text-sm text-gray-700`

---

## Zone 3 : Tableau

### Container
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`

### Header
`bg-gray-50 border-b border-gray-200 px-4 py-3 grid grid-cols-[120px_2fr_100px_80px_80px_100px] gap-4 items-center`

**Colonnes** :
1. Type
2. Nom
3. Statut
4. Emails
5. Impayés
6. Actions

### Rows

**État normal**
`border-b border-gray-100 px-4 py-3 grid grid-cols-[120px_2fr_100px_80px_80px_100px] gap-4 items-center hover:bg-gray-50 transition-colors`

**Cellules**

*Type*
Badge selon type :
- "Relances" : `bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1`
- "Suivi" : `bg-emerald-50 text-emerald-700`
- Icon respective à gauche du texte

*Nom*
- Lien : `text-sm font-medium text-sky-600 hover:text-sky-700 hover:underline`
- Route : `/sequences/{type}/{id}`

*Statut*
- "Publiée" : `bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium`
- "Brouillon" : `bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium`

*Emails*
- `text-sm text-gray-600 tabular-nums`

*Impayés*
- `text-sm text-gray-600 tabular-nums`

*Actions*
`flex items-center justify-end gap-1`
- Éditer : `p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-all`
- Dupliquer : `p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded`
- Supprimer : `p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded`

**État hover sur row**
- Background : `bg-gray-50`
- Ombre légère sur la row (optionnel)

### Empty state
`py-16 text-center`
- Icon : `clipboard-document-list` `h-12 w-12 text-gray-200 mx-auto mb-4`
- Titre : `text-sm font-medium text-gray-900`
- Desc : `text-sm text-gray-500 mt-1`
- CTA : "Créer votre première séquence" (bouton primary)

### Loading state
- Skeleton : `animate-pulse` sur toutes les cellules
- Lignes grises avec opacité réduite

---

## Zone 4 : Modal Confirmation Suppression

### Overlay
`fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4`

### Card
`bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden`

**Header**
`px-6 py-4 border-b border-gray-200`
- Titre : `text-lg font-semibold text-gray-900`

**Content**
`px-6 py-4`
- Texte : `text-sm text-gray-600`
  - "Supprimer **{nom}** ({type}) ?"

**Alert (conditionnelle)**
Si impayés > 0 :
`bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4 flex items-start gap-3`
- Icon : `h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5`
- Texte : `text-sm text-amber-800`
  - "{X} impayé(s) assignés seront sans séquence"

**Footer**
`px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3`
- "Annuler" : `text-gray-700 hover:text-gray-900 font-medium text-sm px-4 py-2`
- "Supprimer" : `bg-rose-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-rose-700 disabled:opacity-50` (loading si en cours)
  - **État loading** : spinner + "Suppression..."

---

## États de création

### Redirection
Après clic sur "Nouvelle séquence" :
- Loading overlay : `fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center`
- Spinner + "Création..."
- Puis redirection vers `/sequences/{type}/{newId}`

### Toast succès création
`fixed top-4 right-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 shadow-lg`
- "Séquence créée avec succès"
