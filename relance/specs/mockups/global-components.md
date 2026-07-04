# Composants Partagés

> Note : Dans cette application, la plupart des éléments sont spécifiques à chaque écran. Le seul composant réellement réutilisable est la **Sidebar de navigation**.

---

## Sidebar Navigation

### Position
`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-40`

### Structure

**Header Sidebar**
`p-6 border-b border-gray-100`
- Logo : `h-8 w-auto mb-2` (ou texte "ADTI")
- Version : `text-xs text-gray-400`

**Navigation**
`p-4 space-y-1`

### Items de Navigation

**État normal**
`flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors`

**État actif**
`flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-sky-600 bg-sky-50 rounded-lg border-r-2 border-sky-600`

**État hover inactif**
`text-gray-900 bg-gray-50`

### Items principaux

| Route | Label | Icône |
|-------|-------|-------|
| `/` | Dashboard | `chart-pie` |
| `/impayes` | Impayés | `document-text` |
| `/relances` | Relances | `paper-airplane` |
| `/contacts` | Contacts | `users` |
| `/sequences` | Séquences | `rectangle-stack` |
| `/blacklist` | Blacklist | `shield-exclamation` |
| `/import` | Importer | `arrow-up-tray` |
| `/settings/smtp` | Paramètres | `cog-6-tooth` |

### Footer Sidebar
`p-4 border-t border-gray-100 mt-auto`

**User Info**
`flex items-center gap-3 px-3 py-2`
- Avatar : `h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium`
- Nom : `text-sm font-medium text-gray-700`
- Email : `text-xs text-gray-500 truncate`

**Logout**
`mt-2 flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer`
- Icon : `arrow-left-on-rectangle` `h-4 w-4`

---

## État Mobile de la Sidebar

### Toggle
`fixed top-4 left-4 z-50 lg:hidden h-10 w-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm`
- Icon : `bars-3` `h-5 w-5 text-gray-600`

### Overlay
`fixed inset-0 bg-gray-900/50 z-40 lg:hidden`

### Sidebar mobile
`fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-50 transform -translate-x-full transition-transform lg:hidden`
- **État ouvert** : `translate-x-0`

---

## Éléments Communs (non-composants)

Ces éléments sont décrits dans chaque écran individuellement :

### Boutons
Définis avec leurs états (normal, hover, focus, loading, disabled) dans chaque fichier.

### Inputs
Définis avec leurs états (focus, error, disabled) dans chaque fichier.

### Badges
Définis avec leurs variantes de couleurs dans chaque fichier.

### Tableaux
Structure et états définis par écran.

### Modales/Slideovers
Structure complète définie dans chaque écran utilisateur.
