# settings/alpinejs.md - Spécification Alpine.js

## Description

Initialisation Alpine.js pour la page "settings".

## Pattern

**Props → Init → Workflows**

## Code

```javascript
// templates/settings/alpinejs.html
<script>
    const log = {
        debug: (event, data) => console.log(`[DEBUG][${event}]`, JSON.stringify(data)),
        info: (event, data) => console.log(`[INFO][${event}]`, JSON.stringify(data)),
        warn: (event, data) => console.warn(`[WARN][${event}]`, JSON.stringify(data)),
        error: (event, data) => console.error(`[ERROR][${event}]`, JSON.stringify(data))
    };

    document.addEventListener('alpine:init', () => {
        Alpine.data('settings', () => ({
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
            {% include 'settings/workflows/initial-load.html' %},
            
            // =====================================================
            // 3. WORKFLOWS (méthodes qui utilisent les props)
            // =====================================================
            // Workflows inclus automatiquement depuis workflows/
        }));
    });
</script>
```

## Mockups de Référence

- `mockups/settings.html` (si existe)
