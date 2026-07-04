# Écran : Édition Séquence

## Informations
- **Route** : `/sequences/{type}/{id}`
- **Type** : Formulaire complexe multi-sections
- **Style** : Pines UI - sections clairement délimitées

---

## Layout Global
- Fond : `bg-gray-50 min-h-screen`
- Container : `max-w-5xl mx-auto px-6 py-8`

---

## Zone 1 : Header Éditable

### Layout
`flex items-center justify-between mb-8`

### Gauche - Titre éditable
`flex items-center gap-4`

**Input titre**
- `text-3xl font-semibold text-gray-900 bg-transparent border-0 border-b-2 border-transparent hover:border-gray-300 focus:border-sky-500 focus:ring-0 transition-all px-0 py-1`
- Placeholder : "Nom de la séquence"
- **État hover** : border grise apparaît
- **État focus** : border sky

**Badge type** (non modifiable)
- "Relances" : `bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium`
- "Suivi" : `bg-emerald-100 text-emerald-700`

### Droite - Toggle publication
`flex items-center gap-3`

**Label**
`text-sm text-gray-600`

**Toggle switch**
- Track : `w-11 h-6 bg-gray-200 rounded-full relative transition-colors`
- **État actif** : `bg-sky-600`
- Thumb : `w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 left-0.5 transition-transform`
- **État actif thumb** : `translate-x-5`
- Label à droite : "Publiée" / "Brouillon"

---

## Zone 2 : Configuration Générale

### Card
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6`

### Header section
`px-6 py-4 border-b border-gray-200 bg-gray-50/50`
- Titre : `text-sm font-semibold text-gray-900`
- Sous-titre : `text-xs text-gray-500 mt-0.5`

### Content
`p-6 space-y-5`

**Champ Description**
- Label : `text-sm font-medium text-gray-700 mb-1.5`
- Textarea : `w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-y min-h-[80px]`
- **État focus** : `ring-2 ring-sky-500`

**Champ Type**
- Label + input disabled
- `bg-gray-100 text-gray-500 cursor-not-allowed`

---

## Zone 3 : Lien de Paiement

### Card
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6`

### Content
`p-6`

**Input URL**
- Label : `text-sm font-medium text-gray-700 mb-1.5`
- Input : `w-full bg-white border border-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm`
- Icon link : `absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`
- Placeholder : "https://..."
- **État valid** : bordure verte + check icon à droite
- Help text : `text-xs text-gray-500 mt-1.5`

---

## Zone 4 : Règles d'Assignation

### Card
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6`

### Header
`px-6 py-4 border-b border-gray-200 flex items-center justify-between`
- Titre : "Appliquer cette séquence à..."
- Badge info (optionnel)

### Content
`p-6`

**Radio groupe**
`flex gap-6 mb-6`

*Option Inclure*
`flex items-center gap-2`
- Radio : `h-4 w-4 text-sky-600 border-gray-300 focus:ring-sky-500`
- Label : `text-sm text-gray-700`

*Option Exclure*
Même style

**Liste des règles**
`space-y-3`

*Row règle*
`flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3`

**Éléments**
1. Select "Champ" : `bg-white border border-gray-200 rounded-md px-3 py-1.5 text-sm flex-1`
2. Select "Opérateur" : `bg-white border border-gray-200 rounded-md px-3 py-1.5 text-sm w-32`
3. Input "Valeur" : `bg-white border border-gray-200 rounded-md px-3 py-1.5 text-sm flex-1`
4. Bouton supprimer : `p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all`

**État empty**
`text-center py-8 border-2 border-dashed border-gray-200 rounded-lg`
- Texte : `text-sm text-gray-500`
- "Aucune règle définie"

**Bouton ajouter**
`mt-4 border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2`
- Icon : `plus` `h-4 w-4`

---

## Zone 5 : Emails de la Séquence

### Header section
`flex items-center justify-between mb-4`
- Titre : `text-lg font-semibold text-gray-900`
- Badge compteur : `bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full ml-2`
- Bouton ajouter : `bg-sky-600 text-white hover:bg-sky-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ml-auto`

### Liste des emails
`space-y-4`

### Card Email

**État collapsed**
`bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors`

*Header*
`px-4 py-3 flex items-center gap-3 cursor-pointer bg-gray-50/50 hover:bg-gray-50`
- Chevron : `h-4 w-4 text-gray-400 transition-transform` (rotate-180 si expanded)
- Numéro : `h-6 w-6 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center text-xs font-bold`
- Sujet : `text-sm font-medium text-gray-900 flex-1 truncate`
- Badge délai : `bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full` (ex: "J+7")
- Drag handle : `h-4 w-4 text-gray-300 cursor-move hover:text-gray-500`

**État expanded**
`bg-white border border-sky-200 rounded-xl overflow-hidden ring-1 ring-sky-100`

*Content*
`p-5 space-y-5`

**Champ Sujet**
- Input : `w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500`
- Help : variables disponibles `{nom}`, `{montant}`...

**Grid 2 colonnes**
- Délai : Number input + Select unité (jours/semaines/mois)
- Heure : Time picker

**Éditeur Corps**
`border border-gray-200 rounded-lg overflow-hidden`
- Toolbar : `bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2`
  - Boutons : gras, italique, liste, lien, variables
- Zone édition : `min-h-[200px] p-4`

**Bouton Variables**
`absolute bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-1.5 text-sm text-gray-700 hover:border-sky-400 flex items-center gap-2`
- Dropdown : `absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48`
- Section : `px-3 py-1 text-xs font-semibold text-gray-500 uppercase`
- Item : `px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer`

*Footer card*
`px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end`
- "Supprimer cet email" : `text-rose-600 hover:text-rose-700 text-sm font-medium`

---

## Zone 6 : Actions Globales

### Container
`flex items-center justify-between mt-8 pt-6 border-t border-gray-200`

**Gauche**
`flex items-center gap-3`
- "Tester" : `border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2`
  - Icon : `play` `h-4 w-4`
- "Dupliquer" : même style

**Droite**
- "Supprimer" : `text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-4 py-2 rounded-lg text-sm font-medium`
- "Enregistrer" : `bg-sky-600 text-white hover:bg-sky-700 px-6 py-2 rounded-lg text-sm font-medium`
  - **État saving** : spinner + "Enregistrement..."

---

## États Complémentaires

### Toast notifications
`fixed top-4 right-4 z-50`
- Succès : `bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 shadow-lg`
- Erreur : `bg-rose-50 border border-rose-200 text-rose-800 rounded-lg px-4 py-3 shadow-lg`

### Modal confirmation navigation
Si modifs non sauvegardées :
- Overlay + card centrée
- Titre : "Modifications non enregistrées"
- Actions : "Rester", "Quitter sans enregistrer"

### Drag & drop réordre
- État dragging : `opacity-50 shadow-lg`
- Zone drop : `border-2 border-dashed border-sky-400 bg-sky-50 rounded-xl`
