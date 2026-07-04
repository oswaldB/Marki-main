# Écran : Relances

## Informations
- **Route** : `/relances`
- **Type** : Gestion des relances avec 3 vues
- **Style** : Pines UI - interface épurée avec calendrier intégré

---

## Layout Global
- Fond : `bg-gray-50 min-h-screen`
- Container : `max-w-7xl mx-auto px-6 py-8`

---

## Zone 1 : Header et Contrôles

### Layout
`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6`

### Toggle de vues (segmented control)
`bg-gray-100 p-1 rounded-lg inline-flex`

**Boutons** :
- **Inactif** : `px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:text-gray-900 transition-all flex items-center gap-2`
- **Actif** : `bg-white text-sky-600 shadow-sm rounded-md` + icône

**Vues** :
1. **Tableau** (table-cells icon)
2. **Calendrier** (calendar-days icon)
3. **Validation** (check-circle icon) - badge si relances en attente

### Filtres (à droite)
`flex items-center gap-3 flex-wrap`

**Select Statut**
- Trigger : `bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 min-w-[140px]`
- Options : Tous, En attente, Envoyé, Échec, Annulé, Non validées
- **État active** : badge dans le select

**Select Séquence**
- Même style

**Recherche**
- Input : `w-52 bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm`
- Icon search : `absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`

### Bouton principal
`bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sky-700 flex items-center gap-2 shadow-sm`
- Icon : `plus-circle`
- **État loading** : spinner + "Création..."
- **État disabled** : `opacity-50 cursor-not-allowed`

---

## Zone 2 : Vue Tableau

