# Styleguide ADTI - Tailwind CSS

Guide de style générique pour l'application ADTI, basé sur Tailwind CSS (CDN).

---

## 1. Setup de base

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ADTI</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body class="bg-slate-50 text-slate-800 font-sans">
  <!-- Contenu -->
</body>
</html>
```

---

## 2. Logo

Le logo de l'application est disponible ici : [`frontend/public/marki-logo.png`](../frontend/public/marki-logo.png)

**Usage HTML :**
```html
<img src="/marki-logo.png" alt="ADTI Logo" class="h-10 w-auto">
```

---

## 3. Palette de couleurs

| Rôle | Classe | Hex |
|------|--------|-----|
| Primary | `bg-blue-600` / `text-blue-600` | #2563eb |
| Primary Hover | `bg-blue-700` | #1d4ed8 |
| Secondary | `bg-slate-600` / `text-slate-600` | #475569 |
| Success | `bg-emerald-500` / `text-emerald-500` | #10b981 |
| Warning | `bg-amber-500` / `text-amber-500` | #f59e0b |
| Danger | `bg-red-500` / `text-red-500` | #ef4444 |
| Info | `bg-cyan-500` / `text-cyan-500` | #06b6d4 |
| Background | `bg-slate-50` | #f8fafc |
| Surface | `bg-white` | #ffffff |
| Border | `border-slate-200` | #e2e8f0 |
| Text Primary | `text-slate-900` | #0f172a |
| Text Secondary | `text-slate-500` | #64748b |

---

## 4. Typographie

| Élément | Classes |
|---------|---------|
| H1 | `text-3xl font-bold text-slate-900` |
| H2 | `text-2xl font-semibold text-slate-900` |
| H3 | `text-xl font-semibold text-slate-800` |
| Body | `text-base text-slate-700` |
| Small | `text-sm text-slate-600` |
| Caption | `text-xs text-slate-500` |

---

## 5. Espacements

| Taille | Classe | Usage |
|--------|--------|-------|
| XS | `p-1` / `m-1` | Tight |
| SM | `p-2` / `m-2` | Compact |
| MD | `p-4` / `m-4` | Standard |
| LG | `p-6` / `m-6` | Sections |
| XL | `p-8` / `m-8` | Hero blocks |
| Gap SM | `gap-2` | Grids tight |
| Gap MD | `gap-4` | Grids standard |

---

## 6. Boutons

**Primaire**
```html
<button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
  Valider
</button>
```

**Secondaire**
```html
<button class="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors">
  Annuler
</button>
```

**Danger**
```html
<button class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors">
  Supprimer
</button>
```

**Disabled**
```html
<button class="px-4 py-2 bg-slate-300 text-slate-500 rounded-lg cursor-not-allowed" disabled>
  Inactif
</button>
```

---

## 7. Inputs

**Text standard**
```html
<input type="text" 
       class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
       placeholder="Saisissez...">
```

**Error state**
```html
<input type="text" 
       class="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-red-900"
       value="Invalide">
<p class="mt-1 text-sm text-red-600">Message d'erreur</p>
```

---

## 8. Cards

```html
<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
  <h3 class="text-lg font-semibold text-slate-900 mb-2">Titre</h3>
  <p class="text-slate-600">Contenu de la carte...</p>
</div>
```

---

## 9. Toasts / Notifications

**Succès**
```html
<div class="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
  <span class="text-emerald-500">✓</span>
  <span class="text-emerald-800 font-medium">Opération réussie</span>
</div>
```

**Erreur**
```html
<div class="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
  <span class="text-red-500">✕</span>
  <span class="text-red-800 font-medium">Une erreur est survenue</span>
</div>
```

**Info**
```html
<div class="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
  <span class="text-blue-500">ℹ</span>
  <span class="text-blue-800 font-medium">Information</span>
</div>
```

---

## 10. Modals

```html
<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
  <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
    <h3 class="text-xl font-semibold text-slate-900 mb-4">Titre du modal</h3>
    <p class="text-slate-600 mb-6">Contenu...</p>
    <div class="flex justify-end gap-3">
      <button class="px-4 py-2 text-slate-600 hover:text-slate-800">Annuler</button>
      <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Confirmer</button>
    </div>
  </div>
</div>
```

---

## 11. Loaders / Skeletons

**Spinner**
```html
<div class="flex items-center gap-2 text-slate-500">
  <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
  <span>Chargement...</span>
</div>
```

**Skeleton**
```html
<div class="animate-pulse space-y-3">
  <div class="h-4 bg-slate-200 rounded w-3/4"></div>
  <div class="h-4 bg-slate-200 rounded w-1/2"></div>
  <div class="h-4 bg-slate-200 rounded w-5/6"></div>
</div>
```

---

## 12. Tables

```html
<table class="w-full text-left">
  <thead class="bg-slate-50 border-b border-slate-200">
    <tr>
      <th class="px-4 py-3 text-sm font-semibold text-slate-700">Colonne A</th>
      <th class="px-4 py-3 text-sm font-semibold text-slate-700">Colonne B</th>
    </tr>
  </thead>
  <tbody class="divide-y divide-slate-200">
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3 text-sm text-slate-700">Valeur A1</td>
      <td class="px-4 py-3 text-sm text-slate-700">Valeur B1</td>
    </tr>
  </tbody>
</table>
```

---

## 13. Layout & Grids

**Container**
```html
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <!-- Contenu -->
</div>
```

**Grid 2 colonnes**
```html
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div>Colonne 1</div>
  <div>Colonne 2</div>
</div>
```

**Flex row**
```html
<div class="flex items-center justify-between">
  <div>Gauche</div>
  <div>Droite</div>
</div>
```

---

## 14. Conventions de nommage

- **Utility-first** : privilégier les classes Tailwind directement
- **Pas de CSS custom** : utiliser `@apply` uniquement si nécessaire
- **Responsive** : mobile-first avec `sm:`, `md:`, `lg:`

---

## 15. Accessibilité

- Toujours mettre un `alt` sur les images
- Labels explicites pour les inputs
- Focus visibles (`focus:ring-2`)
- Contraste minimum 4.5:1

---

## 16. Responsive breakpoints

| Breakpoint | Préfixe | Taille |
|------------|---------|--------|
| Mobile | (default) | < 640px |
| SM | `sm:` | ≥ 640px |
| MD | `md:` | ≥ 768px |
| LG | `lg:` | ≥ 1024px |
| XL | `xl:` | ≥ 1280px |
