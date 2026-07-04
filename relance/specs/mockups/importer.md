# Écran : Importer

## Informations
- **Route** : `/import`
- **Type** : Wizard multi-étapes
- **Style** : Pines UI - épuré, étapes visuelles claires

---

## Layout Global
- Fond : `bg-gray-50 min-h-screen`
- Container : `max-w-3xl mx-auto px-6 py-12`

---

## Zone 1 : Indicateur d'étapes

### Structure
- Flex row avec lignes connectrices
- `mb-10`

### Étape (générique)
```
Flex items-center
  [Cercle] - [Label] - [Ligne] - [Cercle suivant]
```

### États des cercles

**Étape complétée (1)**
- Cercle : `h-8 w-8 rounded-full bg-sky-600 text-white flex items-center justify-center`
- Icône : `h-4 w-4` (check)
- Label : `text-sm font-medium text-gray-900 ml-2`
- Ligne : `h-0.5 flex-1 bg-sky-600 mx-4`

**Étape active (2)**
- Cercle : `h-8 w-8 rounded-full bg-sky-600 text-white ring-4 ring-sky-100`
- Texte : "2" à l'intérieur
- Label : `text-sm font-medium text-sky-600 ml-2`
- Ligne : `h-0.5 flex-1 bg-gray-200 mx-4`

**Étape future (3)**
- Cercle : `h-8 w-8 rounded-full bg-gray-200 text-gray-400`
- Texte : "3"
- Label : `text-sm font-medium text-gray-400 ml-2`

---

## Zone 2 : Étape 1 - Upload

### Card Container
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`

### Header
- `px-6 py-5 border-b border-gray-100`
- Titre : `text-lg font-semibold text-gray-900`
- Sous-titre : `text-sm text-gray-500 mt-1`

### Zone de Drop

**État normal** :
- `m-6 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-all group`
- Icône : `h-12 w-12 text-gray-300 group-hover:text-sky-500 mx-auto mb-4 transition-colors`
- Texte principal : `text-base font-medium text-gray-700`
- Sous-texte : `text-sm text-gray-400 mt-2`
- Input file : caché, multiple, accept="application/pdf"

**État drag-over** :
- `border-sky-500 bg-sky-50`
- Icône : `text-sky-500 scale-110 transition-transform`

**État disabled** (pendant upload) :
- `opacity-50 cursor-not-allowed pointer-events-none`

### Liste des fichiers

**Apparaît si fichiers sélectionnés** :
- Container : `mx-6 mb-6 space-y-2`
- Row : `flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100`

**État normal row** :
- Icône PDF : `h-5 w-5 text-red-400`
- Nom : `text-sm font-medium text-gray-700 flex-1 truncate`
- Taille : `text-xs text-gray-400 tabular-nums`
- Bouton X : `h-6 w-6 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all`

**État uploading row** :
- Progress bar : `h-1.5 bg-gray-200 rounded-full overflow-hidden flex-1`
- Fill : `h-full bg-sky-500 rounded-full` (width selon %)
- Texte : `text-xs text-sky-600 ml-2`

### Footer
- `px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between`
- Gauche : `text-sm text-gray-500` ("3 fichiers sélectionnés")
- Droite :
  - **État normal** : `bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed` (disabled si 0 fichiers)
  - **État loading** : `bg-sky-600 opacity-70 cursor-wait` + spinner
  - **État error** : Message `text-sm text-rose-600 mt-2`

---

## Zone 3 : Étape 2 - Révision

### Alertes

**Warning parsing** (si erreurs partielles) :
- `mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3`
- Icône : `h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5`
- Content :
  - Titre : `text-sm font-medium text-amber-800`
  - Desc : `text-sm text-amber-700 mt-1`

### Cards par fichier

**Container** : `space-y-4`

**Card** : `bg-white rounded-xl border border-gray-200 shadow-sm`

**Header** :
- `px-5 py-4 border-b border-gray-100 flex items-center gap-3`
- Icône : `h-5 w-5 text-gray-400`
- Nom : `text-sm font-medium text-gray-900`
- Badge "Analysé" : `bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium`
- Badge "Non analysé" : `bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full`

**Grid formulaire** :
- `p-5 grid grid-cols-2 gap-x-6 gap-y-5`
- Chaque champ : `space-y-1.5`

### Champs de formulaire

**Label** : `text-xs font-medium text-gray-700`
- Étoile rouge si required : `text-rose-500`

**Input states** :

1. **Vide / Non analysé** :
   - `w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 placeholder-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500`

2. **Rempli / Valid** :
   - `w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500`

3. **Focus** :
   - `ring-2 ring-sky-500 border-sky-500`

4. **Disabled** :
   - `bg-gray-100 text-gray-400 cursor-not-allowed`

5. **Error validation** :
   - `border-rose-300 bg-rose-50`
   - Message : `text-xs text-rose-600 mt-1`

### Groupes de champs

**Groupe "Facture"** :
- N° Facture
- N° Dossier
- Réf. pièce
- Date pièce
- Montant HT
- Montant TTC
- Reste à payer

**Groupe "Contact payeur"** :
- Nom (required)
- Email
- Téléphone
- Type

**Groupe "Bien"** :
- Adresse
- Lot
- Étage
- Porte

**Groupe "Autres"** :
- Date intervention
- Employé
- Commentaire

### Footer actions
- `p-5 border-t border-gray-100 flex items-center justify-between bg-gray-50`
- Gauche : `text-gray-700 hover:text-gray-900 font-medium text-sm` (flèche gauche + "Retour")
- Droite : `bg-sky-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-sky-700 disabled:opacity-50` ("Importer")

---

## Zone 4 : Étape 3 - Résumé

### Card
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`

### Header (succès)
- `px-6 py-5 border-b border-gray-100 flex items-center gap-3`
- Icône : `h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center`
- Texte : `text-lg font-semibold text-gray-900`

### Liste des statistiques

**Container** : `p-6 space-y-4`

**Row** : `flex items-center justify-between py-2`
- Label : `text-sm text-gray-600`
- Valeur : `text-sm font-semibold`
  - Vert : `text-emerald-600`
  - Bleu : `text-sky-600`
  - Gris : `text-gray-900`
  - Orange : `text-amber-600`

**Lignes** :
1. Impayés importés (vert)
2. Contacts créés (bleu)
3. Contacts mis à jour (gris)
4. Impayés sans séquence (orange)
5. Contacts sans email (orange)

### Section erreurs (si présentes)
- `mt-4 border-t border-gray-100 pt-4`
- Titre : `text-sm font-medium text-gray-900 mb-3`
- Liste : `space-y-2`
- Item : `flex items-start gap-2 text-sm text-rose-600`
  - Icône : `h-4 w-4 flex-shrink-0 mt-0.5`
  - Texte : "fichier.pdf — Erreur description"

### Footer actions
- `p-5 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-3`

**Boutons** :
1. "Nouvel import" : `border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium`
2. "Voir impayés sans séquence" (si >0) : `bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 px-4 py-2 rounded-lg text-sm font-medium`
3. "Voir contacts sans email" (si >0) : même style
4. "Aller aux impayés" : `bg-sky-600 text-white hover:bg-sky-700 px-4 py-2 rounded-lg text-sm font-medium`

---

## États Transitions

### Entre étapes
- Spinner overlay : `absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50`
- Animation : fade-in 200ms

### Progress étape 2
- Barre de progression globale : `fixed top-0 left-0 h-1 bg-sky-500 transition-all duration-300`
- Ou spinner dans le bouton
