# dashboard/alpinejs.md - Spécification Alpine.js

## Description

Initialisation Alpine.js pour la page dashboard.

## Pattern

**Props → Init → Workflows**

## Code

```javascript
// templates/dashboard/alpinejs.html
<script>
    const log = {
        debug: (event, data) => console.log(`[DEBUG][${event}]`, JSON.stringify(data)),
        info: (event, data) => console.log(`[INFO][${event}]`, JSON.stringify(data)),
        warn: (event, data) => console.warn(`[WARN][${event}]`, JSON.stringify(data)),
        error: (event, data) => console.error(`[ERROR][${event}]`, JSON.stringify(data))
    };

    document.addEventListener('alpine:init', () => {
        Alpine.data('dashboard', () => ({
            // =====================================================
            // 1. PROPS RÉACTIVES (STATE)
            // =====================================================
            
            // UI State
            loading: false,
            error: null,
            
            // Data
            stats: {
                impayes: 0,
                relances: 0,
                montant_total: 0
            },
            events: [],
            viewMode: 'card',
            
            // Getters calculés
            get itemCount() {
                return this.events.length;
            },
            
            // Helpers
            formatMoney(amount) {
                return new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR',
                    minimumFractionDigits: 2
                }).format(amount);
            },
            
            formatDate(dateStr) {
                if (!dateStr) return '-';
                const date = new Date(dateStr);
                return new Intl.DateTimeFormat('fr-FR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }).format(date);
            },
            
            // =====================================================
            // 2. INIT (EN PREMIER)
            // =====================================================
            {% include 'dashboard/workflows/initial-load.html' %},
            
            // =====================================================
            // 3. WORKFLOWS
            // =====================================================
            {% include 'dashboard/workflows/sync-data.html' %},
            {% include 'dashboard/workflows/clear-events.html' %},
            {% include 'dashboard/workflows/switch-view-card.html' %},
            {% include 'dashboard/workflows/switch-view-list.html' %},
            {% include 'dashboard/workflows/refresh-stats.html' %}
        }));
    });
</script>
```

## Mockups de Référence

- `mockups/dashboard.html`
