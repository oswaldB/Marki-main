# Data Mapping - {cell_name}

## 📋 Référencement des Workflows Frontend

Pour chaque bouton présent dans les mockups (`specs/mockups/*.html`), identifier le workflow frontend associé.

### Boutons identifiés dans les mockups

| Élément HTML | Type | Action | Workflow Frontend | Fichier Spec |
|-------------|------|--------|-------------------|--------------|
| `button#submit-form` | Bouton | Soumettre formulaire | `submit-form` | `specs/wf-frontend/submit-form.md` |
| `button#load-data` | Bouton | Charger données | `load-data` | `specs/wf-frontend/load-data.md` |
| `a#nav-profile` | Lien | Navigation profil | `navigate-profile` | `specs/wf-frontend/navigate-profile.md` |
| ... | ... | ... | ... | ... |

> **⚠️ Important** : Chaque bouton interactif doit avoir un workflow frontend dédié dans `specs/wf-frontend/`.

---

## 🔄 Routes utilisées par les Workflows

Lister toutes les routes API appelées par les workflows frontend.

| Workflow Frontend | Route API appelée | Méthode | Blueprint |
|-------------------|-------------------|---------|-----------|
| `submit-form` | `/api/{cell_name}/submit` | POST | `{cell_name}` |
| `load-data` | `/api/data/load` | GET | `data` |
| ... | ... | ... | ... |

---

## 🌐 Routes utilisées par index.html

Lister les routes nécessaires pour l'affichage initial de la page.

| Route | Méthode | Description | Fichier Spec |
|-------|---------|-------------|--------------|
| `/{cell_name}/` | GET | Page principale | `specs/routes/index.md` |
| `/{cell_name}/data` | GET | Données initiales | `specs/routes/data.md` |
| ... | ... | ... | ... |

> **⚠️ Vérification** : Toutes ces routes doivent exister dans `specs/routes/*.md`.

---

## 🗂️ Modèles de données

| Modèle | Fichier | Champs principaux | Utilisé par |
|--------|---------|-------------------|-------------|
| `{CellName}` | `models/{cell_name}.py` | `id`, `name`, `created_at` | Routes, Workflows |
| ... | ... | ... | ... |

---

## 🔄 Data Mapping : Alpine.js Props ↔️ HTML

Mapper les propriétés réactives Alpine.js (`x-data`) avec les éléments HTML du mockup et les workflow frontend.

### Props principales (définies dans `templates/alpinejs.html`)

| Prop Alpine | Type | HTML Element | Attribut HTML | Description |
|-------------|------|--------------|---------------|-------------|
| `formData` | Object | `form#my-form` | `x-model` | Données du formulaire |
| `isLoading` | Boolean | `button#submit` | `:disabled` | État de chargement |
| `items` | Array | `div#list-container` | `x-for` | Liste des éléments |
| `selectedItem` | Object | `div.item` | `:class` | Élément sélectionné |
| `errors` | Object | `div#error-container` | `x-show` | Messages d'erreur |
| ... | ... | ... | ... | ... |

### Getters et Computed Properties

| Getter | Dépend de | Utilisé dans HTML | Description |
|--------|-----------|-------------------|-------------|
| `isFormValid` | `formData` | `x-show="!isFormValid"` | Validation formulaire |
| `filteredItems` | `items`, `searchQuery` | `x-for="filteredItems"` | Items filtrés |
| `formattedTotal` | `items` | `{{ formattedTotal }}` | Total formaté |
| ... | ... | ... | ... |

> **⚠️ Important** : Toutes les props utilisées dans les templates (`x-data`, `x-model`, `x-show`, `x-for`) doivent être définies dans `alpinejs.html`.

---

## 🗃️ Data Mapping : Props ↔️ Schéma Base de données

Mapper les données entre le frontend (Alpine.js props) et le backend (modèles DB).

### Table de correspondance

| Prop Alpine.js | Type JS | Modèle DB | Champ DB | Type SQL | Transformations |
|----------------|---------|-----------|----------|----------|-----------------|
| `user.name` | `string` | `User` | `name` | `VARCHAR(255)` | Trim, capitalize |
| `user.email` | `string` | `User` | `email` | `VARCHAR(255)` | Lowercase |
| `user.createdAt` | `Date` | `User` | `created_at` | `DATETIME` | ISO 8601 ↔️ SQL |
| `items[].id` | `number` | `Item` | `id` | `INTEGER PK` | - |
| `items[].price` | `number` | `Item` | `price` | `DECIMAL(10,2)` | Centimes ↔️ Euros |
| `isActive` | `boolean` | `User` | `is_active` | `BOOLEAN` | `1/0` ↔️ `true/false` |
| ... | ... | ... | ... | ... | ... |

### Relations entre tables

| Prop (Frontend) | Relation DB | Clé étrangère | Description |
|-----------------|-------------|---------------|-------------|
| `user.orders` | `User` → `Order` | `orders.user_id` | One-to-Many |
| `order.items` | `Order` → `OrderItem` | `order_items.order_id` | One-to-Many |
| `item.category` | `Item` → `Category` | `items.category_id` | Many-to-One |
| ... | ... | ... | ... |

### Flux de données

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   HTML / UI     │     │  Alpine.js     │     │   Backend DB    │
│                 │     │   Props        │     │                 │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ x-model="name"  │◄───►│ formData.name   │◄───►│ users.name      │
│ {{ items }}     │◄───►│ items[]         │◄───►│ items.*         │
│ x-for="order"   │◄───►│ selectedOrder   │◄───►│ orders.*        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## ✅ Checklist de validation

- [ ] Tous les boutons du mockup ont un workflow frontend associé
- [ ] Toutes les routes API des workflows existent dans `specs/routes/`
- [ ] Toutes les routes d'affichage d'`index.html` existent dans `specs/routes/`
- [ ] Les modèles nécessaires sont définis dans `specs/models/`
- [ ] **Toutes les props Alpine.js utilisées dans les templates sont définies dans `alpinejs.html`**
- [ ] **Toutes les props ont un mapping vers un champ de la base de données (si persistantes)**
- [ ] **Les types de données sont cohérents entre JS (Alpine), Python (modèles) et SQL (DB)**
- [ ] **Les relations entre tables sont correctement mappées (FK, JOIN)**

---

*Généré automatiquement par DrDice dev2*
*Date: {date}*
