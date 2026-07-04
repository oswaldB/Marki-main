# Écran : Espace Client

## Informations
- **Route** : `/espace/{id}` ou `/espace/{contactId}/impaye/{impayeId}`
- **Type** : Page publique (sans auth)
- **Style** : Pines UI - épuré, lecture seule

---

## Layout Global
- Fond : `bg-gray-50 min-h-screen`
- Container : `max-w-4xl mx-auto px-6 py-8`

---

## Zone 1 : Header Espace Client

### Container
`bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4 mb-6`

### Content
`flex items-center justify-between`

**Gauche**
- Logo : `h-8 w-auto` (ADTI)

**Droite**
- Nom client : `text-sm font-medium text-gray-700`
- Déconnexion (si applicable) : `text-sky-600 hover:text-sky-700 text-sm ml-4`

---

## Zone 2 : Vue Liste (Route /espace/{id})

### Header Section
`mb-6`
- Titre : `text-2xl font-semibold text-gray-900`
- Sous-titre : `text-sm text-gray-500 mt-1`

### Tableau Factures

**Container**
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`

**Header**
`bg-gray-50 border-b border-gray-200 px-6 py-4 grid grid-cols-[2fr_120px_120px_120px_100px_80px] gap-4 items-center`

**Colonnes** :
1. N° Facture
2. Date émission
3. Date échéance
4. Montant TTC
5. Reste
6. Actions

**Rows**

*État normal*
`border-b border-gray-100 px-6 py-4 grid grid-cols-[2fr_120px_120px_120px_100px_80px] gap-4 items-center hover:bg-gray-50 transition-colors`

**Cellules**

*N° Facture*
- `text-sm font-mono text-gray-900 font-medium`

*Dates*
- `text-sm text-gray-600 tabular-nums`

*Montants*
- `text-sm font-medium text-gray-900 tabular-nums`

*Reste*
- `text-sm font-bold text-rose-600 tabular-nums` si > 0
- `text-sm text-gray-400` si 0

*Statut*
- "Impayé" : `bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full font-medium`
- "Payé" : `bg-emerald-100 text-emerald-700`

*Actions*
- "Voir" : `text-sky-600 hover:text-sky-700 text-sm font-medium`
- "Payer" : `bg-sky-600 text-white hover:bg-sky-700 text-xs px-3 py-1.5 rounded font-medium` (si lien paiement)

**Empty**
`py-16 text-center`
- Icon : `document-check` `h-12 w-12 text-emerald-200 mx-auto mb-4`
- Titre : "Aucune facture en attente"
- Desc : "Toutes vos factures sont payées."

---

## Zone 3 : Vue Détail (Route /espace/{c}/impaye/{i})

### Card Informations

**Container**
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6`

**Header**
`px-6 py-4 border-b border-gray-200 flex items-center justify-between`
- Titre : "Détail de la facture"
- Bouton retour : `text-gray-400 hover:text-gray-600` + "Retour à la liste"

**Content**
`p-6 grid grid-cols-1 md:grid-cols-2 gap-6`

**Sections**

*Informations*
- N° Facture (mono)
- Références
- Dates
- Montants (HT, TTC, reste en évidence)

*Bien*
- Adresse
- Détails (lot, étage...)

### Card PDF

**Container**
`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6`

**Header**
`px-6 py-4 border-b border-gray-200 flex items-center justify-between`
- Titre : "Visualisation"
- Bouton : `border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded text-sm flex items-center gap-2`
  - Icon : `arrow-down-tray` `h-4 w-4`

**Content**
`h-[500px] bg-gray-100`
- Viewer PDF intégré

### Section Paiement

**Container**
`bg-sky-50 border border-sky-200 rounded-xl p-6`

**Content**
- Titre : "Régler en ligne"
- Montant : `text-2xl font-bold text-gray-900` "150,00 €"
- Bouton : `bg-sky-600 text-white hover:bg-sky-700 px-6 py-3 rounded-lg font-medium shadow-sm w-full md:w-auto`
  - "Payer maintenant"

**Alternative**
- Texte : "Ou effectuer un virement :"
- IBAN : `bg-white border border-gray-200 rounded-lg px-4 py-2 font-mono text-sm` (copiable)

---

## États

### Token invalide/expiré
`bg-rose-50 border border-rose-200 rounded-xl p-8 text-center`
- Icon : `shield-exclamation` `h-12 w-12 text-rose-500 mx-auto mb-4`
- Titre : "Lien expiré"
- Desc : "Ce lien n'est plus valide. Contactez votre gestionnaire."

### Loading
Skeleton sur les cards

### Erreur chargement
`text-center py-12`
- Message + bouton retry
