# relances/alpinejs.md - Spécification Alpine.js

## Description

Initialisation Alpine.js pour la page des relances.

## Pattern

**Props → Init → Workflows**

## Code

```javascript
// templates/relances/alpinejs.html
<script>
    const log = {
        debug: (event, data) => console.log(`[DEBUG][${event}]`, JSON.stringify(data)),
        info: (event, data) => console.log(`[INFO][${event}]`, JSON.stringify(data)),
        warn: (event, data) => console.warn(`[WARN][${event}]`, JSON.stringify(data)),
        error: (event, data) => console.error(`[ERROR][${event}]`, JSON.stringify(data))
    };

    document.addEventListener('alpine:init', () => {
        Alpine.data('relances', () => ({
            // =====================================================
            // 1. PROPS RÉACTIVES (STATE)
            // =====================================================
            
            // UI State
            loading: false,
            error: null,
            
            // Data
            relances: [],
            
            // Helpers
            formatDate(dateStr) {
                if (!dateStr) return '-';
                return new Date(dateStr).toLocaleDateString('fr-FR');
            },
            
            // =====================================================
            // 2. INIT (EN PREMIER)
            // =====================================================
            {% include 'relances/workflows/initial-load.html' %},
            
            // =====================================================
            // 3. WORKFLOWS
            // =====================================================
            {% include 'relances/workflows/new-relance.html' %},
            {% include 'relances/workflows/view-relance.html' %},
            {% include 'relances/workflows/edit-relance.html' %},
            {% include 'relances/workflows/cancel-relance.html' %}
        }));
    });
</script>
```

## Mockups de Référence

- `mockups/relances.html`
