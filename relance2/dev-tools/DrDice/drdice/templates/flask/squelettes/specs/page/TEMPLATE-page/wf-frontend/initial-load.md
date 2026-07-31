# Workflow Frontend - initial-load

> **Page**: {cell_name}  
> **Fichier**: `static/js/pages/{cell_name}/workflows/initial-load.js`  
> **Export**: `execute(context, params)`

---

## 🎯 Objectif

Décrire l'objectif de ce workflow (ex: "Charger la liste des {cell_name}s au démarrage de la page").

---

## 🔄 Logique

```javascript
export async function execute(context, params = {}) {
    console.log('initial-load workflow executing', params);
    
    try {
        // Appel API via le contexte
        const result = await context.api.get('/api/{cell_name}s');
        
        if (result.success) {
            return { 
                success: true, 
                data: result.data.data,  // Adapter selon la structure API
                meta: result.data.meta   // Si pagination/info supplémentaire
            };
        }
        
        return { 
            success: false, 
            error: result.error || 'Erreur de chargement' 
        };
        
    } catch (err) {
        console.error('initial-load error:', err);
        return { 
            success: false, 
            error: err.message 
        };
    }
}
```

---

## 📤 Input (params)

```javascript
params = {
    // Paramètres optionnels
    page: 1,        // Pagination: page courante
    perPage: 10,    // Pagination: items par page
    search: '',     // Filtre de recherche
    // ...
}
```

---

## 📥 Retour

### Succès
```javascript
{
    success: true,
    data: [
        { id: 1, name: "...", ... },
        // ...
    ],
    meta: {
        total: 100,
        pages: 10
    }
}
```

### Erreur
```javascript
{
    success: false,
    error: "Message d'erreur",
    // Optionnel: code d'erreur spécifique
    code: "AUTH_REQUIRED" | "SERVER_ERROR" | ...
}
```

---

## 🔗 Dépendances API

- **Endpoint**: `GET /api/{cell_name}s`
- **Query params supportés**:
  - `?page={number}` - Pagination
  - `?per_page={number}` - Limite
  - `?search={string}` - Recherche

---

## 📝 Notes

*Notes spécifiques à ce workflow : gestion de cache, retry, etc.*
