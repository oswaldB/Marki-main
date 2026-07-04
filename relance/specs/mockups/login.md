# Écran : Login

## Informations
- **Route** : `/login`
- **Type** : Page authentification
- **Style** : Pines UI - minimaliste, centré

---

## Layout Global
- Fond : `bg-gray-50 min-h-screen flex items-center justify-center p-6`

---

## Zone 1 : Card Centrale

### Container
`bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden`

### Header Logo
`px-8 pt-8 pb-6 text-center`

**Éléments**
- Logo : `h-12 w-auto mx-auto mb-4` (ou placeholder)
- Titre : `text-2xl font-bold text-gray-900`
- Sous-titre : `text-sm text-gray-500 mt-1`

---

## Zone 2 : Formulaire

### Container
`px-8 pb-8 space-y-5`

### Champs

**Email**
`space-y-1.5`
- Label : `text-sm font-medium text-gray-700`
- Input :
  - `w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all`
  - Icon enveloppe : `absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400` (si icon inside)
  - Type : `email`
  - Required

**États Email**
- **Normal** : border-gray-200
- **Focus** : `ring-2 ring-sky-500 border-sky-500`
- **Error** : `border-rose-500 bg-rose-50 focus:ring-rose-500`
- **Filled** : `text-gray-900`

**Mot de passe**
`space-y-1.5`
- Label : `text-sm font-medium text-gray-700`
- Input group :
  - Input : `w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm pr-10` (pr pour bouton eye)
  - Type : `password`
  - Bouton eye : `absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-600` (toggle visibility)

---

## Zone 3 : Actions

### Container
`space-y-4 pt-2`

### Bouton Principal
`w-full bg-sky-600 text-white rounded-lg px-4 py-3 text-sm font-semibold hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 shadow-sm`

**États**
- **Normal** : bg-sky-600
- **Hover** : bg-sky-700
- **Focus** : ring
- **Loading** : `opacity-70 cursor-wait` + spinner
- **Disabled** : `opacity-50 cursor-not-allowed` (si champs invalides)

### Spinner (dans bouton)
`h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin`

---

## Zone 4 : Messages

### Erreur Authentification
`bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-3`
- Icon : `exclamation-circle` `h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5`
- Texte : `text-sm text-rose-700`
  - "Email ou mot de passe incorrect"

### Lien Secondaire
`text-center`
- Lien : `text-sm text-sky-600 hover:text-sky-700 font-medium`
  - "Mot de passe oublié ?" (si feature activée)

---

## État Page

### Déjà authentifié
- Redirection automatique
- Ou message : "Vous êtes déjà connecté" + lien dashboard

### Session expirée
- Paramètre URL : `?expired=1`
- Alert info : `bg-amber-50 border border-amber-200 text-amber-800`
  - "Votre session a expiré, veuillez vous reconnecter."

---

## Responsive

### Mobile (< 640px)
- Card : `rounded-none border-0 shadow-none bg-transparent`
- Pleine largeur, moins de padding
- Fond gris clair
