# impayes_payeur/alpinejs.md - Spécification Alpine.js

## Description

Initialisation Alpine.js pour la page "impayes_payeur".

## Pattern

**Props → Init → Workflows**

## Code

```javascript
// templates/impayes_payeur/alpinejs.html
<script>
    const log = {
        debug: (event, data) => console.log(`[DEBUG][${event}]`, JSON.stringify(data)),
        info: (event, data) => console.log(`[INFO][${event}]`, JSON.stringify(data)),
        warn: (event, data) => console.warn(`[WARN][${event}]`, JSON.stringify(data)),
        error: (event, data) => console.error(`[ERROR][${event}]`, JSON.stringify(data))
    };

    document.addEventListener('alpine:init', () => {
        Alpine.data('impayes_payeur', () => ({
            // =====================================================
            // 1. PROPS RÉACTIVES (STATE)
            // =====================================================
            
            // UI State
            loading: false,
            error: null,
            
            // Data
            items: [],
            
            // =====================================================
            // 2. INIT (EN PREMIER)
            // =====================================================
            {% include 'impayes_payeur/workflows/initial-load.html' %},
            
            // =====================================================
            // 3. WORKFLOWS (méthodes qui utilisent les props)
            // =====================================================
            // Workflows inclus automatiquement depuis workflows/
        }));
    });
</script>
```

## Mockups de Référence

- `mockups/impayes_payeur.html` (si existe)
