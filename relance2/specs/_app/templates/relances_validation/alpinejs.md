# relances_validation/alpinejs.md - Spécification Alpine.js

## Description

Initialisation Alpine.js pour la page "relances_validation".

## Pattern

**Props → Init → Workflows**

## Code

```javascript
// templates/relances_validation/alpinejs.html
<script>
    const log = {
        debug: (event, data) => console.log(`[DEBUG][${event}]`, JSON.stringify(data)),
        info: (event, data) => console.log(`[INFO][${event}]`, JSON.stringify(data)),
        warn: (event, data) => console.warn(`[WARN][${event}]`, JSON.stringify(data)),
        error: (event, data) => console.error(`[ERROR][${event}]`, JSON.stringify(data))
    };

    document.addEventListener('alpine:init', () => {
        Alpine.data('relances_validation', () => ({
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
            {% include 'relances_validation/workflows/initial-load.html' %},
            
            // =====================================================
            // 3. WORKFLOWS (méthodes qui utilisent les props)
            // =====================================================
            // Workflows inclus automatiquement depuis workflows/
        }));
    });
</script>
```

## Mockups de Référence

- `mockups/relances_validation.html` (si existe)
