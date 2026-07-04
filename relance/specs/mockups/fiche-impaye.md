# Écran : Fiche Impayé (Détail)

## Informations
- **Route** : `/impayes/{id}`
- **Type** : Page détail avec actions
- **Style** : Pines UI - layout en cards distinctes

---

## Layout Global
- Fond : `bg-gray-50 min-h-screen`
- Container : `max-w-5xl mx-auto px-6 py-8`

---

## Zone 1 : Header

### Layout
`flex items-center justify-between mb-6`

### Éléments

**Gauche**
`flex items-center gap-3`
- Bouton retour : `p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all`
  - Icon : `arrow-left` `h-5 w-5`
- Titre : `text-2xl font-semibold text-gray-900 font-mono`
  - Format : "FA-2024-00123"
- Badges :
  - Retard : `bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full font-medium` (ex: "+45j")
  - Blacklist : `bg-gray-800 text-white text-xs px-2 py-0.5 rounded-full font-medium` "Relances suspendues"

**Droite - Actions**
`flex items-center gap-2`

*Marquer payé*
`bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm`
- Icon : `check` `h-4 w-4`

*Blacklister*
`bg-rose-600 text-white hover:bg-rose-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm`
- Icon : `no-symbol` `h-4 w-4`

*Assigner séquence*
`border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2`
- Icon : `queue-list` `h-4 w-4`

---

## Zone 2 : Grille Info (2 colonnes)

### Layout
`grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6`

### Card Informations Facture
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`

**Header**
`px-6 py-4 border-b border-gray-200 flex items-center gap-2`
- Icon : `document-text` `h-5 w-5 text-gray-400`
- Titre : `text-sm font-semibold text-gray-900`

**Content**
`p-6 grid grid-cols-2 gap-4`

**Éléments**
- Label : `text-xs font-medium text-gray-500 uppercase`
- Valeur : `text-sm font-medium text-gray-900`
- Valeur montant : `text-lg font-bold text-gray-900 tabular-nums`
- Valeur reste : `text-lg font-bold text-rose-600 tabular-nums` (si > 0)
- Valeur payé : `text-lg font-bold text-emerald-600` (si 0)

*Champs* :
- N° Facture (mono)
- N° Dossier
- Référence
- Date pièce
- Date échéance
- Montant HT
- Montant TTC
- Reste à payer (en évidence)

### Card Payeur
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`

**Header**
`px-6 py-4 border-b border-gray-200 flex items-center gap-2`
- Icon : `user` `h-5 w-5 text-gray-400`
- Titre : "Payeur"

**Content**
`p-6 space-y-3`

**Éléments**
- Nom : `text-lg font-semibold text-gray-900`
- Email : `text-sm text-sky-600 hover:underline` (lien mailto)
- Téléphone : `text-sm text-gray-600`
- Type : `text-sm text-gray-500`
- Lien : "Voir fiche contact" (sky-600)

---

## Zone 3 : Card Bien (pleine largeur)

**Container**
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6`

**Header**
`px-6 py-4 border-b border-gray-200 flex items-center gap-2`
- Icon : `building-office` `h-5 w-5 text-gray-400`

**Content**
`p-6`
- Adresse : `text-base font-medium text-gray-900`
- Détails : `text-sm text-gray-500 mt-1`
  - Lot / Étage / Porte

---

## Zone 4 : Section Blacklist (conditionnel)

### Alert
`bg-gray-800 rounded-xl p-6 mb-6 text-white`

**Content**
`flex items-start justify-between gap-4`

*Gauche*
- Icon : `no-symbol` `h-6 w-6 text-gray-300 flex-shrink-0`
- Content :
  - Titre : `font-semibold text-lg`
  - Motif : `text-gray-300 text-sm mt-1`
  - Détail : `text-gray-400 text-xs mt-0.5`

*Droite*
- Bouton : `bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium`
  - "Réactiver"

---

## Zone 5 : Section PDF

**Container**
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6`

**Header**
`px-6 py-4 border-b border-gray-200 flex items-center justify-between`
- Titre : "Facture PDF"
- Bouton : `text-sky-600 hover:text-sky-700 text-sm font-medium flex items-center gap-1`
  - Icon : `arrow-down-tray` `h-4 w-4`
  - "Télécharger"

**Content**
`h-[500px] bg-gray-100`

**États**
- Loading : spinner centré
- Loaded : iframe ou viewer PDF
- Error : message + retry

---

## Zone 6 : Section Relances Associées

**Container**
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6`

**Header**
`px-6 py-4 border-b border-gray-200`
- Titre : "Relances associées"

**Tableau**
`divide-y divide-gray-100`

**Row**
`px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors`

*Content*
- Gauche :
  - Date : `text-sm text-gray-600 tabular-nums`
  - Objet : `text-sm font-medium text-gray-900 ml-4`
  - Destinataire : `text-xs text-gray-500 ml-4`
- Droite :
  - Badge statut (mêmes couleurs que liste relances)
  - Bouton "Voir" : `text-sky-600 hover:text-sky-700 text-sm font-medium ml-4`

**Empty**
`py-8 text-center text-sm text-gray-500`

---

## Zone 7 : Section Historique

**Container**
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`

**Header**
`px-6 py-4 border-b border-gray-200`
- Titre : "Historique"

**Timeline**
`p-6 space-y-4`

**Item**
`flex gap-4`
- Icon timeline : `h-2 w-2 rounded-full bg-sky-500 mt-2 flex-shrink-0`
- Content :
  - Action : `text-sm text-gray-900`
  - Date : `text-xs text-gray-500 mt-0.5`
  - Détail : `text-xs text-gray-400 mt-1`

**Types d'icônes**
- Création : `plus-circle` (gris)
- Envoi : `paper-airplane` (sky)
- Paiement : `check-circle` (emerald)
- Blacklist : `no-symbol` (gray/rose)

---

## Modales

### Modal Marquer Payé

**Card**
`bg-white rounded-xl shadow-xl max-w-md w-full p-6`

**Content**
- Titre : "Marquer comme payé ?"
- Champs :
  - Montant payé (input)
  - Date paiement (date picker)
  - Mode de paiement (select)
- Texte : "Le reste à payer sera mis à jour."

**Actions**
- "Annuler"
- "Confirmer le paiement" (emerald)

### Slideover Blacklist

**Panel**
`w-96`

**Content**
- Titre : "Blacklister l'impayé"
- Select motif type (litige, erreur...)
- Textarea détail
- Alert : "Les relances seront suspendues."
- Actions : "Annuler", "Blacklister" (rose)

---

## États

### Toast succès
`bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 shadow-lg`
- "Impayé réactivé avec succès"

### Loading
Skeleton sur les cards pendant chargement initial