### Container
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`

### Header tableau
`bg-gray-50 border-b border-gray-200 px-4 py-3 grid grid-cols-[1fr_1.5fr_1.2fr_1fr_100px_80px_60px] gap-4 items-center`

**Colonnes** :
1. **Date** : `text-xs font-semibold text-gray-500 uppercase` (triable)
2. **Objet** : même style
3. **Destinataire** : même style
4. **Facture** : même style
5. **Statut** : même style
6. **Validé** : même style
7. **Actions** : vide

### Rows

**État normal**
`border-b border-gray-100 px-4 py-3 grid grid-cols-[1fr_1.5fr_1.2fr_1fr_100px_80px_60px] gap-4 items-center hover:bg-gray-50 transition-colors`

**Cellules** :

*Date*
- `text-sm text-gray-600 tabular-nums`
- Format : "12/06/2026"

*Objet*
- `text-sm text-gray-900 truncate`
- Badges inline :
  - Manuel : `✋` emoji
  - Non validé : `bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-medium ml-2`

*Destinataire*
- `text-sm text-gray-600 truncate`

*Facture*
- Lien : `text-sm font-mono text-sky-600 hover:underline truncate`
- Si multiple : "F°001, F°002..."

*Statut*
- Badge selon état :
  - **Pending** : `bg-gray-100 text-gray-700`
  - **Envoyé** : `bg-emerald-100 text-emerald-700`
  - **Échec** : `bg-rose-100 text-rose-700`
  - **Annulé** : `bg-amber-100 text-amber-700`
  - **Optimisée** : `bg-purple-100 text-purple-700`

*Validé*
- Oui : `text-emerald-600 font-medium`
- Non : `text-amber-600 font-medium`

*Actions*
- Icon buttons :
  - Éditer : `p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded`
  - Voir : `p-1.5 text-gray-400 hover:text-gray-600`
  - Retry : `p-1.5 text-amber-500 hover:text-amber-600`
  - Annuler : `p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50`

### Row - État sélectionné
`bg-sky-50 hover:bg-sky-100 border-b border-sky-100`
- Checkbox cochée

### Empty state
`py-16 text-center`
- Icon : `inbox` `h-12 w-12 text-gray-200 mx-auto mb-4`
- Titre : `text-sm font-medium text-gray-900`
- Desc : `text-sm text-gray-500 mt-1`

---

## Zone 3 : Barre de Sélection (Fixed Bottom)

`fixed bottom-6 left-1/2 -translate-x-1/2 z-50`

### Container
`bg-gray-900 text-white rounded-xl shadow-2xl px-5 py-4 flex items-center gap-4`

### Content
- Compteur : `text-sm font-medium` ("3 relances sélectionnées")
- Bouton Annuler groupe : `bg-rose-500 hover:bg-rose-400 text-white px-4 py-2 rounded-lg text-sm font-medium`
- Bouton Valider groupe (si applicable) : `bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm font-medium`
- Bouton Fermer : `text-gray-400 hover:text-white text-sm`

---

## Zone 4 : Vue Calendrier

### Layout
`flex gap-6 h-[calc(100vh-200px)]`

### Calendrier (gauche)
`flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6`

**Header calendrier**
`flex items-center justify-between mb-6`
- Navigation : `< >` buttons `h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100`
- Mois/Année : `text-lg font-semibold text-gray-900`
- Bouton "Aujourd'hui" : `text-sm text-sky-600 hover:text-sky-700 font-medium`

**Grille**
- Jours semaine : `grid grid-cols-7 gap-px`
- Header jours : `text-xs font-medium text-gray-500 text-center py-2`
- Cellule jour :
  - `min-h-[100px] border-t border-gray-100 p-2 hover:bg-gray-50 transition-colors`
  - Numéro : `text-sm text-gray-700 font-medium` (aujourd'hui : `bg-sky-600 text-white h-6 w-6 rounded-full flex items-center justify-center`)
  - Events : `space-y-1 mt-1`

**Event dans calendrier**
`text-xs px-2 py-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity`
- Couleurs selon statut (mêmes que badges)
- Non validé : bordure orange supplémentaire

**État jour sélectionné**
`bg-sky-50 border-sky-200`

### Panneau latéral (droite)
`w-80 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col`

**Header**
`px-4 py-3 border-b border-gray-200 flex items-center justify-between`
- Date : `text-base font-semibold text-gray-900`
- Close : `h-5 w-5 text-gray-400 hover:text-gray-600`

**Content**
`p-4 overflow-y-auto flex-1 space-y-3`

**Card relance**
`border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors`

*Header card*
`flex items-center justify-between mb-2`
- Badge statut (petit)
- Badge "non validé" si applicable

*Content*
- Objet : `text-sm font-medium text-gray-900 line-clamp-1`
- Destinataire : `text-xs text-gray-500 mt-1 truncate`

*Actions*
`flex items-center gap-2 mt-3`
- Icons buttons (petits)

**Empty**
`py-8 text-center text-sm text-gray-400`

---

## Zone 5 : Vue Validation (Workflow)

### Layout
`grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]`

### Colonne 1 : Liste (gauche)
`bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden`

**Header**
`px-4 py-3 border-b border-gray-200`
- Titre : `text-sm font-semibold text-gray-900` + badge count
- Recherche : `mt-2 relative` (input xs)
- Tri : Select "Chronologique" / "Par destinataire"

**Sélection bulk (si items cochés)**
`px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between`
- Compteur : `text-xs text-gray-600`
- Bouton "Valider tout" : `text-xs text-sky-600 font-medium hover:text-sky-700`

**Liste**
`overflow-y-auto flex-1`

*Item*
`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors`

**État normal**
- Content :
  - Objet : `text-sm font-medium text-gray-900 line-clamp-1`
  - Destinataire : `text-xs text-gray-500 mt-0.5`
  - Date : `text-xs text-gray-400 mt-1`
- Checkbox : `absolute right-4 top-1/2 -translate-y-1/2`

**État sélectionné (actif)**
`bg-sky-50 border-l-4 border-l-sky-500 border-gray-100`

**État validé précédemment**
`opacity-50 bg-gray-50`

**Empty**
`flex flex-col items-center justify-center h-full py-12`
- Icon check-circle : `h-12 w-12 text-emerald-500 mb-3`
- Texte : "Toutes les relances ont été validées !"

### Colonne 2-3 : Détail (droite)
`bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden lg:col-span-2`

**Header**
`px-6 py-4 border-b border-gray-200 flex items-center justify-between`
- Titre : "Validation de la relance"
- Position : `text-sm text-gray-500` ("3 / 47")

**Actions**
- "Enregistrer" : `border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50` (disabled si pas de modifs)
- "Valider" : `bg-sky-600 text-white hover:bg-sky-700 px-4 py-1.5 rounded-lg text-sm font-medium`
- Dropdown "Actions" : `border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1`
  - Items : Passer, Blacklister, Supprimer

**Content**
`p-6 overflow-y-auto flex-1 space-y-6`

*Champs*

**Date d'envoi**
`grid grid-cols-2 gap-4`
- Label : `text-xs font-medium text-gray-700 mb-1`
- Input date : `w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500`

**À / CC / Objet**
- Même style
- "À" : souvent readonly (grisé)

**Corps de l'email**
- Label + hint
- Éditeur : `border border-gray-200 rounded-lg overflow-hidden`
  - Toolbar : `border-b border-gray-200 bg-gray-50 px-3 py-2 flex items-center gap-2`
  - Zone texte : `min-h-[300px] p-4`
  - **État focus** : `ring-2 ring-sky-500 border-sky-500`

*Alert pièce jointe*
`bg-sky-50 border border-sky-100 rounded-lg p-4 flex items-start gap-3`
- Icon : `h-5 w-5 text-sky-600 flex-shrink-0`
- Texte : "La facture sera automatiquement jointe..."

*Section PDF*
`border border-gray-200 rounded-lg overflow-hidden`
- Header : `bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center justify-between`
  - Icon document-text + texte + bouton télécharger
- Content : `h-80 bg-gray-100`
  - Iframe ou placeholder

*Footer modale confirmation*
Si modifs non sauvegardées :
- Alert : `bg-amber-50 border border-amber-200 rounded-lg p-4`
- Boutons : Annuler, Abandonner, Enregistrer

---

## Zone 6 : Slideover Édition

### Overlay
`fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50`

### Panel
`fixed inset-y-0 right-0 w-1/2 bg-white shadow-2xl transform transition-transform duration-300 translate-x-full` (ou 0 si open)

### Header
`px-6 py-4 border-b border-gray-200 flex items-center justify-between`
- Titre : "Modifier la relance" / "Voir la relance"
- Bouton Valider (si édition)

### Content
Identique à la vue validation colonne droite

### Footer
`px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3`
- "Annuler"
- "Enregistrer les modifications" (primary)

---

## États Complémentaires

### Toast notifications
`fixed top-4 right-4 z-50`
- Succès : `bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 shadow-lg flex items-center gap-3`
- Erreur : `bg-rose-50 border border-rose-200 text-rose-800`

### Loading overlay
`fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center`
- Spinner : `h-8 w-8 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin`
