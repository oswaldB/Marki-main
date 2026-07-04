# Écran : Paramètres SMTP

## Informations
- **Route** : `/settings/smtp`
- **Type** : Formulaire configuration
- **Style** : Pines UI - formulaire structuré

---

## Layout Global
- Fond : `bg-gray-50 min-h-screen`
- Container : `max-w-3xl mx-auto px-6 py-8`

---

## Zone 1 : Header

### Layout
`mb-8`

### Éléments
- Titre : `text-2xl font-semibold text-gray-900`
- Sous-titre : `text-sm text-gray-500 mt-1`
  - "Paramètres des serveurs d'envoi d'emails"

---

## Zone 2 : Formulaire

### Layout
`space-y-6`

### Section Serveur SMTP

**Card**
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`

**Header**
`px-6 py-4 border-b border-gray-200 bg-gray-50/50`
- Titre : `text-sm font-semibold text-gray-900`

**Content**
`p-6 grid grid-cols-1 md:grid-cols-2 gap-6`

**Champs**

*Hôte*
- Label : `text-sm font-medium text-gray-700 mb-1.5`
- Input : `w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500`
- Placeholder : "smtp.example.com"
- Icon server : `absolute left-3 h-5 w-5 text-gray-400` (si utilisé)

*Port*
- Label + input number
- Valeurs : 587, 465, 25

*Sécurité*
- Label + select
- Options : "TLS", "SSL", "Aucune"

---

### Section Authentification

**Card**
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`

**Content**
`p-6 space-y-4`

**Checkbox "Requiert authentification"**
`flex items-center gap-3`
- Input : `h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500`
- Label : `text-sm text-gray-700`

**Champs (conditionnels)**
Visible si checkbox cochée :

*Utilisateur*
- Input text

*Mot de passe*
- Input password avec toggle eye
- Valeur masquée par défaut

---

### Section Expéditeur

**Card**
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`

**Content**
`p-6 grid grid-cols-1 md:grid-cols-2 gap-6`

**Champs**

*Nom d'affichage*
- Input : placeholder "ADTI Recouvrement"

*Email d'expéditeur*
- Input type email
- Placeholder : "recouvrement@adti.fr"
- Validation format email

---

## Zone 3 : Alertes

### Test Configuration

**Bouton Test**
`border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2`
- Icon : `paper-airplane` `h-4 w-4`

**État loading**
- Spinner + "Test en cours..."

**État succès**
`bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-4 flex items-start gap-3`
- Icon : `check-circle` `h-5 w-5 text-emerald-600`
- Titre : "Connexion réussie"
- Desc : "Un email de test a été envoyé à votre adresse."

**État erreur**
`bg-rose-50 border border-rose-200 rounded-lg p-4 mt-4 flex items-start gap-3`
- Icon : `x-circle` `h-5 w-5 text-rose-600`
- Titre : "Échec de connexion"
- Desc : Message d'erreur spécifique (auth, timeout...)

---

## Zone 4 : Actions Footer

### Layout
`flex items-center justify-between pt-6 border-t border-gray-200`

### Éléments

**Gauche**
- "Annuler" : `text-gray-700 hover:text-gray-900 font-medium text-sm px-4 py-2`
  - Reset du formulaire

**Droite**
`flex items-center gap-3`

*État normal*
- "Enregistrer" : `bg-sky-600 text-white hover:bg-sky-700 px-6 py-2 rounded-lg text-sm font-medium shadow-sm`

*État saving*
- "Enregistrement..." : `opacity-70 cursor-wait` + spinner

*État saved*
- Icon check + "Enregistré" texte vert

---

## Section Historique (optionnelle)

### Card
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6`

**Header**
`px-6 py-4 border-b border-gray-200`
- Titre : "Historique d'envoi"

**Liste**
`divide-y divide-gray-100`

**Item**
`px-6 py-3 flex items-center justify-between`
- Gauche :
  - Destinataire : `text-sm text-gray-900`
  - Date : `text-xs text-gray-500`
- Droite :
  - Badge statut :
    - Envoyé : `bg-emerald-100 text-emerald-700`
    - Échec : `bg-rose-100 text-rose-700`
    - En cours : `bg-gray-100 text-gray-600`
